import { defineConfig } from "tsup";

const shared = {
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  shims: true,
  outExtension({ format }: { format: string }) {
    return {
      js: format === "cjs" ? ".cjs" : ".js",
    };
  },
} as const;

export default defineConfig([
  {
    ...shared,
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
  },
  {
    ...shared,
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    banner: { js: "#!/usr/bin/env node" },
  },
]);
