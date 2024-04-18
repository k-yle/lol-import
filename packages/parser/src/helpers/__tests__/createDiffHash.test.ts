import { describe, expect, it } from 'vitest';
import { createDiffHash } from '../createDiffHash';

describe('createDiffHash', () => {
  it('produces a consistent hash', () => {
    expect(createDiffHash({}, {})).toBe('');
    expect(createDiffHash({ a: '1' }, { a: '2' })).toBe('af3393');
    expect(createDiffHash({}, { a: '2' })).toBe('ee85fc');
    expect(createDiffHash({ a: '1' }, { a: '🗑️' })).toBe('67fcfa');

    // same hash, regardless of the `source` tag
    expect(createDiffHash({ a: '1' }, { a: '2' })).toBe('af3393');
    expect(createDiffHash({ a: '1', source: '1' }, { a: '2' })).toBe('af3393');
    expect(createDiffHash({ a: '1' }, { a: '2', source: '2' })).toBe('af3393');
    expect(
      createDiffHash({ a: '1', source: '1' }, { a: '2', source: '2' }),
    ).toBe('af3393');
  });
});
