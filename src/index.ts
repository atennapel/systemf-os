// @ts-ignore
import { kType, showKind, kfun } from './core/kinds';
// @ts-ignore
import { tforall, tfun, TVar, showType, TDef, showTDef, THash } from './core/types';
// @ts-ignore
import { Var, abs, absT, showTerm, appT, app, Hash, Pack } from './core/terms';
import { FileRepo, addDef, getDef, addTDef, getTDef } from './repo';
import { EnvH } from './core/typecheck';

/**
 * TODO:
 * - evaluation
 * - recursive definitions retrieval
 * - name repos
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

const repo = new FileRepo('test');
repo.init();

const tm = absT([kType], abs([tv(0)], v(0)));
const tdef = TDef([], tforall([kType], tfun(tv(0), tv(0), tv(0))));

(async () => {
  try {
    const [tres, ki, thsh] = await addTDef(hs, repo, tdef);
    console.log(`added (${tres}) ${showTDef(tdef)} : ${showKind(ki)} @ ${thsh}`);
    const [tdef2, ki2] = await getTDef(hs, repo, thsh);
    console.log(`retrieved ${showTDef(tdef2)} : ${showKind(ki2)}`);

    const [res, ty, hsh] = await addDef(hs, repo, tm);
    console.log(`added (${res}) ${showTerm(tm)} : ${showType(ty)} @ ${hsh}`);
    const [tm2, ty2] = await getDef(hs, repo, hsh);
    console.log(`retrieved ${showTerm(tm2)} : ${showType(ty2)}`);
  } catch (err) {
    console.log(err);
  }
})();
