import { TomlDate } from "./date";
import { TomlError } from "./error";
import { parseString } from "./string";
import { parseValue } from "./value";
import type { IntegersAsBigInt } from "./value";

function indexOfNewline(str: string, start = 0, end = str.length): number {
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
        ptr: ptr,
      });
    }
  }

  return str.length;
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
    t = skipComment(e, t);
  }
  return t;
}

function N(e, t, n, i, f = false) {
  if (!i) return ((t = indexOfNewline(e, t)), t < 0 ? e.length : t);
  for (let r = t; r < e.length; r++) {
    let l = e[r];
    if (l === "#") r = indexOfNewline(e, r);
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
    f > -1 && (skipComment(e, f), (i = i.slice(0, f))),
    [i.replace(/[ \t\r\n]+$/, ""), f]
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
    let [a, o] = parseString(e, t);
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
      { toml: e, ptr: t },
    );
  return (
    n && u[1] > -1 && ((l = m(e, t + u[1])), e[l] === "," && l++),
    [parseValue(u[0], e, t, f), l]
  );
}

const KEY_PART_RE = /^[a-zA-Z0-9-_]+[ \t]*$/;

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
        let [u, a] = parseString(e, t);
        i = e.indexOf(".", a);
        let o = e.slice(a, i < 0 || i > r ? r : i),
          s = indexOfNewline(o);
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
        if (!KEY_PART_RE.test(u))
          throw new TomlError(
            "only letter, numbers, dashes and underscores are allowed in keys",
            { toml: e, ptr: t },
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
  for (t++; (l = e[t++]) !== "}" && l; ) {
    if (l === ",")
      throw new TomlError("expected value, found comma", {
        toml: e,
        ptr: t - 1,
      });
    if (l === "#") t = skipComment(e, t);
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
  for (t++; (r = e[t++]) !== "]" && r; ) {
    if (r === ",")
      throw new TomlError("expected value, found comma", {
        toml: e,
        ptr: t - 1,
      });
    if (r === "#") t = skipComment(e, t);
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

  for (let u = m(input, 0); u < input.length; ) {
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
          { toml: input, ptr: u },
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
