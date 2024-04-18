import { describe, expect, it } from 'vitest';
import { removeTrailingZeros } from '../general';

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
