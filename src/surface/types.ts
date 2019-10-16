import { Kind, eqKind, showKindP } from './kinds';
import { HashSet } from '../util';

export type TCon = '->' | 'Byte';
export type THash = string;
export type TName = string;
export type Type
  = { tag: 'TCon', name: TCon }
  | { tag: 'THash', hash: THash }
  | { tag: 'TVar', name: TName }
  | { tag: 'TApp', left: Type, right: Type }
  | { tag: 'TForall', name: TName, kind: Kind, body: Type };

export const TCon = (name: TCon): Type => ({ tag: 'TCon', name });
export const THash = (hash: THash): Type => ({ tag: 'THash', hash });
export const TVar = (name: TName): Type => ({ tag: 'TVar', name });
export const TApp = (left: Type, right: Type): Type => ({ tag: 'TApp', left, right });
export const TForall = (name: TName, kind: Kind, body: Type): Type => ({ tag: 'TForall', name, kind, body });

export interface TDef { readonly tvars: [TName, Kind][]; readonly type: Type }
export const TDef = (tvars: [TName, Kind][], type: Type): TDef => ({ tvars, type });

export const tByte = TCon('Byte');

export type TFun = { tag: 'TApp', left: { tag: 'TApp', left: { tag: 'TCon', name: '->' }, right: Type }, right: Type };
export const tFun = TCon('->');
export const TFun = (left: Type, right: Type): Type => TApp(TApp(tFun, left), right);
export const tfunFrom = (ts: Type[]): Type => ts.reduceRight((x, y) => TFun(y, x));
export const tfun = (...ts: Type[]): Type => tfunFrom(ts);
export const isTFun = (t: Type): t is TFun =>
  t.tag === 'TApp' && t.left.tag === 'TApp' &&
    t.left.left.tag === 'TCon' && t.left.left.name === '->';
export const getTFun = (t: TFun): [Type, Type] => [t.left.right, t.right];
export const matchTFun = (t: Type): [Type, Type] | null =>
  isTFun(t) ? getTFun(t) : null;
export const getTFuns = (t: Type): Type[] => {
  const r = [];
  while (isTFun(t)) {
    r.push(t.left.right);
    t = t.right;
  }
  r.push(t);
  return r;
};

export const tappFrom = (ts: Type[]): Type => ts.reduce(TApp);
export const tapp = (...ts: Type[]): Type => tappFrom(ts);
export const tapp1 = (t: Type, ts: Type[]): Type => ts.reduce(TApp, t);
export const getTApps = (t: Type): Type[] => {
  const r = [];
  while (t.tag === 'TApp') {
    r.push(t.right);
    t = t.left;
  }
  r.push(t);
  return r.reverse();
};
export const tforall = (tvars: [TName, Kind][], body: Type): Type =>
  tvars.reduceRight((b, [x, k]) => TForall(x, k, b), body);
export const getTForalls = (t: Type): [[TName, Kind][], Type] => {
  const r: [TName, Kind][] = [];
  while (t.tag === 'TForall') {
    r.push([t.name, t.kind]);
    t = t.body;
  }
  return [r, t];
};

export const showTypeP = (t: Type, b: boolean): string =>
  b ? `(${showType(t)})` : showType(t);
export const showType = (t: Type): string => {
  if (t.tag === 'TCon') return t.name;
  if (t.tag === 'THash') return `#${t.hash}`;
  if (t.tag === 'TVar') return `${t.name}`;
  if (isTFun(t))
    return getTFuns(t)
      .map((t, i, a) => showTypeP(t, isTFun(t) || (t.tag === 'TForall' && i !== a.length - 1)))
      .join(' -> ');
  if (t.tag === 'TApp')
    return getTApps(t).map(t => showTypeP(t, t.tag === 'TApp' || t.tag === 'TForall')).join(' ');
  if (t.tag === 'TForall') {
    const [ks, body] = getTForalls(t);
    return `∀${ks.map(([x, k]) => `(${x} : ${showKindP(k, k.tag === 'KFun')})`).join('')}. ${showType(body)}`;
  }
  return t;
};
export const showTDef = (t: TDef): string =>
  `type${t.tvars.length > 0 ? ' ' : ''}${t.tvars.map(([x, k]) => `(${x} : ${showKindP(k, k.tag === 'KFun')}`).join('')} = ${showType(t.type)}`;

export const hashesType = (t: Type, h: HashSet): void => {
  if (t.tag === 'THash') { h[t.hash] = true; return }
  if (t.tag === 'TApp') {
    hashesType(t.left, h);
    hashesType(t.right, h);
    return;
  }
  if (t.tag === 'TForall') return hashesType(t.body, h);
};

export const eqType = (a: Type, b: Type): boolean => {
  if (a.tag === 'TCon') return b.tag === 'TCon' && a.name === b.name;
  if (a.tag === 'THash') return b.tag === 'THash' && a.hash === b.hash;
  if (a.tag === 'TVar') return b.tag === 'TVar' && a.name === b.name;
  if (a.tag === 'TApp')
    return b.tag === 'TApp' && eqType(a.left, b.left) && eqType(a.right, b.right);
  if (a.tag === 'TForall')
    return b.tag === 'TForall' && a.name === b.name && eqKind(a.kind, b.kind) && eqType(a.body, b.body);
  return a;
};

export const substTVar = (x: TName, s: Type, t: Type): Type => {
  if (t.tag === 'TVar') return t.name === x ? s : t;
  if (t.tag === 'TApp')
    return TApp(substTVar(x, s, t.left), substTVar(x, s, t.right));
  if (t.tag === 'TForall')
    return t.name === x ? t : TForall(t.name, t.kind, substTVar(x, s, t.body));
  return t;
};
