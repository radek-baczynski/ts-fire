export type RuntimeId = "node" | "bun" | "deno" | "unknown";

export function detectRuntime(): RuntimeId {
  if (typeof process !== "undefined" && process.versions?.bun) {
    return "bun";
  }
  // Deno exposes global Deno
  if (typeof globalThis !== "undefined" && "Deno" in globalThis) {
    return "deno";
  }
  if (typeof process !== "undefined" && process.versions?.node) {
    return "node";
  }
  return "unknown";
}
