import { describe, test, expect } from "bun:test";

import { parse } from "../src/index";
import { normalizeParsed } from "./shared";

const fixtures = {
  "valid/comment/tricky": `[section]#attached comment
#[notsection]
one = "11"#cmt
two = "22#"
three = '#'

four = """# no comment
# nor this
#also not comment"""#is_comment

five = 5.5#66
six = 6#7
8 = "eight"
#nine = 99
ten = 10e2#1
eleven = 1.11e1#23

["hash#tag"]
"#!" = "hash bang"
arr3 = [ "#", '#', """###""" ]
arr4 = [ 1,# 9, 9,
2#,9
,#9
3#]
,4]
arr5 = [[[[#["#"],
["#"]]]]#]
]
tbl1 = { "#" = '}#'}#}}


`,
  "valid/float/exponent-upper": `# Both upper- and lower-case "e" is valid, so repeat the exponent.toml test with
# upper-case.
exp        = 3E2
pos-exp    = 3E+2
neg-exp    = 3E-2
zero-exp   = 3E0
frac       = 3.1E2
neg        = -1E-1
zero       = 0E2
zero-plus = +0E2
`,
  "valid/float/exponent": `# Please keep exponent-upper.toml in sync with this.

exp       = 3e2
pos-exp   = 3e+2
neg-exp   = 3e-2
zero-exp  = 3e0
frac      = 3.1e2
neg       = -1e-1
zero      = 0e2
zero-plus = +0e2
`,
  "valid/float/underscore": `before = 3_141.5927
after = 3141.592_7
exponent = 3e1_4
`,
  "valid/float/max-int": `# Maximum and minimum safe natural numbers.
max_float =  9_007_199_254_740_991.0
min_float = -9_007_199_254_740_991.0
`,
  "valid/float/zero": `zero = 0.0
signed-pos = +0.0
signed-neg = -0.0
exponent = 0e0
exponent-two-0 = 0e00
exponent-signed-pos = +0e0
exponent-signed-neg = -0e0
`,
  "valid/spec-1.1.0/common-23": `# fractional
flt1 = +1.0
flt2 = 3.1415
flt3 = -0.01

# exponent
flt4 = 5e+22
flt5 = 1e06
flt6 = -2E-2

# both
flt7 = 6.626e-34
`,
};

describe("special", () => {
  for (const [name, tomlContent] of Object.entries(fixtures))
    test(name, () => {
      const parsed = parse(tomlContent);
      expect(parsed).toMatchSnapshot("parsed");
      const result = normalizeParsed(parsed);
      expect(result).toMatchSnapshot("normalized");
    });
});
