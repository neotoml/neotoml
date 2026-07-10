import { stringify as stringifier } from "./lib/stringifier";

function stringify(input: unknown): string {
  return stringifier(input);
}

export { stringify };
