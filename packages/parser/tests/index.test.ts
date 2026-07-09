import { describe, test, expect } from "bun:test";
import { resolve } from "node:path";

import { parse } from "../src/index";
import { normalizeParsed } from "./shared";

const fixturesDir = resolve(import.meta.dirname, "fixtures");

const files = (
  await Bun.file(resolve(fixturesDir, "files-toml-1.1.0.txt")).text()
).split("\n");

function getTomlFiles(type: "valid" | "invalid"): string[] {
  return files.filter((file) => file.startsWith(type) && file.endsWith("toml"));
}

const validTomlFiles = getTomlFiles("valid");
const invalidTomlFiles = getTomlFiles("invalid");

console.log(files.length, validTomlFiles.length, invalidTomlFiles.length);

describe("valid fixtures", () => {
  for (const name of validTomlFiles) {
    const tomlPath = resolve(fixturesDir, name);
    const jsonPath = tomlPath.replace(".toml", ".json");

    test(name, async () => {
      const tomlContent = await Bun.file(tomlPath).text();
      const jsonContent = await Bun.file(jsonPath).text();
      const expected = JSON.parse(jsonContent);
      const parsed = parse(tomlContent);
      expect(parsed).toMatchSnapshot();
      const result = normalizeParsed(parsed);
      expect(result).toEqual(expected);
    });
  }
});

describe("invalid fixtures", () => {
  for (const name of invalidTomlFiles) {
    const tomlPath = resolve(fixturesDir, name);

    test(name, async () => {
      const tomlContent = await Bun.file(tomlPath).text();
      expect(() => parse(tomlContent)).toThrow();
    });
  }
});
