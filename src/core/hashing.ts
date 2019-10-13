import * as crypto from 'crypto';

import { err } from '../util';

export const HASH = 'sha256';
export const HASH_SIZE = 32;

export const hashBytes = (arr: Buffer): Buffer => {
  const hash = crypto.createHash(HASH);
  hash.update(arr);
  return hash.digest();
};

export const checkHash = (hsh: Buffer, exhash: Buffer): void => {
  if (!hsh.equals(exhash))
    return err(`hash does not match`);
};
