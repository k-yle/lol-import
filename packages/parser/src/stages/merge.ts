import type { Tags } from 'osm-api';
import type { FELight, Warning } from '../helpers/types.js';
import {
  duplicateLightTags,
  isLightTag,
  isUnsectoredLightTag,
} from '../helpers/duplicateLightTags.js';
import { isTruthy, sortObject } from '../helpers/general.js';

const SECTOR_KEY_REGEX = /seamark:light:(?<sector>\d+):/;

export const getHighestSector = (tags: Tags) =>
  Object.keys(tags)
    .map((key) => key.match(SECTOR_KEY_REGEX)?.groups?.sector)
    .filter(isTruthy)
    .map(Number)
    .toSorted((a, b) => b - a)[0] || 0;

/**
 * The LOL dataset has several lights with the same ID,
 * they need to be merged. Each light might already be
 * split into multiple sectors
 */
export function mergeLights(
  a: FELight,
  b: FELight,
  warnings: Warning[],
): FELight {
  const allKeys = new Set([...Object.keys(a.tags), ...Object.keys(b.tags)]);
  const nonLightKeys = [...allKeys].filter((key) => !isLightTag(key));

  // if one is a racon or something else without light tags, then we
  // don't actually need to convert :light: into :light:1:
  const bothHaveLightTags =
    Object.keys(a.tags).some(isLightTag) &&
    Object.keys(b.tags).some(isLightTag);

  const mergedNonLightTags: Tags = {};
  for (const key of nonLightKeys) {
    const aValue = a.tags[key];
    const bValue = b.tags[key];
    if (aValue && !bValue) mergedNonLightTags[key] = aValue;
    else if (bValue && !aValue) mergedNonLightTags[key] = bValue;
    else if (bValue === aValue) mergedNonLightTags[key] = aValue;
    else {
      // values are different
      switch (key) {
        case 'seamark:type': {
          const bestType =
            [aValue, bValue].find(
              (type) => type.startsWith('beacon') || type.startsWith('buoy'),
            ) || 'light_minor';
          mergedNonLightTags[key] = bestType;
          break;
        }

        case 'seamark:name': {
          mergedNonLightTags[key] = `${aValue} / ${bValue}`;
          break;
        }

        case 'seamark:information': {
          mergedNonLightTags[key] = `${aValue};${bValue}`;
          break;
        }

        default: {
          // pick the first value, but emit a warning to clarify that
          // this was a questionable decision
          mergedNonLightTags[key] = aValue;

          warnings.push({
            type: 'bad_merge',
            value: `${key} chose “${aValue}” over “${bValue}”`,
          });
        }
      }
    }
  }

  // now deal with the lights.
  const mergedLightTags: Tags = {};

  // Part 1: start by adding all light tags from `a`
  for (const key in a.tags) {
    if (isLightTag(key)) {
      mergedLightTags[key] = a.tags[key];
    }
  }

  // Part 2: If `a` is a simple light, convert :light: to :light:1:
  const isAUnSectored = Object.keys(mergedLightTags).some(isUnsectoredLightTag);
  if (isAUnSectored && bothHaveLightTags) {
    duplicateLightTags(mergedLightTags, 1);
  }

  // Part 3: renumber the sectors of `b` to start after `a`'s sectors
  const highestSectorInA = getHighestSector(mergedLightTags);
  for (const key in b.tags) {
    if (isLightTag(key)) {
      if (SECTOR_KEY_REGEX.test(key)) {
        // already a sectored light
        const reNumberedKey = key.replace(
          SECTOR_KEY_REGEX,
          (_, sector) => `seamark:light:${highestSectorInA + +sector}:`,
        );
        mergedLightTags[reNumberedKey] = b.tags[key];
      } else {
        // not a sectored light
        const reNumberedKey = key.replace(
          'seamark:light:',
          `seamark:light:${highestSectorInA + 1}:`,
        );
        mergedLightTags[reNumberedKey] = b.tags[key];
      }
    }
  }

  return {
    // ialaId, country, lat, lng will be the same
    ...a,

    warnings: [...a.warnings, ...b.warnings],

    // merge all string properties, by adding an <hr /> inbetween
    orig: <FELight['orig']>Object.fromEntries(
      Object.keys(a.orig).map((key) => {
        const aValue: string = a.orig[<never>key] || '';
        const bValue: string = b.orig[<never>key] || '';
        return [key, `${aValue.trim()}\n---------\n${bValue.trim()}`.trim()];
      }),
    ),

    // use merged tags from above
    tags: sortObject({ ...mergedNonLightTags, ...mergedLightTags }),
  };
}
