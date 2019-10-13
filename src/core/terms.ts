import { Type, showTypeP, THash } from './types';
import { Kind, showKindP } from './kinds';

export type Con = never;
export type Hash = string;
export type Ix = number;
export type Term
  = { tag: 'Con', name: Con }
  | { tag: 'Hash', hash: Hash }
  | { tag: 'Var', index: Ix }
  | { tag: 'App', left: Term, right: Term }
  | { tag: 'Abs', type: Type, body: Term }
  | { tag: 'AppT', left: Term, right: Type }
  | { tag: 'AbsT', kind: Kind, body: Term }
  | { tag: 'Pack', hash: THash }
  | { tag: 'Unpack', hash: THash };

export const Con = (name: Con): Term => ({ tag: 'Con', name });
export const Hash = (hash: Hash): Term => ({ tag: 'Hash', hash });
export const Var = (index: Ix): Term => ({ tag: 'Var', index });
export const App = (left: Term, right: Term): Term => ({ tag: 'App', left, right });
export const Abs = (type: Type, body: Term): Term => ({ tag: 'Abs', type, body });
export const AppT = (left: Term, right: Type): Term => ({ tag: 'AppT', left, right });
export const AbsT = (kind: Kind, body: Term): Term => ({ tag: 'AbsT', kind, body });
export const Pack = (hash: THash): Term => ({ tag: 'Pack', hash });
export const Unpack = (hash: THash): Term => ({ tag: 'Unpack', hash });

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
export const abs = (ts: Type[], body: Term): Term =>
  ts.reduceRight((x, y) => Abs(y, x), body);
export const getAbss = (t: Term): [Type[], Term] => {
  const r = [];
  while (t.tag === 'Abs') {
    r.push(t.type);
    t = t.body;
  }
  return [r, t];
};
export const absT = (ks: Kind[], body: Term): Term =>
  ks.reduceRight((x, y) => AbsT(y, x), body);
export const getAbsTs = (t: Term): [Kind[], Term] => {
  const r = [];
  while (t.tag === 'AbsT') {
    r.push(t.kind);
    t = t.body;
  }
  return [r, t];
};

export const showTermP = (t: Term, b: boolean): string =>
  b ? `(${showTerm(t)})` : showTerm(t);
export const showTerm = (t: Term): string => {
  if (t.tag === 'Con') return t.name;
  if (t.tag === 'Hash') return `#${t.hash}`;
  if (t.tag === 'Var') return `${t.index}`;
  if (t.tag === 'App')
    return getApps(t)
      .map((t, i, a) => showTermP(t,
        (t.tag === 'App' && i > 0) ||
        (t.tag === 'AppT' && i > 0) ||
        (t.tag === 'Abs' && i !== a.length - 1) ||
        (t.tag === 'AbsT' && i !== a.length - 1)))
      .join(' ');
  if (t.tag === 'AppT') {
    const [tm, ts] = getAppTs(t);
    return `${showTermP(tm, tm.tag === 'Abs' || tm.tag === 'AbsT')} ${ts.map(t => `@${showTypeP(t, t.tag === 'TApp' || t.tag === 'TForall')}`).join(' ')}`;
  }
  if (t.tag === 'Abs') {
    const [ts, body] = getAbss(t);
    return `λ${ts.map(t => showTypeP(t, t.tag === 'TApp' || t.tag === 'TForall')).join(' ')}. ${showTerm(body)}`;
  }
  if (t.tag === 'AbsT') {
    const [ks, body] = getAbsTs(t);
    return `Λ${ks.map(k => showKindP(k, k.tag === 'KFun')).join(' ')}. ${showTerm(body)}`;
  }
  if (t.tag === 'Pack') return `>#${t.hash}`;
  if (t.tag === 'Unpack') return `<#${t.hash}`;
  return t;
};
