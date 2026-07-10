import { TomlError } from "./error";
import { parseString } from "./string";
import { indexOfNewline, skipVoid } from "./util";

const KEY_PART_RE = /^[a-zA-Z0-9-_]+[ \t]*$/;

function parseKey(str: string, ptr: number, end = "="): [string[], number] {
  let dot = ptr - 1;
  let parsed = [];

  let endPtr = str.indexOf(end, ptr);
  if (endPtr < 0) {
    throw new TomlError("incomplete key-value: cannot find end of key", {
      toml: str,
      ptr,
    });
  }

  do {
    let c = str[(ptr = ++dot)];

    if (c !== " " && c !== "\t") {
      if (c === '"' || c === "'") {
        if (c === str[ptr + 1] && c === str[ptr + 2]) {
          throw new TomlError("multiline strings are not allowed in keys", {
            toml: str,
            ptr,
          });
        }

        let [part, eos] = parseString(str, ptr);
        dot = str.indexOf(".", eos);

        let strEnd = str.slice(eos, dot < 0 || dot > endPtr ? endPtr : dot);
        let newLine = indexOfNewline(strEnd);
        if (newLine > -1) {
          throw new TomlError("newlines are not allowed in keys", {
            toml: str,
            ptr: ptr + dot + newLine,
          });
        }

        if (strEnd.trimStart()) {
          throw new TomlError("found extra tokens after the string part", {
            toml: str,
            ptr: eos,
          });
        }

        if (endPtr < eos) {
          endPtr = str.indexOf(end, eos);
          if (endPtr < 0) {
            throw new TomlError(
              "incomplete key-value: cannot find end of key",
              { toml: str, ptr },
            );
          }
        }

        parsed.push(part);
      } else {
        dot = str.indexOf(".", ptr);
        let part = str.slice(ptr, dot < 0 || dot > endPtr ? endPtr : dot);
        if (!KEY_PART_RE.test(part)) {
          throw new TomlError(
            "only letter, numbers, dashes and underscores are allowed in keys",
            { toml: str, ptr },
          );
        }

        parsed.push(part.trimEnd());
      }
    }
  } while (dot + 1 && dot < endPtr);

  return [parsed, skipVoid(str, endPtr + 1, true, true)];
}

export { parseKey };
