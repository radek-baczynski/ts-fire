# ts-fire

A TypeScript implementation of [google/python-fire](https://github.com/google/python-fire) and [js-fire](https://github.com/craigmulligan/js-fire). Automatically generate command-line interfaces from functions and plain objects.

## Installation

```bash
npm install ts-fire
# or
bun add ts-fire
# or
deno add npm:ts-fire
```

## API usage

```ts
import { fire } from "ts-fire";

const calculator = {
  __description__: "I am a math machine",
  double(number: number) {
    return 2 * number;
  },
  add(n1 = Math.PI, n2?: number) {
    return n1 + (n2 ?? 0);
  },
  misc: {
    hello(name: string) {
      return `hello ${name}`;
    },
  },
};

fire(calculator, import.meta.url);
```

`fire(target, import.meta.url)` runs only when **this file** is the runtime entry script (`node ./calculator.js`). Static or dynamic `import` of that file does **not** run the CLI—the module still loads, but `fire()` returns immediately unless this file’s path matches the process entry. That matches Python’s `if __name__ == "__main__"`. Use **`runFire`** when you want to drive commands from tests or libraries. The **`ts-fire` package itself** has no import-time CLI side effects beyond loading exports.

```bash
node calculator.js double --number=15   # 30
node calculator.js misc hello --name=ada  # hello ada
node calculator.js --help
node calculator.js --interactive
```

### Programmatic execution (no `process.exit`)

```ts
import { runFire } from "ts-fire";

const result = await runFire(calculator, {
  argv: ["double", "--number=15"],
  name: "calculator",
});
```

## CLI usage

The `ts-fire` binary loads a module and passes remaining argv to Fire:

```bash
ts-fire ./examples/calculator-target.mjs double --number=15
ts-fire ./examples/calculator-target.mjs --help
ts-fire ./examples/calculator-target.mjs misc hello --name=world
```

Use `--` to separate module path from commands when needed:

```bash
ts-fire ./my-tool.mjs -- misc hello --name=world
```

## Features (MVP)

- Nested commands via object properties
- Flag parsing: `--flag=value`, `--flag value`, short `-h` / `-i`
- Automatic `--help` with usage, description, and command tree
- `--interactive` mode (readline prompts)
- Async function support
- TypeScript types for library consumers

## Runtime compatibility

| Runtime | API (`fire`) | CLI (`ts-fire`) | Notes |
|---------|--------------|-----------------|-------|
| Node 20+ | Yes | Yes | Primary target |
| Bun | Yes | Yes | Uses native `import()` |
| Deno | Yes | Yes* | Use `deno run` with npm specifier |

\* CLI: `deno run --allow-read npm:ts-fire/dist/cli.js ./module.mjs --help`

## Development

```bash
npm install
npm run build
npm test
node examples/calculator.mjs double --number=15
```

## CI/CD and releases

- **CI** runs on every push/PR to `main`: typecheck, tests, build (Node 20 & 22).
- **Release** runs when you push a semver tag `v*.*.*`: publishes to [npm](https://www.npmjs.com/package/ts-fire) and creates a GitHub Release.

```bash
npm run release          # prompts: bump + optional push (default patch)
npm run release:minor
npm run release:major
```

If you decline the **push** step, the script reverts the local version bump (`git reset` + delete tag).

Setup and full release steps: [.github/RELEASE.md](.github/RELEASE.md).

## License

MIT — see [LICENSE](LICENSE).
