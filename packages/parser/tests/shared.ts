import { TomlDate } from "../src/dist/parser.js";

export function normalizeParsed(value: unknown): unknown {
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
    return value.map(normalizeParsed);
  }
  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = normalizeParsed(val);
    }
    return result;
  }
}
