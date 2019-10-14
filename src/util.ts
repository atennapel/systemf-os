export const err = (msg: string) => {
  throw new Error(msg);
};

export type HashSet<T = true> = { [key: string]: T };
