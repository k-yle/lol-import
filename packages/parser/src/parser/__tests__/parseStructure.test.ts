import { describe, expect, it } from 'vitest';
import { type Structure, parseStructure } from '../parseStructure';
import type { Warning } from '../../helpers/types';

describe('parseStructure', () => {
  describe('physicalHeight', () => {
    it.each`
      input                        | height | remainder
      ${'bob; 12'}                 | ${3.7} | ${'bob'}
      ${'a 1 b2 c 3 d e fgh; 15.'} | ${4.6} | ${'a 1 b2 c 3 d e fgh'}
    `('$height from $input', ({ input, height, remainder }) => {
      const warnings: Warning[] = [];
      expect(parseStructure(input, warnings, true)).toStrictEqual([
        { type: 'physicalHeight', metres: `${height}` },
        { type: 'unknown', remainder },
      ]);
      expect(warnings).toStrictEqual([]);
    });
  });

  describe('cardinal', () => {
    it.each`
      input                          | category   | colour                   | topmarkShape
      ${'N. Cardinal BY'}            | ${'north'} | ${'black;yellow'}        | ${false}
      ${'W. cardinal YBY, topmark.'} | ${'west'}  | ${'yellow;black;yellow'} | ${'2 cones point together'}
    `('$height from $input', ({ input, category, colour, topmarkShape }) => {
      const warnings: Warning[] = [];
      expect([parseStructure(input, warnings, true)![0]]).toStrictEqual([
        {
          type: 'cardinal',
          category,
          colour,
          topmarkShape,
          colour_pattern: 'horizontal',
        },
      ]);
      expect(warnings).toStrictEqual([]);
    });
  });

  describe('lateral', () => {
    it.each`
      input                                  | category       | colour
      ${'starboard (a) g, beacon, topmark.'} | ${'starboard'} | ${'green'}
    `('$height from $input', ({ input, category, colour }) => {
      const warnings: Warning[] = [];
      expect(parseStructure(input, warnings, true)).toStrictEqual([
        { type: 'lateral', category, colour, system: 'iala-a' },
        { type: 'topmark' },
        { type: 'shape', shape: 'beacon' },
      ]);
      expect(warnings).toStrictEqual([]);
    });
  });

  describe('topmark/daymark', () => {
    it.each([
      [
        'white octagonal daymark, black stripe',
        [
          {
            type: 'daymark',
            colour: 'white;black',
            colourPattern: 'horizontal',
          },
        ],
      ],
      [
        'red neon cross topmark',
        [{ type: 'topmark', colour: 'red', shape: 'x-shape' }],
      ],
      [
        'white octagonal daymark, black stripe',
        [
          {
            type: 'daymark',
            colour: 'white;black',
            colourPattern: 'horizontal',
          },
        ],
      ],
      [
        'yellow and blue triangular daymark point up, orange and green stripes',
        [
          {
            type: 'daymark',
            colour: 'yellow;blue;orange;green', // unrealistic, extreme example
            colourPattern: 'horizontal',
            shape: 'triangle, point up',
          },
        ],
      ],
    ])('$input', (input, output) => {
      const warnings: Warning[] = [];
      const result = parseStructure(input, warnings, true);
      expect(result).toStrictEqual(output);
      expect(warnings).toStrictEqual([]);
    });
  });

  describe('full tests', () => {
    it.each<[string, Structure[]]>([
      [
        'preferred channel (a) (to starboard) rgr, big pink iron pylon with green and brown bands, white top, with orange topmark; 100',
        [
          {
            type: 'lateral',
            category: 'preferred_channel_starboard',
            colour: 'red;green;red',
            system: 'iala-a',
          },
          { type: 'topmark', colour: 'orange' },
          {
            type: 'shape',
            shape: 'beacon',
            structure: 'pylon',
            colour: 'pink',
            material: 'iron',
          },
          { type: 'physicalHeight', metres: '30.5' },
          {
            type: 'colourPattern',
            colours: ['green', 'brown'],
            pattern: 'horizontal',
          },
          {
            type: 'unknown',
            remainder: 'big  with , white top, with',
          },
        ],
      ],
      [
        'green and black checkered "x"',
        [
          {
            type: 'topmark',
            colour: 'green;black',
            colourPattern: 'squared',
            shape: 'x-shape',
          },
        ],
      ],
      [
        'E. CARDINAL BYB, beacon, topmark.',
        [
          {
            type: 'cardinal',
            colour: 'black;yellow;black',
            colour_pattern: 'horizontal',
            category: 'east',
            topmarkShape: '2 cones base together',
          },
          { type: 'topmark' },
          { type: 'shape', shape: 'beacon' },
        ],
      ],
    ])('%s', (input, output) => {
      const warnings: Warning[] = [];
      expect(parseStructure(input, warnings, true)).toStrictEqual(output);
      expect(warnings).toStrictEqual([]);
    });
  });
});
