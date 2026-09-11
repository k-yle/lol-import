import type { LatLon } from '@lol-import/parser';

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
