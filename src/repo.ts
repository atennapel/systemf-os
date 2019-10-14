import { Type, THash, TDef, hashesType } from './core/types';
import { Term, Hash, hashesTerm } from './core/terms';
import { deserializeTerm, deserializeTDef, serializeTerm, serializeTDef } from './core/serialization';
import { typecheck, EnvH, kindcheckTDef } from './core/typecheck';
import { Kind } from './core/kinds';
import * as fs from 'fs';
import { hashBytes } from './core/hashing';
import { HashSet } from './util';

export interface Repo {
  getDef(hash: Hash): Promise<Buffer>;
  getTDef(hash: THash): Promise<Buffer>;
  addDef(hsh: Hash, buf: Buffer): Promise<boolean>;
  addTDef(hsh: THash, buf: Buffer): Promise<boolean>;
}

export const getDef = async (hs: EnvH, repo: Repo, hsh: Hash): Promise<[Term, Type]> => {
  const buf = await repo.getDef(hsh);
  const tm = deserializeTerm(buf);
  const h: HashSet = {};
  const th: HashSet = {};
  hashesTerm(tm, h, th);
  await Promise.all(Object.keys(h).map(async h => {
    const [def, type] = await getDef(hs, repo, h);
    hs.terms[h] = { def, type };
  }));
  await Promise.all(Object.keys(th).map(async h => {
    const [def, kind] = await getTDef(hs, repo, h);
    hs.types[h] = { def, kind };
  }));
  const ty = typecheck(hs, tm);
  hs.terms[hsh] = { def: tm, type: ty };
  return [tm, ty];
};
export const getDefByName = async (hs: EnvH, repo: Repo & NameRepo, name: string): Promise<[Hash, Term, Type]> => {
  const hsh = await repo.getHashByName(name);
  const [tm, ty] = await getDef(hs, repo, hsh);
  return [hsh, tm, ty];
};
export const getTDef = async (hs: EnvH, repo: Repo, hsh: Hash): Promise<[TDef, Kind]> => {
  const buf = await repo.getTDef(hsh);
  const tdef = deserializeTDef(buf);
  const th: HashSet = {};
  hashesType(tdef.type, th);
  await Promise.all(Object.keys(th).map(async h => {
    const [def, kind] = await getTDef(hs, repo, h);
    hs.types[h] = { def, kind };
  }));
  const ki = kindcheckTDef(hs, tdef);
  hs.types[hsh] = { def: tdef, kind: ki };
  return [tdef, ki];
};
export const getTDefByName = async (hs: EnvH, repo: Repo & NameRepo, name: string): Promise<[Hash, TDef, Kind]> => {
  const hsh = await repo.getTHashByName(name);
  const [def, ki] = await getTDef(hs, repo, hsh);
  return [hsh, def, ki];
};
export const addDef = async (hs: EnvH, repo: Repo, tm: Term): Promise<[boolean, Type, Hash]> => {
  const h: HashSet = {};
  const th: HashSet = {};
  hashesTerm(tm, h, th);
  await Promise.all(Object.keys(h).map(async h => {
    const [def, type] = await getDef(hs, repo, h);
    hs.terms[h] = { def, type };
  }));
  await Promise.all(Object.keys(th).map(async h => {
    const [def, kind] = await getTDef(hs, repo, h);
    hs.types[h] = { def, kind };
  }));
  const ty = typecheck(hs, tm);
  const buf = serializeTerm(tm);
  const hsh = hashBytes(buf).toString('hex');
  hs.terms[hsh] = { def: tm, type: ty };
  const res = await repo.addDef(hsh, buf);
  return [res, ty, hsh];
};
export const addDefByName = async (hs: EnvH, repo: Repo & NameRepo, name: string, tm: Term, update: boolean = false): Promise<[boolean, Type, Hash, boolean]> => {
  const [b1, ty, hsh] = await addDef(hs, repo, tm);
  const b2 = await repo.addHashByName(name, hsh, update);
  return [b1, ty, hsh, b2];
};
export const addTDef = async (hs: EnvH, repo: Repo, tdef: TDef): Promise<[boolean, Kind, THash]> => {
  const th: HashSet = {};
  hashesType(tdef.type, th);
  await Promise.all(Object.keys(th).map(async h => {
    const [def, kind] = await getTDef(hs, repo, h);
    hs.types[h] = { def, kind };
  }));
  const ki = kindcheckTDef(hs, tdef);
  const buf = serializeTDef(tdef);
  const hsh = hashBytes(buf).toString('hex');
  hs.types[hsh] = { def: tdef, kind: ki };
  const res = await repo.addTDef(hsh, buf);
  return [res, ki, hsh];
};
export const addTDefByName = async (hs: EnvH, repo: Repo & NameRepo, name: string, tdef: TDef, update: boolean = false): Promise<[boolean, Kind, THash, boolean]> => {
  const [b1, ty, hsh] = await addTDef(hs, repo, tdef);
  const b2 = await repo.addTHashByName(name, hsh, update);
  return [b1, ty, hsh, b2];
};

export const checkDef = async (hs: EnvH, repo: Repo, tm: Term): Promise<[Type, Hash]> => {
  const h: HashSet = {};
  const th: HashSet = {};
  hashesTerm(tm, h, th);
  await Promise.all(Object.keys(h).map(async h => {
    const [def, type] = await getDef(hs, repo, h);
    hs.terms[h] = { def, type };
  }));
  await Promise.all(Object.keys(th).map(async h => {
    const [def, kind] = await getTDef(hs, repo, h);
    hs.types[h] = { def, kind };
  }));
  const ty = typecheck(hs, tm);
  const buf = serializeTerm(tm);
  const hsh = hashBytes(buf).toString('hex');
  hs.terms[hsh] = { def: tm, type: ty };
  return [ty, hsh];
};
export const checkTDef = async (hs: EnvH, repo: Repo, tdef: TDef): Promise<[Kind, THash]> => {
  const th: HashSet = {};
  hashesType(tdef.type, th);
  await Promise.all(Object.keys(th).map(async h => {
    const [def, kind] = await getTDef(hs, repo, h);
    hs.types[h] = { def, kind };
  }));
  const ki = kindcheckTDef(hs, tdef);
  const buf = serializeTDef(tdef);
  const hsh = hashBytes(buf).toString('hex');
  hs.types[hsh] = { def: tdef, kind: ki };
  return [ki, hsh];
};

export interface NameRepo {
  getHashByName(name: string): Promise<Hash>;
  getTHashByName(name: string): Promise<THash>;
  addHashByName(name: string, hash: Hash, update?: boolean): Promise<boolean>;
  addTHashByName(name: string, hash: THash, update?: boolean): Promise<boolean>;
  removeHashByName(name: string): Promise<boolean>;
  removeTHashByName(name: string): Promise<boolean>;
}

export class FileRepo implements Repo, NameRepo {
  constructor(
    public readonly dir: string,
  ) {}

  init() {
    if (!fs.existsSync(this.dir))
      fs.mkdirSync(this.dir);
    if (!fs.existsSync(`${this.dir}/terms`))
      fs.mkdirSync(`${this.dir}/terms`);
    if (!fs.existsSync(`${this.dir}/types`))
      fs.mkdirSync(`${this.dir}/types`);
    if (!fs.existsSync(`${this.dir}/names`))
      fs.mkdirSync(`${this.dir}/names`);
    if (!fs.existsSync(`${this.dir}/names/terms`))
      fs.mkdirSync(`${this.dir}/names/terms`);
    if (!fs.existsSync(`${this.dir}/names/types`))
      fs.mkdirSync(`${this.dir}/names/types`);
  }

  getDef(hash: Hash): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      fs.readFile(`${this.dir}/terms/${hash}`, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      })
    });
  }

  getTDef(hash: THash): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      fs.readFile(`${this.dir}/types/${hash}`, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      })
    });
  }

  addDef(hsh: Hash, buf: Buffer): Promise<boolean> {
    return new Promise((resolve, reject) => {
      fs.exists(`${this.dir}/terms/${hsh}`, b => {
        if (b) return resolve(false);
        fs.writeFile(`${this.dir}/terms/${hsh}`, buf, err => {
          if (err) return reject(err);
          resolve(true);
        })
      })
    });
  }

  addTDef(hsh: THash, buf: Buffer): Promise<boolean> {
    return new Promise((resolve, reject) => {
      fs.exists(`${this.dir}/types/${hsh}`, b => {
        if (b) return resolve(false);
        fs.writeFile(`${this.dir}/types/${hsh}`, buf, err => {
          if (err) return reject(err);
          resolve(true);
        })
      })
    });
  }

  getHashByName(name: string): Promise<Hash> {
    return new Promise((resolve, reject) => {
      fs.readFile(`${this.dir}/names/terms/${name}`, { encoding: 'utf8' }, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      })
    });
  }

  getTHashByName(name: string): Promise<THash> {
    return new Promise((resolve, reject) => {
      fs.readFile(`${this.dir}/names/types/${name}`, { encoding: 'utf8' }, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      })
    });
  }

  addHashByName(name: string, hash: Hash, update: boolean = false): Promise<boolean> {
    return new Promise((resolve, reject) => {
      fs.exists(`${this.dir}/names/terms/${name}`, b => {
        if (!update && b) return reject(new Error(`term by name ${name} is already defined`));
        fs.writeFile(`${this.dir}/names/terms/${name}`, hash, err => {
          if (err) return reject(err);
          resolve(!b);
        })
      })
    });
  }

  addTHashByName(name: string, hash: THash, update: boolean = false): Promise<boolean> {
    return new Promise((resolve, reject) => {
      fs.exists(`${this.dir}/names/types/${name}`, b => {
        if (!update && b) return reject(new Error(`type by name ${name} is already defined`));
        fs.writeFile(`${this.dir}/names/types/${name}`, hash, err => {
          if (err) return reject(err);
          resolve(!b);
        })
      })
    });
  }

  removeHashByName(name: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      fs.exists(`${this.dir}/names/terms/${name}`, b => {
        if (!b) return resolve(false);
        fs.unlink(`${this.dir}/names/terms/${name}`, err => {
          if (err) return reject(err);
          resolve(true);
        })
      })
    });
  }

  removeTHashByName(name: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      fs.exists(`${this.dir}/names/types/${name}`, b => {
        if (!b) return resolve(false);
        fs.unlink(`${this.dir}/names/types/${name}`, err => {
          if (err) return reject(err);
          resolve(true);
        })
      })
    });
  }
}
