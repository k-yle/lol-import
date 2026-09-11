import type { Tags } from 'osm-api';
import type { LolFeature, Warning } from '../../helpers/types';
import { capitalise, isTruthy } from '../../helpers/general';
import { tokeniser } from '../../helpers/tokeniser';

const unparsableRemarks: Record<string, number> = {};

export const getUnparsableRemarks = () =>
  Object.entries(unparsableRemarks)
    .toSorted((a, b) => b[1] - a[1])
    .map((line) => line.toReversed().join('\t'))
    .join('\n');

export type Sector = {
  start: number;
  end: number;
  characteristics: string;
  visibility?: Visibility;
};

export type Remark =
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
  'Shown on request': { 'seamark:radar_reflector': 'on_request' },
};

type Visibility =
  | '' // no value = visible (default)
  | 'unintensified'
  | 'intensified'
  | 'occasional'
  | 'faint'
  | 'low'
  | 'high'
  | 'part_obscured'
  | 'obscured';

const VISIBILITIES: Record<string, Visibility> = {
  visible: '',
  unintensified: 'unintensified',
  '(unintensified)': 'unintensified',
  '(unintens.)': 'unintensified',
  'unintens.': 'unintensified',
  intensified: 'intensified',
  '(intensified)': 'intensified',
  'intens.': 'intensified',
  'occas.': 'occasional',
  'partially obscured': 'part_obscured',
  obscured: 'obscured',
  obsc: 'obscured',
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

  const result = lines.map((_line) => {
    return tokeniser<Remark>(_line, (workingString) => {
      const fogSignalMatch =
        workingString.match(
          /(?<cat>bell|horn|siren|whistle|diaphone|nautophone|reed): ((?<groupSec>\d+) bl.|mo\.?\((?<groupMo>\w+)\)) ev. (?<period>[\d.]+)s( \((?<seq>.+)\))?/i,
        ) ||
        workingString.match(
          /(?<cat>horn) points (?<angle>[\d'`°]+). \((?<seq>.+)\)/i,
        );
      if (fogSignalMatch?.groups) {
        const blastSequence = (fogSignalMatch.groups.seq || '')
          .split(';')
          .filter(isTruthy)
          .map((segment) => {
            const match = segment.match(
              /(bl\.|stroke) ?(?<stroke>[\d.]+)s, +si\. (?<silence>[\d.]+)s/,
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

        return {
          raw: fogSignalMatch[0],
          parsed: { type: 'genericTags', tags },
        };
      }

      const aisMatch = workingString.match(/AIS ?\(MMSI No (\d+)\)/);
      if (aisMatch) {
        return {
          raw: aisMatch[0],
          parsed: {
            type: 'genericTags',
            tags: {
              'seamark:radio_station:category': 'ais',
              'seamark:radio_station:mmsi': aisMatch[1],
            },
          },
        };
      }

      const safetyDistanceMatch = workingString.match(
        /safety distance (\d+)(m| meters)/i,
      );
      if (safetyDistanceMatch) {
        return {
          raw: safetyDistanceMatch[0],
          parsed: {
            type: 'genericTags',
            tags: { 'seamark:safety_distance': safetyDistanceMatch[1] },
          },
        };
      }

      const calendarMatch = workingString.match(
        /shown(?<exhibition> 24 hours)? (?<startM>[a-z]+)\.? ?(?<startD>\d+) to (?<endM>[a-z]+)\.? ?(?<endD>\d+)/i,
      );
      if (calendarMatch?.groups) {
        const { startM, startD, endM, endD, exhibition } = calendarMatch.groups;

        const openingHours = `${capitalise(startM)} ${startD}-${capitalise(endM)} ${endD}`;

        return {
          raw: calendarMatch[0],
          parsed: {
            type: 'genericTags',
            tags: exhibition
              ? {
                  'seamark:light:exhibition:conditional': `24h @ (${openingHours})`,
                }
              : { lit: 'no', 'lit:conditional': `yes @ (${openingHours})` },
          },
        };
      }

      // must come after lit:conditional, so that "Shown 24 hours [...]" is parsed
      // before "Shown 24 hours".
      for (const substr in COMMON_REMARKS) {
        const index = workingString.toLowerCase().indexOf(substr);
        if (index !== -1) {
          // this ensure that we use the original capitalisation
          const match = workingString.slice(index, index + substr.length);
          return {
            raw: match,
            parsed: { type: 'genericTags', tags: COMMON_REMARKS[substr] },
          };
        }
      }

      const waveLengthMatch = workingString.match(/\( *[\d &]+cm *\)/);
      if (waveLengthMatch) {
        const value = [
          waveLengthMatch[0].includes('3') && '0.03-X',
          waveLengthMatch[0].includes('10') && '0.10-S',
        ]
          .filter(Boolean)
          .join(';');
        return {
          raw: waveLengthMatch[0],
          parsed: {
            type: 'genericTags',
            tags: { 'seamark:radar_transponder:wavelength': value },
          },
        };
      }

      const azimuthMatch = workingString.match(
        /Azimuth( coverage)? (?<start>[\d'.?`°]+)?-(?<end>[\d'.?`°]+)/,
      );
      if (azimuthMatch?.groups) {
        return {
          raw: azimuthMatch[0],
          parsed: {
            type: 'genericTags',
            tags: {
              'seamark:radar_transponder:sector_start': `${parseBearing(azimuthMatch.groups.start)}`,
              'seamark:radar_transponder:sector_end': `${parseBearing(azimuthMatch.groups.end)}`,
            },
          },
        };
      }

      const splitByComma = workingString.split(',');
      const sectorsMatch = splitByComma
        .map(
          (sector) =>
            sector.match(
              /Visible(?<rangeList>( ([\d'.?`°]+)-([\d'.?`°]+)( and)?)+)/,
            ) ||
            sector.match(
              /(?<char>\d*[.A-Za-z]+)\. ?(\((?<viz>(un)?intens(\.|ified))\))? ?(?<start>[\d'.?`°]+)?- ?(?<end>[\d'.?`°]+)/,
            ) ||
            sector.match(
              /(?<viz>Visible|obsc|(partially )?obscured|\((un)?intens(\.|ified)\)) ?(?<start>[\d'.?`°]+)?- ?(?<end>[\d'.?`°]+)/,
            ),
        )
        .filter(isTruthy);

      // we split at each comma, so check if some segments matched the sector pattern
      if (sectorsMatch.length) {
        const sectors = sectorsMatch
          .flatMap((match) => {
            // special case for "Visible a-b° and c-d°" - we need to split
            // this into multiple array items
            return (
              match.groups?.rangeList?.split(' and ').map((range) => {
                const rangeMatch = range.match(
                  /(?<start>[\d'.?`°]+)-(?<end>[\d'.?`°]+)/,
                )!;
                rangeMatch.groups!.viz = 'Visible';
                return rangeMatch;
              }) || [match]
            );
          })
          .map((match, index, array) => {
            if (!match?.groups) return undefined;

            const previous = array[index - 1];
            const { char = '', start, end, viz } = match.groups;

            // if there's no start, then use the end of the prev sector
            const realStart = start || previous?.groups?.end || '';
            const startNumber = parseBearing(realStart);
            const endNumber = parseBearing(end);

            if (startNumber === undefined) {
              if (index === 0 && !realStart) {
                warnings.push({
                  type: 'invalid_bearings_first_sector_no_start',
                  value: `“${match[0]}” in “${_line}”`,
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
            if (viz) {
              const mappedViz = VISIBILITIES[viz.toLowerCase()];
              if (mappedViz === undefined) {
                throw new Error(`Unknown visibility “${viz}”`);
              }
              sector.visibility = mappedViz;
            }

            // sometimes this one is parsed into the wrong field
            if (char === 'obsc') {
              sector.visibility = 'obscured';
              sector.characteristics = '';
            }

            return sector;
          })
          .filter(isTruthy);

        return {
          raw: sectorsMatch.map((match) => match[0]),
          parsed: { type: 'sectorCharacteristics', sectors },
        };
      }

      return undefined;
    });
  });

  const output = result.flatMap((r) => r.output);
  const unparsable = result.map((r) => r.unparsable).filter(isTruthy);

  // loop is complete - that means that anything left in the string is unparsable.
  for (const remainder of unparsable) {
    output.push({ type: 'unknown', line: remainder });
    unparsableRemarks[remainder] ||= 0;
    unparsableRemarks[remainder]++;
  }

  return output;
}
