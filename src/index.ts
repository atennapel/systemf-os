// @ts-ignore
import { kType, showKind, kfun } from './core/kinds';
// @ts-ignore
import { tforall, tfun, TVar, showType, TDef, showTDef, THash, tByte } from './core/types';
// @ts-ignore
import { Var, abs, absT, showTerm, appT, app, Hash, Pack, cZeroByte, cSuccByte, Unpack } from './core/terms';
// @ts-ignore
import { FileRepo, checkDef, addDef, addTDef } from './repo';
// @ts-ignore
import { EnvH } from './core/typecheck';
// @ts-ignore
import { evaluate, showETerm } from './core/machine';

/**
 * TODO:
 * - name repos
 * - surface language
 * - recursive types
 */
// @ts-ignore
const tv = TVar;
// @ts-ignore
const v = Var;

const hs: EnvH = {
  types: {
  },
  terms: {
  },
};

const repo = new FileRepo('test');
repo.init();

const Nat = '8afb958abffc1e72c37409e4218bb4519f3fd4adb1b92ed2bfd18670e8c696c3';
const zero = Hash('e740a1060f8aadd5f48fb185b87200ea2be272f9d04a7d2709d2458153680d78');
const succ = Hash('bc71d5d6a769f59c606bc4365189a2345e5dba98837f4a214eaad6b7c3717d5b');

(async () => {
  try {
    const tm = app(appT(app(Unpack(Nat), app(succ, app(succ, app(succ, zero)))), tByte), cZeroByte, cSuccByte);
    console.log(showTerm(tm));
    const [ty, hsh] = await checkDef(hs, repo, tm);
    console.log(showType(ty));
    console.log(hsh);
    const res = evaluate(hs, tm);
    console.log(res);
  } catch (err) {
    console.log(err);
  }
})();
