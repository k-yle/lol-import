export const capitalise = (string: string) => {
  const lower = string.toLowerCase();
  return lower[0].toUpperCase() + lower.slice(1);
};

export const isTruthy = <T>(v: T | undefined | null | 0 | ''): v is T => !!v;

/** deletes empty values in the object */
export const deleteUndefinedKeys = <T>(object: T): T => {
  for (const key in object) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete, no-param-reassign
    if (object[key] === undefined || object[key] === '') delete object[key];
  }
  return object;
};
