import type { Tags } from 'osm-api';
import { mapObject, pick, sortObject } from '../../helpers/general';
import type { FELight, Warning } from '../../helpers/types';
import { getHighestSector } from '../../stages/merge';
import { isLightTag } from '../../helpers/duplicateLightTags';

export function deleteSector(tags: Tags, sectorToRemove: number) {
  return pick(
    tags,
    (key) => !isLightTag(key) || +key.split(':', 3)[2] !== sectorToRemove,
  );
}

export function reshuffleSectors(tags: Tags) {
  const highestSector = getHighestSector(tags);

  const shuffledTags: Tags = {};
  for (let oldIndex = 1, newIndex = 1; oldIndex <= highestSector; oldIndex++) {
    const tagsForThisSector = pick(tags, (k) =>
      k.startsWith(`seamark:light:${oldIndex}:`),
    );
    if (Object.keys(tagsForThisSector).length) {
      Object.assign(
        shuffledTags,
        mapObject(
          tagsForThisSector,
          ([k, v]) => <const>[k.replace(`:${oldIndex}:`, `:${newIndex}:`), v],
        ),
      );
      newIndex++;
    }
  }

  return {
    ...pick(tags, (key) => !isLightTag(key)), // non-sectored tags
    ...shuffledTags,
  };
}

export function removeDuplicateSectors(light: FELight, warnings: Warning[]) {
  const values: string[] = [];

  const highestSector = getHighestSector(light.tags);
  for (let index = 1; index <= highestSector; index++) {
    const tagsForThisSector = Object.fromEntries(
      Object.entries(light.tags)
        .filter(([key]) => key.startsWith(`seamark:light:${index}:`))
        .map(([key, value]) => [key.split(':', 4)[3], value]),
    );
    const stringifiedTags = Object.entries(sortObject(tagsForThisSector))
      .map((kv) => kv.join('='))
      .join(' ');

    values.push(stringifiedTags);
  }

  const duplicateCount = values.length - new Set(values).size;
  if (duplicateCount === 0) return;

  for (let index = 1; index <= highestSector; index++) {
    const isDuplicate = values.indexOf(values[index]) !== index;
    if (isDuplicate) {
      light.tags = deleteSector(light.tags, index + 1);
    }
  }

  light.tags = sortObject(reshuffleSectors(light.tags));

  warnings.push({
    severity: 'info',
    type: 'duplicate_sectors',
    value: `Removed ${duplicateCount} sector(s)`,
  });
}
