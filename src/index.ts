// @ts-ignore
import { kType } from './core/kinds';
// @ts-ignore
import { tforall, tfun, TVar, showType } from './core/types';
// @ts-ignore
import { Var, abs, absT, showTerm } from './core/term';
import { typecheck } from './core/typecheck';

/**
 * TODO:
 * - type defs, con and decon
 */

const tv = TVar;
const v = Var;

const term = absT([kType], abs([tv(0)], v(0)));
console.log(showTerm(term));
const ty = typecheck(term);
console.log(showType(ty));
