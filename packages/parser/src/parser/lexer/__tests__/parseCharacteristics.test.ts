import { describe, expect, it } from 'vitest';
import {
  type Characteric,
  parseCharacteristics,
} from '../parseCharacteristics.js';
import type { LolFeature, Warning } from '../../../helpers/types.js';

describe(parseCharacteristics, () => {
  it.each<[string, Characteric[]]>([
    ['Period 1.23s', [{ type: 'period', seconds: 1.23 }]],
    [
      'nullfl. 1.23s, ec. 4.56s',
      [{ type: 'sequence', flash: 1.23, eclipse: 4.56 }],
    ],
    [
      ' period 070s \n \n\n fl. 1.23s, ec. 4.56s',
      [
        { type: 'period', seconds: 70 },
        { type: 'sequence', flash: 1.23, eclipse: 4.56 },
      ],
    ],
    ['SOS (••• --- •••).', [{ type: 'morse', letters: 'SOS' }]],
    ['U(••-)', [{ type: 'morse', letters: 'U' }]],
    ['U (other text).', [{ type: 'unknown', line: 'U (other text).' }]],
    [
      '\n  Dir.W.R.G.\n\n',
      [
        {
          type: 'characteristic',
          parsed: {
            CATLIT: 'directional',
            COLOUR: ['W', 'R', 'G'],
            LITCHR: <never>'', // hardcoded invalid example
          },
        },
      ],
    ],
    ['🦄nOnSensE', [{ type: 'unknown', line: '🦄nOnSensE' }]],
    [
      '4 LFl(U)RGB.1m1M(Front)',
      [
        {
          type: 'characteristic',
          parsed: {
            CATLIT: 'front',
            COLOUR: ['R', 'G', 'B'],
            HEIGHT: 1,
            LITCHR: 'LFl',
            MLTYLT: 4,
            SIGGRP: 'U',
            VALMXR: 1,
          },
        },
      ],
    ],
    [
      'Al.I.Q.Vi.Or.RG.(horiz.)',
      [
        {
          type: 'characteristic',
          parsed: {
            CATLIT: 'horizontal',
            COLOUR: ['V', 'O', 'R', 'G'],
            LITCHR: 'IQ',
          },
        },
      ],
    ],
    [
      'V.Q.(2+1)G.\nperiod 6s \n',
      [
        {
          type: 'characteristic',
          parsed: { COLOUR: ['G'], LITCHR: 'VQ', SIGGRP: '2+1' },
        },
        { type: 'period', seconds: 6 },
      ],
    ],
    [
      '2 V.Q.R.',
      [
        {
          type: 'characteristic',
          parsed: { COLOUR: ['R'], LITCHR: 'VQ', MLTYLT: 2 },
        },
      ],
    ],
  ])('%s', (characteristic, output) => {
    const warnings: Warning[] = [];
    expect(
      parseCharacteristics({ characteristic } as LolFeature, warnings),
    ).toStrictEqual(output);
    expect(warnings).toStrictEqual([]);
  });

  it('handles invalid morse', () => {
    // it's not smart enough to convert to letters
    const warnings: Warning[] = [];
    expect(
      parseCharacteristics(
        { characteristic: '(••• ••- •--•).' } as LolFeature,
        warnings,
      ),
    ).toStrictEqual([{ type: 'morse', letters: '' }]);
    expect(warnings).toStrictEqual([
      { type: 'invalid_morse', value: '(••• ••- •--•).' },
    ]);
  });
});
