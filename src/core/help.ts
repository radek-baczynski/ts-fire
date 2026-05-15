import {
  argName,
  formatDefault,
  getProps,
  introspect,
  isCallable,
  isPlainObject,
  scrapeDescription,
} from "./utils";
import type { ArgSpec } from "./types";

export function flagsText(args: ArgSpec[]): string {
  if (args.length === 0) return "";
  return args
    .map((arg) => {
      if (Array.isArray(arg)) {
        return ` --${arg[0]}=${formatDefault(arg[1])}`;
      }
      return ` --${arg}=<${arg}>`;
    })
    .join("");
}

export function usageText(programName: string, commandPath: string[] = []): string {
  const parts = [programName, ...commandPath].filter(Boolean);
  return `USAGE:\n\t${parts.join(" ")}\n`;
}

export function subcommandsText(
  input: Record<string, unknown>,
  depth = 1,
): string {
  return getProps(input).reduce((acc, key) => {
    const child = input[key];
    if (isPlainObject(child)) {
      return (
        acc +
        "\n" +
        "\t".repeat(depth) +
        key +
        "\n" +
        subcommandsText(child, depth + 1) +
        "\n"
      );
    }
    if (isCallable(child)) {
      const args = introspect(child);
      return acc + "\t".repeat(depth) + key + flagsText(args) + "\n";
    }
    return acc;
  }, "");
}

export function functionHelpText(
  fn: (...args: unknown[]) => unknown,
  programName: string,
  commandPath: string[],
): string {
  const description = scrapeDescription(fn);
  const args = introspect(fn);
  return (
    usageText(programName, commandPath) +
    flagsText(args) +
    (description ? `\n\nDESCRIPTION:\n${description}\n` : "")
  );
}

export function objectHelpText(
  input: Record<string, unknown>,
  programName: string,
  commandPath: string[],
  notFoundPrefix = "",
): string {
  const description = scrapeDescription(input);
  const cmdHelp = subcommandsText(input, 0);
  return (
    notFoundPrefix +
    usageText(programName, commandPath) +
    (description ? `\n\nDESCRIPTION:\n\t${description}\n` : "") +
    "\n\nCOMMANDS:\n\n" +
    cmdHelp
  );
}

export function flagErrorText(
  flag: string,
  allowed: string[],
  fn: (...args: unknown[]) => unknown,
  programName: string,
  commandPath: string[],
): string {
  let msg = `Error: Flag '${flag}' not found\n`;
  const suggestions = allowed.filter((a) => a !== flag);
  const best = suggestions
    .map((target) => ({
      target,
      rating:
        target.toLowerCase().includes(flag.toLowerCase()) ||
        flag.toLowerCase().includes(target.toLowerCase())
          ? 0.6
          : overlapRating(flag, target),
    }))
    .sort((a, b) => b.rating - a.rating)[0];

  if (best && best.rating > 0.4) {
    msg += `Did you mean: ${best.target}?\n`;
  }
  return msg + "\n" + functionHelpText(fn, programName, commandPath);
}

function overlapRating(a: string, b: string): number {
  let n = 0;
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    if (x[i] === y[i]) n++;
  }
  return n / Math.max(x.length, y.length);
}

export { argName };
