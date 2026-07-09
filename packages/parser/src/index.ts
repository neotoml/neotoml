import {
  parse as parser,
  TomlDate as _TomlDate,
  TomlError as _TomlError,
} from "./dist/parser";

function parse(input: string): unknown {
  return parser(input);
}

const TomlError: unknown = _TomlError;
const TomlDate: unknown = _TomlDate;

export { parse, TomlDate, TomlError };
