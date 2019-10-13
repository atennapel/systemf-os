// @ts-ignore
import { kType } from './core/kinds';
// @ts-ignore
import { tforall, tfun, TVar, showType } from './core/types';
// @ts-ignore
import { Var, abs, absT, showTerm, appT, app } from './core/term';
import { typecheck } from './core/typecheck';

/**
 * TODO:
 * - type defs, con and decon
 */

const tv = TVar;
const v = Var;

const tbool = tforall([kType], tfun(tv(0), tv(0), tv(0)));
const id = absT([kType], abs([tv(0)], v(0)));
const vTrue = absT([kType], abs([tv(0), tv(0)], v(1)));

const term = app(appT(id, tbool), vTrue);
console.log(showTerm(term));
const ty = typecheck(term);
console.log(showType(ty));
