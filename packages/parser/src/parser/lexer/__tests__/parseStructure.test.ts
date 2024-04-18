import { describe, expect, it } from 'vitest';
import { type Structure, parseStructure } from '../parseStructure';
import type { Warning } from '../../../helpers/types';

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
    ])('%s', (input, output) => {
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
            pattern: 'vertical',
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
        'Column, black and white checkered diamond daymark; 20.',
        [
          {
            type: 'daymark',
            shape: 'rhombus',
            colour: 'black;white',
            colourPattern: 'squared',
          },
          { type: 'shape', shape: 'beacon', structure: 'column' },
          { type: 'physicalHeight', metres: '6.1' },
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
      [
        'Black triangular daymark point up, white trapezoidal daymark, black stripe; 20.',
        [
          { type: 'daymark', colour: 'black', shape: 'triangle, point up' },
          {
            type: 'daymark',
            colour: 'white;black',
            colourPattern: 'horizontal',
            shape: 'trapezium, up',
          },
          { type: 'physicalHeight', metres: '6.1' },
        ],
      ],
      [
        'Metal framework tower, black rectangular daymark, white stripes; 158.\n\nSecondary structure: Red rectangular daymark, white stripes.\n',
        [
          {
            type: 'daymark',
            colour: 'black;white',
            colourPattern: 'horizontal',
            shape: 'board',
          },
          {
            type: 'daymark',
            colour: 'red;white',
            colourPattern: 'horizontal',
            shape: 'board',
          },
          {
            type: 'shape',
            material: 'metal;framework',
            shape: 'beacon',
            structure: 'tower',
          },
          { type: 'shape', shape: 'beacon' },
          { type: 'unknown', remainder: '; 158.\n\nsecondary :' },
        ],
      ],
      [
        'SPECIAL Y, buoyant beacon, "x" topmark.\n',
        [
          { type: 'special_purpose', colour: 'yellow' },
          { type: 'topmark', shape: 'x-shape' },
          { type: 'shape', shape: 'beacon', structure: 'buoyant' },
          { type: 'shape', shape: 'beacon' }, // the double match is a bit weird, but doesn't cause issues
        ],
      ],
    ])('%s', (input, output) => {
      const warnings: Warning[] = [];
      expect(parseStructure(input, warnings, true)).toStrictEqual(output);
      expect(warnings).toStrictEqual([]);
    });
  });
});
