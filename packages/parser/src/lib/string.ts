import { TomlError } from "./error";

function parseString(str: string, ptr: number): [string, number] {
  let c = str[ptr++]!;
  let first = c;
  const isLiteral = c === "'";
  const isMultiline = c === str[ptr] && c === str[ptr + 1];
  if (isMultiline) {
    if (str[(ptr += 2)] === "\n") ptr++;
    else if (str[ptr] === "\r" && str[ptr + 1] === "\n") ptr += 2;
  }

  let parsed = "";
  let sliceStart = ptr;

  let state = 0;
  for (let i = ptr; i < str.length; i++) {
    c = str[i]!;

    if (isMultiline && (c === "\n" || (c === "\r" && str[i + 1] === "\n"))) {
      state = state && 3;
    } else if ((c < "\x20" && c !== "\t") || c === "\x7f") {
      throw new TomlError("control characters are not allowed in strings", {
        toml: str,
        ptr: i,
      });
    } else if (
      (!state || state === 3) &&
      c === first &&
      (!isMultiline || (str[i + 1] === first && str[i + 2] === first))
    ) {
      if (isMultiline) {
        if (str[i + 3] === first) i++;
        if (str[i + 3] === first) i++;
      }

      return [
        state ? parsed : parsed + str.slice(sliceStart, i),
        i + (isMultiline ? 3 : 1),
      ];
    } else if (!state) {
      if (!isLiteral && c === "\\") {
        parsed += str.slice(sliceStart, (sliceStart = i));
        state = 1;
      }
    } else if (state === 1) {
      if (c === "x" || c === "u" || c === "U") {
        let value = 0;
        let len = c === "x" ? 2 : c === "u" ? 4 : 8;
        for (let j = 0; j < len; j++, i++) {
          let hex = str.charCodeAt(i + 1);
          let digit =
            hex >= 0x30 && hex <= 0x39
              ? hex - 0x30
              : hex >= 0x41 && hex <= 0x46
                ? hex - 0x41 + 10
                : hex >= 0x61 && hex <= 0x66
                  ? hex - 0x61 + 10
                  : -1;

          if (digit < 0)
            throw new TomlError("invalid non-hex character in unicode escape", {
              toml: str,
              ptr: i + 1,
            });
          value = (value << 4) | digit;
        }

        if (
          value < 0 ||
          value > 0x10ffff ||
          (value >= 0xd800 && value <= 0xdfff)
        ) {
          throw new TomlError("invalid unicode escape", { toml: str, ptr: i });
        }

        parsed += String.fromCodePoint(value);
        sliceStart = i + 1;
        state = 0;
      } else if (c === " " || c === "\t") {
        state = 2;
      } else {
        if (c === "b") parsed += "\b";
        else if (c === "t") parsed += "\t";
        else if (c === "n") parsed += "\n";
        else if (c === "f") parsed += "\f";
        else if (c === "r") parsed += "\r";
        else if (c === "e") parsed += "\x1b";
        else if (c === '"') parsed += '"';
        else if (c === "\\") parsed += "\\";
        else
          throw new TomlError("unrecognized escape sequence", {
            toml: str,
            ptr: i,
          });
        sliceStart = i + 1;
        state = 0;
      }
    } else if (c !== " " && c !== "\t") {
      if (state === 2) {
        throw new TomlError(
          "invalid escape: only line-ending whitespace may be escaped",
          { toml: str, ptr: sliceStart },
        );
      }

      state = !isLiteral && c === "\\" ? 1 : 0;
      sliceStart = i;
    }
  }

  throw new TomlError("unfinished string", { toml: str, ptr });
}

export { parseString };
