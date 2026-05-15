import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Returns true when `callerModuleUrl` is the script the runtime started (direct CLI execution),
 * not a file that was only imported.
 */
export function isExecutedAsMainEntry(callerModuleUrl: string | URL): boolean {
  const href =
    typeof callerModuleUrl === "string"
      ? normalizeToFileHref(callerModuleUrl)
      : callerModuleUrl.href;

  const Deno_ = (globalThis as { Deno?: { mainModule?: string } }).Deno;
  if (typeof Deno_?.mainModule === "string" && Deno_.mainModule.length > 0) {
    try {
      return (
        new URL(Deno_.mainModule).href.replace(/\/$/, "") === href.replace(/\/$/, "")
      );
    } catch {
      return false;
    }
  }

  if (typeof process === "undefined" || typeof process.argv?.[1] !== "string") {
    return false;
  }

  const argv1 = process.argv[1]!;
  if (argv1 === "" || argv1 === "-e" || argv1 === "-") {
    return false;
  }

  try {
    let entryPath: string;
    if (argv1.startsWith("file:")) {
      entryPath = resolve(fileURLToPath(argv1));
    } else {
      entryPath = resolve(argv1);
    }
    const callerPath = resolve(fileURLToPath(new URL(href)));
    return samePath(entryPath, callerPath);
  } catch {
    return false;
  }
}

function normalizeToFileHref(spec: string): string {
  try {
    return new URL(spec).href;
  } catch {
    return pathToFileURL(resolve(spec)).href;
  }
}

function samePath(a: string, b: string): boolean {
  const x = resolve(a);
  const y = resolve(b);
  if (process.platform === "win32") {
    return x.toLowerCase() === y.toLowerCase();
  }
  return x === y;
}
