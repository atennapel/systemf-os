export type KCon = '*';
export type Kind
  = { tag: 'KCon', name: KCon } 
  | { tag: 'KFun', left: Kind, right: Kind };

export const KCon = (name: KCon): Kind => ({ tag: 'KCon', name });
export const KFun = (left: Kind, right: Kind): Kind => ({ tag: 'KFun', left, right });

export const kType = KCon('*');
export const kfunFrom = (ks: Kind[]): Kind => ks.reduceRight((x, y) => KFun(y, x));
export const kfun = (...ks: Kind[]): Kind => kfunFrom(ks);
export const getKFuns = (k: Kind): Kind[] => {
  const r = [];
  while (k.tag === 'KFun') {
    r.push(k.left);
    k = k.right;
  }
  r.push(k);
  return r;
};

export const showKindP = (k: Kind, b: boolean): string =>
  b ? `(${showKind(k)})` : showKind(k);
export const showKind = (k: Kind): string => {
  if (k.tag === 'KCon') return k.name;
  if (k.tag === 'KFun')
    return getKFuns(k).map(k => showKindP(k, k.tag === 'KFun')).join(' -> ');
  return k;
};

export const eqKind = (a: Kind, b: Kind): boolean => {
  if (a.tag === 'KCon') return b.tag === 'KCon' && a.name === b.name;
  if (a.tag === 'KFun')
    return b.tag === 'KFun' && eqKind(a.left, b.left) && eqKind(a.right, b.right);
  return a;
};
