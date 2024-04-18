import { createHash } from 'node:crypto';
import type { Tags } from 'osm-api';

const EXCLUDE_FROM_DIFF = new Set([
  'source',
  'seamark:name',
  'seamark:information',
]);

export function createDiffHash(oldTags: Tags, tagDiff: Tags) {
  const stringDiff = Object.keys(tagDiff)
    .filter((key) => !EXCLUDE_FROM_DIFF.has(key))
    .map((key) => `${key}\t${oldTags[key] || ''}\t${tagDiff[key]}`)
    .join('\n');

  if (!stringDiff) return '';

  return createHash('sha256').update(stringDiff).digest('hex').slice(0, 6);
}
