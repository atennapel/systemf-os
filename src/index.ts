// @ts-ignore
import { kType, showKind } from './core/kinds';
// @ts-ignore
import { tforall, tfun, TVar, showType, TDef, showTDef } from './core/types';
// @ts-ignore
import { Var, abs, absT, showTerm, appT, app } from './core/term';
import { typecheck, kindcheckTDef } from './core/typecheck';

/**
 * TODO:
 * - hashes
 * - con and decon
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

const tdef = TDef([kType], tforall([kType], tfun(tv(0), tfun(tv(1), tv(0), tv(0)), tv(0))));
console.log(showTDef(tdef));
const ki = kindcheckTDef(tdef);
console.log(showKind(ki));
