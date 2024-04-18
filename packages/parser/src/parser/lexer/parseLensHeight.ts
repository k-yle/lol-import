/** either a single value, or a per-sector value */
export function parseLensHeight(
  heightFeetMeters: string | null,
  sectorCount: number,
): string | string[] {
  const lensHeightsMetres =
    heightFeetMeters
      ?.split('\n')
      .filter((_, index) => index % 2) // even numbers are metres
      .filter((v) => v !== 'null') || [];

  if (lensHeightsMetres.some((v) => Number.isNaN(+v))) {
    throw new Error('NaN lens height');
  }

  if (
    lensHeightsMetres.length === 1 || // only 1 value
    new Set(lensHeightsMetres).size === 1 // or only 1 unique value
  ) {
    return lensHeightsMetres[0]; // so reduce the array to a single value
  }

  if (
    sectorCount > 1 &&
    lensHeightsMetres.length > 1 &&
    lensHeightsMetres.length !== sectorCount
  ) {
    throw new Error(`height - ${sectorCount} != ${lensHeightsMetres.length}`);
  }

  return lensHeightsMetres;
}
