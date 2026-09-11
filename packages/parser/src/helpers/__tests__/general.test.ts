import { describe, expect, it } from 'vitest';
import { pick, removeTrailingZeros } from '../general';

describe('removeTrailing', () => {
  it.each`
    input             | output
    ${'K 123'}        | ${'K 123'}
    ${'K 1230'}       | ${'K 1230'}
    ${'K 12300'}      | ${'K 12300'}
    ${'K 12300.120'}  | ${'K 12300.12'}
    ${'K 12300.1200'} | ${'K 12300.12'}
    ${'K 123.0'}      | ${'K 123.0' /* never happens so who cares */}
  `('converts $input to $output', ({ input, output }) => {
    expect(removeTrailingZeros(input)).toBe(output);
  });
});

describe(pick, () => {
  it.each`
    input             | keysToKeep         | output
    ${{ a: 1, b: 2 }} | ${['a']}           | ${{ a: 1 }}
    ${{ a: 1, b: 2 }} | ${[]}              | ${{}}
    ${{ a: 1, b: 2 }} | ${['a', 'b', 'c']} | ${{ a: 1, b: 2 }}
  `('converts $input to $output', ({ input, keysToKeep, output }) => {
    expect(pick(input, keysToKeep)).toStrictEqual(output);
  });
});
