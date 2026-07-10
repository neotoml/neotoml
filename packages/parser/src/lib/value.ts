import { TomlDate } from "./date";
import { TomlError } from "./error";

const INT_REGEX =
  /^((0x[0-9a-fA-F](_?[0-9a-fA-F])*)|(([+-]|0[ob])?\d(_?\d)*))$/;
const FLOAT_REGEX = /^[+-]?\d(_?\d)*(\.\d(_?\d)*)?([eE][+-]?\d(_?\d)*)?$/;
const LEADING_ZERO = /^[+-]?0[0-9_]/;

type IntegersAsBigInt = undefined | boolean | "asNeeded";

function parseValue(
  value: string,
  toml: string,
  ptr: number,
  integersAsBigInt: IntegersAsBigInt,
): boolean | number | bigint | TomlDate {
  // Constant values
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "-inf") return -Infinity;
  if (value === "inf" || value === "+inf") return Infinity;
  if (value === "nan" || value === "+nan" || value === "-nan") return NaN;

  // Avoid FP representation of -0
  if (value === "-0") return integersAsBigInt ? 0n : 0;

  // Numbers
  let isInt = INT_REGEX.test(value);
  if (isInt || FLOAT_REGEX.test(value)) {
    if (LEADING_ZERO.test(value)) {
      throw new TomlError("leading zeroes are not allowed", {
        toml: toml,
        ptr: ptr,
      });
    }

    value = value.replace(/_/g, "");
    let numeric: number | bigint = +value;

    if (isNaN(numeric)) {
      throw new TomlError("invalid number", {
        toml: toml,
        ptr: ptr,
      });
    }

    if (isInt) {
      if ((isInt = !Number.isSafeInteger(numeric)) && !integersAsBigInt) {
        throw new TomlError("integer value cannot be represented losslessly", {
          toml: toml,
          ptr: ptr,
        });
      }

      if (isInt || integersAsBigInt === true) numeric = BigInt(value);
    }

    return numeric;
  }

  const date = new TomlDate(value);
  if (!date.isValid()) {
    throw new TomlError("invalid value", {
      toml: toml,
      ptr: ptr,
    });
  }

  return date;
}

export { parseValue };

export type { IntegersAsBigInt };
