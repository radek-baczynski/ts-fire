import {
  CommandNotFoundError,
  FlagNotFoundError,
  FireError,
  InvariantViolationError,
} from "./errors";
import {
  functionHelpText,
  objectHelpText,
} from "./help";
import { buildCallArgs, invokeFunction, validateFunctionFlags } from "./invoke";
import { runInteractiveSession, selectSubCommand, collectFlagValues } from "./interactive";
import { parseArgv } from "./parse-args";
import {
  getSubCommands,
  isCallable,
  isLastCommand,
  isPlainObject,
  resolveCommand,
  unknownCommandMessage,
  getProps,
} from "./resolve-command";
import type { FireOptions, FireTarget, ParsedArgv } from "./types";
import { introspect } from "./utils";
import { isExecutedAsMainEntry } from "../runtime/main-entry";

export interface RunContext {
  programName: string;
  commandPath: string[];
}

function getProgramName(options: FireOptions): string {
  if (options.name) return options.name;
  if (typeof process !== "undefined" && process.argv?.[1]) {
    return process.argv[1].split(/[/\\]/).pop() ?? "ts-fire";
  }
  return "ts-fire";
}

function cloneTarget<T>(input: T): T {
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(input);
    } catch {
      // functions are not cloneable
    }
  }
  return input;
}

export async function runFire(
  target: FireTarget,
  options: FireOptions = {},
): Promise<unknown> {
  const argv = options.argv ?? (typeof process !== "undefined" ? process.argv.slice(2) : []);
  const parsed = parseArgv(argv);
  const programName = getProgramName(options);
  const ctx: RunContext = { programName, commandPath: [] };

  if (isCallable(target)) {
    return handleFunction(target, parsed, ctx, 0);
  }

  if (isPlainObject(target)) {
    return handleObject(cloneTarget(target) as Record<string, unknown>, parsed, ctx);
  }

  throw new InvariantViolationError();
}

async function handleFunction(
  fn: (...args: unknown[]) => unknown,
  parsed: ParsedArgv,
  ctx: RunContext,
  positionalOffset: number,
  commandKey?: string,
): Promise<unknown> {
  const isTerminal = !commandKey || isLastCommand(parsed, commandKey);

  if (parsed.interactive && isTerminal) {
    const specs = introspect(fn);
    const values = await collectFlagValues(specs);
    return invokeFunction(fn, values);
  }

  if (parsed.help && isTerminal) {
    return functionHelpText(fn, ctx.programName, ctx.commandPath);
  }

  const specs = validateFunctionFlags(
    parsed,
    fn,
    ctx.programName,
    ctx.commandPath,
  );
  const args = buildCallArgs(parsed, specs, positionalOffset);
  return invokeFunction(fn, args);
}

async function handleObject(
  input: Record<string, unknown>,
  parsed: ParsedArgv,
  ctx: RunContext,
): Promise<unknown> {
  const { keys, target } = resolveCommand(input, parsed);
  ctx.commandPath = keys;

  if (isCallable(target)) {
    const key = keys[keys.length - 1]!;
    return handleFunction(target, parsed, ctx, keys.length, key);
  }

  if (!isPlainObject(target)) {
    throw new CommandNotFoundError("Error: Invalid command\n");
  }

  const props = getProps(target);

  if (parsed.interactive) {
    const subcommands = getSubCommands(target);
    const selected = await selectSubCommand(subcommands);
    parsed._.push(selected.key);
    ctx.commandPath = [...keys, selected.key];

    if (isCallable(selected.instance)) {
      return handleFunction(
        selected.instance as (...args: unknown[]) => unknown,
        parsed,
        ctx,
        keys.length + 1,
        selected.key,
      );
    }

    if (isPlainObject(selected.instance)) {
      return handleObject(
        selected.instance as Record<string, unknown>,
        parsed,
        ctx,
      );
    }
  }

  const notFound = unknownCommandMessage(parsed, props);
  const helpText = objectHelpText(target, ctx.programName, ctx.commandPath);

  if (parsed.help) {
    return notFound + helpText;
  }

  if (parsed._.length > keys.length) {
    throw new CommandNotFoundError(notFound + helpText);
  }

  throw new CommandNotFoundError(notFound + helpText);
}

export async function runFireInteractiveRoot(
  target: FireTarget,
): Promise<unknown> {
  return runInteractiveSession(target, async (fn, args) => invokeFunction(fn, args));
}

export function formatResult(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export async function fire(
  target: FireTarget,
  options: FireOptions = {},
): Promise<void> {
  if (options.callerUrl == null) {
    return;
  }
  if (!isExecutedAsMainEntry(options.callerUrl)) {
    return;
  }

  const write = options.write ?? ((t: string) => console.log(t));
  const writeError = options.writeError ?? ((t: string) => console.error(t));
  const exitOnError = options.exitOnError ?? true;

  try {
    const parsed = parseArgv(
      options.argv ?? (typeof process !== "undefined" ? process.argv.slice(2) : []),
    );

    let result: unknown;
    if (parsed.interactive && parsed._.length === 0 && isPlainObject(target)) {
      result = await runFireInteractiveRoot(target);
    } else if (parsed.interactive && isCallable(target)) {
      result = await runFireInteractiveRoot(target);
    } else {
      result = await runFire(target, options);
    }

    const formatted = formatResult(result);
    if (formatted !== null && !(options.silentNull && formatted === "")) {
      write(formatted);
    }
  } catch (err) {
    if (err instanceof FireError || err instanceof FlagNotFoundError || err instanceof CommandNotFoundError) {
      writeError(err.message);
      if (exitOnError && typeof process !== "undefined") process.exit(err.exitCode);
      return;
    }
    writeError(err instanceof Error ? err.message : String(err));
    if (exitOnError && typeof process !== "undefined") process.exit(1);
  }
}

export { parseArgv, runFire as executeFire };
