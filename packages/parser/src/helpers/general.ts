import type { Tags } from 'osm-api';

export const capitalise = (string: string) => {
  const lower = string.toLowerCase();
  return lower[0].toUpperCase() + lower.slice(1);
};

export const isTruthy = <T>(v: T | undefined | null | 0 | ''): v is T => !!v;

/** deletes empty values in the object */
export const deleteUndefinedKeys = <T>(object: T): T => {
  for (const key in object) {
    if (object[key] === undefined || object[key] === '') delete object[key];
  }
  return object;
};

/** useful for reduce the noise in a diff */
export function sortObject<T extends Record<string, unknown>>(object: T): T {
  return <T>(
    Object.fromEntries(
      Object.entries(object).toSorted(([a], [b]) => a.localeCompare(b)),
    )
  );
}

export const isNotNaN = (n: number) => !Number.isNaN(n);

export const removeTrailingZeros = (str: string) =>
  str.replace(/(\.\d+?)0+$/, '$1');

/** like {@link Array.filter}, but for objects */
export const pick = <T extends object, K extends keyof T>(
  object: T,
  keysToKeep: K[] | ((key: K, value: T[K]) => boolean),
) =>
  <Pick<T, K>>(
    Object.fromEntries(
      Object.entries(object).filter(([key, value]) =>
        Array.isArray(keysToKeep)
          ? keysToKeep.includes(<K>key)
          : keysToKeep(<K>key, value),
      ),
    )
  );

export const mapObject = (
  object: Tags,
  callback: (kv: [string, string]) => [string, string],
) => Object.fromEntries(Object.entries(object).map(callback));
