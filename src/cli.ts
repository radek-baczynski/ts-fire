import { fire } from "./core/engine";
import { getArgv, getCwd, loadModule } from "./runtime/load-module";
import type { FireTarget } from "./core/types";

const HELP = `USAGE:
  ts-fire <modulePath> [--] [command] [flags]

EXAMPLES:
  ts-fire ./calculator.js double --number=15
  ts-fire node:fs -- readFileSync --path=./package.json --encoding=utf8
  ts-fire ./calculator.js --help
  ts-fire ./calculator.js --interactive

Pass arguments after \`--\` when the module path could be ambiguous.
`;

async function main(): Promise<void> {
  const argv = getArgv();

  if (argv.length === 0 || argv.includes("--help") || argv[0] === "-h") {
    console.log(HELP.trim());
    process.exit(0);
  }

  let modulePath = argv[0]!;
  let fireArgv = argv.slice(1);

  const dashIndex = argv.indexOf("--");
  if (dashIndex > 0) {
    modulePath = argv[0]!;
    fireArgv = argv.slice(dashIndex + 1);
  }

  let target: FireTarget;
  try {
    target = (await loadModule(modulePath, getCwd())) as FireTarget;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to load module '${modulePath}': ${message}`);
    process.exit(1);
  }

  const programName = `ts-fire ${modulePath.split(/[/\\]/).pop()}`;
  await fire(target, {
    argv: fireArgv,
    name: programName,
    exitOnError: true,
    callerUrl: import.meta.url,
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
