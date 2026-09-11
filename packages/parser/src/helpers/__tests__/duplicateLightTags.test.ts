import { describe, expect, it } from 'vitest';
import { duplicateLightTags } from '../duplicateLightTags';

describe(duplicateLightTags, () => {
  it('can duplicate simple` light tags', () => {
    const tags = {
      'seamark:something': 'a',
      'seamark:light:reference': 'abc',
      'seamark:light:colour': 'red',
      'seamark:light:period': '3',
    };
    duplicateLightTags(tags, 2);
    expect(tags).toStrictEqual({
      'seamark:something': 'a',
      'seamark:light:reference': 'abc',
      'seamark:light:1:colour': 'red',
      'seamark:light:1:period': '3',
      'seamark:light:2:colour': 'red',
      'seamark:light:2:period': '3',
    });
  });

  it('can duplicate existing sectors', () => {
    const tags = {
      'seamark:something': 'a',
      'seamark:light:reference': 'abc',
      'seamark:light:1:colour': 'red',
      'seamark:light:1:period': '3',
    };
    duplicateLightTags(tags, 3, 1);
    expect(tags).toStrictEqual({
      'seamark:something': 'a',
      'seamark:light:reference': 'abc',
      'seamark:light:1:colour': 'red',
      'seamark:light:1:period': '3',
      'seamark:light:2:colour': 'red',
      'seamark:light:2:period': '3',
      'seamark:light:3:colour': 'red',
      'seamark:light:3:period': '3',
    });
  });
});
