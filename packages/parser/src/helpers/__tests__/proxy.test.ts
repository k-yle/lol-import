import { describe, expect, it } from 'vitest';
import { allowOverride, proxyTags } from '../proxy.js';
import type { Warning } from '../types.js';

describe('proxy', () => {
  it('emits a warning when tags are overriden', () => {
    const warnings: Warning[] = [];
    const tags = proxyTags({}, warnings);

    tags.a = '1';
    tags.a = '1'; // no warning, since the value is unchanged
    expect(warnings).toStrictEqual([]);

    tags.a = '2';
    expect(tags).toStrictEqual({ a: '2' });
    expect(warnings).toStrictEqual([
      {
        type: 'overridden_tag',
        value: 'a “1” --> “2” at /src/helpers/__tests__/proxy.test.ts:14:10',
      },
    ]);
  });

  it('does not emit a warning, when using allowOverride', () => {
    const warnings: Warning[] = [];
    const tags = proxyTags({}, warnings);

    tags.a = '1';
    tags.a = allowOverride('2');
    expect(tags).toStrictEqual({ a: '2' });
    expect(warnings).toStrictEqual([]);
  });
});
