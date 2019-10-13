import { Type, TCon, eqType, showType, isTFun, getTFun, substIn, TForall, TFun } from './types';
import { Term, Con, showTerm } from './term';
import { kfun, kType, Kind, showKind, eqKind } from './kinds';
import { List, Nil, index, Cons } from '../list';

export const terr = (msg: string) => {
  throw new TypeError(msg);
};

export type EnvK = List<Kind>;
export type EnvT = List<Type>;

// kind checking
export const kindTCon = (t: TCon): Kind => {
  if (t === '->') return kfun(kType, kType, kType);
  return t;
};

export const checkType = (ks: EnvK, ty: Type, ki: Kind): void => {
  const ki2 = synthType(ks, ty);
  if (!eqKind(ki2, ki))
    terr(`kindcheck failed in ${showType(ty)}: ${showKind(ki2)} ~ ${showKind(ki)}`);
};
export const synthType = (ks: EnvK, ty: Type): Kind => {
  if (ty.tag === 'TCon') return kindTCon(ty.name);
  if (ty.tag === 'TVar') {
    const ki = index(ks, ty.index);
    if (!ki) return terr(`undefined tvar ${showType(ty)}`);
    return ki;
  }
  if (ty.tag === 'TForall') {
    checkType(Cons(ty.kind, ks), ty.body, kType);
    return kType;
  }
  if (ty.tag === 'TApp') {
    const ki = synthType(ks, ty.left);
    return synthappType(ks, ty, ki, ty.right);
  }
  return ty;
};
export const synthappType = (ks: EnvK, f: Type, ki: Kind, ty: Type): Kind => {
  if (ki.tag === 'KFun') {
    checkType(ks, ty, ki.left);
    return ki.right;
  }
  return terr(`not a kind function in ${showType(f)}, got ${showKind(ki)}`);
};

export const kindcheck = (ty: Type, ks: EnvK = Nil): Kind =>
  synthType(ks, ty);

// type checking
export const typeCon = (t: Con): Type => {
  return t;
};

export const check = (ts: EnvT, ks: EnvK, tm: Term, ty: Type): void => {
  const ty2 = synth(ts, ks, tm);
  if (!eqType(ty2, ty))
    terr(`typecheck failed in ${showTerm(tm)}: ${showType(ty2)} ~ ${showType(ty)}`);
};
export const synth = (ts: EnvT, ks: EnvK, tm: Term): Type => {
  if (tm.tag === 'Con') return typeCon(tm.name);
  if (tm.tag === 'Var') {
    const ty = index(ts, tm.index);
    if (!ty) return terr(`undefined var ${showTerm(tm)}`);
    return ty;
  }
  if (tm.tag === 'Abs') {
    checkType(ks, tm.type, kType);
    const ty = synth(Cons(tm.type, ts), ks, tm.body);
    return TFun(tm.type, ty);
  }
  if (tm.tag === 'AbsT') {
    const ty = synth(ts, Cons(tm.kind, ks), tm.body);
    return TForall(tm.kind, ty);
  }
  if (tm.tag === 'App') {
    const ty = synth(ts, ks, tm.left);
    return synthapp(ts, ks, tm, ty, tm.right);
  }
  if (tm.tag === 'AppT') {
    const ty = synth(ts, ks, tm.left);
    return synthappT(ts, ks, tm, ty, tm.right);
  }
  return tm;
};
export const synthapp = (ts: EnvT, ks: EnvK, f: Term, ty: Type, tm: Term): Type => {
  if (isTFun(ty)) {
    const [left, right] = getTFun(ty);
    check(ts, ks, tm, left);
    return right;
  }
  return terr(`not a function in ${showTerm(f)}, got ${showType(ty)}`);
};
export const synthappT = (ts: EnvT, ks: EnvK, f: Term, ty: Type, ty2: Type): Type => {
  if (ty.tag === 'TForall') {
    checkType(ks, ty2, ty.kind);
    return substIn(ty.body, ty2);
  }
  return terr(`not a forall in ${showTerm(f)}, got ${showType(ty)}`);
};

export const typecheck = (tm: Term, ts: EnvT = Nil, ks: EnvK = Nil): Type =>
  synth(ts, ks, tm);
