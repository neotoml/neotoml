import { describe, test, expect } from "bun:test";
import { readdirSync, statSync } from "fs";
import { resolve, relative, extname } from "path";

import { TomlDate } from "../src/dist/parser.js";
import { parse } from "../src/index";

const fixturesDir = resolve(import.meta.dirname, "fixtures");

function collectTomlFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = resolve(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectTomlFiles(fullPath));
    } else if (extname(fullPath) === ".toml") {
      files.push(fullPath);
    }
  }
  return files;
}

function normalize(value: unknown): unknown {
  if (value === null || value === undefined) {
    return { type: "null", value: String(value) };
  }
  if (typeof value === "string") {
    return { type: "string", value };
  }
  if (typeof value === "boolean") {
    return { type: "bool", value: String(value) };
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      if (Number.isNaN(value)) return { type: "float", value: "nan" };
      if (value === Infinity) return { type: "float", value: "inf" };
      if (value === -Infinity) return { type: "float", value: "-inf" };
    }
    if (Number.isInteger(value)) {
      return { type: "integer", value: String(value) };
    }
    return { type: "float", value: String(value) };
  }
  if (value instanceof TomlDate) {
    if (value.isLocal()) {
      if (value.isDate()) {
        return {
          type: "date-local",
          value: value.toISOString().replace(".000", ""),
        };
      }
      if (value.isDateTime()) {
        return {
          type: "datetime-local",
          value: value.toISOString().replace(".000", ""),
        };
      }
      return {
        type: "time-local",
        value: value.toISOString().replace(".000", ""),
      };
    }
    return { type: "datetime", value: value.toISOString().replace(".000", "") };
  }
  if (Array.isArray(value)) {
    return value.map(normalize);
  }
  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = normalize(val);
    }
    return result;
  }
  throw new Error(`unexpected value type: ${typeof value}`);
}

describe("valid fixtures", () => {
  const validDir = resolve(fixturesDir, "valid");
  const tomlFiles = collectTomlFiles(validDir);

  for (const tomlPath of tomlFiles) {
    const jsonPath = tomlPath.replace(/\.toml$/, ".json");
    const name = relative(validDir, tomlPath).replace(/\\/g, "/");

    test(name, async () => {
      const tomlContent = await Bun.file(tomlPath).text();
      const jsonContent = await Bun.file(jsonPath).text();
      const expected = JSON.parse(jsonContent);
      const parsed = parse(tomlContent);
      expect(parsed).toMatchSnapshot();
      const result = normalize(parsed);
      expect(result).toEqual(expected);
    });
  }
});

describe("invalid fixtures", () => {
  const invalidDir = resolve(fixturesDir, "invalid");
  const tomlFiles = collectTomlFiles(invalidDir);

  for (const tomlPath of tomlFiles) {
    const name = relative(invalidDir, tomlPath).replace(/\\/g, "/");

    test(name, async () => {
      const tomlContent = await Bun.file(tomlPath).text();
      expect(() => parse(tomlContent)).toThrow();
    });
  }
});
