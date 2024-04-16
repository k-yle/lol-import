import type { Tags } from 'osm-api';

/** mutates instead of returning, to preserve the {@link Proxy} */
export function duplicateLightTags(tags: Tags, copies: number) {
  const lightKeys = Object.keys(tags).filter(
    (key) => key.startsWith('seamark:light:') && !key.endsWith(':reference'),
  );
  for (const key of lightKeys) {
    /* eslint-disable no-param-reassign */
    for (let index = 1; index <= copies; index++) {
      const newKey = key.replace(':light:', `:light:${index}:`);
      if (tags[newKey]) {
        throw new Error(`Refusing to overwrite ${newKey}`);
      }
      tags[newKey] = tags[key];
    }
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete tags[key];
  }
}
