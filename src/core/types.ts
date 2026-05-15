export type FireTarget = Record<string, unknown> | ((...args: unknown[]) => unknown);

export type ArgSpec = string | [name: string, defaultValue: unknown];

export interface ParsedArgv {
  _: string[];
  help: boolean;
  interactive: boolean;
  flags: Record<string, unknown>;
  /** Raw argv slice used for this invocation */
  raw: string[];
}

export interface FireOptions {
  /**
   * Pass `import.meta.url` from the module that calls `fire()`.
   * The CLI only runs when that file is the process entry script (e.g. `node ./my-cli.mjs`),
   * not when the file is imported elsewhere. Required for `fire()` to do anything.
   */
  callerUrl?: string | URL;
  /** argv to parse (defaults to process.argv.slice(2)) */
  argv?: string[];
  /** Program name shown in usage (defaults to process.argv[1]) */
  name?: string;
  /** Suppress stdout for null/undefined results */
  silentNull?: boolean;
  /** Custom stdout writer */
  write?: (text: string) => void;
  /** Custom stderr writer */
  writeError?: (text: string) => void;
  /** Exit process on error (default true for CLI, false for API) */
  exitOnError?: boolean;
}

export interface SubCommand {
  key: string;
  description: string;
  instance: unknown;
}

export interface CommandResolution {
  /** Keys traversed from root */
  keys: string[];
  /** Resolved target (function or object) */
  target: unknown;
  /** Parent object containing target (for object help) */
  parent: unknown;
}

export interface RuntimeEnv {
  argv: string[];
  cwd: string;
  /** Load a module by path and return its default export or namespace */
  loadModule: (modulePath: string) => Promise<unknown>;
}
