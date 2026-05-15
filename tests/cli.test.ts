import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "dist", "cli.js");
const target = join(root, "examples", "calculator-target.mjs");

function runCli(args: string[]) {
  return spawnSync(process.execPath, [cli, target, ...args], {
    encoding: "utf8",
    cwd: root,
  });
}

describe("ts-fire CLI", () => {
  it("runs nested command with flags", () => {
    const result = runCli(["double", "--number=15"]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("30");
  });

  it("prints help", () => {
    const result = runCli(["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("USAGE:");
    expect(result.stdout).toContain("double");
  });
});
