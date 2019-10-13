import { tforall, tfun, TVar, showType } from './core/types';
import { kType } from './core/kinds';

/**
 * TODO:
 * - terms
 * - typechecking
 * - pretty terms
 * - type defs, con and decon
 */

const tv = TVar;

const type = tforall([kType], tfun(tv(0), tv(0)));
console.log(showType(type));
