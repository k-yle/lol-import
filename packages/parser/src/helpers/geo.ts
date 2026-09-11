import { countries as COUNTRIES_DB, type TCountryCode } from 'countries-list';
import type { LatLon } from './types.js';

interface DMS {
  d: number;
  m: number;
  s: number;
  dir: 'N' | 'S' | 'E' | 'W';
}

function dmsToDecimal({ d, m, s, dir }: DMS) {
  const flip = dir === 'S' || dir === 'W' ? -1 : 1;
  return flip * (d + m / 60 + s / 3600);
}

const round = (dp: number) => (number_: number) => {
  const factor = 10 ** dp;
  return Math.round(number_ * factor) / factor;
};

export function parseCoords(stringifiedCoords: string): LatLon {
  const matches = stringifiedCoords.matchAll(
    /(?<d>\d+)[?°](?<m>\d+)'(?<s>(\d|.)+)"(?<dir>\w)/g,
  );
  const [lat, lon] = [...matches]
    .map((match): DMS => {
      const { d, m, s, dir } = match.groups!;
      return {
        d: +d,
        m: +m,
        s: +s,
        dir: <DMS['dir']>dir,
      };
    })
    .map(dmsToDecimal)
    .map(round(4)); // the data is only accurate to 4dp, so remove floating point errors

  return { lat, lon };
}

/** iD's country-coder library doesn't include continent information :( */
export function getContinents(countryCodes: string[]) {
  const continents: Record<string, string[]> = {};
  for (const country of countryCodes) {
    const continent = COUNTRIES_DB[<TCountryCode>country]?.continent || '--';
    continents[continent] ||= [];
    continents[continent].push(country);
  }
  return continents;
}
