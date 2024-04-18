import { isNotNaN } from '../../helpers/general';
import type { Warning } from '../../helpers/types';

/** either a single value, or a per-sector value */
export function parseRange(
  range: string | null,
  sectorCount: number,
  warnings: Warning[],
): string | string[] {
  if (!range) return [];

  // case 1: single number (all sectors have the same range)
  if (isNotNaN(+range)) return range;

  // case 2: array (e.g. `1 ; 2 ; 3`)
  const perSectorRange = range.split(';').map((s) => +s.trim());
  if (perSectorRange.length > 1 && perSectorRange.every(isNotNaN)) {
    if (
      sectorCount > 1 &&
      perSectorRange.length > 1 &&
      perSectorRange.length !== sectorCount
    ) {
      throw new Error(`range - ${sectorCount} != ${perSectorRange.length}`);
    }

    return perSectorRange.map(String);
  }

  // case 3: object (e.g. `R. 1 ; W. 2 ; Fl. 3`)
  warnings.push({ type: 'invalid_range', value: `${range}` });
  // TODO: support this
  return [];
}
