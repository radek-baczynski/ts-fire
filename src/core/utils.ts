import type { ArgSpec } from "./types";

export const UNKNOWN_VALUE = "ts-fire-unknown-value";

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function isCallable(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

export function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

export function functionExists(obj: unknown): boolean {
  if (isCallable(obj)) return true;
  if (!isPlainObject(obj)) return false;

  return getProps(obj).some((key) => {
    const child = obj[key];
    return isCallable(child) || functionExists(child);
  });
}

/**
 * Object keys exposed as CLI subcommands (sorted, no private/__description__).
 */
export function getProps(instance: Record<string, unknown>): string[] {
  return Object.keys(instance)
    .filter((k) => k !== "__description__")
    .filter((k) => !k.startsWith("_"))
    .filter((k) => functionExists(instance[k]))
    .sort();
}

const introspectCache = new WeakMap<(...args: unknown[]) => unknown, ArgSpec[]>();

/**
 * Parse function parameter names and defaults from source text.
 */
export function introspect(fn: (...args: unknown[]) => unknown): ArgSpec[] {
  const cached = introspectCache.get(fn);
  if (cached) return cached;

  const source = fn.toString();
  const firstLine = source.match(/^.*$/m)?.[0] ?? "";
  const match = /\(([^)]*)\)|^[^=]+(?==>)/.exec(firstLine);

  if (!match?.[1]?.trim()) {
    introspectCache.set(fn, []);
    return [];
  }

  const args: ArgSpec[] = match[1]
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/async\s+/g, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((segment) => {
      if (segment.includes("=")) {
        const eq = segment.indexOf("=");
        const name = segment.slice(0, eq).trim();
        const defaultExpr = segment.slice(eq + 1).trim();
        let defaultValue: unknown = UNKNOWN_VALUE;
        try {
          // eslint-disable-next-line no-eval
          defaultValue = eval(`(${defaultExpr})`);
        } catch {
          // default may reference out-of-scope identifiers
        }
        return [name, defaultValue] as ArgSpec;
      }
      return segment;
    });

  introspectCache.set(fn, args);
  return args;
}

export function scrapeDescription(input: unknown): string | undefined {
  if (input !== null && typeof input === "object" && "__description__" in input) {
    const desc = (input as { __description__?: unknown }).__description__;
    if (typeof desc === "string") return desc;
  }

  if (!isCallable(input)) return undefined;

  const source = input.toString();
  const lineComments = /(?:^|\s)\/\/(.+?)$/gms;
  const blockComments = /\/\*(.*?)\*\//gms;
  const pattern = new RegExp(`(?:${lineComments.source})|(?:${blockComments.source})`, "gms");
  const match = source.match(pattern);
  if (!match?.[0]) return undefined;

  return match[0]
    .replace(/^\/\/\s?/gm, "")
    .replace(/^\/\*\s?|\s?\*\/$/g, "")
    .replace(/^\s*\*\s?/gm, "")
    .trim();
}

export function argName(spec: ArgSpec): string {
  return Array.isArray(spec) ? spec[0] : spec;
}

export function formatDefault(value: unknown): string {
  if (value === UNKNOWN_VALUE) return "<default>";
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
}

/** Simple string similarity for suggestions (0–1). */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.includes(shorter)) return shorter.length / longer.length;
  let matches = 0;
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / longer.length;
}

export function bestMatch(query: string, candidates: string[]): { target: string; rating: number } | null {
  if (candidates.length === 0) return null;
  let best = { target: candidates[0]!, rating: 0 };
  for (const target of candidates) {
    const rating = similarity(query.toLowerCase(), target.toLowerCase());
    if (rating > best.rating) best = { target, rating };
  }
  return best;
}
