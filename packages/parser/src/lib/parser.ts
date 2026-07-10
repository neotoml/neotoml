import { TomlDate } from "./date";
import { TomlError } from "./error";
import { extractValue } from "./extract-value";
import { parseKey } from "./key";
import { peekTable } from "./peek";
import { skipVoid } from "./util";
import type { IntegersAsBigInt } from "./value";

interface ParseOptions {
  maxDepth?: number;
  integersAsBigInt?: IntegersAsBigInt;
}

function parse(
  input: string,
  { maxDepth = 1000, integersAsBigInt }: ParseOptions = {},
): unknown {
  const res = {};
  const meta = {};

  let tbl = res;
  let m = meta;

  for (let ptr = skipVoid(input, 0); ptr < input.length;) {
    if (input[ptr] === "[") {
      let isTableArray = input[++ptr] === "[";
      let k = parseKey(input, (ptr += +isTableArray), "]");

      if (isTableArray) {
        if (input[k[1] - 1] !== "]") {
          throw new TomlError("expected end of table declaration", {
            toml: input,
            ptr: k[1] - 1,
          });
        }

        k[1]++;
      }

      let p = peekTable(k[0], res, meta, isTableArray ? 2 : 1);
      if (!p) {
        throw new TomlError(
          "trying to redefine an already defined table or value",
          { toml: input, ptr },
        );
      }

      m = p[2];
      tbl = p[1];
      ptr = k[1];
    } else {
      let k = parseKey(input, ptr);
      let p = peekTable(k[0], tbl, m, 0);
      if (!p) {
        throw new TomlError(
          "trying to redefine an already defined table or value",
          { toml: input, ptr },
        );
      }

      let v = extractValue(input, k[1], void 0, maxDepth, integersAsBigInt);
      p[1][p[0]] = v[0];
      ptr = v[1];
    }

    ptr = skipVoid(input, ptr, true);
    if (input[ptr] && input[ptr] !== "\n" && input[ptr] !== "\r") {
      throw new TomlError(
        "each key-value declaration must be followed by an end-of-line",
        { toml: input, ptr },
      );
    }
    ptr = skipVoid(input, ptr);
  }

  return res;
}

export { TomlDate, TomlError, parse };
