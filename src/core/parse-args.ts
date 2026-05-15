import type { ParsedArgv } from "./types";

const RESERVED = new Set(["help", "h", "interactive", "i", "_", "--"]);

const ALIASES: Record<string, string> = {
  h: "help",
  i: "interactive",
};

/**
 * Parse CLI argv into command segments and flags (minimist-style).
 */
export function parseArgv(argv: string[]): ParsedArgv {
  const _: string[] = [];
  const flags: Record<string, unknown> = {};
  let help = false;
  let interactive = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--") {
      _.push(...argv.slice(i + 1));
      break;
    }

    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      if (eq !== -1) {
        const key = normalizeKey(arg.slice(2, eq));
        const value = coerceValue(arg.slice(eq + 1));
        applyFlag(key, value, flags, () => {
          help = help || key === "help";
          interactive = interactive || key === "interactive";
        });
        continue;
      }

      const key = normalizeKey(arg.slice(2));
      if (isBooleanFlag(key)) {
        applyFlag(key, true, flags, () => {
          help = help || key === "help";
          interactive = interactive || key === "interactive";
        });
        continue;
      }

      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        applyFlag(key, coerceValue(next), flags, () => {
          help = help || key === "help";
          interactive = interactive || key === "interactive";
        });
        i++;
        continue;
      }

      applyFlag(key, true, flags, () => {
        help = help || key === "help";
        interactive = interactive || key === "interactive";
      });
      continue;
    }

    if (arg.startsWith("-") && arg.length > 1) {
      const short = arg.slice(1);
      for (const ch of short) {
        const key = ALIASES[ch] ?? ch;
        applyFlag(key, true, flags, () => {
          help = help || key === "help";
          interactive = interactive || key === "interactive";
        });
      }
      continue;
    }

    _.push(arg);
  }

  return {
    _,
    help: help || flags.help === true,
    interactive: interactive || flags.interactive === true,
    flags,
    raw: argv,
  };
}

function normalizeKey(key: string): string {
  return ALIASES[key] ?? key;
}

function applyFlag(
  key: string,
  value: unknown,
  flags: Record<string, unknown>,
  onReserved: () => void,
): void {
  if (key === "help" || key === "interactive") onReserved();
  flags[key] = value;
}

function isBooleanFlag(key: string): boolean {
  return key === "help" || key === "interactive";
}

function coerceValue(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (raw === "undefined") return undefined;
  if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10);
  if (/^-?\d*\.\d+$/.test(raw)) return Number.parseFloat(raw);
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function validateFlags(
  parsed: ParsedArgv,
  allowedNames: string[],
): string[] {
  return Object.keys(parsed.flags).filter(
    (f) => !RESERVED.has(f) && !allowedNames.includes(f),
  );
}
