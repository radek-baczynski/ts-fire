import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { ArgSpec, SubCommand } from "./types";
import {
  argName,
  formatDefault,
  introspect,
  isCallable,
  isPlainObject,
  UNKNOWN_VALUE,
} from "./utils";

export interface InteractiveIO {
  question: (prompt: string) => Promise<string>;
  close: () => void;
}

export function createInteractiveIO(): InteractiveIO {
  const rl = readline.createInterface({ input, output });
  return {
    question: (prompt) => rl.question(prompt),
    close: () => rl.close(),
  };
}

export async function selectSubCommand(
  subcommands: SubCommand[],
  io: InteractiveIO = createInteractiveIO(),
): Promise<SubCommand> {
  if (subcommands.length === 0) {
    throw new Error("No subcommands available");
  }

  output.write("\nSelect a command:\n");
  subcommands.forEach((cmd, i) => {
    const desc = cmd.description ? ` — ${cmd.description}` : "";
    output.write(`  ${i + 1}. ${cmd.key}${desc}\n`);
  });

  const answer = (await io.question("\nEnter number or name: ")).trim();
  const byIndex = Number.parseInt(answer, 10);
  if (!Number.isNaN(byIndex) && byIndex >= 1 && byIndex <= subcommands.length) {
    io.close();
    return subcommands[byIndex - 1]!;
  }

  const found = subcommands.find((c) => c.key === answer);
  io.close();
  if (!found) {
    throw new Error(`Unknown command: ${answer}`);
  }
  return found;
}

export async function collectFlagValues(
  specs: ArgSpec[],
  io: InteractiveIO = createInteractiveIO(),
): Promise<unknown[]> {
  const values: unknown[] = [];

  for (const spec of specs) {
    const name = argName(spec);
    const defaultHint = Array.isArray(spec)
      ? formatDefault(spec[1])
      : undefined;
    const prompt =
      defaultHint !== undefined
        ? `--${name} [${defaultHint}]: `
        : `--${name}: `;
    const raw = (await io.question(prompt)).trim();

    if (raw === "" && Array.isArray(spec)) {
      values.push(spec[1] === UNKNOWN_VALUE ? undefined : spec[1]);
    } else if (raw === "") {
      values.push(undefined);
    } else {
      values.push(coerceInteractiveValue(raw));
    }
  }

  io.close();
  return values;
}

function coerceInteractiveValue(raw: string): unknown {
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

export async function runInteractiveSession(
  target: unknown,
  onInvoke: (fn: (...args: unknown[]) => unknown, args: unknown[]) => Promise<unknown>,
): Promise<unknown> {
  let current = target;

  while (true) {
    if (isCallable(current)) {
      const specs = introspect(current);
      const values = await collectFlagValues(specs);
      return onInvoke(current, values);
    }

    if (!isPlainObject(current)) {
      throw new Error("Cannot explore this target interactively");
    }

    const keys = Object.keys(current)
      .filter((k) => k !== "__description__" && !k.startsWith("_"))
      .filter((k) => {
        const v = current[k as keyof typeof current];
        return isCallable(v) || isPlainObject(v);
      })
      .sort();

    const subcommands: SubCommand[] = keys.map((key) => ({
      key,
      description: "",
      instance: current[key as keyof typeof current],
    }));

    const selected = await selectSubCommand(subcommands);
    current = selected.instance;
  }
}
