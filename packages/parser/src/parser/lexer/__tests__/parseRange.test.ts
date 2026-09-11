import { describe, expect, it } from 'vitest';
import { parseRange } from '../parseRange.js';
import type { Warning } from '../../../helpers/types.js';
import type { Sector } from '../parseRemarks.js';

const createSectors = (...characteristics: string[]) =>
  characteristics.map((c): Sector => ({
    start: 0,
    end: 0,
    characteristics: c,
  }));

describe(parseRange, () => {
  it.each`
    input             | output         | expectedWarnings
    ${''}             | ${[]}          | ${[]}
    ${'12'}           | ${'12'}        | ${[]}
    ${'12 ; 6'}       | ${['12', '6']} | ${[]}
    ${'12 ; invalid'} | ${[]}          | ${['[Some items unparsable] 12 ; invalid']}
    ${'12 ; '}        | ${['12', '0']} | ${[]}
  `('can parse $input', ({ input, output, expectedWarnings }) => {
    const warnings: Warning[] = [];
    expect(parseRange(input, [], warnings)).toStrictEqual(output);
    expect(warnings).toStrictEqual(
      (expectedWarnings as string[]).map((value) => ({
        type: 'invalid_range',
        value,
      })),
    );
  });

  it.each<
    [input: string, sectors: Sector[], output: string[], warnings: string[]]
  >([
    [
      'R. 12 ; G. 3 ; B. 4',
      createSectors('F.R', 'F.G', 'F.B'),
      ['12', '3', '4'],
      [],
    ],
    ['R. 12 ; 3', createSectors('F.R', 'F.G', 'F.B'), ['12', '3', '3'], []],
    [
      '1 ; R.  2  ; G. 3',
      createSectors('F.R', 'F.G', 'F.B'),
      ['2', '3', '1'],
      [],
    ],
    [
      'F. 1 ; Fl. 2 ; 3',
      createSectors('F.R', 'F.G', 'Fl.W', 'Oc.W', 'Oc.W'),
      ['1', '1', '2', '3', '3'],
      [],
    ],
    [
      'F. 1 ; Fl. 2',
      createSectors('F.R', 'F.G', 'Fl.W', 'Oc.W', 'Oc.W'),
      ['1', '1', '2', '', ''],
      [],
    ],
    [
      'F  1 ; Fl 2',
      createSectors('F.R', 'F.G', 'Fl.W', 'Oc.W', 'Oc.W'),
      ['1', '1', '2', '', ''],
      [],
    ],
    [
      'R.  ; G. 2',
      createSectors('F.R', 'F.G', 'F.R', 'Oc.G'),
      ['', '2', '', '2'],
      [],
    ],
  ])('can parse %s', (input, sectors, output, expectedWarnings) => {
    const warnings: Warning[] = [];
    expect(parseRange(input, sectors, warnings)).toStrictEqual(output);
    expect(warnings).toStrictEqual(
      (expectedWarnings as string[]).map((value) => ({
        type: 'invalid_range',
        value,
      })),
    );
  });
});
