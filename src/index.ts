import { tforall, tfun, TVar, showType } from './core/types';
import { kType } from './core/kinds';

const tv = TVar;

const type = tforall([kType], tfun(tv(0), tv(0)));
console.log(showType(type));
