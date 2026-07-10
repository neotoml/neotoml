const BARE_KEY = /^[a-z0-9-_]+$/i;

function typeOf(obj: unknown) {
  const type = typeof obj;
  if (type === "object") {
    if (Array.isArray(obj)) return "array";
    if (obj instanceof Date) return "date";
  }

  return type;
}

type Type = ReturnType<typeof typeOf>;

function isArrayOfTables(obj: unknown[]) {
  for (let i = 0; i < obj.length; i++) {
    if (typeOf(obj[i]) !== "object") return false;
  }

  return obj.length != 0;
}

function formatString(str: string) {
  return JSON.stringify(str).replace(/\x7f/g, "\\u007f");
}

function stringifyValue(
  // oxlint-disable-next-line typescript/no-explicit-any
  val: any,
  type: Type,
  depth: number,
  numberAsFloat: boolean,
) {
  if (depth === 0) {
    throw new Error(
      "Could not stringify the object: maximum object depth exceeded",
    );
  }

  if (type === "number") {
    if (isNaN(val)) return "nan";
    if (val === Infinity) return "inf";
    if (val === -Infinity) return "-inf";
    if (Number.isInteger(val) && (numberAsFloat || !Number.isSafeInteger(val)))
      return val.toFixed(1);
    return val.toString();
  }

  if (type === "bigint" || type === "boolean") {
    return val.toString();
  }

  if (type === "string") {
    return formatString(val);
  }

  if (type === "date") {
    if (isNaN(val.getTime())) {
      throw new TypeError("cannot serialize invalid date");
    }

    return val.toISOString();
  }

  if (type === "object") {
    return stringifyInlineTable(val, depth, numberAsFloat);
  }

  if (type === "array") {
    return stringifyArray(val, depth, numberAsFloat);
  }
}

function stringifyInlineTable(
  obj: Record<string, unknown>,
  depth: number,
  numberAsFloat: boolean,
) {
  const keys = Object.keys(obj);
  if (keys.length === 0) return "{}";

  let res = "{ ";
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]!;
    if (i) res += ", ";

    res += BARE_KEY.test(k) ? k : formatString(k);
    res += " = ";
    res += stringifyValue(obj[k], typeOf(obj[k]), depth - 1, numberAsFloat);
  }

  return `${res} }`;
}

function stringifyArray(
  array: unknown[],
  depth: number,
  numberAsFloat: boolean,
) {
  if (array.length === 0) return "[]";

  let res = "[ ";
  for (let i = 0; i < array.length; i++) {
    if (i) res += ", ";
    if (array[i] == null) {
      throw new TypeError("arrays cannot contain null or undefined values");
    }

    res += stringifyValue(array[i], typeOf(array[i]), depth - 1, numberAsFloat);
  }

  return `${res} ]`;
}

function stringifyArrayTable(
  array: unknown[],
  key: string,
  depth: number,
  numberAsFloat: boolean,
) {
  if (depth === 0) {
    throw new Error(
      "Could not stringify the object: maximum object depth exceeded",
    );
  }

  let res = "";
  for (let i = 0; i < array.length; i++) {
    res += `${res && "\n"}[[${key}]]\n`;
    res += stringifyTable(0, array[i], key, depth, numberAsFloat);
  }

  return res;
}

function stringifyTable(
  tableKey: string | 0,
  // oxlint-disable-next-line typescript/no-explicit-any
  obj: any,
  prefix: string,
  depth: number,
  numberAsFloat: boolean,
) {
  if (depth === 0) {
    throw new Error(
      "Could not stringify the object: maximum object depth exceeded",
    );
  }

  let preamble = "";
  let tables = "";

  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]!;
    if (obj[k] !== null && obj[k] !== void 0) {
      const type: Type = typeOf(obj[k]);
      if (type === "symbol" || type === "function") {
        throw new TypeError(`cannot serialize values of type '${type}'`);
      }

      const key = BARE_KEY.test(k) ? k : formatString(k);

      if (type === "array" && isArrayOfTables(obj[k])) {
        tables +=
          (tables && "\n") +
          stringifyArrayTable(
            obj[k],
            prefix ? `${prefix}.${key}` : key,
            depth - 1,
            numberAsFloat,
          );
      } else if (type === "object") {
        const tblKey = prefix ? `${prefix}.${key}` : key;
        tables +=
          (tables && "\n") +
          stringifyTable(tblKey, obj[k], tblKey, depth - 1, numberAsFloat);
      } else {
        preamble += key;
        preamble += " = ";
        preamble += stringifyValue(obj[k], type, depth, numberAsFloat);
        preamble += "\n";
      }
    }
  }

  if (tableKey && (preamble || !tables)) {
    preamble = preamble ? `[${tableKey}]\n${preamble}` : `[${tableKey}]`;
  }

  return preamble && tables ? `${preamble}\n${tables}` : preamble || tables;
}

function stringify(
  obj: unknown,
  {
    maxDepth = 1000,
    numbersAsFloat = false,
  }: { maxDepth?: number; numbersAsFloat?: boolean } = {},
): string {
  if (typeOf(obj) !== "object") {
    throw new TypeError("stringify can only be called with an object");
  }

  const str = stringifyTable(0, obj, "", maxDepth, numbersAsFloat);
  return str[str.length - 1] !== "\n" ? `${str}\n` : str;
}

export { stringify };
