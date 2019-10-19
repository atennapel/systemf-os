import { Type, showTypeP, THash, hashesType, TName, showType } from './types';
import { Kind, showKindP } from './kinds';
import { HashSet } from '../util';

export type Con = 'zeroByte' | 'succByte';
export type Hash = string;
export type Name = string;
export type Term
  = { tag: 'Con', name: Con }
  | { tag: 'Hash', hash: Hash }
  | { tag: 'Var', name: Name }
  | { tag: 'App', left: Term, right: Term }
  | { tag: 'Abs', name: Name, type: Type | null, body: Term }
  | { tag: 'AppT', left: Term, right: Type }
  | { tag: 'AbsT', name: TName, kind: Kind, body: Term }
  | { tag: 'Pack', hash: THash }
  | { tag: 'Unpack', hash: THash }
  | { tag: 'Ann', term: Term, type: Type };

export const Con = (name: Con): Term => ({ tag: 'Con', name });
export const Hash = (hash: Hash): Term => ({ tag: 'Hash', hash });
export const Var = (name: Name): Term => ({ tag: 'Var', name });
export const App = (left: Term, right: Term): Term => ({ tag: 'App', left, right });
export const Abs = (name: Name, type: Type | null, body: Term): Term => ({ tag: 'Abs', name, type, body });
export const AppT = (left: Term, right: Type): Term => ({ tag: 'AppT', left, right });
export const AbsT = (name: TName, kind: Kind, body: Term): Term => ({ tag: 'AbsT', name, kind, body });
export const Pack = (hash: THash): Term => ({ tag: 'Pack', hash });
export const Unpack = (hash: THash): Term => ({ tag: 'Unpack', hash });
export const Ann = (term: Term, type: Type): Term => ({ tag: 'Ann', term, type });

export const cZeroByte = Con('zeroByte');
export const cSuccByte = Con('succByte');

export const appFrom = (ts: Term[]): Term => ts.reduce(App);
export const app = (...ts: Term[]): Term => appFrom(ts);
export const getApps = (t: Term): Term[] => {
  const r = [];
  while (t.tag === 'App') {
    r.push(t.right);
    t = t.left;
  }
  r.push(t);
  return r.reverse();
};
export const appTFrom = (t: Term, ts: Type[]): Term => ts.reduce(AppT, t);
export const appT = (t: Term, ...ts: Type[]): Term => appTFrom(t, ts);
export const getAppTs = (t: Term): [Term, Type[]] => {
  const r = [];
  while (t.tag === 'AppT') {
    r.push(t.right);
    t = t.left;
  }
  return [t, r.reverse()];
};
export const abs = (ts: [Name, (Type | null)][], body: Term): Term =>
  ts.reduceRight((b, [x, t]) => Abs(x, t, b), body);
export const getAbss = (t: Term): [[Name, (Type | null)][], Term] => {
  const r: [Name, (Type | null)][] = [];
  while (t.tag === 'Abs') {
    r.push([t.name, t.type]);
    t = t.body;
  }
  return [r, t];
};
export const absT = (ks: [TName, Kind][], body: Term): Term =>
  ks.reduceRight((b, [x, k]) => AbsT(x, k, b), body);
export const getAbsTs = (t: Term): [[TName, Kind][], Term] => {
  const r: [TName, Kind][] = [];
  while (t.tag === 'AbsT') {
    r.push([t.name, t.kind]);
    t = t.body;
  }
  return [r, t];
};

export const showTermP = (t: Term, b: boolean): string =>
  b ? `(${showTerm(t)})` : showTerm(t);
export const showTerm = (t: Term): string => {
  if (t.tag === 'Con') return t.name;
  if (t.tag === 'Hash') return `#${t.hash}`;
  if (t.tag === 'Var') return `${t.name}`;
  if (t.tag === 'App')
    return getApps(t)
      .map((t, i, a) => showTermP(t,
        (t.tag === 'App' && i > 0) ||
        (t.tag === 'AppT' && i > 0) ||
        t.tag === 'Ann' ||
        (t.tag === 'Abs' && i !== a.length - 1) ||
        (t.tag === 'AbsT' && i !== a.length - 1)))
      .join(' ');
  if (t.tag === 'AppT') {
    const [tm, ts] = getAppTs(t);
    return `${showTermP(tm, tm.tag === 'Abs' || tm.tag === 'AbsT' || tm.tag === 'Ann')} ${ts.map(t => `@${showTypeP(t, t.tag === 'TApp' || t.tag === 'TForall')}`).join(' ')}`;
  }
  if (t.tag === 'Abs') {
    const [ts, body] = getAbss(t);
    return `λ${ts.map(([x, t]) =>
      t ? `(${x} : ${showTypeP(t, t.tag === 'TApp' || t.tag === 'TForall')})` : x).join(' ')}. ${showTermP(body, body.tag === 'Ann')}`;
  }
  if (t.tag === 'AbsT') {
    const [ks, body] = getAbsTs(t);
    return `Λ${ks.map(([x, k]) => `(${x} : ${showKindP(k, k.tag === 'KFun')})`).join('')}. ${showTermP(body, body.tag === 'Ann')}`;
  }
  if (t.tag === 'Pack') return `>#${t.hash}`;
  if (t.tag === 'Unpack') return `<#${t.hash}`;
  if (t.tag === 'Ann') return `${showTermP(t.term, t.term.tag === 'Ann')} : ${showType(t.type)}`
  return t;
};

export const hashesTerm = (t: Term, h: HashSet, th: HashSet): void => {
  if (t.tag === 'Hash') { h[t.hash] = true; return }
  if (t.tag === 'Pack') { th[t.hash] = true; return }
  if (t.tag === 'Unpack') { th[t.hash] = true; return }
  if (t.tag === 'App') {
    hashesTerm(t.left, h, th);
    hashesTerm(t.right, h, th);
    return;
  }
  if (t.tag === 'AppT') {
    hashesTerm(t.left, h, th)
    hashesType(t.right, th);
    return;
  }
  if (t.tag === 'Abs') {
    if (t.type) hashesType(t.type, th);
    hashesTerm(t.body, h, th);
    return;
  }
  if (t.tag === 'AbsT')
    return hashesTerm(t.body, h, th);
  if (t.tag === 'Ann') {
    hashesTerm(t.term, h, th);
    hashesType(t.type, th);
    return;
  }
};
