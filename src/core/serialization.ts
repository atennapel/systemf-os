import { Kind, showKind, kType, KFun } from './kinds';
import { err } from '../util';
import { HASH_SIZE } from './hashing';
import { Type, TDef, showTDef, tFun, TApp, THash, TForall, TVar, showType } from './types';
import { Term, showTerm, Var, Hash, Abs, App, AbsT, AppT, Pack, Unpack } from './terms';

export enum KIND_BYTES {
  KCon = 0,
  KFun,
}
export enum KCON_BYTES {
  KType = 0,
}
const serializeKindR = (term: Kind, arr: number[]): void => {
  if (term.tag === 'KCon') {
    arr.push(KIND_BYTES.KCon);
    if (term.name === '*') arr.push(KCON_BYTES.KType);
    else return err(`invalid kind con: ${term.name}`);
    return;
  }
  if (term.tag === 'KFun') {
    arr.push(KIND_BYTES.KFun);
    serializeKindR(term.left, arr);
    serializeKindR(term.right, arr);
    return;
  }
  return term;
};
export const serializeKind = (term: Kind): Buffer => {
  const arr: number[] = [];
  serializeKindR(term, arr);
  return Buffer.from(arr);
};

export enum TYPE_BYTES {
  TCon = 0,
  THash,
  TApp,
  TForall,
}
export enum TCON_BYTES {
  TFun = 0,
}
export const TVAR_BYTE = 4;
export const MAX_TVAR_BYTE = Math.pow(2, 8) - TVAR_BYTE - 1;
const serializeTypeR = (term: Type, arr: number[]): void => {
  if (term.tag === 'TVar') {
    if (term.index > MAX_TVAR_BYTE)
      return err(`cannot serialize tvar ${term.index}, too big (${MAX_TVAR_BYTE})`);
    arr.push(term.index + TVAR_BYTE);
    return;
  }
  if (term.tag === 'TCon') {
    arr.push(TYPE_BYTES.TCon);
    if (term.name === '->') arr.push(TCON_BYTES.TFun);
    else return err(`invalid tcon name: ${term.name}`);
    return;
  }
  if (term.tag === 'THash') {
    if (term.hash.length !== HASH_SIZE * 2)
      return err(`invalid hash: ${term.hash}`);
    arr.push(TYPE_BYTES.THash);
    for (let i = 0, l = HASH_SIZE * 2; i < l; i += 2) {
      const hex = parseInt(`${term.hash[i]}${term.hash[i + 1]}`, 16);
      if (isNaN(hex) || hex < 0 || hex > 255)
        return err(`invalid type hash: ${term.hash}`);
      arr.push(hex);
    }
    return;
  }
  if (term.tag === 'TApp') {
    arr.push(TYPE_BYTES.TApp);
    serializeTypeR(term.left, arr);
    serializeTypeR(term.right, arr);
    return;
  }
  if (term.tag === 'TForall') {
    arr.push(TYPE_BYTES.TForall);
    serializeKindR(term.kind, arr);
    serializeTypeR(term.body, arr);
    return;
  }
  return term;
};
export const serializeType = (term: Type): Buffer => {
  const arr: number[] = [];
  serializeTypeR(term, arr);
  return Buffer.from(arr);
};
export const serializeTDef = (def: TDef): Buffer => {
  const arr: number[] = [];
  const l = def.kinds.length;
  if (l > 255)
    return err(`TDef has too many arguments: ${showTDef(def)}`);
  arr.push(l);
  for (let i = 0; i < l; i++) serializeKindR(def.kinds[i], arr);
  serializeTypeR(def.type, arr);
  return Buffer.from(arr);
};

export enum TERM_BYTES {
  Con,
  Hash,
  Abs,
  App,
  AbsT,
  AppT,
  Pack,
  Unpack,
}
export enum CONST_BYTES {}
export const VAR_BYTE = 8;
export const MAX_VAR_BYTE = Math.pow(2, 8) - VAR_BYTE - 1;
const serializeTermR = (term: Term, arr: number[]): void => {
  if (term.tag === 'Var') {
    if (term.index > MAX_VAR_BYTE)
      return err(`cannot serialize var ${term.index}, too big (${MAX_VAR_BYTE})`);
    arr.push(term.index + VAR_BYTE);
    return;
  }
  if (term.tag === 'Hash') {
    if (term.hash.length !== HASH_SIZE * 2)
      return err(`invalid hash: ${term.hash}`);
    arr.push(TERM_BYTES.Hash);
    for (let i = 0, l = HASH_SIZE * 2; i < l; i += 2) {
      const hex = parseInt(`${term.hash[i]}${term.hash[i + 1]}`, 16);
      if (isNaN(hex) || hex < 0 || hex > 255)
        return err(`invalid type hash: ${term.hash}`);
      arr.push(hex);
    }
    return;
  }
  if (term.tag === 'Abs') {
    arr.push(TERM_BYTES.Abs);
    serializeTypeR(term.type, arr);
    serializeTermR(term.body, arr);
    return;
  }
  if (term.tag === 'App') {
    arr.push(TERM_BYTES.App);
    serializeTermR(term.left, arr);
    serializeTermR(term.right, arr);
    return;
  }
  if (term.tag === 'AbsT') {
    arr.push(TERM_BYTES.AbsT);
    serializeKindR(term.kind, arr);
    serializeTermR(term.body, arr);
    return;
  }
  if (term.tag === 'AppT') {
    arr.push(TERM_BYTES.AppT);
    serializeTermR(term.left, arr);
    serializeTypeR(term.right, arr);
    return;
  }
  if (term.tag === 'Pack') {
    if (term.hash.length !== HASH_SIZE * 2)
      return err(`invalid type hash: ${term.hash}`);
    arr.push(TERM_BYTES.Pack);
    for (let i = 0, l = HASH_SIZE * 2; i < l; i += 2) {
      const hex = parseInt(`${term.hash[i]}${term.hash[i + 1]}`, 16);
      if (isNaN(hex) || hex < 0 || hex > 255)
        return err(`invalid type hash: ${term.hash}`);
      arr.push(hex);
    }
    return;
  }
  if (term.tag === 'Unpack') {
    if (term.hash.length !== HASH_SIZE * 2)
      return err(`invalid type hash: ${term.hash}`);
    arr.push(TERM_BYTES.Unpack);
    for (let i = 0, l = HASH_SIZE * 2; i < l; i += 2) {
      const hex = parseInt(`${term.hash[i]}${term.hash[i + 1]}`, 16);
      if (isNaN(hex) || hex < 0 || hex > 255)
        return err(`invalid type hash: ${term.hash}`);
      arr.push(hex);
    }
    return;
  }
  if (term.tag === 'Con') {
    arr.push(TERM_BYTES.Con);
    return err(`invalid const name: ${term.name}`);
  }
  return term;
};
export const serializeTerm = (term: Term): Buffer => {
  const arr: number[] = [];
  serializeTermR(term, arr);
  return Buffer.from(arr);
};

const deserializeKindR = (arr: Buffer, i: number): [number, Kind] => {
  const c = arr[i];
  if (c === KIND_BYTES.KCon) {
    const x = arr[i+1];
    if (x === KCON_BYTES.KType) return [i + 2, kType];
    return err(`invalid kind const byte: ${x}`);
  }
  if (c === KIND_BYTES.KFun) {
    const [j, l] = deserializeKindR(arr, i + 1);
    if (j >= arr.length) return err(`no right side for kind function`);
    const [k, r] = deserializeKindR(arr, j);
    return [k, KFun(l, r)];
  }
  return err(`invalid byte in kind bytes: ${c}`);
};
export const deserializeKind = (arr: Buffer): Kind => {
  const [i, term] = deserializeKindR(arr, 0);
  if (i < arr.length)
    return err(`deserialization failure (too many bytes): ${showKind(term)}`);
  return term;
};

const deserializeTypeR = (arr: Buffer, i: number): [number, Type] => {
  const c = arr[i];
  if (c === TYPE_BYTES.TCon) {
    const x = arr[i+1];
    if (x === TCON_BYTES.TFun) return [i + 2, tFun];
    return err(`invalid tconst byte: ${x}`);
  }
  if (c === TYPE_BYTES.TApp) {
    const [j, l] = deserializeTypeR(arr, i + 1);
    if (j >= arr.length) return err(`no right side for type application`);
    const [k, r] = deserializeTypeR(arr, j);
    return [k, TApp(l, r)];
  }
  if (c === TYPE_BYTES.THash) {
    if (i + HASH_SIZE >= arr.length)
      return err(`not enough bytes for hash`);
    const hash = Array(HASH_SIZE);
    for (let j = 0; j < HASH_SIZE; j++)
      hash[j] = `00${arr[i + j + 1].toString(16)}`.slice(-2);
    return [i + HASH_SIZE + 1, THash(hash.join(''))];
  }
  if (c === TYPE_BYTES.TForall) {
    const [j, l] = deserializeKindR(arr, i + 1);
    if (j >= arr.length) return err(`no right side for type application`);
    const [k, r] = deserializeTypeR(arr, j);
    return [k, TForall(l, r)];
  }
  return [i + 1, TVar(c - TVAR_BYTE)];
};
export const deserializeType = (arr: Buffer): Type => {
  const [i, term] = deserializeTypeR(arr, 0);
  if (i < arr.length)
    return err(`deserialization failure (too many bytes): ${showType(term)}`);
  return term;
};
export const deserializeTDef = (arr: Buffer): TDef => {
  const l = arr[0];
  const ks: Kind[] = Array(l);
  let i = 1;
  for (let j = 0; j < l; j++) {
    const [ni, k] = deserializeKindR(arr, i);
    ks[j] = k;
    i = ni;
  }
  const [ni, type] = deserializeTypeR(arr, i);
  const tdef = TDef(ks, type);
  if (ni < arr.length)
    return err(`deserialization failure (too many bytes): ${showTDef(tdef)}`);
  return tdef;
};

const deserializeTermR = (arr: Buffer, i: number): [number, Term] => {
  const c = arr[i];
  if (c === TERM_BYTES.Hash) {
    if (i + HASH_SIZE >= arr.length)
      return err(`not enough bytes for hash`);
    const hash = Array(HASH_SIZE);
    for (let j = 0; j < HASH_SIZE; j++)
      hash[j] = `00${arr[i + j + 1].toString(16)}`.slice(-2);
    return [i + HASH_SIZE + 1, Hash(hash.join(''))];
  }
  if (c === TERM_BYTES.Abs) {
    const [j, l] = deserializeTypeR(arr, i + 1);
    if (j >= arr.length) return err(`no body for abstraction`);
    const [k, r] = deserializeTermR(arr, j);
    return [k, Abs(l, r)];
  }
  if (c === TERM_BYTES.App) {
    const [j, l] = deserializeTermR(arr, i + 1);
    if (j >= arr.length) return err(`no right side for application`);
    const [k, r] = deserializeTermR(arr, j);
    return [k, App(l, r)];
  }
  if (c === TERM_BYTES.AbsT) {
    const [j, l] = deserializeKindR(arr, i + 1);
    if (j >= arr.length) return err(`no body for type abstraction`);
    const [k, r] = deserializeTermR(arr, j);
    return [k, AbsT(l, r)];
  }
  if (c === TERM_BYTES.AppT) {
    const [j, l] = deserializeTermR(arr, i + 1);
    if (j >= arr.length) return err(`no right side for type application`);
    const [k, r] = deserializeTypeR(arr, j);
    return [k, AppT(l, r)];
  }
  if (c === TERM_BYTES.Pack) {
    if (i + HASH_SIZE >= arr.length)
    return err(`not enough bytes for hash`);
    const hash = Array(HASH_SIZE);
    for (let j = 0; j < HASH_SIZE; j++)
      hash[j] = `00${arr[i + j + 1].toString(16)}`.slice(-2);
    return [i + HASH_SIZE + 1, Pack(hash.join(''))];
  }
  if (c === TERM_BYTES.Unpack) {
    if (i + HASH_SIZE >= arr.length)
    return err(`not enough bytes for hash`);
    const hash = Array(HASH_SIZE);
    for (let j = 0; j < HASH_SIZE; j++)
      hash[j] = `00${arr[i + j + 1].toString(16)}`.slice(-2);
    return [i + HASH_SIZE + 1, Unpack(hash.join(''))];
  }
  if (c === TERM_BYTES.Con) {
    const x = arr[i+1];
    return err(`invalid const byte: ${x}`);
  }
  return [i + 1, Var(c - VAR_BYTE)];
};
export const deserializeTerm = (arr: Buffer): Term => {
  const [i, term] = deserializeTermR(arr, 0);
  if (i < arr.length)
    return err(`deserialization failure (too many bytes): ${showTerm(term)}`);
  return term;
};
