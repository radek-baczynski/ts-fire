import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { detectRuntime, type RuntimeId } from "./detect";

export { detectRuntime } from "./detect";
export type { RuntimeId } from "./detect";

/**
 * Load a user module by path. Returns default export or module namespace.
 */
export async function loadModule(modulePath: string, cwd?: string): Promise<unknown> {
  const runtime = detectRuntime();
  const resolved = resolveModulePath(modulePath, cwd);

  switch (runtime) {
    case "bun":
      return loadWithImport(resolved, "bun");
    case "deno":
      return loadWithDeno(resolved);
    case "node":
    default:
      return loadWithImport(resolved, "node");
  }
}

function resolveModulePath(modulePath: string, cwd?: string): string {
  const base = cwd ?? (typeof process !== "undefined" ? process.cwd() : ".");
  if (modulePath.startsWith("file:")) return modulePath;
  if (modulePath.startsWith("/") || /^[A-Za-z]:\\/.test(modulePath)) {
    return modulePath;
  }
  return resolve(base, modulePath);
}

async function loadWithImport(
  resolved: string,
  runtime: RuntimeId,
): Promise<unknown> {
  const url =
    resolved.startsWith("file:") ? resolved : pathToFileURL(resolved).href;

  if (runtime === "node") {
    // Node dynamic import needs file URL for absolute paths
    const mod = await import(url);
    return mod.default ?? mod;
  }

  const mod = await import(url);
  return mod.default ?? mod;
}

async function loadWithDeno(resolved: string): Promise<unknown> {
  const deno = (globalThis as { Deno?: { cwd?: () => string } }).Deno;
  if (!deno) {
    return loadWithImport(resolved, "node");
  }

  const url = resolved.startsWith("file:")
    ? resolved
    : pathToFileURL(resolved).href;

  const mod = await import(url);
  return mod.default ?? mod;
}

export function getArgv(): string[] {
  if (typeof process !== "undefined" && Array.isArray(process.argv)) {
    return process.argv.slice(2);
  }
  const deno = (globalThis as { Deno?: { args: string[] } }).Deno;
  if (deno?.args) return [...deno.args];
  return [];
}

export function getCwd(): string {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd();
  }
  const deno = (globalThis as { Deno?: { cwd: () => string } }).Deno;
  if (deno?.cwd) return deno.cwd();
  return ".";
}
