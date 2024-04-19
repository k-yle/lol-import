import { isNotNaN } from '../../helpers/general';
import type { Warning } from '../../helpers/types';
import { parseCharacteristicForSector } from './parseCharacteristics';
import type { Sector } from './parseRemarks';

/** either a single value, or a per-sector value */
export function parseRange(
  range: string | null,
  sectors: (Sector | undefined)[],
  warnings: Warning[],
): string | string[] {
  if (!range) return [];

  // case 1: single number (all sectors have the same range)
  if (isNotNaN(+range)) return range;

  // case 2: array (e.g. `1 ; 2 ; 3`)
  const perSectorRange = range.split(';').map((s) => +s.trim());
  if (perSectorRange.length > 1 && perSectorRange.every(isNotNaN)) {
    if (
      sectors.length > 1 &&
      perSectorRange.length > 1 &&
      perSectorRange.length !== sectors.length
    ) {
      throw new Error(`range - ${sectors.length} != ${perSectorRange.length}`);
    }

    return perSectorRange.map(String);
  }

  // case 3: object (e.g. `R. 1 ; W. 2 ; Fl. 3`)
  let defaultRange = '';
  const perCharacteristicRange = range
    .split(';')
    .map((s) => {
      // first try to parse as single number.
      if (!Number.isNaN(+s.trim())) {
        defaultRange = s.trim();
        return null;
      }

      // very rare (6 occurances): e.g. "R. ; G. 2 ; W. 3" then throw away blank values
      if (/^ *[a-z]+\. +$/i.test(s)) return null;

      // if that fails, try to parse as an object
      return s.match(/^ *(?<char>[a-z]+)\.? +(?<range>[\d.]+) *$/i)?.groups as
        | { char: string; range: string }
        | undefined;
    })
    .filter((x) => x !== null); // null is okay, undefined is a bad thing

  if (
    perCharacteristicRange.some((item) => !item || Number.isNaN(+item.range))
  ) {
    warnings.push({
      type: 'invalid_range',
      value: `[Some items unparsable] ${range}`,
    });
    return [];
  }

  // it's okay if perCharacteristicRange.length != sectors.length
  // it's also okay if some sectors have no characteristics

  const ranges = sectors.map((sector) => {
    // we have to re-parse here :( but we discard all warnings, since
    // they would be duplicates.
    const characteristics = parseCharacteristicForSector(
      sector?.characteristics,
    );
    if (!characteristics) return defaultRange;

    const value = perCharacteristicRange.find(
      (item) =>
        item!.char === characteristics.COLOUR?.join('.') ||
        item!.char === characteristics.LITCHR,
    );

    return value ? value.range : defaultRange;
  });

  return ranges;
}
