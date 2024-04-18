import { describe, expect, it } from 'vitest';
import { type Remark, parseRemarks } from '../parseRemarks';
import type { LolFeature, Warning } from '../../../helpers/types';

describe('parseRemarks', () => {
  describe('fog signals', () => {
    it.each`
      group   | period    | category     | sequence                 | remarks
      ${'5'}  | ${'10'}   | ${'siren'}   | ${''}                    | ${'siren: 5 bl. ev. 10s'}
      ${'DX'} | ${'1.23'} | ${'horn'}    | ${''}                    | ${'horn: Mo.(DX) ev. 1.23s'}
      ${'U'}  | ${'5'}    | ${'whistle'} | ${''}                    | ${'whistle: Mo(U) ev. 5s'}
      ${'5'}  | ${'10'}   | ${'horn'}    | ${'2.0+(3.0)+4.1+(5.2)'} | ${'horn: 5 bl. ev. 10s (bl. 2.0s,  si. 3.0s; bl. 4.1s,  si. 5.2s)'}
      ${'5'}  | ${'10'}   | ${'bell'}    | ${'2.0+(3.0)'}           | ${'bell: 5 bl. ev. 10s (stroke 2.0s,  si. 3.0s)'}
    `('$remarks', ({ remarks, group, period, category, sequence }) => {
      const warnings: Warning[] = [];
      expect(parseRemarks(<LolFeature>{ remarks }, warnings)).toStrictEqual([
        {
          type: 'genericTags',
          tags: {
            'seamark:fog_signal:group': group,
            'seamark:fog_signal:period': period,
            'seamark:fog_signal:category': category,
            'seamark:fog_signal:sequence': sequence,
          },
        },
      ]);
      expect(warnings).toStrictEqual([]);
    });

    it('directional fog horn', () => {
      const remarks = 'Horn points 103°30`. (bl. 4.0s,  si. 56.0s)';

      const warnings: Warning[] = [];
      expect(parseRemarks(<LolFeature>{ remarks }, warnings)).toStrictEqual([
        {
          type: 'genericTags',
          tags: {
            'seamark:fog_signal:category': 'horn',
            'seamark:fog_signal:orientation': '103.5',
            'seamark:fog_signal:period': '60', // inferred
            'seamark:fog_signal:sequence': '4.0+(56.0)',
          },
        },
      ]);
      expect(warnings).toStrictEqual([]);
    });
  });

  describe('AIS', () => {
    it.each`
      mmsi          | remarks
      ${'12345678'} | ${'AIS (MMSI No 12345678)'}
      ${'87654321'} | ${'AIS(MMSI No 87654321)'}
    `('$remarks', ({ remarks, mmsi }) => {
      const warnings: Warning[] = [];
      expect(parseRemarks(<LolFeature>{ remarks }, warnings)).toStrictEqual([
        {
          type: 'genericTags',
          tags: {
            'seamark:radio_station:category': 'ais',
            'seamark:radio_station:mmsi': mmsi,
          },
        },
      ]);
      expect(warnings).toStrictEqual([]);
    });
  });

  describe('visible bearing', () => {
    it.each`
      start                 | end     | remarks                        | extra
      ${123.4}              | ${56.3} | ${'Visible 123.4°-56°18`'}     | ${[]}
      ${123.06666666666666} | ${56.3} | ${"Visible 123°4'-56°18`"}     | ${[]}
      ${256}                | ${118}  | ${'Visible 256°-118°.  XXXX.'} | ${[{ type: 'unknown', line: 'XXXX' }]}
    `('$remarks', ({ remarks, start, end, extra }) => {
      const warnings: Warning[] = [];
      expect(parseRemarks(<LolFeature>{ remarks }, warnings)).toStrictEqual([
        {
          type: 'sectorCharacteristics',
          sectors: [{ characteristics: '', start, end, visibility: '' }], // blank visibility means visible
        },
        ...extra,
      ]);
      expect(warnings).toStrictEqual([]);
    });

    it('handles multiple bearings', () => {
      const warnings: Warning[] = [];
      expect(
        parseRemarks(
          <LolFeature>{
            remarks: 'Visible 350°36`-006°36` and 008°18`-227°.\n',
          },
          warnings,
        ),
      ).toStrictEqual([
        {
          type: 'sectorCharacteristics',
          sectors: [
            {
              characteristics: '',
              start: 350.6,
              end: 6.6,
              visibility: '', // blank means visible
            },
            {
              characteristics: '',
              start: 8.3,
              end: 227,
              visibility: '', // blank means visible
            },
          ],
        },
      ]);
      expect(warnings).toStrictEqual([]);
    });
  });

  describe('safety distance', () => {
    it.each`
      distance | remarks
      ${'30'}  | ${'Safety Distance 30m'}
      ${'2'}   | ${'Safety Distance 2 meters'}
      ${'20'}  | ${'Safety Distance 20M'}
    `('$remarks', ({ remarks, distance }) => {
      const warnings: Warning[] = [];
      expect(parseRemarks(<LolFeature>{ remarks }, warnings)).toStrictEqual([
        { type: 'genericTags', tags: { 'seamark:safety_distance': distance } },
      ]);
      expect(warnings).toStrictEqual([]);
    });
  });

  describe('common hardcoded remarks', () => {
    it.each`
      tags                                     | remarks
      ${{ 'seamark:light:exhibition': '24h' }} | ${'Shown 24 hours'}
      ${{ 'seamark:radar_reflector': 'yes' }}  | ${'rAdaR rEfLeCtOr'}
    `('$remarks', ({ remarks, tags }) => {
      const warnings: Warning[] = [];
      expect(parseRemarks(<LolFeature>{ remarks }, warnings)).toStrictEqual([
        { type: 'genericTags', tags },
      ]);
      expect(warnings).toStrictEqual([]);
    });
  });

  describe('calendar', () => {
    it.each`
      openingHours               | remarks
      ${'yes @ (Feb 29-Oct 32)'} | ${'Shown FEB. 29 to Oct 32'}
      ${'yes @ (Feb 1-Dec 7)'}   | ${'shown feb.1 to dEc7'}
    `('$remarks', ({ remarks, openingHours }) => {
      const warnings: Warning[] = [];
      expect(parseRemarks(<LolFeature>{ remarks }, warnings)).toStrictEqual([
        {
          type: 'genericTags',
          tags: { lit: 'no', 'lit:conditional': openingHours },
        },
      ]);
      expect(warnings).toStrictEqual([]);
    });
  });

  describe('sectors', () => {
    it.each<[string, object, Remark[]?]>([
      [
        'F.G. 0°30`-360.5°',
        [{ characteristics: 'F.G', start: 0.5, end: 360.5 }],
      ],
      [
        '2QFl.RGB. 0°30`-360.5°',
        [{ characteristics: '2QFl.RGB', start: 0.5, end: 360.5 }],
      ],
      [
        "F.G. 213°30'-214°30', Al.G.W.-215?30`, F.W.-216°30', Al.W.R.-217°30', F.R.-218°30'. ",
        [
          { characteristics: 'F.G', start: 213.5, end: 214.5 },
          { characteristics: 'Al.G.W', start: 214.5, end: 215.5 },
          { characteristics: 'F.W', start: 215.5, end: 216.5 },
          { characteristics: 'Al.W.R', start: 216.5, end: 217.5 },
          { characteristics: 'F.R', start: 217.5, end: 218.5 },
        ],
      ],
      [
        'F.G. 178°.24`-179°.24`, Al.G.W.-179°.42`, F.W.-180°, Al.W.R.-180°.18`, F.R.-181°.18`.  Range 4M by day',
        [
          { characteristics: 'F.G', start: 178.004, end: 179.004 },
          {
            characteristics: 'Al.G.W',
            start: 179.004,
            end: 179.007,
          },
          { characteristics: 'F.W', start: 179.007, end: 180 },
          { characteristics: 'Al.W.R', start: 180, end: 180.003 },
          { characteristics: 'F.R', start: 180.003, end: 181.003 },
        ],
        [{ type: 'unknown', line: 'Range 4M by day' }],
      ],
    ])('%s', (remarks, sectors, extra = []) => {
      const warnings: Warning[] = [];
      expect(parseRemarks(<LolFeature>{ remarks }, warnings)).toStrictEqual([
        { type: 'sectorCharacteristics', sectors },
        ...extra,
      ]);
      expect(warnings).toStrictEqual([]);
    });
  });

  describe('full', () => {
    it.each<[string, object]>([
      [
        'Azimuth coverage 020°-196°.  (3  & 10cm )',
        [
          {
            type: 'genericTags',
            tags: { 'seamark:radar_transponder:wavelength': '0.03-X;0.10-S' },
          },
          {
            type: 'genericTags',
            tags: {
              'seamark:radar_transponder:sector_start': '20',
              'seamark:radar_transponder:sector_end': '196',
            },
          },
        ],
      ],
      [
        'Azimuth coverage 020°-196°30`.',
        [
          {
            type: 'genericTags',
            tags: {
              'seamark:radar_transponder:sector_start': '20',
              'seamark:radar_transponder:sector_end': '196.5',
            },
          },
        ],
      ],
      [
        'R.(unintensified) 040°-062°48`, Vi. (intensified) -130°, G.-198°48`, B.-344°, W.-040°.  Shown 24 hours Nov. 1 to Mar. 31',
        [
          {
            type: 'genericTags',
            tags: {
              'seamark:light:exhibition:conditional': '24h @ (Nov 1-Mar 31)',
            },
          },
          {
            type: 'sectorCharacteristics',
            sectors: [
              {
                characteristics: 'R',
                start: 40,
                end: 62.8,
                visibility: 'unintensified',
              },
              {
                characteristics: 'Vi',
                start: 62.8,
                end: 130,
                visibility: 'intensified',
              },
              { characteristics: 'G', start: 130, end: 198.8 },
              { characteristics: 'B', start: 198.8, end: 344 },
              { characteristics: 'W', start: 344, end: 40 },
            ],
          },
        ],
      ],
      [
        'G. 231°54`-252°24`, W.-258°30`, R.-056°48`, W.-065°, G.-084°36`.  Shown Jul. 1 to Jun. 10.',
        [
          {
            type: 'genericTags',
            tags: { lit: 'no', 'lit:conditional': 'yes @ (Jul 1-Jun 10)' },
          },
          {
            type: 'sectorCharacteristics',
            sectors: [
              { characteristics: 'G', start: 231.9, end: 252.4 },
              { characteristics: 'W', start: 252.4, end: 258.5 },
              { characteristics: 'R', start: 258.5, end: 56.8 },
              { characteristics: 'W', start: 56.8, end: 65 },
              { characteristics: 'G', start: 65, end: 84.6 },
            ],
          },
        ],
      ],
      [
        'Visible 204°-359°, (unintens.)- 016°, obsc.-073°, (unintens.)- 094°, obsc.-115°, (unintens.)- 130°, obsc.-204°.',
        [
          {
            type: 'sectorCharacteristics',
            sectors: [
              {
                characteristics: '',
                start: 204,
                end: 359,
                visibility: '', // blank means visible
              },
              {
                characteristics: '',
                start: 359,
                end: 16,
                visibility: 'unintensified',
              },
              {
                characteristics: '',
                start: 16,
                end: 73,
                visibility: 'obscured',
              },
              {
                characteristics: '',
                start: 73,
                end: 94,
                visibility: 'unintensified',
              },
              {
                characteristics: '',
                start: 94,
                end: 115,
                visibility: 'obscured',
              },
              {
                characteristics: '',
                start: 115,
                end: 130,
                visibility: 'unintensified',
              },
              {
                characteristics: '',
                start: 130,
                end: 204,
                visibility: 'obscured',
              },
            ],
          },
        ],
      ],
    ])('%s', (remarks, results) => {
      const warnings: Warning[] = [];
      expect(parseRemarks(<LolFeature>{ remarks }, warnings)).toStrictEqual(
        results,
      );
      expect(warnings).toStrictEqual([]);
    });
  });
});
