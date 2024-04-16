import type { LatLon } from '../../../parser/src/helpers/types';

export function createBbox(data: LatLon[]) {
  let [minLat, maxLat, minLon, maxLon] = [
    Infinity,
    -Infinity,
    Infinity,
    -Infinity,
  ];
  for (const { lat, lon } of data) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  return {
    bbox: { minLat, maxLat, minLon, maxLon },
    centre: {
      lat: (minLat + maxLat) / 2,
      lon: (minLon + maxLon) / 2,
    },
  };
}

export const getFlagEmoji = (country: string) => {
  return String.fromCodePoint(
    ...[...country].map((char) => 0x1f1a5 + char.codePointAt(0)!),
  );
};
