import { Kind, showKind, eqKind } from './kinds';

export type TCon = '->';
export type Ix = number;
export type Type
  = { tag: 'TCon', name: TCon }
  | { tag: 'TVar', index: Ix }
  | { tag: 'TApp', left: Type, right: Type }
  | { tag: 'TForall', kind: Kind, body: Type };

export const TCon = (name: TCon): Type => ({ tag: 'TCon', name });
export const TVar = (index: Ix): Type => ({ tag: 'TVar', index });
export const TApp = (left: Type, right: Type): Type => ({ tag: 'TApp', left, right });
export const TForall = (kind: Kind, body: Type): Type => ({ tag: 'TForall', kind, body });

export type TFun = { tag: 'TApp', left: { tag: 'TApp', left: { tag: 'TCon', name: '->' }, right: Type }, right: Type }
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

export const tappFrom = (ts: Type[]): Type => ts.reduce(TApp);
export const tapp = (...ts: Type[]): Type => tappFrom(ts);
export const tforall = (ks: Kind[], body: Type): Type =>
  ks.reduceRight((x, y) => TForall(y, x), body);

export const showType = (t: Type): string => {
  if (t.tag === 'TCon') return t.name;
  if (t.tag === 'TVar') return `${t.index}`;
  if (isTFun(t)) return `(${showType(t.left.right)} -> ${showType(t.right)})`;
  if (t.tag === 'TApp') return `(${showType(t.left)} ${showType(t.right)})`;
  if (t.tag === 'TForall') return `(∀${showKind(t.kind)}. ${showType(t.body)})`;
  return t;
};

export const eqType = (a: Type, b: Type): boolean => {
  if (a.tag === 'TCon') return b.tag === 'TCon' && a.name === b.name;
  if (a.tag === 'TVar') return b.tag === 'TVar' && a.index === b.index;
  if (a.tag === 'TApp')
    return b.tag === 'TApp' && eqType(a.left, b.left) && eqType(a.right, b.right);
  if (a.tag === 'TForall')
    return b.tag === 'TForall' && eqKind(a.kind, b.kind) && eqType(a.body, b.body);
  return a;
};

export const shift = (d: Ix, c: Ix, t: Type): Type => {
  if (t.tag === 'TVar') return t.index < c ? t : TVar(t.index + d);
  if (t.tag === 'TApp') return TApp(shift(d, c, t.left), shift(d, c, t.right));
  if (t.tag === 'TForall') return TForall(t.kind, shift(d, c + 1, t.body));
  return t;
};
export const subst = (j: Ix, s: Type, t: Type): Type => {
  if (t.tag === 'TVar') return t.index === j ? s : t;
  if (t.tag === 'TApp') return TApp(subst(j, s, t.left), subst(j, s, t.right));
  if (t.tag === 'TForall') return TForall(t.kind, subst(j + 1, shift(1, 0, s), t.body));
  return t;
};
export const substIn = (t: Type, s: Type): Type => shift(-1, 0, subst(0, shift(1, 0, s), t));