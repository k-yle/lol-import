import type { Tags } from 'osm-api';
import type { Warning } from './types';

/** every tag that this project sets, and its count */
export const EVERY_KEY: { [key: string]: { [value: string]: number } } = {};

/** tags that we intentionally mutate or append to */
const SKIP_WARNING = new Set<string>([
  //
  'seamark:information',
]);

/** @internal, don't export */
const ALLOW_OVERRIDE_SYMBOL = Symbol('ALLOWED_CLONE_SYMBOL');

/**
 * This proxy detects when we accidentally override a tag value
 * that has already been set by another function
 */
export const proxyTags = (tags: Tags, warnings: Warning[]) => {
  return new Proxy(tags, {
    set(target, key, newValue) {
      if (typeof key === 'symbol') return true;

      // check if this override is allowed
      if (
        typeof newValue === 'object' &&
        newValue &&
        ALLOW_OVERRIDE_SYMBOL in newValue
      ) {
        target[key] = newValue.toString();
        return true;
      }

      if (newValue) {
        EVERY_KEY[key] ||= {};
        EVERY_KEY[key][newValue] ||= 0;
        EVERY_KEY[key][newValue]++;
      }

      const oldValue = target[key];

      if (
        key &&
        oldValue && // no warning for the inital set
        oldValue !== newValue && // no warning if the value is unchanged
        !newValue?.startsWith(`${oldValue};`) && // no warning if appending a new value to an array tag
        !SKIP_WARNING.has(key) // no warning for special tags
      ) {
        // create an error object to get the callstack which
        // tells us where the tag value was set.
        const stack = new Error('.').stack
          ?.split('\n')
          .slice(2)
          .find((line) => !line.includes('(<anonymous>)'))
          ?.toLowerCase() // because the drive name in windows is inconsistently capitalised
          .replace(process.cwd().toLowerCase(), '')
          .replaceAll('\\', '/')
          .trim();

        warnings.push({
          type: 'overridden_tag',
          value: `${key} “${oldValue}” --> “${newValue}” ${stack}`,
        });
      }
      target[key] = newValue;
      return true;
    },
  });
};

// we have to use stringify, because structuredClone doesn't work on proxied objects
export const stripProxy = (proxiedTags: Tags): Tags =>
  // eslint-disable-next-line unicorn/prefer-structured-clone -- see comment above
  JSON.parse(JSON.stringify(proxiedTags));

/**
 * If you want to override a tag without emiting a warning,
 * use `tags[key] = allowOverride(newValue);`
 */
export const allowOverride = (newValue: string) =>
  Object.assign(newValue, { [ALLOW_OVERRIDE_SYMBOL]: true });
