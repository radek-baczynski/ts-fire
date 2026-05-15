import { FlagNotFoundError } from "./errors";
import { flagErrorText } from "./help";
import { validateFlags } from "./parse-args";
import type { ArgSpec, ParsedArgv } from "./types";
import { argName, introspect } from "./utils";

export function buildCallArgs(
  parsed: ParsedArgv,
  specs: ArgSpec[],
  positionalOffset = 0,
): unknown[] {
  return specs.map((spec, index) => {
    const name = argName(spec);
    if (name in parsed.flags) {
      return parsed.flags[name];
    }
    const positional = parsed._[positionalOffset + index];
    if (positional !== undefined) {
      return coercePositional(positional, spec);
    }
    if (Array.isArray(spec)) {
      return spec[1];
    }
    return undefined;
  });
}

function coercePositional(value: string, spec: ArgSpec): unknown {
  const coerced = coerceString(value);
  if (Array.isArray(spec) && typeof spec[1] === "number" && typeof coerced === "string") {
    const n = Number(coerced);
    if (!Number.isNaN(n)) return n;
  }
  return coerced;
}

function coerceString(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10);
  if (/^-?\d*\.\d+$/.test(raw)) return Number.parseFloat(raw);
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function validateFunctionFlags(
  parsed: ParsedArgv,
  fn: (...args: unknown[]) => unknown,
  programName: string,
  commandPath: string[],
): ArgSpec[] {
  const specs = introspect(fn);
  const allowed = specs.map(argName);
  const unknown = validateFlags(parsed, allowed);

  if (unknown.length > 0) {
    const flag = unknown[0]!;
    throw new FlagNotFoundError(
      flagErrorText(flag, allowed, fn, programName, commandPath),
    );
  }

  return specs;
}

export async function invokeFunction(
  fn: (...args: unknown[]) => unknown,
  args: unknown[],
): Promise<unknown> {
  const result = fn(...args);
  if (result !== null && typeof result === "object" && "then" in result) {
    return (result as Promise<unknown>).then((v) => v);
  }
  return result;
}
