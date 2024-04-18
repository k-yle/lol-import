/* eslint-disable no-param-reassign */
import type { Tags } from 'osm-api';
import { getHighestSector } from '../../stages/merge';
import { isLightTag } from '../../helpers/duplicateLightTags';

const ALLOW_CLONE = new Set(['exhibition', 'category']);

/**
 * check if there are any unsectored and sectored tags. If yes,
 * copy all the unsectored into each sector, and delete the original
 * unsectored tags.
 */
export function moveUnsectoredTags(tags: Tags) {
  const highestSector = getHighestSector(tags);
  if (highestSector > 0) {
    // we know there are some sectored tags.
    const unsectoredKeys = Object.keys(tags).filter(
      (key) => isLightTag(key) && key.split(':').length === 3,
    );
    for (const key of unsectoredKeys) {
      const subKey = key.split(':')[2];
      if (!ALLOW_CLONE.has(subKey)) {
        throw new Error(`Not allowed to clone ${key}`);
      }
      for (let index = 1; index <= highestSector; index++) {
        tags[`seamark:light:${index}:${subKey}`] = tags[key];
      }
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete tags[key];
    }
  }
}
