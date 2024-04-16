import type { Tags } from 'osm-api';
import type { LolFeature, Warning } from '../helpers/types';
import { capitalise, isTruthy } from '../helpers/general';

const unparsableRemarks: Record<string, number> = {};

export const getUnparsableRemarks = () =>
  Object.entries(unparsableRemarks)
    .sort((a, b) => b[1] - a[1])
    .map((line) => line.reverse().join('\t'))
    .join('\n');

export type Bearing = { start: number; end: number };

export type Sector = {
  start: number;
  end: number;
  characteristics: string;
  visibility?: string;
};

type Remark =
  | { type: 'visibleBearings'; bearings: Bearing[] }
  | {
      type: 'sectorCharacteristics';
      sectors: Sector[];
    }
  | { type: 'genericTags'; tags: Tags }
  | { type: 'unknown'; line: string };

const COMMON_REMARKS: Record<string, Tags> = {
  'private light': { 'operator:type': 'private' },
  seasonal: { 'seamark:light:exhibition': 'seasonal' },
  occasional: { 'seamark:light:exhibition': 'occasional' },
  'emergency light': { 'seamark:light:category': 'emergency' },
  'shown 24 hours': { 'seamark:light:exhibition': '24h' },
  'operates at night only': { 'seamark:light:exhibition': 'night' },
  'storm signals': { 'seamark:light:exhibition': 'storm' },
  'radar reflector': { 'seamark:radar_reflector': 'yes' },
};

export function parseBearing(_string: string): number | undefined {
  // remove full stop and anything afterwards
  const string = _string.replace(/\.($| .*)/, '');

  const dmMatch = string.match(/^(\d+)[?°]([\d.]+)('|`)?\.?$/);
  if (dmMatch) {
    const [, d, m] = dmMatch;
    return +d + +m / 60;
  }

  // could be a decimal
  const dMatch = string.match(/^([\d.]+)[?°]?\.?$/)?.[1];
  if (dMatch) return +dMatch;

  return undefined;
}

export function parseRemarks(lol: LolFeature, warnings: Warning[]): Remark[] {
  const lines = (lol.remarks || '')
    .split('\n')
    .map((line) => line.trim().replace(/\.$/, '').trim())
    .filter(isTruthy);

  return lines.map((line): Remark => {
    const fogSignalMatch =
      line.match(
        /(?<cat>bell|horn|siren|whistle|diaphone|nautophone|reed): ((?<groupSec>\d+) bl.|mo\.?\((?<groupMo>\w+)\)) ev. (?<period>[\d.]+)s( \((?<seq>.+)\))?/i,
      ) ||
      line.match(/(?<cat>horn) points (?<angle>[\d'`°]+). \((?<seq>.+)\)/i);
    if (fogSignalMatch?.groups) {
      const blastSequence = (fogSignalMatch.groups.seq || '')
        .split(';')
        .filter(isTruthy)
        .map((segment) => {
          const match = segment.match(
            /(bl\.|stroke) (?<stroke>[\d.]+)s, +si\. (?<silence>[\d.]+)s/,
          );
          if (!match) {
            throw new Error(`Invalid blast sequence: “${segment}”`);
          }
          return <{ stroke: string; silence: string }>match.groups;
        });

      const { cat, angle, groupSec, groupMo } = fogSignalMatch.groups;
      const group = groupSec || groupMo;
      const parsedAngle = angle && parseBearing(angle);

      const tags: Tags = {};

      // if there is no explicit period, we can infer it by adding
      // up the sequence
      const period =
        fogSignalMatch.groups.period ||
        blastSequence.reduce(
          (ac, index) => ac + +index.silence + +index.stroke,
          0,
        );

      tags['seamark:fog_signal:category'] = cat.toLowerCase();
      tags['seamark:fog_signal:period'] = `${period}`;
      if (group) tags['seamark:fog_signal:group'] = group;
      if (parsedAngle !== undefined) {
        tags['seamark:fog_signal:orientation'] = `${parsedAngle}`;
      }

      tags['seamark:fog_signal:sequence'] = blastSequence
        .map((blast) => `${blast.stroke}+(${blast.silence})`)
        .join('+');

      return { type: 'genericTags', tags };
    }

    const aisMatch = line.match(/AIS ?\(MMSI No (\d+)\)/);
    if (aisMatch) {
      return {
        type: 'genericTags',
        tags: {
          'seamark:radio_station:category': 'ais',
          'seamark:radio_station:mmsi': aisMatch[1],
        },
      };
    }

    const visibleMatch = line.match(
      /Visible(?<rangeList>( ([\d'.?`°]+)-([\d'.?`°]+)( and)?)+)/,
    );
    if (visibleMatch) {
      const rangeList = visibleMatch.groups!.rangeList.split(' and ');
      const sectors = rangeList
        .map((range) => {
          const rangeMatch = range.match(
            /(?<start>[\d'.?`°]+)-(?<end>[\d'.?`°]+)/,
          )!;

          const start = parseBearing(rangeMatch.groups!.start);
          const end = parseBearing(
            // remove full stop and anything afterwards
            rangeMatch.groups!.end.replace(/\.($| .*)/, ''),
          );
          if (start === undefined) {
            warnings.push({ type: 'invalid_bearings', value: visibleMatch[1] });
            return undefined;
          }
          if (end === undefined) {
            warnings.push({ type: 'invalid_bearings', value: visibleMatch[2] });
            return undefined;
          }

          return { start, end };
        })
        .filter(isTruthy);

      if (sectors.length !== rangeList.length) {
        // this means some ranges were filtered out above
        // because they resolved to undefined.
        return { type: 'unknown', line };
      }

      return {
        type: 'visibleBearings',
        bearings: <Bearing[]>sectors,
      };
    }

    const safetyDistanceMatch = line.match(/safety distance (\d+)(m| meters)/i);
    if (safetyDistanceMatch) {
      return {
        type: 'genericTags',
        tags: { 'seamark:safety_distance': safetyDistanceMatch[1] },
      };
    }

    const genericTagMatch = COMMON_REMARKS[line.toLowerCase()];
    if (genericTagMatch) {
      return { type: 'genericTags', tags: genericTagMatch };
    }

    const waveLengthMatch = line.match(/\( *[\d &]+cm *\)/);
    if (waveLengthMatch) {
      const value = [
        waveLengthMatch[0].includes('3') && '0.03-X',
        waveLengthMatch[0].includes('10') && '0.10-S',
      ]
        .filter(Boolean)
        .join(';');
      return {
        type: 'genericTags',
        tags: { 'seamark:radar_transponder:wavelength': value },
      };
    }

    const azimuthMatch = line.match(
      /Azimuth( coverage)? (?<start>[\d'.?`°]+)?-(?<end>[\d'.?`°]+)/,
    );
    if (azimuthMatch?.groups) {
      return {
        type: 'genericTags',
        tags: {
          'seamark:radar_transponder:sector_start': `${parseBearing(azimuthMatch.groups.start)}`,
          'seamark:radar_transponder:sector_end': `${parseBearing(azimuthMatch.groups.end)}`,
        },
      };
    }

    const calendarMatch = line.match(
      /shown (?<startM>[a-z]+)\.? ?(?<startD>\d+) to (?<endM>[a-z]+)\.? ?(?<endD>\d+)/i,
    );
    if (calendarMatch?.groups) {
      const { startM, startD, endM, endD } = calendarMatch.groups;

      const openingHours = `${capitalise(startM)} ${startD}-${capitalise(endM)} ${endD}`;
      return {
        type: 'genericTags',
        tags: {
          lit: 'no',
          'lit:conditional': `yes @ (${openingHours})`,
        },
      };
    }

    const splitByComma = line.split(',');
    const sectorsMatch = splitByComma.map((sector) =>
      sector.match(
        /(?<char>[\w.]+)\. ?(\((?<viz>(un)?intensified)\))? ?(?<start>[\d'.?`°]+)?-(?<end>[\d'.?`°]+)/,
      ),
    );
    const nonSectors = splitByComma.filter((_, index) => !sectorsMatch[index]);

    // we split at each comma, so check if some segments matched the sector pattern
    if (sectorsMatch.some(isTruthy)) {
      const sectors = sectorsMatch
        .filter(isTruthy)
        .map((match, index, array) => {
          if (!match?.groups) return undefined;

          const previous = array[index - 1];
          const { char, start, end, viz } = match.groups;

          // if there's no start, then use the end of the prev sector
          const realStart = start || previous?.groups?.end || '';
          const startNumber = parseBearing(realStart);
          const endNumber = parseBearing(end);

          if (startNumber === undefined) {
            if (index === 0 && !realStart) {
              warnings.push({
                type: 'invalid_bearings_first_sector_no_start',
                value: `“${match[0]}” in “${line}”`,
              });
            } else {
              warnings.push({
                type: 'invalid_bearings',
                value: `start: “${realStart}” in ${match[0]}`,
              });
            }
            return undefined;
          }
          if (endNumber === undefined) {
            warnings.push({
              type: 'invalid_bearings',
              value: `end: “${end}” in ${match[0]}`,
            });
            return undefined;
          }

          const sector: Sector = {
            characteristics: char,
            start: startNumber,
            end: endNumber,
          };
          if (viz) sector.visibility = viz;
          return sector;
        })
        .filter(isTruthy);
      return { type: 'sectorCharacteristics', sectors };
    }

    const remainingPartOfLine = nonSectors.join(', ');

    unparsableRemarks[remainingPartOfLine] ||= 0;
    unparsableRemarks[remainingPartOfLine]++;

    return { type: 'unknown', line: remainingPartOfLine };
  });
}
