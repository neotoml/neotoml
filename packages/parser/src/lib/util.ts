import { TomlError } from "./error";

function indexOfNewline(
  str: string,
  start = 0,
  end: number = str.length,
): number {
  let idx = str.indexOf("\n", start);
  if (str[idx - 1] === "\r") idx--;
  return idx <= end ? idx : -1;
}

function skipComment(str: string, ptr: number): number {
  for (let i = ptr; i < str.length; i++) {
    let c = str[i]!;
    if (c === "\n") return i;

    if (c === "\r" && str[i + 1] === "\n") return i + 1;

    if ((c < "\x20" && c !== "\t") || c === "\x7f") {
      throw new TomlError("control characters are not allowed in comments", {
        toml: str,
        ptr,
      });
    }
  }

  return str.length;
}

function skipVoid(
  str: string,
  ptr: number,
  banNewLines?: boolean,
  banComments?: boolean,
): number {
  let c;
  while (true) {
    while (
      (c = str[ptr]) === " " ||
      c === "\t" ||
      (!banNewLines && (c === "\n" || (c === "\r" && str[ptr + 1] === "\n")))
    ) {
      ptr++;
    }

    if (banComments || c !== "#") return ptr;

    ptr = skipComment(str, ptr);
  }
}

function skipUntil(
  str: string,
  ptr: number,
  sep: string,
  end?: string,
  banNewLines: boolean = false,
): number {
  if (!end) {
    ptr = indexOfNewline(str, ptr);
    return ptr < 0 ? str.length : ptr;
  }

  for (let i = ptr; i < str.length; i++) {
    let c = str[i];
    if (c === "#") {
      i = indexOfNewline(str, i);
    } else if (c === sep) {
      return i + 1;
    } else if (
      c === end ||
      (banNewLines && (c === "\n" || (c === "\r" && str[i + 1] === "\n")))
    ) {
      return i;
    }
  }

  throw new TomlError("cannot find end of structure", { toml: str, ptr });
}

function sliceAndTrimEndOf(
  str: string,
  startPtr: number,
  endPtr: number,
): [string, commentIdx: number] {
  let value = str.slice(startPtr, endPtr);

  const commentIdx = value.indexOf("#");
  if (commentIdx > -1) {
    skipComment(str, commentIdx);
    value = value.slice(0, commentIdx);
  }

  return [value.replace(/[ \t\r\n]+$/, ""), commentIdx];
}

export { indexOfNewline, skipComment, skipVoid, skipUntil, sliceAndTrimEndOf };
