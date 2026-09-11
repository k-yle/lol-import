import { describe, expect, it } from 'vitest';
import { parseCoords } from '../geo';

describe(parseCoords, () => {
  it.each`
    input                                | lat         | lon
    ${'20°56\'09.24"S \n55°16\'56.64"E'} | ${-20.9359} | ${55.2824}
    ${'33°51\'10.4"S \n151?13\'08"E'}    | ${-33.8529} | ${151.2189}
  `('can parse $input', ({ input, lat, lon }) => {
    expect(parseCoords(input)).toStrictEqual({ lat, lon });
  });
});
