import type { Tags } from 'osm-api';

/** any tag that start with `seamark:light` except `seamark:light:reference` */
export const isLightTag = (key: string) =>
  key.startsWith('seamark:light:') && !key.endsWith(':reference');

/** mutates instead of returning, to preserve the {@link Proxy} */
export function duplicateLightTags(
  tags: Tags,
  copies: number,
  sectorToCopy?: number,
) {
  const lightKeys = Object.keys(tags).filter(isLightTag);
  for (const key of lightKeys) {
    for (let index = 1; index <= copies; index++) {
      if (index === sectorToCopy) continue;
      const newKey = key.replace(
        `:light:${sectorToCopy ? `${sectorToCopy}:` : ''}`,
        `:light:${index}:`,
      );
      if (tags[newKey]) {
        throw new Error(
          `Refusing to copy ${key} into ${newKey} (copying ${sectorToCopy} into ${index})`,
        );
      }
      tags[newKey] = tags[key];
    }

    // if we're duplicating an existing sector, don't delete those tags
    if (!sectorToCopy) delete tags[key];
  }
}
