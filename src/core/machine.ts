import { Con, Hash, Ix, Term } from './terms';
import { List, Cons, index, Nil } from '../list';
import { EnvH } from './typecheck';

export type ETerm
  = { tag: 'ECon', name: Con }
  | { tag: 'EHash', hash: Hash }
  | { tag: 'EVar', index: Ix }
  | { tag: 'EByte', val: number }
  | { tag: 'EApp', left: ETerm, right: ETerm }
  | { tag: 'EAbs', body: ETerm };

export const ECon = (name: Con): ETerm => ({ tag: 'ECon', name });
export const EHash = (hash: Hash): ETerm => ({ tag: 'EHash', hash });
export const EVar = (index: Ix): ETerm => ({ tag: 'EVar', index });
export const EByte = (val: number): ETerm => ({ tag: 'EByte', val });
export const EApp = (left: ETerm, right: ETerm): ETerm => ({ tag: 'EApp', left, right });
export const EAbs = (body: ETerm): ETerm => ({ tag: 'EAbs', body });

export const eZeroByte = ECon('zeroByte');
export const eSuccByte = ECon('succByte');

export const eappFrom = (ts: ETerm[]): ETerm => ts.reduce(EApp);
export const eapp = (...ts: ETerm[]): ETerm => eappFrom(ts);
export const getEApps = (t: ETerm): ETerm[] => {
  const r = [];
  while (t.tag === 'EApp') {
    r.push(t.right);
    t = t.left;
  }
  r.push(t);
  return r.reverse();
};

export const showETermP = (t: ETerm, b: boolean): string =>
  b ? `(${showETerm(t)})` : showETerm(t);
export const showETerm = (t: ETerm): string => {
  if (t.tag === 'ECon') return t.name;
  if (t.tag === 'EHash') return `#${t.hash}`;
  if (t.tag === 'EVar') return `${t.index}`;
  if (t.tag === 'EByte') return `b${t.val}`
  if (t.tag === 'EAbs') return `λ${showETerm(t.body)}`;
  if (t.tag === 'EApp')
    return getEApps(t)
      .map((t, i, a) => showETermP(t, t.tag === 'EAbs' && i !== a.length - 1))
      .join(' ');
  return t;
};

export const eid = EAbs(EVar(0));
export const erase = (t: Term): ETerm => {
  if (t.tag === 'Var') return EVar(t.index);
  if (t.tag === 'Con') return ECon(t.name);
  if (t.tag === 'Hash') return EHash(t.hash);
  if (t.tag === 'Abs') return EAbs(erase(t.body));
  if (t.tag === 'AbsT') return erase(t.body);
  if (t.tag === 'App') return EApp(erase(t.left), erase(t.right));
  if (t.tag === 'AppT') return erase(t.left);
  if (t.tag === 'Pack') return eid;
  if (t.tag === 'Unpack') return eid;
  return t;
};

export type EnvM = List<EVal>;
export type EVal
  = { tag: 'VByte', val: number }
  | { tag: 'VClos', body: ETerm, env: EnvM }
  | { tag: 'VSucc' };
export const VByte = (val: number): EVal => ({ tag: 'VByte', val });
export const VClos = (body: ETerm, env: EnvM): EVal => ({ tag: 'VClos', body, env });
export const VSucc: EVal = { tag: 'VSucc' };

export const showEVal = (v: EVal): string => {
  if (v.tag === 'VByte') return `${v.val}`;
  if (v.tag === 'VSucc') return `succByte`;
  if (v.tag === 'VClos') return `*closure*`;
  return v;
};

export type MCont
  = { tag: 'MDone' }
  | { tag: 'MArg', term: ETerm, env: EnvM, cont: MCont }
  | { tag: 'MFn', body: ETerm, env: EnvM, cont: MCont }
  | { tag: 'MSucc', cont: MCont };
export const MDone: MCont = { tag: 'MDone' };
export const MArg = (term: ETerm, env: EnvM, cont: MCont): MCont =>
  ({ tag: 'MArg', term, env, cont });
export const MFn = (body: ETerm, env: EnvM, cont: MCont): MCont =>
  ({ tag: 'MFn', body, env, cont });
export const MSucc = (cont: MCont): MCont => ({ tag: 'MSucc', cont });

export type MState = [ETerm, EnvM, MCont];

export type MCache = { [key: string]: ETerm };

export const step = (hs: EnvH, cache: MCache, state: MState): MState | null => {
  const [t, e, c] = state;
  if (t.tag === 'EVar') {
    const v = index(e, t.index);
    if (!v) return null;
    if (v.tag === 'VByte') return [EByte(v.val), Nil, c];
    if (v.tag === 'VClos') return [EAbs(v.body), v.env, c];
    if (v.tag === 'VSucc') return [eSuccByte, Nil, c];
    return null;
  }
  if (t.tag === 'EHash') {
    const etm = cache[t.hash];
    if (etm) return [etm, Nil, c];
    const tm = hs.terms[t.hash];
    const er = erase(tm.def);
    cache[t.hash] = er;
    return [er, Nil, c];
  }
  if (t.tag === 'ECon' && t.name === 'zeroByte') return [EByte(0), Nil, c];
  if (t.tag === 'ECon' && t.name === 'succByte') {
    if (c.tag === 'MArg') return [c.term, c.env, MSucc(c.cont)];
    if (c.tag === 'MFn') return [c.body, Cons(VSucc, c.env), c.cont];
  }
  if (t.tag === 'EApp') return [t.left, e, MArg(t.right, e, c)];
  if (t.tag === 'EByte') {
     if (c.tag === 'MFn') return [c.body, Cons(VByte(t.val), c.env), c.cont];
     if (c.tag === 'MSucc') return [EByte(t.val + 1), Nil, c.cont];
  }
  if (t.tag === 'EAbs') {
    if (c.tag === 'MArg') return [c.term, c.env, MFn(t.body, e, c.cont)];
    if (c.tag === 'MFn') return [c.body, Cons(VClos(t.body, e), c.env), c.cont];
  }
  return null;
};
export const steps = (hs: EnvH, state: MState, cache: MCache = {}): MState => {
  let c: MState | null = state;
  while (true) {
    const p = c;
    c = step(hs, cache, c);
    if (!c) return p;
  }
};

export const evaluate = (hs: EnvH, t: Term, cache: MCache = {}): MState =>
  steps(hs, [erase(t), Nil, MDone], cache);
