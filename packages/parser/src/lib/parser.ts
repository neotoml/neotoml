const DATE_TIME_RE =
  /^(\d{4}-\d{2}-\d{2})?[T ]?(?:(\d{2}):\d{2}(?::\d{2}(?:\.\d+)?)?)?(Z|[-+]\d{2}:\d{2})?$/i;

class TomlDate extends Date {
  #hasDate = false;
  #hasTime = false;
  #offset: string | null = null;

  constructor(date: string | Date) {
    let hasDate = true;
    let hasTime = true;
    let offset: string | null = "Z";

    if (typeof date === "string") {
      let match = date.match(DATE_TIME_RE);
      if (match) {
        if (!match[1]) {
          hasDate = false;
          date = `0000-01-01T${date}`;
        }

        hasTime = !!match[2];

        // Make sure to use T instead of a space. Breaks in case of extreme values otherwise.
        if (hasTime && date[10] === " ") {
          date = date.replace(" ", "T");
        }

        // Do not allow rollover hours.
        if (match[2] && +match[2] > 23) {
          date = "";
        } else {
          offset = match[3] || null;
          date = date.toUpperCase();
          if (!offset && hasTime) date += "Z";
        }
      } else {
        date = "";
      }
    }

    super(date);

    if (!isNaN(this.getTime())) {
      this.#hasDate = hasDate;
      this.#hasTime = hasTime;
      this.#offset = offset;
    }
  }

  isDateTime(): boolean {
    return this.#hasDate && this.#hasTime;
  }

  isLocal(): boolean {
    return !this.#hasDate || !this.#hasTime || !this.#offset;
  }

  isDate(): boolean {
    return this.#hasDate && !this.#hasTime;
  }

  isTime(): boolean {
    return this.#hasTime && !this.#hasDate;
  }

  isValid(): boolean {
    return this.#hasDate || this.#hasTime;
  }

  override toISOString(): string {
    const iso = super.toISOString();

    // Local Date
    if (this.isDate()) return iso.slice(0, 10);

    // Local Time
    if (this.isTime()) return iso.slice(11, 23);

    // Local DateTime
    if (this.#offset === null) return iso.slice(0, -1);

    // Offset DateTime
    if (this.#offset === "Z") return iso;

    // This part is quite annoying: JS strips the original timezone from the ISO string representation
    // Instead of using a "modified" date and "Z", we restore the representation "as authored"

    let offset = +this.#offset.slice(1, 3) * 60 + +this.#offset.slice(4, 6);
    offset = this.#offset[0] === "-" ? offset : -offset;

    const offsetDate = new Date(this.getTime() - offset * 60e3);
    return offsetDate.toISOString().slice(0, -1) + this.#offset;
  }

  static wrapAsOffsetDateTime(jsDate: Date, offset = "Z"): TomlDate {
    const date = new TomlDate(jsDate);
    date.#offset = offset;
    return date;
  }

  static wrapAsLocalDateTime(jsDate: Date): TomlDate {
    const n = new TomlDate(jsDate);
    n.#offset = null;
    return n;
  }

  static wrapAsLocalDate(jsDate: Date): TomlDate {
    let n = new TomlDate(jsDate);
    return ((n.#hasTime = false), (n.#offset = null), n);
  }

  static wrapAsLocalTime(jsDate: Date): TomlDate {
    let n = new TomlDate(jsDate);
    return ((n.#hasDate = false), (n.#offset = null), n);
  }
}

function getLineColFromPtr(string: string, ptr: number): [number, number] {
  let lines = string.slice(0, ptr).split(/\r\n|\n|\r/g);
  return [lines.length, lines.pop()!.length + 1];
}

function makeCodeBlock(string: string, line: number, column: number) {
  let lines = string.split(/\r\n|\n|\r/g);
  let codeblock = "";

  let numberLen = (Math.log10(line + 1) | 0) + 1;

  for (let i = line - 1; i <= line + 1; i++) {
    let l = lines[i - 1];
    if (!l) continue;

    codeblock += i.toString().padEnd(numberLen, " ");
    codeblock += ":  ";
    codeblock += l;
    codeblock += "\n";

    if (i === line) {
      codeblock += " ".repeat(numberLen + column + 2);
      codeblock += "^\n";
    }
  }

  return codeblock;
}

type TomlErrorOptions = ErrorOptions & { toml: string; ptr: number };

class TomlError extends Error {
  line: number;
  column: number;
  codeblock: string;

  constructor(message: string, options: TomlErrorOptions) {
    const [line, column] = getLineColFromPtr(options.toml, options.ptr);
    const codeblock = makeCodeBlock(options.toml, line, column);

    super(`Invalid TOML document: ${message}\n\n${codeblock}`, options);
    this.line = line;
    this.column = column;
    this.codeblock = codeblock;
  }
}

const INT_REGEX =
  /^((0x[0-9a-fA-F](_?[0-9a-fA-F])*)|(([+-]|0[ob])?\d(_?\d)*))$/;
const FLOAT_REGEX = /^[+-]?\d(_?\d)*(\.\d(_?\d)*)?([eE][+-]?\d(_?\d)*)?$/;
const LEADING_ZERO = /^[+-]?0[0-9_]/;

function T(e, t) {
  let n = e[t++],
    i = n,
    f = n === "'",
    r = n === e[t] && n === e[t + 1];

  r &&
    (e[(t += 2)] ===
    `
`
      ? t++
      : e[t] === "\r" &&
        e[t + 1] ===
          `
` &&
        (t += 2));
  let l = "",
    u = t,
    a = 0;
  for (let o = t; o < e.length; o++)
    if (
      ((n = e[o]),
      r &&
        (n ===
          `
` ||
          (n === "\r" &&
            e[o + 1] ===
              `
`)))
    )
      a = a && 3;
    else {
      if ((n < " " && n !== "	") || n === "\x7F")
        throw new TomlError("control characters are not allowed in strings", {
          toml: e,
          ptr: o,
        });
      if (
        (!a || a === 3) &&
        n === i &&
        (!r || (e[o + 1] === i && e[o + 2] === i))
      )
        return (
          r && (e[o + 3] === i && o++, e[o + 3] === i && o++),
          [a ? l : l + e.slice(u, o), o + (r ? 3 : 1)]
        );
      if (!a) !f && n === "\\" && ((l += e.slice(u, (u = o))), (a = 1));
      else if (a === 1)
        if (n === "x" || n === "u" || n === "U") {
          let s = 0,
            h = n === "x" ? 2 : n === "u" ? 4 : 8;
          for (let w = 0; w < h; w++, o++) {
            let d = e.charCodeAt(o + 1),
              g =
                d >= 48 && d <= 57
                  ? d - 48
                  : d >= 65 && d <= 70
                    ? d - 65 + 10
                    : d >= 97 && d <= 102
                      ? d - 97 + 10
                      : -1;
            if (g < 0)
              throw new TomlError(
                "invalid non-hex character in unicode escape",
                {
                  toml: e,
                  ptr: o + 1,
                },
              );
            s = (s << 4) | g;
          }
          if (s < 0 || s > 1114111 || (s >= 55296 && s <= 57343))
            throw new TomlError("invalid unicode escape", {
              toml: e,
              ptr: o,
            });
          ((l += String.fromCodePoint(s)), (u = o + 1), (a = 0));
        } else if (n === " " || n === "	") a = 2;
        else {
          if (n === "b") l += "\b";
          else if (n === "t") l += "	";
          else if (n === "n")
            l += `
`;
          else if (n === "f") l += "\f";
          else if (n === "r") l += "\r";
          else if (n === "e") l += "\x1B";
          else if (n === '"') l += '"';
          else if (n === "\\") l += "\\";
          else
            throw new TomlError("unrecognized escape sequence", {
              toml: e,
              ptr: o,
            });
          ((u = o + 1), (a = 0));
        }
      else if (n !== " " && n !== "	") {
        if (a === 2)
          throw new TomlError(
            "invalid escape: only line-ending whitespace may be escaped",
            {
              toml: e,
              ptr: u,
            },
          );
        ((a = !f && n === "\\" ? 1 : 0), (u = o));
      }
    }
  throw new TomlError("unfinished string", {
    toml: e,
    ptr: t,
  });
}

function $(e, t, n, i) {
  if (e === "true") return true;
  if (e === "false") return false;
  if (e === "-inf") return -Infinity;
  if (e === "inf" || e === "+inf") return Infinity;
  if (e === "nan" || e === "+nan" || e === "-nan") return NaN;
  if (e === "-0") return i ? 0n : 0;
  let f = INT_REGEX.test(e);
  if (f || FLOAT_REGEX.test(e)) {
    if (LEADING_ZERO.test(e))
      throw new TomlError("leading zeroes are not allowed", {
        toml: t,
        ptr: n,
      });
    e = e.replace(/_/g, "");
    let l = +e;
    if (isNaN(l))
      throw new TomlError("invalid number", {
        toml: t,
        ptr: n,
      });
    if (f) {
      if ((f = !Number.isSafeInteger(l)) && !i)
        throw new TomlError("integer value cannot be represented losslessly", {
          toml: t,
          ptr: n,
        });
      (f || i === true) && (l = BigInt(e));
    }
    return l;
  }
  let r = new TomlDate(e);
  if (!r.isValid())
    throw new TomlError("invalid value", {
      toml: t,
      ptr: n,
    });
  return r;
}

function k(e, t = 0, n = e.length) {
  let i = e.indexOf(
    `
`,
    t,
  );
  return (e[i - 1] === "\r" && i--, i <= n ? i : -1);
}

function x(e, t) {
  for (let n = t; n < e.length; n++) {
    let i = e[n];
    if (
      i ===
      `
`
    )
      return n;
    if (
      i === "\r" &&
      e[n + 1] ===
        `
`
    )
      return n + 1;
    if ((i < " " && i !== "	") || i === "\x7F")
      throw new TomlError("control characters are not allowed in comments", {
        toml: e,
        ptr: t,
      });
  }
  return e.length;
}

function m(e, t, n, i) {
  let f;
  for (;;) {
    for (
      ;
      (f = e[t]) === " " ||
      f === "	" ||
      (!n &&
        (f ===
          `
` ||
          (f === "\r" &&
            e[t + 1] ===
              `
`)));
    )
      t++;
    if (i || f !== "#") break;
    t = x(e, t);
  }
  return t;
}

function N(e, t, n, i, f = false) {
  if (!i) return ((t = k(e, t)), t < 0 ? e.length : t);
  for (let r = t; r < e.length; r++) {
    let l = e[r];
    if (l === "#") r = k(e, r);
    else {
      if (l === n) return r + 1;
      if (
        l === i ||
        (f &&
          (l ===
            `
` ||
            (l === "\r" &&
              e[r + 1] ===
                `
`)))
      )
        return r;
    }
  }
  throw new TomlError("cannot find end of structure", {
    toml: e,
    ptr: t,
  });
}

function M(e, t, n) {
  let i = e.slice(t, n),
    f = i.indexOf("#");
  return (
    f > -1 && (x(e, f), (i = i.slice(0, f))), [i.replace(/[ \t\r\n]+$/, ""), f]
  );
}

function y(e, t, n, i, f) {
  if (i === 0)
    throw new TomlError(
      "document contains excessively nested structures. aborting.",
      {
        toml: e,
        ptr: t,
      },
    );
  let r = e[t];
  if (r === "[" || r === "{") {
    let [a, o] = r === "[" ? D(e, t, i, f) : I(e, t, i, f);
    if (n) {
      if (((o = m(e, o)), e[o] === ",")) o++;
      else if (e[o] !== n)
        throw new TomlError("expected comma or end of structure", {
          toml: e,
          ptr: o,
        });
    }
    return [a, o];
  }
  if (r === '"' || r === "'") {
    let [a, o] = T(e, t);
    if (n) {
      if (
        ((o = m(e, o)),
        e[o] &&
          e[o] !== "," &&
          e[o] !== n &&
          e[o] !==
            `
` &&
          e[o] !== "\r")
      )
        throw new TomlError("unexpected character encountered", {
          toml: e,
          ptr: o,
        });
      e[o] === "," && o++;
    }
    return [a, o];
  }
  let l = N(e, t, ",", n),
    u = M(e, t, l - (e[l - 1] === "," ? 1 : 0));
  if (!u[0])
    throw new TomlError(
      "incomplete key-value declaration: no value specified",
      {
        toml: e,
        ptr: t,
      },
    );
  return (
    n && u[1] > -1 && ((l = m(e, t + u[1])), e[l] === "," && l++),
    [$(u[0], e, t, f), l]
  );
}
var U = /^[a-zA-Z0-9-_]+[ \t]*$/;

function E(e, t, n = "=") {
  let i = t - 1,
    f = [],
    r = e.indexOf(n, t);
  if (r < 0)
    throw new TomlError("incomplete key-value: cannot find end of key", {
      toml: e,
      ptr: t,
    });
  do {
    let l = e[(t = ++i)];
    if (l !== " " && l !== "	")
      if (l === '"' || l === "'") {
        if (l === e[t + 1] && l === e[t + 2])
          throw new TomlError("multiline strings are not allowed in keys", {
            toml: e,
            ptr: t,
          });
        let [u, a] = T(e, t);
        i = e.indexOf(".", a);
        let o = e.slice(a, i < 0 || i > r ? r : i),
          s = k(o);
        if (s > -1)
          throw new TomlError("newlines are not allowed in keys", {
            toml: e,
            ptr: t + i + s,
          });
        if (o.trimStart())
          throw new TomlError("found extra tokens after the string part", {
            toml: e,
            ptr: a,
          });
        if (r < a && ((r = e.indexOf(n, a)), r < 0))
          throw new TomlError("incomplete key-value: cannot find end of key", {
            toml: e,
            ptr: t,
          });
        f.push(u);
      } else {
        i = e.indexOf(".", t);
        let u = e.slice(t, i < 0 || i > r ? r : i);
        if (!U.test(u))
          throw new TomlError(
            "only letter, numbers, dashes and underscores are allowed in keys",
            {
              toml: e,
              ptr: t,
            },
          );
        f.push(u.trimEnd());
      }
  } while (i + 1 && i < r);
  return [f, m(e, r + 1, true, true)];
}

function I(e, t, n, i) {
  let f = {},
    r = /* @__PURE__ */ new Set(),
    l;
  for (t++; (l = e[t++]) !== "}" && l;) {
    if (l === ",")
      throw new TomlError("expected value, found comma", {
        toml: e,
        ptr: t - 1,
      });
    if (l === "#") t = x(e, t);
    else if (
      l !== " " &&
      l !== "	" &&
      l !==
        `
` &&
      l !== "\r"
    ) {
      let u,
        a = f,
        o = false,
        [s, h] = E(e, t - 1);
      for (let g = 0; g < s.length; g++) {
        if (
          (g && (a = o ? a[u] : (a[u] = {})),
          (u = s[g]),
          (o = Object.hasOwn(a, u)) && (typeof a[u] != "object" || r.has(a[u])))
        )
          throw new TomlError("trying to redefine an already defined value", {
            toml: e,
            ptr: t,
          });
        !o &&
          u === "__proto__" &&
          Object.defineProperty(a, u, {
            enumerable: true,
            configurable: true,
            writable: true,
          });
      }
      if (o)
        throw new TomlError("trying to redefine an already defined value", {
          toml: e,
          ptr: t,
        });
      let [w, d] = y(e, h, "}", n - 1, i);
      (r.add(w), (a[u] = w), (t = d));
    }
  }
  if (!l)
    throw new TomlError("unfinished table encountered", {
      toml: e,
      ptr: t,
    });
  return [f, t];
}

function D(e, t, n, i) {
  let f = [],
    r;
  for (t++; (r = e[t++]) !== "]" && r;) {
    if (r === ",")
      throw new TomlError("expected value, found comma", {
        toml: e,
        ptr: t - 1,
      });
    if (r === "#") t = x(e, t);
    else if (
      r !== " " &&
      r !== "	" &&
      r !==
        `
` &&
      r !== "\r"
    ) {
      let l = y(e, t - 1, "]", n - 1, i);
      (f.push(l[0]), (t = l[1]));
    }
  }
  if (!r)
    throw new TomlError("unfinished array encountered", {
      toml: e,
      ptr: t,
    });
  return [f, t];
}

function A(e, t, n, i) {
  let f = t,
    r = n,
    l,
    u = false,
    a;
  for (let o = 0; o < e.length; o++) {
    if (o) {
      if (
        ((f = u ? f[l] : (f[l] = {})),
        (r = (a = r[l]).c),
        i === 0 && (a.t === 1 || a.t === 2))
      )
        return null;
      if (a.t === 2) {
        let s = f.length - 1;
        ((f = f[s]), (r = r[s].c));
      }
    }
    if (((l = e[o]), (u = Object.hasOwn(f, l)) && r[l]?.t === 0 && r[l]?.d))
      return null;
    u ||
      (l === "__proto__" &&
        (Object.defineProperty(f, l, {
          enumerable: true,
          configurable: true,
          writable: true,
        }),
        Object.defineProperty(r, l, {
          enumerable: true,
          configurable: true,
          writable: true,
        })),
      (r[l] = {
        t: o < e.length - 1 && i === 2 ? 3 : i,
        d: false,
        i: 0,
        c: {},
      }));
  }
  if (
    ((a = r[l]),
    (a.t !== i && !(i === 1 && a.t === 3)) ||
      (i === 2 &&
        (a.d || ((a.d = true), (f[l] = [])),
        f[l].push((f = {})),
        (a.c[a.i++] = a =
          {
            t: 1,
            d: false,
            i: 0,
            c: {},
          })),
      a.d))
  )
    return null;
  if (((a.d = true), i === 1)) f = u ? f[l] : (f[l] = {});
  else if (i === 0 && u) return null;
  return [l, f, a.c];
}

type IntegersAsBigInt = undefined | boolean | "asNeeded";

interface ParseOptions {
  maxDepth?: number;
  integersAsBigInt?: IntegersAsBigInt;
}

function parse(
  input: string,
  { maxDepth = 1e3, integersAsBigInt }: ParseOptions = {},
): unknown {
  let i = {},
    f = {},
    r = i,
    l = f;

  for (let u = m(input, 0); u < input.length;) {
    if (input[u] === "[") {
      let a = input[++u] === "[",
        o = E(input, (u += +a), "]");
      if (a) {
        if (input[o[1] - 1] !== "]")
          throw new TomlError("expected end of table declaration", {
            toml: input,
            ptr: o[1] - 1,
          });
        o[1]++;
      }
      let s = A(o[0], i, f, a ? 2 : 1);
      if (!s)
        throw new TomlError(
          "trying to redefine an already defined table or value",
          {
            toml: input,
            ptr: u,
          },
        );
      ((l = s[2]), (r = s[1]), (u = o[1]));
    } else {
      let a = E(input, u),
        o = A(a[0], r, l, 0);
      if (!o)
        throw new TomlError(
          "trying to redefine an already defined table or value",
          { toml: input, ptr: u },
        );
      let s = y(input, a[1], void 0, maxDepth, integersAsBigInt);
      ((o[1][o[0]] = s[0]), (u = s[1]));
    }
    if (
      ((u = m(input, u, true)),
      input[u] &&
        input[u] !==
          `
` &&
        input[u] !== "\r")
    )
      throw new TomlError(
        "each key-value declaration must be followed by an end-of-line",
        { toml: input, ptr: u },
      );
    u = m(input, u);
  }
  return i;
}

export { TomlDate, TomlError, parse };
