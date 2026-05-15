import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function runNode(script: string) {
  const full = join(root, script);
  return spawnSync(process.execPath, [full], { encoding: "utf8", cwd: root });
}

describe("fire CLI entry guard", () => {
  it("runs when the file that calls fire is the process entry script", () => {
    const r = runNode("tests/fixtures/fire-when-main.mjs");
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("42");
  });

  it("does not run CLI when the fire module is only statically imported", () => {
    const r = runNode("tests/fixtures/import-static-loader.mjs");
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("__static_import_loader__");
    expect(r.stdout).not.toContain("42");
  });

  it("does not run CLI when the fire module is only dynamically imported", () => {
    const r = runNode("tests/fixtures/import-dynamic-loader.mjs");
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("__dynamic_import_loader__");
    expect(r.stdout).not.toContain("42");
  });

  it("does not run CLI when wrapped importer is entry (nested dependency)", () => {
    const r = runNode("tests/fixtures/import-fire-wrapper.mjs");
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("__import_side_effect_ok__");
    expect(r.stdout).not.toContain("42");
  });

  it("does not run CLI through a static import chain", () => {
    const r = runNode("tests/fixtures/import-chain-loader.mjs");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("__import_side_effect_ok__");
    expect(r.stdout).toContain("__chain_loader__");
    expect(r.stdout).not.toContain("42");
  });

  it("importing the ts-fire package entry has no CLI side effects", () => {
    const r = runNode("tests/fixtures/import-ts-fire-package.mjs");
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe("__pkg_import_only__");
  });
});
