import { Kind, showKind } from './kinds';

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
