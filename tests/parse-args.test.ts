import { describe, expect, it } from "vitest";
import { parseArgv } from "../src/core/parse-args.ts";

describe("parseArgv", () => {
  it("parses command segments", () => {
    const parsed = parseArgv(["misc", "hello", "world"]);
    expect(parsed._).toEqual(["misc", "hello", "world"]);
  });

  it("parses --flag=value", () => {
    const parsed = parseArgv(["double", "--number=15"]);
    expect(parsed.flags.number).toBe(15);
  });

  it("parses --flag value", () => {
    const parsed = parseArgv(["hello", "--name", "ada"]);
    expect(parsed.flags.name).toBe("ada");
  });

  it("parses help aliases", () => {
    expect(parseArgv(["-h"]).help).toBe(true);
    expect(parseArgv(["--help"]).help).toBe(true);
  });

  it("parses interactive aliases", () => {
    expect(parseArgv(["-i"]).interactive).toBe(true);
    expect(parseArgv(["--interactive"]).interactive).toBe(true);
  });

  it("respects -- separator", () => {
    const parsed = parseArgv(["cmd", "--", "--not-a-flag"]);
    expect(parsed._).toEqual(["cmd", "--not-a-flag"]);
  });
});
