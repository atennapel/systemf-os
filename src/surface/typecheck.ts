import { List, Nil, Cons, listFrom, append, lookupWithIndex } from '../list';
import { Kind, kfun, kType, showKind, eqKind, kfunFrom } from './kinds';
import { Type, TName, TCon, tByte, TFun, showType, substTVar, getTFun, isTFun, eqType, TDef, TForall } from './types';
import { Name, Con, Term, showTerm } from './terms';
import { EnvH } from '../core/typecheck';

import * as T from '../core/types';
import * as E from '../core/terms';

export const terr = (msg: string) => {
  throw new TypeError(msg);
};

export type EnvK = List<[TName, Kind]>;
export type EnvT = List<[Name, Type]>;

// kind checking
export const kindTCon = (t: TCon): [Kind, T.Type] => {
  if (t === '->') return [kfun(kType, kType, kType), T.tFun];
  if (t === 'Byte') return [kType, T.tByte];
  return t;
};

export const checkType = (hs: EnvH, ks: EnvK, ty: Type, ki: Kind): T.Type => {
  const [ki2, ty2] = synthType(hs, ks, ty);
  if (!eqKind(ki2, ki))
    terr(`kindcheck failed in ${showType(ty)}: ${showKind(ki2)} ~ ${showKind(ki)}`);
  return ty2;
};
export const synthType = (hs: EnvH, ks: EnvK, ty: Type): [Kind, T.Type] => {
  if (ty.tag === 'TCon') return kindTCon(ty.name);
  if (ty.tag === 'THash') {
    const def = hs.types[ty.hash];
    if (!def) return terr(`undefined type hash: ${showType(ty)}`);
    return [def.kind, T.THash(ty.hash)];
  }
  if (ty.tag === 'TVar') {
    const res = lookupWithIndex(ks, ty.name);
    if (!res) return terr(`undefined tvar ${showType(ty)}`);
    const [i, ki] = res;
    return [ki, T.TVar(i)];
  }
  if (ty.tag === 'TForall') {
    const body = checkType(hs, Cons([ty.name, ty.kind], ks), ty.body, kType);
    return [kType, T.TForall(ty.kind, body)];
  }
  if (ty.tag === 'TApp') {
    const [ki, left] = synthType(hs, ks, ty.left);
    const [kr, right] = synthappType(hs, ks, ty, ki, ty.right);
    return [kr, T.TApp(left, right)];
  }
  return ty;
};
export const synthappType = (hs: EnvH, ks: EnvK, f: Type, ki: Kind, ty: Type): [Kind, T.Type] => {
  if (ki.tag === 'KFun') {
    const ty2 = checkType(hs, ks, ty, ki.left);
    return [ki.right, ty2];
  }
  return terr(`not a kind function in ${showType(f)}, got ${showKind(ki)}`);
};

export const kindcheck = (hs: EnvH, ty: Type, ks: EnvK = Nil): [Kind, T.Type] =>
  synthType(hs, ks, ty);
export const kindcheckTDef = (hs: EnvH, t: TDef, ks: EnvK = Nil): [Kind, T.TDef] => {
  const nks = append(listFrom(t.tvars.slice().reverse()), ks);
  const type = checkType(hs, nks, t.type, kType);
  return [
    kfunFrom(t.tvars.map(([_, k]) => k).concat(kType)),
    T.TDef(t.tvars.map(([_, k]) => k), type),
  ];
};

// type checking
export const typeCon = (t: Con): [Type, E.Term] => {
  if (t === 'zeroByte') return [tByte, E.cZeroByte];
  if (t === 'succByte') return [TFun(tByte, tByte), E.cSuccByte];
  return t;
};

export const check = (hs: EnvH, ts: EnvT, ks: EnvK, tm: Term, ty: Type): E.Term => {
  if (tm.tag === 'Abs' && !tm.type && isTFun(ty)) {
    const [left, right] = getTFun(ty);
    const ety = checkType(hs, ks, left, kType);
    const body = check(hs, Cons([tm.name, left], ts), ks, tm.body, right);
    return E.Abs(ety, body);
  }
  const [ty2, etm] = synth(hs, ts, ks, tm);
  if (!eqType(ty2, ty))
    terr(`typecheck failed in ${showTerm(tm)}: ${showType(ty2)} ~ ${showType(ty)}`);
  return etm;
};
export const synth = (hs: EnvH, ts: EnvT, ks: EnvK, tm: Term): [Type, E.Term] => {
  if (tm.tag === 'Con') return typeCon(tm.name);
  if (tm.tag === 'Hash') {
    const def = hs.terms[tm.hash];
    if (!def) return terr(`undefined hash: ${showTerm(tm)}`);
    return terr(`unimplemented hash`);
  }
  if (tm.tag === 'Var') {
    const res = lookupWithIndex(ts, tm.name);
    if (!res) return terr(`undefined var ${showTerm(tm)}`);
    const [i, ty] = res;
    return [ty, E.Var(i)];
  }
  if (tm.tag === 'Abs' && tm.type) {
    const ety = checkType(hs, ks, tm.type, kType);
    const [ty, body] = synth(hs, Cons([tm.name, tm.type], ts), ks, tm.body);
    return [TFun(tm.type, ty), E.Abs(ety, body)];
  }
  if (tm.tag === 'AbsT') {
    const [ty, body] = synth(hs, ts, Cons([tm.name, tm.kind], ks), tm.body);
    return [TForall(tm.name, tm.kind, ty), E.AbsT(tm.kind, body)];
  }
  if (tm.tag === 'App') {
    const [ty, left] = synth(hs, ts, ks, tm.left);
    const [rty, right] = synthapp(hs, ts, ks, tm, ty, tm.right);
    return [rty, E.App(left, right)];
  }
  if (tm.tag === 'AppT') {
    const [ty, left] = synth(hs, ts, ks, tm.left);
    const [rty, right] = synthappT(hs, ks, tm, ty, tm.right);
    return [rty, E.AppT(left, right)];
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
  if (tm.tag === 'Ann') {
    checkType(hs, ks, tm.type, kType);
    const etm = check(hs, ts, ks, tm.term, tm.type);
    return [tm.type, etm];
  }
  return terr(`cannot synth ${showTerm(tm)}`);
};
export const synthapp = (hs: EnvH, ts: EnvT, ks: EnvK, f: Term, ty: Type, tm: Term): [Type, E.Term] => {
  if (isTFun(ty)) {
    const [left, right] = getTFun(ty);
    const eright = check(hs, ts, ks, tm, left);
    return [right, eright];
  }
  return terr(`not a function in ${showTerm(f)}, got ${showType(ty)}`);
};
export const synthappT = (hs: EnvH, ks: EnvK, f: Term, ty: Type, ty2: Type): [Type, T.Type] => {
  if (ty.tag === 'TForall') {
    const ety = checkType(hs, ks, ty2, ty.kind);
    return [substTVar(ty.name, ty2, ty.body), ety];
  }
  return terr(`not a forall in ${showTerm(f)}, got ${showType(ty)}`);
};

export const typecheck = (hs: EnvH, tm: Term, ts: EnvT = Nil, ks: EnvK = Nil): [Type, E.Term] =>
  synth(hs, ts, ks, tm);
