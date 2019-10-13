// @ts-ignore
import { kType, showKind, kfun } from './core/kinds';
// @ts-ignore
import { tforall, tfun, TVar, showType, TDef, showTDef, THash } from './core/types';
// @ts-ignore
import { Var, abs, absT, showTerm, appT, app, Hash, Pack } from './core/terms';
import { typecheck, EnvH } from './core/typecheck';

/**
 * TODO:
 * - recursive types
 * - hashing
 */

const tv = TVar;
const v = Var;

const hs: EnvH = {
  types: {
    Bool: {
      kind: kType,
      def: TDef([], tforall([kType], tfun(tv(0), tv(0), tv(0)))),
    },
    List: {
      kind: kfun(kType, kType),
      def: TDef([kType], tforall([kType], tfun(tv(0), tfun(tv(1), tv(0), tv(0)), tv(0)))),
    },
  },
  terms: {
    id: {
      type: tforall([kType], tfun(tv(0), tv(0))),
      def: absT([kType], abs([tv(0)], v(0))),
    },
    True: {
      type: THash('Bool'),
      def: app(Pack('Bool'), absT([kType], abs([tv(0), tv(0)], v(1)))),
    },
    False: {
      type: THash('Bool'),
      def: app(Pack('Bool'), absT([kType], abs([tv(0), tv(0)], v(0)))),
    }
  },
};

const term = app(Pack('Bool'), absT([kType], abs([tv(0), tv(0)], v(0))));
console.log(showTerm(term));
const ty = typecheck(hs, term);
console.log(showType(ty));
