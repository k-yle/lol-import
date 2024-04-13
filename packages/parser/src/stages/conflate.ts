import type { Tags } from 'osm-api';

/**
 * Compares the expected vs actual tags, returns a diff
 * of which tags need updating.
 */
export function conflateTags(expected: Tags, actual: Tags): Tags {
  const diff: Tags = {};

  // part 1: ensure the semark:type is correct, prefer the value in OSM if we're unsure

  const expectedType = expected['seamark:type'];
  const actualType = actual['seamark:type'];
  if (
    // if LOL doesn't know the exact beacon/buoy…
    (expectedType === 'beacon' || expectedType === 'buoy') &&
    // …but OSM already has a specific type
    /^(beacon|buoy)_/.test(actualType)
  ) {
    /* eslint-disable no-param-reassign, @typescript-eslint/no-dynamic-delete */
    expected['seamark:type'] = actualType;

    // rename seamark:(beacon|buoy):* tags to use the actual type
    for (const key in expected) {
      if (key.includes(`:${expectedType}:`)) {
        expected[key.replace(`:${expectedType}:`, `:${actualType}:`)] =
          expected[key];
        delete expected[key];
      }
    }
  }

  // part 2: conflate tags

  for (const key in expected) {
    if (actual[key] === expected[key]) continue;

    // special case: if we suggest "yes", then any
    // more specific value is allowed, except "no".
    if (expected[key] === 'yes' && actual[key] && actual[key] !== 'no') {
      continue;
    }

    // special case: some tags can have any value, it just needs to exist
    if (key === 'seamark:type' && actual[key]) continue;
    if (key === 'seamark:name' && actual[key]) continue;

    // special case: sequence is valid in reverse if it only has 2 parts
    if (key === 'seamark:light:sequence') {
      const existing = actual[key]?.split('+');
      const existingReversed = existing?.reverse().join('+');
      if (existing?.length === 2 && existingReversed === expected[key]) {
        continue;
      }
    }

    // for shapes, some shapes are effectively the same
    if (key.endsWith(':shape')) {
      const synonyms: Record<string, string> = {
        square: 'cylinder',
      };

      if (
        (synonyms[actual[key]] || actual[key]) ===
        (synonyms[expected[key]] || expected[key])
      ) {
        continue;
      }
    }

    // compare height as a number, e.g. to avoid flagging '3.0' != '3'
    if (key.endsWith(':height') && +actual[key] === +expected[key]) continue;

    // special case: don't require adding semark:*:system=iala-a to every
    // feature, since it's the default value.
    if (key.endsWith(':system') && !actual[key] && expected[key] === 'iala-a') {
      continue;
    }

    // special case: the source tag is a semicolon delimited list,
    // it needs to contain the US NGA entry. When we update it, we
    // remove the old US NGA entry.
    if (key === 'source') {
      if (actual[key]?.includes(expected[key])) {
        // source tag already contains the US NGA entry with the correct date
      } else {
        const sources = (actual[key] || '').split(';');
        const newSources = sources.filter(
          (line) => !line.startsWith('US NGA Pub.'),
        );

        // to reduce noise in the diff, try to insert at the old index
        const oldIndex = sources.findIndex((line) =>
          line.startsWith('US NGA Pub.'),
        );
        if (oldIndex === -1) {
          newSources.push(expected[key]);
        } else {
          newSources.splice(oldIndex, 0, expected[key]);
        }

        diff[key] = newSources.join(';');
      }
      continue;
    }

    // if we get to here, the value needs updating
    diff[key] = expected[key];
  }
  return diff;
}
