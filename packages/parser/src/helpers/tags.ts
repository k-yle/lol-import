import type { Tags } from 'osm-api';

/**
 * For semicolon-delimeted tags, this function will add the newItem
 * to the string if it doesn't exist already
 * @param tags is mutated
 */
export function appendToTag(
  tags: Tags,
  key: string,
  newItem: string | undefined,
) {
  const existing = tags[key]?.split(';') || [];
  if (!newItem || existing.includes(newItem)) return;

  existing.push(newItem);
  tags[key] = existing.join(';');
}
