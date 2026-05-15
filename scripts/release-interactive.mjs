#!/usr/bin/env node
/**
 * Interactive release: confirms before bumping, then confirms before push.
 * If push is declined, reverts `npm version` via reset + tag delete.
 */
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const KINDS = new Set(["patch", "minor", "major"]);

function readVersion() {
  return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
}

function git(args, inherit = false) {
  return spawnSync("git", args, {
    encoding: "utf8",
    stdio: inherit ? "inherit" : "pipe",
    cwd: ROOT,
  });
}

function npmVersion(kind) {
  const cmd = process.platform === "win32" ? "npm.cmd" : "npm";
  return spawnSync(cmd, ["version", kind, "-m", "chore: release %s"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    cwd: ROOT,
  });
}

async function question(rl, prompt) {
  const a = (await rl.question(prompt)).trim().toLowerCase();
  return a === "y" || a === "yes";
}

async function main() {
  const kind = process.argv[2] ?? "patch";
  if (!KINDS.has(kind)) {
    console.error(`Usage: node scripts/release-interactive.mjs [patch|minor|major]\n  Invalid kind: ${process.argv[2] ?? "(empty)"}`);
    process.exit(1);
  }

  const status = git(["status", "--porcelain"]);
  if (status.stdout?.trim()) {
    console.error("Working tree is not clean. Commit or stash changes before releasing.");
    process.exit(1);
  }

  const from = readVersion();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const okBump = await question(
      rl,
      `\nBump ${kind} (${from} → next), commit, and tag locally? [y/N] `,
    );
    if (!okBump) {
      console.log("Aborted. Version unchanged.");
      return;
    }
  } finally {
    rl.close();
  }

  const bump = npmVersion(kind);
  if (bump.status !== 0) {
    console.error("npm version failed (nothing was pushed).");
    process.exit(bump.status ?? 1);
  }

  const to = readVersion();
  const tag = `v${to}`;

  const rl2 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let okPush;
  try {
    okPush = await question(
      rl2,
      `\nPush current branch + ${tag} to origin (triggers CI / release workflows)? [y/N] `,
    );
  } finally {
    rl2.close();
  }

  if (!okPush) {
    console.log("\nReverting local bump (git tag -d + reset HEAD~1)…");
    const delTag = git(["tag", "-d", tag], true);
    if (delTag.status !== 0) {
      console.error(`Could not delete tag ${tag}. Revert manually.`);
      process.exit(1);
    }
    const reset = git(["reset", "--hard", "HEAD~1"], true);
    if (reset.status !== 0) {
      console.error("Could not git reset. Revert manually: git reset --hard HEAD~1");
      process.exit(1);
    }
    console.log(`Reverted to v${from}. Working tree matches previous commit.`);
    return;
  }

  const branch = git(["branch", "--show-current"]).stdout?.trim() ?? "main";
  const pushBranch = git(["push", "origin", branch], true);
  if (pushBranch.status !== 0) {
    console.error("git push branch failed. Tag was not pushed; fix remote and push manually.");
    process.exit(pushBranch.status ?? 1);
  }

  const pushTag = git(["push", "origin", tag], true);
  if (pushTag.status !== 0) {
    console.error(`git push tag ${tag} failed. Push it manually or delete the tag if you want to retry.`);
    process.exit(pushTag.status ?? 1);
  }

  console.log(`\nDone. Pushed ${branch} and ${tag}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
