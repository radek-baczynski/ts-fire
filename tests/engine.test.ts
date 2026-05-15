import { describe, expect, it } from "vitest";
import { runFire, formatResult } from "../src/core/engine";
import { introspect } from "../src/core/utils";

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

describe("runFire", () => {
  it("invokes nested commands with flags", async () => {
    const result = await runFire(calculator, { argv: ["double", "--number=15"] });
    expect(result).toBe(30);
  });

  it("invokes nested object methods", async () => {
    const result = await runFire(calculator, {
      argv: ["misc", "hello", "--name", "hobochild"],
    });
    expect(result).toBe("hello hobochild");
  });

  it("renders help for objects", async () => {
    const result = await runFire(calculator, { argv: ["--help"], name: "calculator" });
    expect(String(result)).toContain("USAGE:");
    expect(String(result)).toContain("I am a math machine");
    expect(String(result)).toContain("double");
    expect(String(result)).toContain("misc");
  });

  it("renders help for functions", async () => {
    const result = await runFire(calculator, {
      argv: ["double", "--help"],
      name: "calculator",
    });
    expect(String(result)).toContain("USAGE:");
    expect(String(result)).toContain("--number");
  });

  it("throws on unknown command", async () => {
    await expect(
      runFire(calculator, { argv: ["bogus"], name: "calculator" }),
    ).rejects.toThrow(/not found/i);
  });

  it("throws on unknown flag", async () => {
    await expect(
      runFire(calculator, { argv: ["double", "--bogus=1"], name: "calculator" }),
    ).rejects.toThrow(/Flag/);
  });

  it("supports async functions", async () => {
    const api = {
      async delay(ms: number) {
        return ms;
      },
    };
    const result = await runFire(api, { argv: ["delay", "--ms=42"] });
    expect(result).toBe(42);
  });
});

describe("introspect", () => {
  it("extracts parameter names and defaults", () => {
    const sample = function sample(a: string, b = 10) {
      void a;
      void b;
    };
    const specs = introspect(sample as (...args: unknown[]) => unknown);
    expect(specs[0]).toBe("a");
    expect(Array.isArray(specs[1])).toBe(true);
    if (Array.isArray(specs[1])) expect(specs[1][0]).toBe("b");
  });
});

describe("formatResult", () => {
  it("formats primitives and objects", () => {
    expect(formatResult(null)).toBeNull();
    expect(formatResult(" hi ")).toBe("hi");
    expect(formatResult({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
});
