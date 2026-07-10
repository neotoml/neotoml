var V = /^[a-z0-9-_]+$/i;
function b(e) {
  let t = typeof e;
  if (t === "object") {
    if (Array.isArray(e)) return "array";
    if (e instanceof Date) return "date";
  }
  return t;
}
function G(e) {
  for (let t = 0; t < e.length; t++) if (b(e[t]) !== "object") return !1;
  return e.length != 0;
}
function O(e) {
  return JSON.stringify(e).replace(/\x7f/g, "\\u007f");
}
function S(e, t, n, i) {
  if (n === 0)
    throw new Error(
      "Could not stringify the object: maximum object depth exceeded",
    );
  if (t === "number")
    return isNaN(e)
      ? "nan"
      : e === Infinity
        ? "inf"
        : e === -Infinity
          ? "-inf"
          : Number.isInteger(e) && (i || !Number.isSafeInteger(e))
            ? e.toFixed(1)
            : e.toString();
  if (t === "bigint" || t === "boolean") return e.toString();
  if (t === "string") return O(e);
  if (t === "date") {
    if (isNaN(e.getTime()))
      throw new TypeError("cannot serialize invalid date");
    return e.toISOString();
  }
  if (t === "object") return K(e, n, i);
  if (t === "array") return X(e, n, i);
}
function K(e, t, n) {
  let i = Object.keys(e);
  if (i.length === 0) return "{}";
  let f = "{ ";
  for (let r = 0; r < i.length; r++) {
    let l = i[r];
    (r && (f += ", "),
      (f += V.test(l) ? l : O(l)),
      (f += " = "),
      (f += S(e[l], b(e[l]), t - 1, n)));
  }
  return f + " }";
}
function X(e, t, n) {
  if (e.length === 0) return "[]";
  let i = "[ ";
  for (let f = 0; f < e.length; f++) {
    if ((f && (i += ", "), e[f] === null || e[f] === void 0))
      throw new TypeError("arrays cannot contain null or undefined values");
    i += S(e[f], b(e[f]), t - 1, n);
  }
  return i + " ]";
}
function Y(e, t, n, i) {
  if (n === 0)
    throw new Error(
      "Could not stringify the object: maximum object depth exceeded",
    );
  let f = "";
  for (let r = 0; r < e.length; r++)
    ((f += `${
      f &&
      `
`
    }[[${t}]]
`),
      (f += _(0, e[r], t, n, i)));
  return f;
}
function _(e, t, n, i, f) {
  if (i === 0)
    throw new Error(
      "Could not stringify the object: maximum object depth exceeded",
    );
  let r = "",
    l = "",
    u = Object.keys(t);
  for (let a = 0; a < u.length; a++) {
    let o = u[a];
    if (t[o] !== null && t[o] !== void 0) {
      let s = b(t[o]);
      if (s === "symbol" || s === "function")
        throw new TypeError(`cannot serialize values of type '${s}'`);
      let h = V.test(o) ? o : O(o);
      if (s === "array" && G(t[o]))
        l +=
          (l &&
            `
`) + Y(t[o], n ? `${n}.${h}` : h, i - 1, f);
      else if (s === "object") {
        let w = n ? `${n}.${h}` : h;
        l +=
          (l &&
            `
`) + _(w, t[o], w, i - 1, f);
      } else
        ((r += h),
          (r += " = "),
          (r += S(t[o], s, i, f)),
          (r += `
`));
    }
  }
  return (
    e &&
      (r || !l) &&
      (r = r
        ? `[${e}]
${r}`
        : `[${e}]`),
    r && l
      ? `${r}
${l}`
      : r || l
  );
}
function C(e, { maxDepth: t = 1e3, numbersAsFloat: n = !1 } = {}) {
  if (b(e) !== "object")
    throw new TypeError("stringify can only be called with an object");
  let i = _(0, e, "", t, n);
  return i[i.length - 1] !==
    `
`
    ? i +
        `
`
    : i;
}
export { C as stringify };
