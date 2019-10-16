import { EnvH } from './core/typecheck';
import { absT, abs, Var, showTerm } from './surface/terms';
import { kType } from './surface/kinds';
import { TVar, showType } from './surface/types';
import { typecheck } from './surface/typecheck';

/**
 * TODO:
 * - elaboration
 * - delaboration
 * - free names typing
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
  const ty = typecheck(hs, tm);
  console.log(showType(ty));
} catch (err) {
  console.log(err);
}
