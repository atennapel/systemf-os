import { List, Nil, Cons, lookup, listFrom, append } from '../list';
import { Kind, kfun, kType, showKind, eqKind, kfunFrom } from './kinds';
import { Type, TName, TCon, tByte, TFun, showType, substTVar, getTFun, isTFun, eqType, TDef, TForall } from './types';
import { Name, Con, Term, showTerm } from './terms';
import { EnvH } from '../core/typecheck';

export const terr = (msg: string) => {
  throw new TypeError(msg);
};

export type EnvK = List<[TName, Kind]>;
export type EnvT = List<[Name, Type]>;

// kind checking
export const kindTCon = (t: TCon): Kind => {
  if (t === '->') return kfun(kType, kType, kType);
  if (t === 'Byte') return kType;
  return t;
};

export const checkType = (hs: EnvH, ks: EnvK, ty: Type, ki: Kind): void => {
  const ki2 = synthType(hs, ks, ty);
  if (!eqKind(ki2, ki))
    terr(`kindcheck failed in ${showType(ty)}: ${showKind(ki2)} ~ ${showKind(ki)}`);
};
export const synthType = (hs: EnvH, ks: EnvK, ty: Type): Kind => {
  if (ty.tag === 'TCon') return kindTCon(ty.name);
  if (ty.tag === 'THash') {
    const def = hs.types[ty.hash];
    if (!def) return terr(`undefined type hash: ${showType(ty)}`);
    return def.kind;
  }
  if (ty.tag === 'TVar') {
    const ki = lookup(ks, ty.name);
    if (!ki) return terr(`undefined tvar ${showType(ty)}`);
    return ki;
  }
  if (ty.tag === 'TForall') {
    checkType(hs, Cons([ty.name, ty.kind], ks), ty.body, kType);
    return kType;
  }
  if (ty.tag === 'TApp') {
    const ki = synthType(hs, ks, ty.left);
    return synthappType(hs, ks, ty, ki, ty.right);
  }
  return ty;
};
export const synthappType = (hs: EnvH, ks: EnvK, f: Type, ki: Kind, ty: Type): Kind => {
  if (ki.tag === 'KFun') {
    checkType(hs, ks, ty, ki.left);
    return ki.right;
  }
  return terr(`not a kind function in ${showType(f)}, got ${showKind(ki)}`);
};

export const kindcheck = (hs: EnvH, ty: Type, ks: EnvK = Nil): Kind =>
  synthType(hs, ks, ty);
export const kindcheckTDef = (hs: EnvH, t: TDef, ks: EnvK = Nil): Kind => {
  const nks = append(listFrom(t.tvars.slice().reverse()), ks);
  checkType(hs, nks, t.type, kType);
  return kfunFrom(t.tvars.map(([_, k]) => k).concat(kType));
};

// type checking
export const typeCon = (t: Con): Type => {
  if (t === 'zeroByte') return tByte;
  if (t === 'succByte') return TFun(tByte, tByte);
  return t;
};

export const check = (hs: EnvH, ts: EnvT, ks: EnvK, tm: Term, ty: Type): void => {
  const ty2 = synth(hs, ts, ks, tm);
  if (!eqType(ty2, ty))
    terr(`typecheck failed in ${showTerm(tm)}: ${showType(ty2)} ~ ${showType(ty)}`);
};
export const synth = (hs: EnvH, ts: EnvT, ks: EnvK, tm: Term): Type => {
  if (tm.tag === 'Con') return typeCon(tm.name);
  if (tm.tag === 'Hash') {
    const def = hs.terms[tm.hash];
    if (!def) return terr(`undefined hash: ${showTerm(tm)}`);
    return terr(`unimplemented hash`);
  }
  if (tm.tag === 'Var') {
    const ty = lookup(ts, tm.name);
    if (!ty) return terr(`undefined var ${showTerm(tm)}`);
    return ty;
  }
  if (tm.tag === 'Abs') {
    checkType(hs, ks, tm.type, kType);
    const ty = synth(hs, Cons([tm.name, tm.type], ts), ks, tm.body);
    return TFun(tm.type, ty);
  }
  if (tm.tag === 'AbsT') {
    const ty = synth(hs, ts, Cons([tm.name, tm.kind], ks), tm.body);
    return TForall(tm.name, tm.kind, ty);
  }
  if (tm.tag === 'App') {
    const ty = synth(hs, ts, ks, tm.left);
    return synthapp(hs, ts, ks, tm, ty, tm.right);
  }
  if (tm.tag === 'AppT') {
    const ty = synth(hs, ts, ks, tm.left);
    return synthappT(hs, ks, tm, ty, tm.right);
  }
  if (tm.tag === 'Pack') {
    const def = hs.types[tm.hash];
    if (!def) return terr(`undefined type hash: ${showTerm(tm)}`);
    return terr(`unimplemented: Pack`);
  }
  if (tm.tag === 'Unpack') {
    const def = hs.types[tm.hash];
    if (!def) return terr(`undefined type hash: ${showTerm(tm)}`);
    return terr(`unimplemented: Unpack`);
  }
  return tm;
};
export const synthapp = (hs: EnvH, ts: EnvT, ks: EnvK, f: Term, ty: Type, tm: Term): Type => {
  if (isTFun(ty)) {
    const [left, right] = getTFun(ty);
    check(hs, ts, ks, tm, left);
    return right;
  }
  return terr(`not a function in ${showTerm(f)}, got ${showType(ty)}`);
};
export const synthappT = (hs: EnvH, ks: EnvK, f: Term, ty: Type, ty2: Type): Type => {
  if (ty.tag === 'TForall') {
    checkType(hs, ks, ty2, ty.kind);
    return substTVar(ty.name, ty2, ty.body);
  }
  return terr(`not a forall in ${showTerm(f)}, got ${showType(ty)}`);
};

export const typecheck = (hs: EnvH, tm: Term, ts: EnvT = Nil, ks: EnvK = Nil): Type =>
  synth(hs, ts, ks, tm);
