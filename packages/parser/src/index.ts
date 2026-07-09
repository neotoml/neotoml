import { parse as parser } from "./dist/parser";

function parse(input: string): unknown {
  return parser(input);
}

export { parse };
