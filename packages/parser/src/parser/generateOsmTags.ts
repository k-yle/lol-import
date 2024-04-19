import { COLOURS, type Light } from 'light-characteristics';
import type { Tags } from 'osm-api';
import type { LolFeature, Warning } from '../helpers/types';
import { IALA_B } from '../helpers/constants';
import { deleteUndefinedKeys, isTruthy, sortObject } from '../helpers/general';
import { proxyTags, stripProxy } from '../helpers/proxy';
import { appendToTag } from '../helpers/tags';
import {
  parseCharacteristicForSector,
  parseCharacteristics,
} from './lexer/parseCharacteristics';
import { type Sector, parseRemarks } from './lexer/parseRemarks';
import { type Structure, parseStructure } from './lexer/parseStructure';
import { parseName } from './lexer/parseName';
import { checkPeriodSum } from './work/checkPeriodSum';
import { moveUnsectoredTags } from './work/moveUnsectoredTags';
import { splitMultiLights } from './work/splitMultiLights';
import { parseLensHeight } from './lexer/parseLensHeight';
import { parseRange } from './lexer/parseRange';

const CATEGORY_TYPES = new Set<Structure['type']>([
  'cardinal',
  'lateral',
  'isolated_danger',
  'safe_water',
  'special_purpose',
]);

const IMPLIED_TOPMARKS: Partial<Record<Structure['type'], [string, string]>> = {
  isolated_danger: ['2 spheres', 'black'],
  safe_water: ['sphere', 'red'],
  // cardinals are special-cased elsewhere
};

export function generateOsmTags(
  light: LolFeature,
  country: string,
  date: string,
): { tags?: Tags; ialaId: string; warnings: Warning[] } {
  const warnings: Warning[] = [];
  const tags = proxyTags({}, warnings);

  const standardId = light.featureNumber.split('\n')[1];

  const ialaId = (standardId || `X${light.featureNumber}`)
    // add space after the first letter
    .replace(/^([A-Z])/, '$1 ');

  if (!ialaId) {
    throw new Error(`Could not parse ID: “${light.featureNumber}”`);
  }

  const isIalaRegionA = !IALA_B.has(country);

  const { cleanedName, tokenFromName } = parseName(light.name);
  tags['seamark:name'] = cleanedName;

  if (tokenFromName.has('RACON')) {
    tags['seamark:radar_transponder:category'] = 'racon';
  }
  if (tokenFromName.has('RAMARK')) {
    tags['seamark:radar_transponder:category'] = 'ramark';
  }

  const structures = parseStructure(light.structure, warnings, isIalaRegionA);
  if (!structures) return { ialaId, warnings };

  // the order of 'structure' tokens is arbitrary, but we need
  // to figure out the shape and type first, before processing
  // the tokens, since they depend on these values
  const shape = structures
    .map((token) => token.type === 'shape' && token.shape)
    .find(isTruthy);

  const categoryToken = structures.find((token) =>
    CATEGORY_TYPES.has(token.type),
  )?.type;

  const type = (() => {
    if (shape && categoryToken) return `${shape}_${categoryToken}`;
    if (shape) return shape;
    if (tokenFromName.has('LIGHTSHIP')) return 'light_ship';
    if (tokenFromName.has('LIGHTFLOAT')) return 'light_float';
    if (tokenFromName.has('RACON') || tokenFromName.has('RAMARK')) {
      return 'radar_transponder';
    }

    // we always use _minor, since _major vs _minor is determined by
    // the boldness of the name in the PDF. However, this information
    // is lost during parsing.
    return 'light_minor';
  })();

  /** use this assertion if the code requires the shape to be known */
  function isShapeUnknown() {
    if (type === 'light_minor') {
      warnings.push({ type: 'no_shape', value: light.structure || '' });
      return true;
    }
    return false;
  }

  for (const token of structures) {
    switch (token.type) {
      case 'lateral':
      case 'isolated_danger':
      case 'safe_water':
      case 'special_purpose':
      case 'cardinal': {
        if (isShapeUnknown()) break;

        appendToTag(tags, `seamark:${type}:colour`, token.colour);
        if ('category' in token) {
          tags[`seamark:${type}:category`] = token.category;
        }
        if ('colour_pattern' in token) {
          tags[`seamark:${type}:colour_pattern`] = token.colour_pattern;
        }
        if ('system' in token) {
          tags[`seamark:${type}:system`] = token.system || '';
        }
        if ('topmarkShape' in token) {
          tags['seamark:topmark:shape'] = token.topmarkShape || '';
          tags['seamark:topmark:colour'] = 'black';
        }
        break;
      }

      case 'daymark':
      case 'topmark': {
        const [impliedShape, impliedColour] =
          IMPLIED_TOPMARKS[categoryToken!] || [];

        // if it's a buoy or beacon, then it's a topmark that complements
        // the buoy/beacon. It's only a daymark if it's own it's own.
        const topOrDayMark = shape ? 'topmark' : token.type;

        // or-or-eq because these tags might have already been set above (for carindals)
        tags[`seamark:${topOrDayMark}:shape`] ||=
          token.shape || impliedShape || '';
        tags[`seamark:${topOrDayMark}:colour`] ||=
          token.colour || impliedColour || '';
        tags[`seamark:${topOrDayMark}:colour_pattern`] ||=
          token.colourPattern || '';
        tags[`seamark:${topOrDayMark}:construction`] = token.material || '';

        // make sure at least one seamark:*mark:* tag is set. Otherwise this info gets lost.
        if (!tags[`seamark:${topOrDayMark}:colour`]) {
          tags[`seamark:${topOrDayMark}:shape`] ||= 'yes';
        }
        break;
      }

      case 'shape': {
        appendToTag(tags, `seamark:${type}:colour`, token.colour);
        appendToTag(tags, `seamark:${type}:construction`, token.material);
        appendToTag(tags, `seamark:${type}:shape`, token.structure);
        break;
      }

      case 'colourPattern': {
        if (isShapeUnknown()) break;
        appendToTag(tags, `seamark:${type}:colour`, token.colours.join(';'));
        tags[`seamark:${type}:colour_pattern`] = token.pattern;
        break;
      }

      case 'physicalHeight': {
        if (isShapeUnknown()) break;
        tags[`seamark:${type}:height`] = token.metres;
        break;
      }

      case 'helipad': {
        tags.aeroway = 'helipad';
        break;
      }

      case 'unknown': {
        appendToTag(tags, 'seamark:information', token.remainder);
        break;
      }

      default: {
        token satisfies never; // exhaustivity check
      }
    }
  }

  // this one never has sectors
  tags['seamark:light:reference'] = ialaId;

  // this tag is special cased in the conflation function
  tags['seamark:type'] = type;

  // this tag is also special cased in the conflation function
  tags.source = `US NGA Pub. ${light.volumeNumber.replace('PUB ', '')}. ${date}.`;

  let sectors: false | Sector[] = false;

  const remarks = parseRemarks(light, warnings);
  for (const remark of remarks) {
    switch (remark.type) {
      case 'genericTags': {
        for (const [k, v] of Object.entries(remark.tags)) {
          if (k === 'seamark:light:exhibition') {
            appendToTag(tags, k, v);
          } else {
            tags[k] = v;
          }
        }
        break;
      }

      case 'sectorCharacteristics': {
        sectors = remark.sectors;
        break;
      }

      case 'unknown': {
        appendToTag(tags, 'seamark:information', remark.line);
        break;
      }

      default: {
        remark satisfies never; // exhaustivity check
      }
    }
  }

  const lightsToMap = sectors === false ? [undefined] : sectors;

  const lensHeight = parseLensHeight(
    light.heightFeetMeters,
    lightsToMap.length,
  );

  const range = parseRange(light.range, lightsToMap, warnings);

  for (const [index, sector] of lightsToMap.entries()) {
    // for sectored lights, you have to use :1: to keep
    // OpenSeaMap happy, even if there's only 1 sector.
    const lxType = tokenFromName.has('RACON')
      ? 'radar_transponder'
      : sector
        ? `light:${index + 1}`
        : 'light';

    // if these are single values, add them now
    tags[`seamark:${lxType}:height`] =
      (typeof lensHeight === 'string' ? lensHeight : lensHeight[index]) || '';
    tags[`seamark:${lxType}:range`] =
      (typeof range === 'string' ? range : range[index]) || '';

    if (sector) {
      tags[`seamark:${lxType}:sector_start`] = `${sector.start}`;
      tags[`seamark:${lxType}:sector_end`] = `${sector.end}`;
      tags[`seamark:${lxType}:visibility`] = sector.visibility || '';
    }

    const sequence: string[] = [];
    const parsedLines = parseCharacteristics(light, warnings);

    const parsedTypes = new Set(parsedLines.map((line) => line.type));
    if (parsedTypes.has('morse') && parsedTypes.has('characteristic')) {
      throw new Error('morse and characteristic would override each other');
    }

    for (const line of parsedLines) {
      switch (line.type) {
        case 'period': {
          tags[`seamark:${lxType}:period`] = `${line.seconds}`;
          break;
        }

        case 'morse': {
          tags[`seamark:${lxType}:group`] = line.letters;
          if (lxType !== 'radar_transponder') {
            tags[`seamark:${lxType}:category`] = 'Mo';
          }
          break;
        }

        case 'sequence': {
          // format is `light+(eclipse)` per the S-57 spec for SIGSEQ
          sequence.push(`${line.flash}+(${line.eclipse})`);
          break;
        }

        case 'characteristic': {
          // these are encoded separate, so they shouldn't
          // appear in the characteristic.
          if (line.parsed.HEIGHT) throw new Error('Unexpected height');
          if (line.parsed.SIGPER) throw new Error('Unexpected period');
          if (line.parsed.VALMXR) throw new Error('Unexpected range');

          // for sectored lights, get the overrides for this sector.
          const overrides =
            parseCharacteristicForSector(sector?.characteristics) || {};

          const parsed: Light = { ...line.parsed, ...overrides };

          tags[`seamark:${lxType}:colour`] = parsed.COLOUR.map(
            (code) => COLOURS[code],
          ).join(';');
          tags[`seamark:${lxType}:character`] = parsed.LITCHR;
          tags[`seamark:${lxType}:group`] = parsed.SIGGRP || '';
          tags[`seamark:${lxType}:multiple`] = `${parsed.MLTYLT || ''}`;
          appendToTag(tags, `seamark:${lxType}:category`, parsed.CATLIT);

          break;
        }

        case 'unknown':
        case 'unsupported': {
          appendToTag(tags, 'seamark:information', line.line);
          break;
        }

        default: {
          line satisfies never; // exhaustivity check
        }
      }
    }

    // after we've looped through all lines:
    tags[`seamark:${lxType}:sequence`] = sequence.join('+');

    if (tokenFromName.has('AVIATION LIGHT')) {
      appendToTag(tags, `seamark:${lxType}:category`, 'aero');
    }
  }

  moveUnsectoredTags(tags);

  splitMultiLights(tags, warnings, { lensHeight, range });

  // remove double spaces
  tags['seamark:information'] = tags['seamark:information']?.replace(
    / +/g,
    ' ',
  );

  checkPeriodSum(tags, warnings);

  return {
    tags: sortObject(deleteUndefinedKeys(stripProxy(tags))),
    ialaId,
    warnings,
  };
}
