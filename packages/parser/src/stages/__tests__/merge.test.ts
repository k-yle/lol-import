import { describe, expect, it } from 'vitest';
import type { Tags } from 'osm-api';
import { getHighestSector, mergeLights } from '../merge';
import type { FELight, LolFeature } from '../../helpers/types';

describe('getHighestSector', () => {
  it.each<[number, Tags]>([
    [0, {}],
    [0, { 'seamark:light:colour': 'green' }],
    [1, { 'seamark:light:1:colour': 'green' }],
    [
      2,
      { 'seamark:light:2:colour': 'green', 'seamark:light:1:colour': 'green' },
    ],
    [
      5,
      { 'seamark:light:1:colour': 'green', 'seamark:light:5:colour': 'green' },
    ],
  ])('%s for %s', (result, tags) => {
    expect(getHighestSector(tags)).toBe(result);
  });
});

const partialMock = (lx: Partial<FELight>) =>
  <FELight>{ warnings: [], orig: {}, tags: {}, ...lx };

describe('mergeLights', () => {
  describe('orig', () => {
    it('can merge the original data', () => {
      expect(
        mergeLights(
          partialMock({
            orig: <LolFeature>{
              range: '7 Nm',
              characteristic: 'F.W.',
              structure: '',
            },
          }),
          partialMock({
            orig: <LolFeature>{ range: '5 Nm', structure: 'red lantern' },
          }),
          [],
        ).orig,
      ).toStrictEqual({
        characteristic: 'F.W.\n---------',
        range: '7 Nm\n---------\n5 Nm',
        structure: '---------\nred lantern',
      });
    });
  });

  describe('Lx tags', () => {
    it('can merge 2 lights with no sectors', () => {
      expect(
        mergeLights(
          partialMock({ tags: { 'seamark:light:colour': 'green' } }),
          partialMock({ tags: { 'seamark:light:colour': 'pink' } }),
          [],
        ).tags,
      ).toStrictEqual({
        'seamark:light:1:colour': 'green',
        'seamark:light:2:colour': 'pink',
      });
    });

    it('can merge 1 lights with sectors and one without (case a)', () => {
      expect(
        mergeLights(
          partialMock({ tags: { 'seamark:light:colour': 'green' } }),
          partialMock({
            tags: {
              'seamark:light:1:colour': 'pink',
              'seamark:light:2:colour': 'red',
            },
          }),
          [],
        ).tags,
      ).toStrictEqual({
        'seamark:light:1:colour': 'green',
        'seamark:light:2:colour': 'pink',
        'seamark:light:3:colour': 'red',
      });
    });

    it('can merge 1 lights with sectors and one without (case b)', () => {
      expect(
        mergeLights(
          partialMock({
            tags: {
              'seamark:light:1:colour': 'pink',
              'seamark:light:2:colour': 'red',
            },
          }),
          partialMock({ tags: { 'seamark:light:colour': 'green' } }),
          [],
        ).tags,
      ).toStrictEqual({
        'seamark:light:1:colour': 'pink',
        'seamark:light:2:colour': 'red',
        'seamark:light:3:colour': 'green',
      });
    });

    it('can merge 2 lights with sectors', () => {
      expect(
        mergeLights(
          partialMock({
            tags: {
              'seamark:light:1:colour': 'pink',
              'seamark:light:2:colour': 'red',
            },
          }),
          partialMock({
            tags: {
              'seamark:light:1:colour': 'green',
              'seamark:light:2:colour': 'blue',
            },
          }),
          [],
        ).tags,
      ).toStrictEqual({
        'seamark:light:1:colour': 'pink',
        'seamark:light:2:colour': 'red',
        'seamark:light:3:colour': 'green',
        'seamark:light:4:colour': 'blue',
      });
    });
  });

  describe('non-lx tags', () => {
    it('can merge generic tags', () => {
      expect(
        mergeLights(
          partialMock({
            tags: {
              'seamark:type': 'buoy_lateral',
              'seamark:buoy_lateral:colour': 'green',
            },
          }),
          partialMock({
            tags: {
              'seamark:type': 'light_minor',
              'seamark:radio_station:mmsi': '132',
            },
          }),
          [],
        ).tags,
      ).toStrictEqual({
        'seamark:type': 'buoy_lateral', // it picked the first one arbitrarily
        'seamark:buoy_lateral:colour': 'green',
        'seamark:radio_station:mmsi': '132',
      });
    });
  });

  it('can recursively merge 3 features, where only 1 is a light (real case)', () => {
    const a: FELight = {
      country: 'NZ',
      lat: -39.8506,
      lon: 174.1202,
      warnings: [{ type: 'a', value: 'a' }],
      orig: {
        characteristic: 'Mo.(U)W.\nperiod 15s \n',
        name: 'NEW ZEALAND-NORTH ISLAND\nKupe Platform.',
        remarks: '1 on each corner.\n',
        structure: 'Platform.\n',
        heightFeetMeters: '79\n24',
        range: '10',
      },
      tags: {
        'seamark:name': 'Kupe Platform',
        'seamark:beacon:shape': 'platform',
        'seamark:light:reference': 'K 4084.5',
        'seamark:type': 'beacon',
        source: 'US NGA Pub. 111. 2024-04-15.',
        'seamark:information': '1 on each corner',
        'seamark:light:height': '24',
        'seamark:light:range': '10',
        'seamark:light:colour': 'white',
        'seamark:light:character': 'Mo',
        'seamark:light:group': 'U',
        'seamark:light:period': '15',
      },
    };
    const b: FELight = {
      country: 'NZ',
      lat: -39.8506,
      lon: 174.1202,
      warnings: [{ type: 'b', value: 'b' }],
      orig: {
        characteristic: 'U(• • - )\n',
        name: 'NEW ZEALAND-NORTH ISLAND\nRACON',
        remarks: null,
        structure: null,
        heightFeetMeters: null,
        range: null,
      },
      tags: {
        'seamark:radar_transponder:category': 'racon',
        'seamark:light:reference': 'K 4084.5',
        'seamark:type': 'radar_transponder',
        source: 'US NGA Pub. 111. 2024-04-15.',
        'seamark:radar_transponder:group': 'U',
      },
    };
    const c: FELight = {
      country: 'NZ',
      lat: -39.8506,
      lon: 174.1202,
      warnings: [],
      orig: {
        characteristic: 'U(• • - )\n',
        name: 'NEW ZEALAND-NORTH ISLAND\nRACON',
        remarks: null,
        structure: null,
        heightFeetMeters: null,
        range: null,
      },
      tags: {
        'seamark:radar_transponder:category': 'racon',
        'seamark:light:reference': 'K 4084.5',
        'seamark:type': 'radar_transponder',
        source: 'US NGA Pub. 111. 2024-04-15.',
        'seamark:radar_transponder:group': 'U',
      },
    };
    expect(mergeLights(mergeLights(a, b, []), c, [])).toStrictEqual({
      country: 'NZ',
      lat: -39.8506,
      lon: 174.1202,
      warnings: [
        { type: 'a', value: 'a' },
        { type: 'b', value: 'b' },
      ],
      orig: {
        characteristic: `Mo.(U)W.
period 15s
---------
U(• • - )
---------
U(• • - )`,
        heightFeetMeters: `79
24
---------
---------`,
        name: `NEW ZEALAND-NORTH ISLAND
Kupe Platform.
---------
NEW ZEALAND-NORTH ISLAND
RACON
---------
NEW ZEALAND-NORTH ISLAND
RACON`,
        range: `10
---------
---------`,
        remarks: `1 on each corner.
---------
---------`,
        structure: `Platform.
---------
---------`,
      },
      tags: {
        'seamark:beacon:shape': 'platform',
        'seamark:information': '1 on each corner',
        // in this case, we didn't need to convert :light: to :light:1:
        'seamark:light:character': 'Mo',
        'seamark:light:colour': 'white',
        'seamark:light:group': 'U',
        'seamark:light:height': '24',
        'seamark:light:period': '15',
        'seamark:light:range': '10',
        'seamark:light:reference': 'K 4084.5',
        'seamark:name': 'Kupe Platform',
        'seamark:radar_transponder:category': 'racon',
        'seamark:radar_transponder:group': 'U',
        'seamark:type': 'beacon',
        source: 'US NGA Pub. 111. 2024-04-15.',
      },
    });
  });

  it('can recursively merge 3 features (where both are lights)', () => {
    const a: FELight = {
      country: 'NZ',
      lat: -39.5552,
      lon: 173.4493,
      warnings: [
        {
          type: 'invalid_lens_height',
          value:
            '2 different lens heights (69, 161), but only 1 light was detected',
        },
      ],
      orig: {
        characteristic:
          'Oc.R.\nperiod 10s \nnullfl. 6.0s, ec. 4.0s \nfl. 3.0s, ec. 1.0s \nfl. 1.0s, ec. 1.0s \n',
        name: 'NEW ZEALAND-NORTH ISLAND',
        remarks: 'Visible 038°-060°, marks pipeline.  On SW side.\n',
        structure: null,
        heightFeetMeters: 'null\n69\n21\n161\n49',
        range: '5',
      },
      tags: {
        'seamark:light:reference': 'K 4087',
        'seamark:type': 'light_minor',
        source: 'US NGA Pub. 111. 2024-04-15.',
        'seamark:light:1:range': '5',
        'seamark:light:1:sector_start': '38',
        'seamark:light:1:sector_end': '60',
        'seamark:light:1:colour': 'red',
        'seamark:light:1:character': 'Oc',
        'seamark:light:1:period': '10',
        'seamark:light:1:sequence': '6+(4)+3+(1)+1+(1)',
      },
    };
    const b: FELight = {
      country: 'NZ',
      lat: -39.5552,
      lon: 173.4493,
      warnings: [],
      orig: {
        characteristic:
          'Mo.(U)W.\nperiod 15s \nfl. 1.2s, ec. 12.0s \nfl. 0.4s, ec. 0.5s \nfl. 0.4s, ec. 0.5s \n',
        name: 'NEW ZEALAND-NORTH ISLAND\nMāui A.',
        remarks:
          'Horn: Mo.(U) 3 bl. ev. 30s (bl. 2.5s, si. 24.1s; bl. 0.7s, si. 1.0s; bl. 0.7s, si. 1.0s)\n',
        structure: null,
        heightFeetMeters: 'null\n89\n27',
        range: '10',
      },
      tags: {
        'seamark:name': 'Māui A',
        'seamark:light:reference': 'K 4087',
        'seamark:type': 'light_minor',
        source: 'US NGA Pub. 111. 2024-04-15.',
        'seamark:information':
          'Horn: Mo.(U) 3 bl. ev. 30s (bl. 2.5s, si. 24.1s; bl. 0.7s, si. 1.0s; bl. 0.7s, si. 1.0s)',
        'seamark:light:height': '89',
        'seamark:light:range': '10',
        'seamark:light:colour': 'white',
        'seamark:light:character': 'Mo',
        'seamark:light:group': 'U',
        'seamark:light:period': '15',
        'seamark:light:sequence': '1.2+(12)+0.4+(0.5)+0.4+(0.5)',
      },
    };
    expect(mergeLights(a, b, [])).toStrictEqual({
      country: 'NZ',
      lat: -39.5552,
      lon: 173.4493,
      warnings: [
        {
          type: 'invalid_lens_height',
          value:
            '2 different lens heights (69, 161), but only 1 light was detected',
        },
      ],
      orig: {
        characteristic: `Oc.R.
period 10s${' '}
nullfl. 6.0s, ec. 4.0s${' '}
fl. 3.0s, ec. 1.0s${' '}
fl. 1.0s, ec. 1.0s
---------
Mo.(U)W.
period 15s${' '}
fl. 1.2s, ec. 12.0s${' '}
fl. 0.4s, ec. 0.5s${' '}
fl. 0.4s, ec. 0.5s`,
        name: `NEW ZEALAND-NORTH ISLAND
---------
NEW ZEALAND-NORTH ISLAND
Māui A.`,
        remarks: `Visible 038°-060°, marks pipeline.  On SW side.
---------
Horn: Mo.(U) 3 bl. ev. 30s (bl. 2.5s, si. 24.1s; bl. 0.7s, si. 1.0s; bl. 0.7s, si. 1.0s)`,
        structure: '---------',
        heightFeetMeters: `null
69
21
161
49
---------
null
89
27`,
        range: `5
---------
10`,
      },
      tags: {
        'seamark:light:reference': 'K 4087',
        'seamark:type': 'light_minor',
        source: 'US NGA Pub. 111. 2024-04-15.',
        'seamark:name': 'Māui A',
        'seamark:information':
          'Horn: Mo.(U) 3 bl. ev. 30s (bl. 2.5s, si. 24.1s; bl. 0.7s, si. 1.0s; bl. 0.7s, si. 1.0s)',
        'seamark:light:1:range': '5',
        'seamark:light:1:sector_start': '38',
        'seamark:light:1:sector_end': '60',
        'seamark:light:1:colour': 'red',
        'seamark:light:1:character': 'Oc',
        'seamark:light:1:period': '10',
        'seamark:light:1:sequence': '6+(4)+3+(1)+1+(1)',
        'seamark:light:2:height': '89',
        'seamark:light:2:range': '10',
        'seamark:light:2:colour': 'white',
        'seamark:light:2:character': 'Mo',
        'seamark:light:2:group': 'U',
        'seamark:light:2:period': '15',
        'seamark:light:2:sequence': '1.2+(12)+0.4+(0.5)+0.4+(0.5)',
      },
    });
  });
});
