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

/** useful for reduce the noise in a diff */
export function sortObject<T extends Record<string, unknown>>(object: T): T {
  return <T>(
    Object.fromEntries(
      Object.entries(object).sort(([a], [b]) => a.localeCompare(b)),
    )
  );
}

export const isNotNaN = (n: number) => !Number.isNaN(n);
