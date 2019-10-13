import { Type, THash, TDef } from './core/types';
import { Term, Hash } from './core/terms';
import { deserializeTerm, deserializeTDef, serializeTerm, serializeTDef } from './core/serialization';
import { typecheck, EnvH, kindcheckTDef } from './core/typecheck';
import { Kind } from './core/kinds';
import * as fs from 'fs';
import { hashBytes } from './core/hashing';

export interface Repo {
  getDef(hash: Hash): Promise<Buffer>;
  getTDef(hash: THash): Promise<Buffer>;
  addDef(hsh: Hash, buf: Buffer): Promise<boolean>;
  addTDef(hsh: THash, buf: Buffer): Promise<boolean>;
}

export const getDef = async (hs: EnvH, repo: Repo, hsh: Hash): Promise<[Term, Type]> => {
  const buf = await repo.getDef(hsh);
  const tm = deserializeTerm(buf);
  const ty = typecheck(hs, tm);
  return [tm, ty];
};
export const getTDef = async (hs: EnvH, repo: Repo, hsh: Hash): Promise<[TDef, Kind]> => {
  const buf = await repo.getTDef(hsh);
  const tdef = deserializeTDef(buf);
  const ki = kindcheckTDef(hs, tdef);
  return [tdef, ki];
};
export const addDef = async (hs: EnvH, repo: Repo, tm: Term): Promise<[boolean, Type, Hash]> => {
  const ty = typecheck(hs, tm);
  const buf = serializeTerm(tm);
  const hsh = hashBytes(buf).toString('hex');
  const res = await repo.addDef(hsh, buf);
  return [res, ty, hsh];
};
export const addTDef = async (hs: EnvH, repo: Repo, tdef: TDef): Promise<[boolean, Kind, THash]> => {
  const ki = kindcheckTDef(hs, tdef);
  const buf = serializeTDef(tdef);
  const hsh = hashBytes(buf).toString('hex');
  const res = await repo.addTDef(hsh, buf);
  return [res, ki, hsh];
};

export class FileRepo implements Repo {
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
}
