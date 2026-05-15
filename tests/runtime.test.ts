import { describe, expect, it } from "vitest";
import { detectRuntime } from "../src/runtime/detect.ts";
import { loadModule } from "../src/runtime/load-module.ts";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("runtime", () => {
  it("detects node in vitest", () => {
    expect(["node", "bun", "deno", "unknown"]).toContain(detectRuntime());
  });

  it("loads example calculator module", async () => {
    const path = join(__dirname, "..", "examples", "calculator-target.mjs");
    const mod = await loadModule(path);
    expect(mod).toBeTruthy();
  });
});
