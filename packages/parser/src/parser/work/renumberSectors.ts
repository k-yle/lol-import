import type { Tags } from 'osm-api';
import { getHighestSector } from '../../stages/merge';
import { pick } from '../../helpers/general';
import { isLightTag } from '../../helpers/duplicateLightTags';

export function groupSectorsByBearing(tags: Tags) {
  const byBearing: Record<string, Tags> = {};

  const highestSector = getHighestSector(tags);
  for (let index = 1; index <= highestSector; index++) {
    const start = +tags[`seamark:light:${index}:sector_start`];
    const end = +tags[`seamark:light:${index}:sector_end`];

    let sectorId = <const>`${start}-${end}`;

    // there are duplicate sectors, so ensure they have a unique name
    while (byBearing[sectorId]) sectorId += '-';

    byBearing[sectorId] = Object.fromEntries(
      Object.entries(tags)
        .filter(([key]) => key.startsWith(`seamark:light:${index}:`))
        .map(([key, value]) => [key.split(':')[3], value]),
    );
    byBearing[sectorId].__index = `${index}`;
  }
  return byBearing;
}

export function renumberSectors(lolTags: Tags, osmTags: Tags) {
  // if there are no sectors, then there's nothing to do
  if (!getHighestSector(lolTags)) return { tags: lolTags };

  const lolGrouped = groupSectorsByBearing(lolTags);
  const osmGrouped = groupSectorsByBearing(osmTags);

  let nextFreeIndex = getHighestSector(osmTags);

  /** map of new to old index */
  const indexMap: Record<number, number | undefined> = {};
  const mappedTags: Tags = {};
  for (const [sectorId, sector] of Object.entries(lolGrouped)) {
    const matchingGroup = osmGrouped[sectorId];

    const newIndex = matchingGroup ? +matchingGroup.__index : ++nextFreeIndex;
    for (const subKey in sector) {
      if (subKey.startsWith('__')) continue;
      mappedTags[`seamark:light:${newIndex}:${subKey}`] = sector[subKey];
    }
    delete osmGrouped[sectorId];
    indexMap[newIndex] = +sector.__index;
  }

  for (const unexpectedSector of Object.values(osmGrouped)) {
    for (const subKey in unexpectedSector) {
      if (subKey.startsWith('__')) continue;
      mappedTags[`seamark:light:${unexpectedSector.__index}:${subKey}`] = '🗑️';
    }
    indexMap[+unexpectedSector.__index] = undefined;
  }

  const nonLightTags = pick(lolTags, (key) => !isLightTag(key));

  return {
    tags: { ...nonLightTags, ...mappedTags },
    indexMap,
  };
}
