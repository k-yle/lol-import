import { describe, expect, it } from 'vitest';
import { conflateTags } from '../conflate';

describe('conflateTags', () => {
  it('replaces generic buoy/beacon tags with the value from osm', () => {
    const expeced = {
      'seamark:type': 'beacon',
      'seamark:beacon:colour': 'pink',
    };
    const actual = {
      'seamark:type': 'beacon_lateral',
      'seamark:beacon_lateral:colour': 'pink',
    };

    expect(conflateTags(expeced, actual)).toStrictEqual({});
  });

  it('keeps the generic buoy/beacon tags if osm has no proper tag', () => {
    const expeced = {
      'seamark:type': 'beacon',
      'seamark:beacon:colour': 'pink',
    };
    const actual = {
      'seamark:type': 'light_minor',
    };

    expect(conflateTags(expeced, actual)).toStrictEqual({
      // we respect the existing value for seamark:type
      'seamark:beacon:colour': 'pink',
    });
  });
});
