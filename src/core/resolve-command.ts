import { CommandNotFoundError } from "./errors";
import type { CommandResolution, ParsedArgv } from "./types";
import { getProps, isCallable, isPlainObject } from "./utils";

/**
 * Walk the command path on an object graph.
 */
export function resolveCommand(
  root: Record<string, unknown>,
  parsed: ParsedArgv,
): CommandResolution {
  let current: unknown = root;
  const keys: string[] = [];

  for (const segment of parsed._) {
    if (!isPlainObject(current)) break;

    const props = getProps(current);
    if (!props.includes(segment)) {
      return {
        keys,
        target: current,
        parent: keys.length > 0 ? getAtPath(root, keys.slice(0, -1)) : root,
      };
    }

    keys.push(segment);
    current = current[segment];
  }

  const parent =
    keys.length === 0
      ? root
      : (getAtPath(root, keys.slice(0, -1)) as Record<string, unknown>);

  return { keys, target: current, parent: parent ?? root };
}

function getAtPath(root: Record<string, unknown>, keys: string[]): unknown {
  let cur: unknown = root;
  for (const k of keys) {
    if (!isPlainObject(cur)) return undefined;
    cur = cur[k];
  }
  return cur;
}

export function isLastCommand(parsed: ParsedArgv, key: string): boolean {
  return parsed._.length > 0 && parsed._[parsed._.length - 1] === key;
}

export function unknownCommandMessage(
  parsed: ParsedArgv,
  props: string[],
): string {
  if (parsed._.length === 0) {
    return "Error: Command not found\n\n";
  }

  const unknown = parsed._[parsed._.length - 1]!;
  let msg = `Error: Command '${unknown}' not found\n`;

  const candidates = props.filter((p) => p !== unknown);
  const { bestMatch } = suggestCommand(unknown, candidates);
  if (bestMatch && bestMatch.rating > 0.4) {
    msg += `Did you mean: ${bestMatch.target}?\n`;
  }
  return msg + "\n";
}

export function suggestCommand(
  query: string,
  candidates: string[],
): { bestMatch: { target: string; rating: number } | null } {
  const { bestMatch } = requireBestMatch(query, candidates);
  return { bestMatch };
}

function requireBestMatch(query: string, candidates: string[]) {
  let best: { target: string; rating: number } | null = null;
  for (const target of candidates) {
    const rating = simpleRating(query.toLowerCase(), target.toLowerCase());
    if (!best || rating > best.rating) best = { target, rating };
  }
  return { bestMatch: best };
}

function simpleRating(a: string, b: string): number {
  if (a === b) return 1;
  if (b.includes(a) || a.includes(b)) return 0.6;
  let n = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) n++;
  }
  return n / Math.max(a.length, b.length);
}

export function assertResolvableObject(
  target: unknown,
  parsed: ParsedArgv,
): asserts target is Record<string, unknown> {
  if (!isPlainObject(target)) {
    throw new CommandNotFoundError("Error: Invalid command target\n");
  }

  const remaining = parsed._.slice(
    resolveCommand(target, { ...parsed, _: [] }).keys.length,
  );
  if (remaining.length > 0) {
    const props = getProps(target);
    throw new CommandNotFoundError(unknownCommandMessage(parsed, props));
  }
}

export function getSubCommands(input: Record<string, unknown>) {
  return getProps(input).map((key) => ({
    key,
    description: "",
    instance: input[key],
  }));
}

export { isCallable, isPlainObject, getProps };
