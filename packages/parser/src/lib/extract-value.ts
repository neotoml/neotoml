import type { TomlDate } from "./date";
import { TomlError } from "./error";
import { parseKey } from "./key";
import { parseString } from "./string";
import { skipComment, skipUntil, skipVoid, sliceAndTrimEndOf } from "./util";
import { parseValue } from "./value";
import type { IntegersAsBigInt } from "./value";

type TomlPrimitive = string | number | bigint | boolean | TomlDate;
type TomlTable = { [key: string]: TomlValue };
type TomlValue = TomlPrimitive | TomlValue[] | TomlTable;

function parseArray(
  str: string,
  ptr: number,
  depth: number,
  integersAsBigInt: IntegersAsBigInt,
): [TomlValue[], number] {
  let res: TomlValue[] = [];
  let c;

  ptr++;
  while ((c = str[ptr++]) !== "]" && c) {
    if (c === ",") {
      throw new TomlError("expected value, found comma", {
        toml: str,
        ptr: ptr - 1,
      });
    } else if (c === "#") ptr = skipComment(str, ptr);
    else if (c !== " " && c !== "\t" && c !== "\n" && c !== "\r") {
      let e = extractValue(str, ptr - 1, "]", depth - 1, integersAsBigInt);
      res.push(e[0]);
      ptr = e[1];
    }
  }

  if (!c) {
    throw new TomlError("unfinished array encountered", {
      toml: str,
      ptr,
    });
  }

  return [res, ptr];
}

function parseInlineTable(
  str: string,
  ptr: number,
  depth: number,
  integersAsBigInt: IntegersAsBigInt,
): [TomlTable, number] {
  let res: TomlTable = {};
  let seen = new Set();
  let c: string;

  ptr++;
  while ((c = str[ptr++]!) !== "}" && c) {
    if (c === ",") {
      throw new TomlError("expected value, found comma", {
        toml: str,
        ptr: ptr - 1,
      });
    } else if (c === "#") ptr = skipComment(str, ptr);
    else if (c !== " " && c !== "\t" && c !== "\n" && c !== "\r") {
      let k: string;
      let t: any = res;
      let hasOwn = false;

      let [key, keyEndPtr] = parseKey(str, ptr - 1);
      for (let i = 0; i < key.length; i++) {
        if (i) t = hasOwn ? t[k!] : (t[k!] = {});

        k = key[i]!;
        if (
          (hasOwn = Object.hasOwn(t, k)) &&
          (typeof t[k] !== "object" || seen.has(t[k]))
        ) {
          throw new TomlError("trying to redefine an already defined value", {
            toml: str,
            ptr,
          });
        }

        if (!hasOwn && k === "__proto__") {
          Object.defineProperty(t, k, {
            enumerable: true,
            configurable: true,
            writable: true,
          });
        }
      }

      if (hasOwn) {
        throw new TomlError("trying to redefine an already defined value", {
          toml: str,
          ptr,
        });
      }

      let [value, valueEndPtr] = extractValue(
        str,
        keyEndPtr,
        "}",
        depth - 1,
        integersAsBigInt,
      );
      seen.add(value);

      t[k!] = value;
      ptr = valueEndPtr;
    }
  }

  if (!c) {
    throw new TomlError("unfinished table encountered", {
      toml: str,
      ptr,
    });
  }

  return [res, ptr];
}

function extractValue(
  str: string,
  ptr: number,
  end: string | undefined,
  depth: number,
  integersAsBigInt: IntegersAsBigInt,
): [TomlValue, number] {
  if (depth === 0) {
    throw new TomlError(
      "document contains excessively nested structures. aborting.",
      { toml: str, ptr },
    );
  }

  let c = str[ptr];
  if (c === "[" || c === "{") {
    let [value, endPtr] =
      c === "["
        ? parseArray(str, ptr, depth, integersAsBigInt)
        : parseInlineTable(str, ptr, depth, integersAsBigInt);

    if (end) {
      endPtr = skipVoid(str, endPtr);
      if (str[endPtr] === ",") endPtr++;
      else if (str[endPtr] !== end) {
        throw new TomlError("expected comma or end of structure", {
          toml: str,
          ptr: endPtr,
        });
      }
    }

    return [value, endPtr];
  }

  if (c === '"' || c === "'") {
    let [parsed, endPtr] = parseString(str, ptr);
    if (end) {
      endPtr = skipVoid(str, endPtr);

      if (
        str[endPtr] &&
        str[endPtr] !== "," &&
        str[endPtr] !== end &&
        str[endPtr] !== "\n" &&
        str[endPtr] !== "\r"
      ) {
        throw new TomlError("unexpected character encountered", {
          toml: str,
          ptr: endPtr,
        });
      }

      if (str[endPtr] === ",") endPtr++;
    }

    return [parsed, endPtr];
  }

  let endPtr = skipUntil(str, ptr, ",", end);
  const slice = sliceAndTrimEndOf(
    str,
    ptr,
    endPtr - (str[endPtr - 1] === "," ? 1 : 0),
  );

  if (!slice[0]) {
    throw new TomlError(
      "incomplete key-value declaration: no value specified",
      { toml: str, ptr },
    );
  }

  if (end && slice[1] > -1) {
    endPtr = skipVoid(str, ptr + slice[1]);
    if (str[endPtr] === ",") endPtr++;
  }

  return [parseValue(slice[0], str, ptr, integersAsBigInt), endPtr];
}

export { extractValue };
export type { TomlTable };
