import { stringify as stringifier } from "./dist/stringifier";

function stringify(input: unknown): string {
  return stringifier(input);
}

export { stringify };
