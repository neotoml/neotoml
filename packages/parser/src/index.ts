import { parse as parser, TomlDate, TomlError } from "./lib/parser";

function parse(input: string): unknown {
  return parser(input);
}

export { parse, TomlDate, TomlError };
