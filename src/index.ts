import { EnvH } from './core/typecheck';
import { absT, abs, Var, showTerm } from './surface/terms';
import { kType } from './surface/kinds';
import { TVar, showType } from './surface/types';
import { typecheck } from './surface/typecheck';
import * as E from './core/terms';
import * as T from './core/types';
import * as TC from './core/typecheck';

/**
 * TODO:
 * - surface typecheck hash, pack, unpack
 * - free names typing
 * - delaboration
 * - type inference
 * - recursive types
 */

const tv = TVar;
const v = Var;

const hs: EnvH = {
  types: {
  },
  terms: {
  },
};

try {
  const tm = absT([['t', kType]], abs([['x', tv('t')]], v('x')));
  console.log(showTerm(tm));
  const [ty, etm] = typecheck(hs, tm);
  console.log(showType(ty));
  console.log(E.showTerm(etm));
  const ety = TC.typecheck(hs, etm);
  console.log(T.showType(ety));
} catch (err) {
  console.log(err);
}
