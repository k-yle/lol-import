import { describe, expect, it } from 'vitest';
import { groupSectorsByBearing, renumberSectors } from '../renumberSectors';

const K3745lol = {
  'seamark:beacon:construction': 'metal',
  'seamark:beacon:shape': 'column',
  'seamark:information': 'Range 4M by day',
  'seamark:light:1:category': 'directional',
  'seamark:light:1:character': 'F',
  'seamark:light:1:colour': 'green',
  'seamark:light:1:height': '23',
  'seamark:light:1:sector_end': '214.5',
  'seamark:light:1:sector_start': '213.5',
  'seamark:light:2:category': 'directional',
  'seamark:light:2:character': 'Al',
  'seamark:light:2:colour': 'green;white',
  'seamark:light:2:height': '23',
  'seamark:light:2:sector_end': '215.5',
  'seamark:light:2:sector_start': '214.5',
  'seamark:light:3:category': 'directional',
  'seamark:light:3:character': 'F',
  'seamark:light:3:colour': 'white',
  'seamark:light:3:height': '23',
  'seamark:light:3:sector_end': '216.5',
  'seamark:light:3:sector_start': '215.5',
  'seamark:light:4:category': 'directional',
  'seamark:light:4:character': 'Al',
  'seamark:light:4:colour': 'white;red',
  'seamark:light:4:height': '23',
  'seamark:light:4:sector_end': '217.5',
  'seamark:light:4:sector_start': '216.5',
  'seamark:light:5:category': 'directional',
  'seamark:light:5:character': 'F',
  'seamark:light:5:colour': 'red',
  'seamark:light:5:height': '23',
  'seamark:light:5:sector_end': '218.5',
  'seamark:light:5:sector_start': '217.5',
  'seamark:light:reference': 'K 3745',
  'seamark:name': 'Approach',
  'seamark:type': 'beacon',
  source: 'US NGA Pub. 111. 2024-04-15.',
};

const K3745osm = {
  description:
    'Alternating red light range 17.0M\nAlternating green light range 17.0M',
  height: '23',
  'ref:linz:hydrographic_id': '125414;125416;125417;125418;125420;125423',
  'seamark:light:1:character': 'Al',
  'seamark:light:1:colour': 'red;white',
  'seamark:light:1:exhibition': 'night',
  'seamark:light:1:height': '23',
  'seamark:light:1:range': '21',
  'seamark:light:1:sector_end': '217.5',
  'seamark:light:1:sector_start': '216.5',
  'seamark:light:2:character': 'F',
  'seamark:light:2:colour': 'red',
  'seamark:light:2:exhibition': 'night',
  'seamark:light:2:height': '23',
  'seamark:light:2:range': '17',
  'seamark:light:2:sector_end': '218.5',
  'seamark:light:2:sector_start': '217.5',
  'seamark:light:3:exhibition': 'day',
  'seamark:light:3:height': '23',
  'seamark:light:3:range': '4',
  'seamark:light:4:category': 'directional',
  'seamark:light:4:character': 'F',
  'seamark:light:4:colour': 'white',
  'seamark:light:4:exhibition': 'night',
  'seamark:light:4:height': '23',
  'seamark:light:4:range': '21',
  'seamark:light:4:sector_end': '216.5',
  'seamark:light:4:sector_start': '215.5',
  'seamark:light:5:character': 'Al',
  'seamark:light:5:colour': 'green;white',
  'seamark:light:5:exhibition': 'night',
  'seamark:light:5:height': '23',
  'seamark:light:5:range': '21',
  'seamark:light:5:sector_end': '215.5',
  'seamark:light:5:sector_start': '214.5',
  'seamark:light:6:exhibition': 'day',
  'seamark:light:6:colour': 'blue',
  'seamark:light:6:height': '23',
  'seamark:light:6:range': '4',
  'seamark:light:reference': 'K 3745',
  'seamark:type': 'light_minor',
  source: 'US NGA Pub. 111. 2010-09-02.;LINZ;Auckland Harbour East Chart',
};

const unsectored = {
  'seamark:light:character': 'F',
  'seamark:light:colour': 'red',
  'seamark:light:height': '12',
  'seamark:light:range': '6',
  'seamark:light:reference': 'K 1234',
  'seamark:type': 'light_minor',
  source: 'US NGA Pub. 111. 2010-09-02.',
};

describe('groupSectorsByBearing', () => {
  it('can group by sector', () => {
    expect(groupSectorsByBearing(K3745osm)).toStrictEqual({
      '214.5-215.5': {
        __index: '5',
        character: 'Al',
        colour: 'green;white',
        exhibition: 'night',
        height: '23',
        range: '21',
        sector_end: '215.5',
        sector_start: '214.5',
      },
      '215.5-216.5': {
        __index: '4',
        category: 'directional',
        character: 'F',
        colour: 'white',
        exhibition: 'night',
        height: '23',
        range: '21',
        sector_end: '216.5',
        sector_start: '215.5',
      },
      '216.5-217.5': {
        __index: '1',
        character: 'Al',
        colour: 'red;white',
        exhibition: 'night',
        height: '23',
        range: '21',
        sector_end: '217.5',
        sector_start: '216.5',
      },
      '217.5-218.5': {
        __index: '2',
        character: 'F',
        colour: 'red',
        exhibition: 'night',
        height: '23',
        range: '17',
        sector_end: '218.5',
        sector_start: '217.5',
      },
      'NaN-NaN': {
        __index: '3',
        // sector 3 in the input has no bearings
        exhibition: 'day',
        height: '23',
        range: '4',
      },
      'NaN-NaN-': {
        __index: '6',
        // sector 6 in the input has no bearings
        colour: 'blue',
        exhibition: 'day',
        height: '23',
        range: '4',
      },
    });
  });
});

describe('groupSectorsByBearing', () => {
  it('can group by sector', () => {
    expect(renumberSectors(K3745lol, K3745osm)).toStrictEqual({
      indexMap: { 1: 4, 2: 5, 3: undefined, 4: 3, 5: 2, 6: undefined, 7: 1 },
      tags: {
        // non-sectored tags are retained
        'seamark:beacon:construction': 'metal',
        'seamark:beacon:shape': 'column',
        'seamark:information': 'Range 4M by day',
        'seamark:light:reference': 'K 3745',
        'seamark:name': 'Approach',
        'seamark:type': 'beacon',
        source: 'US NGA Pub. 111. 2024-04-15.',

        // was 4, now 1
        'seamark:light:1:category': 'directional',
        'seamark:light:1:character': 'Al',
        'seamark:light:1:colour': 'white;red',
        'seamark:light:1:height': '23',
        'seamark:light:1:sector_end': '217.5',
        'seamark:light:1:sector_start': '216.5',

        // was 5, now 2
        'seamark:light:2:category': 'directional',
        'seamark:light:2:character': 'F',
        'seamark:light:2:colour': 'red',
        'seamark:light:2:height': '23',
        'seamark:light:2:sector_end': '218.5',
        'seamark:light:2:sector_start': '217.5',

        // 3 is in use for something else we don't know about
        'seamark:light:3:exhibition': '🗑️',
        'seamark:light:3:height': '🗑️',
        'seamark:light:3:range': '🗑️',

        // was 3, now 4
        'seamark:light:4:category': 'directional',
        'seamark:light:4:character': 'F',
        'seamark:light:4:colour': 'white',
        'seamark:light:4:height': '23',
        'seamark:light:4:sector_end': '216.5',
        'seamark:light:4:sector_start': '215.5',

        // was 5, now 2
        'seamark:light:5:category': 'directional',
        'seamark:light:5:character': 'Al',
        'seamark:light:5:colour': 'green;white',
        'seamark:light:5:height': '23',
        'seamark:light:5:sector_end': '215.5',
        'seamark:light:5:sector_start': '214.5',

        // 6 is in use for something else we don't know about
        'seamark:light:6:colour': '🗑️',
        'seamark:light:6:exhibition': '🗑️',
        'seamark:light:6:height': '🗑️',
        'seamark:light:6:range': '🗑️',

        // was 1, now 7 (new sector)
        'seamark:light:7:category': 'directional',
        'seamark:light:7:character': 'F',
        'seamark:light:7:colour': 'green',
        'seamark:light:7:height': '23',
        'seamark:light:7:sector_end': '214.5',
        'seamark:light:7:sector_start': '213.5',
      },
    });
  });

  it('does nothing if osm matches lol', () => {
    expect(renumberSectors(K3745lol, K3745lol)).toStrictEqual({
      indexMap: { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 },
      tags: K3745lol,
    });
  });

  it('does nothing if osm has no sectors', () => {
    expect(renumberSectors(K3745lol, {})).toStrictEqual({
      indexMap: { '1': 1, '2': 2, '3': 3, '4': 4, '5': 5 },
      tags: K3745lol,
    });
  });

  it('handles unsectored lights', () => {
    expect(renumberSectors(unsectored, {})).toStrictEqual({ tags: unsectored });
    expect(renumberSectors(unsectored, unsectored)).toStrictEqual({
      tags: unsectored,
    });
  });
});
