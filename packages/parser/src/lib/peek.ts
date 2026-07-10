import type { TomlTable } from "./extract-value";

type MetaState = { t: Type; d: boolean; i: number; c: MetaRecord };
type MetaRecord = { [k: string]: MetaState };
type PeekResult = [string, TomlTable, MetaRecord] | null;

type Type = 0 | 1 | 2 | 3;

function peekTable(
  key: string[],
  table: TomlTable,
  meta: MetaRecord,
  type: Type,
): PeekResult {
  let t: any = table;
  let m = meta;
  let k: string;
  let hasOwn = false;
  let state: MetaState;

  for (let i = 0; i < key.length; i++) {
    if (i) {
      t = hasOwn ? t[k!] : (t[k!] = {});
      m = (state = m[k!]!).c;

      if (type === 0 && (state.t === 1 || state.t === 2)) {
        return null;
      }

      if (state.t === 2) {
        const l = t.length - 1;
        t = t[l];
        m = m[l]!.c;
      }
    }

    k = key[i]!;
    if ((hasOwn = Object.hasOwn(t, k)) && m[k]?.t === 0 && m[k]?.d) {
      return null;
    }

    if (!hasOwn) {
      if (k === "__proto__") {
        Object.defineProperty(t, k, {
          enumerable: true,
          configurable: true,
          writable: true,
        });
        Object.defineProperty(m, k, {
          enumerable: true,
          configurable: true,
          writable: true,
        });
      }

      m[k] = {
        t: i < key.length - 1 && type === 2 ? 3 : type,
        d: false,
        i: 0,
        c: {},
      };
    }
  }

  state = m[k!]!;
  if (state.t !== type && !(type === 1 && state.t === 3)) {
    // Bad key type!
    return null;
  }

  if (type === 2) {
    if (!state.d) {
      state.d = true;
      t[k!] = [];
    }

    t[k!].push((t = {}));
    state.c[state.i++] = state = { t: 1, d: false, i: 0, c: {} };
  }

  if (state.d) {
    // Redefining a table!
    return null;
  }

  state.d = true;
  if (type === 1) {
    t = hasOwn ? t[k!] : (t[k!] = {});
  } else if (type === 0 && hasOwn) {
    return null;
  }

  return [k!, t, state.c];
}

export { peekTable };
