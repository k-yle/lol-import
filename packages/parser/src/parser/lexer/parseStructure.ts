import { deleteUndefinedKeys, isTruthy } from '../../helpers/general';
import { tokeniser } from '../../helpers/tokeniser';
import type { Warning } from '../../helpers/types';

const SHAPES: Record<
  'beacon' | 'buoy',
  Record<string, string | true | undefined>
> = {
  beacon: {
    // generic match = no shape
    beacon: undefined,
    structure: undefined,
    superstructure: undefined,

    // values that are exactly equal to OSM tags
    tower: true,
    pillar: true,
    post: true,
    pole: true,
    pile: true,
    pipe: true,
    mast: true,
    dolphin: true,
    tripod: true,
    pylon: true,
    platform: true,
    column: true,
    pyramid: true,
    cairn: true,
    buoyant: true,

    // values that need to be standardised
    hut: 'building',
    dwelling: 'building',
    piles: 'pile',
  },
  buoy: {
    // generic match = no shape
    buoy: undefined,

    // values that are exactly equal to OSM tags
    spar: true,
    can: true,
    conical: true,

    // values that need to be standardised
    superbuoy: 'super-buoy',
    monobuoy: 'super-buoy',
  },
};
const COLOURS = new Set([
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'black',
  'white',
  'pink',
  'gray',
  'grey',
  'brown',
]);
const MATERIALS = {
  masonry: true,
  concrete: 'concreted',
  wooden: true,
  wood: 'wooden',
  metal: true,
  framework: true,
  skeleton: 'framework',
  lattice: 'framework',
  truss: 'framework',

  // these values are not documented on the wiki, nor in S-57
  iron: true,
  steel: true,
  fiberglass: true,
  brick: true,
  granite: true,
  aluminum: 'aluminium',
  aluminium: true,
  stone: true,
};

const COLOUR_PATTERNS: Record<string, string> = {
  checkered: 'squared',
};
const TOPMARK_SHAPES: Record<string, string> = {
  round: 'sphere',
  circular: 'sphere',
  spherical: 'sphere',
  sphere: 'sphere',
  square: 'square',
  cross: 'x-shape',
  rectangular: 'board',
  pyramidal: 'triangle, point up',
  triangular: 'triangle, point up',
  cylindrical: 'cylinder',
  diamond: 'rhombus',
  trapezoidal: 'trapezium, up',
  '"x"': 'x-shape',
};
const SHAPE_ADJECTIVES = new Set([
  ...Object.keys(TOPMARK_SHAPES),
  'octagonal',
  'hexagonal',
  'quadrangular',
  '[a-z]+-sided', // e.g. four-sided
]);

/** adjectives we don't care about, but might appear between 2 valid adjectives */
const JUNK_ADJECTIVES = new Set([
  'truncated', // unclear what this means
  'neon',
  'and',
]);

/** words that we completely strip out */
const JUNK_TOKENS = [
  'floodlit',
  //
];

const reNouns = [
  ...Object.keys(SHAPES.beacon),
  ...Object.keys(SHAPES.buoy),
].join('|');

const reAdjectives = [
  ...COLOURS,
  ...Object.keys(COLOUR_PATTERNS),
  ...Object.keys(MATERIALS),
  ...SHAPE_ADJECTIVES,
  ...JUNK_ADJECTIVES,
].join('|');

const reJunkTokens = new RegExp(String.raw`\b(${JUNK_TOKENS.join('|')})\b`);

const unparsableStructureLines: Record<string, number> = {};

export const getUnparsableStructureLines = () =>
  Object.entries(unparsableStructureLines)
    .toSorted((a, b) => b[1] - a[1])
    .map((line) => line.join('\t').replaceAll('\n', '⏎'))
    .join('\n');

export type Structure =
  | {
      type: 'cardinal';
      colour: string;
      colour_pattern: string;
      category: string;
      topmarkShape: string | false;
    }
  | { type: 'lateral'; category: string; colour: string; system?: string }
  | { type: 'isolated_danger'; colour: string; colour_pattern: string }
  | { type: 'safe_water'; colour: string; colour_pattern: string }
  | { type: 'special_purpose'; colour: string }
  | {
      type: 'shape';
      shape: 'buoy' | 'beacon';
      structure?: string;
      colour?: string;
      material?: string;
    }
  | {
      type: 'topmark' | 'daymark';
      colour?: string;
      colourPattern?: string;
      shape?: string;
      material?: string;
    }
  | { type: 'colourPattern'; colours: string[]; pattern: string }
  | { type: 'physicalHeight'; metres: string }
  | { type: 'helipad' }
  | { type: 'unknown'; remainder: string };

/**
 * Structures are easier than remarks, since all tokens
 * are english words. Dots and commas are never part of
 * a token, they're always separators.
 *
 * We can also use english grammar rules, e.g. looking
 * for nouns first, and possibly any associated adjectives
 * (e.g. colour or material)
 */
export function parseStructure(
  original: string | null,
  warnings: Warning[],
  isIalaRegionA: boolean,
): Structure[] | undefined {
  if (!original) return []; // 4700 have nothing. They have to be mapped as light_minor

  const { output, unparsable } = tokeniser<Structure>(
    original.toLowerCase().replaceAll(/&(l|r)dquo;/g, '"'),
    (workingString) => {
      const cardinalMatch = workingString.match(
        /([ensw]). cardinal (yby|byb|by|yb)/,
      );
      if (cardinalMatch) {
        // this is contradictory
        if (cardinalMatch[0] === 'e. cardinal yby') {
          warnings.push({ type: 'invalid_cardinal', value: cardinalMatch[0] });
          return undefined;
        }

        const [category, colour, topmarkShape] = {
          's. cardinal yb': ['south', 'yellow;black', '2 cones down'],
          'n. cardinal by': ['north', 'black;yellow', '2 cones up'],
          'w. cardinal yby': [
            'west',
            'yellow;black;yellow',
            '2 cones point together',
          ],
          'e. cardinal byb': [
            'east',
            'black;yellow;black',
            '2 cones base together',
          ],
        }[cardinalMatch[0]]!;

        return {
          raw: cardinalMatch[0],
          parsed: {
            type: 'cardinal',
            colour,
            colour_pattern: 'horizontal',
            category,
            topmarkShape: original.toLowerCase().includes('topmark')
              ? topmarkShape
              : false,
          },
        };
      }

      const lateralMatch = workingString.match(
        /\b(?<side>port|starboard) \((?<region>a|b)\) (?<colour>g|r)\b/,
      );
      if (lateralMatch) {
        const VALID_COLOURS: Record<string, string> = { r: 'red', g: 'green' };
        const { side, region, colour } = lateralMatch.groups!;

        if (isIalaRegionA !== (region === 'a')) {
          warnings.push({
            type: 'iala_region_mismatch',
            value: `[Lateral] Expected ${isIalaRegionA ? 'a' : 'b'}, got ${region}`,
          });
        }
        if (!(colour in VALID_COLOURS)) {
          throw new Error(`Illogical colour: “${colour}”`);
        }

        return {
          raw: lateralMatch[0],
          parsed: {
            type: 'lateral',
            category: side,
            colour: VALID_COLOURS[colour],
            system: `iala-${region}`,
          },
        };
      }

      const preferredChannelMatch = workingString.match(
        /\bpreferred channel \((?<region>a|b)\) \(to (?<side>port|starboard)\) (?<colour>grg|rgr)\b/,
      );
      if (preferredChannelMatch) {
        const VALID_COLOURS: Record<string, string> = {
          rgr: 'red;green;red',
          grg: 'green;red;green',
        };
        const { side, region, colour } = preferredChannelMatch.groups!;

        if (isIalaRegionA !== (region === 'a')) {
          warnings.push({
            type: 'iala_region_mismatch',
            value: `[Preferred Channel] Expected ${isIalaRegionA ? 'a' : 'b'}, got ${region}`,
          });
        }
        if (!(colour in VALID_COLOURS)) {
          throw new Error(`Illogical colour: “${colour}”`);
        }

        return {
          raw: preferredChannelMatch[0],
          parsed: {
            type: 'lateral',
            category: `preferred_channel_${side}`,
            colour: VALID_COLOURS[colour],
            system: `iala-${region}`,
          },
        };
      }

      const isoDangerMatch = workingString.match(/isolated danger brb/);
      if (isoDangerMatch) {
        return {
          raw: isoDangerMatch[0],
          parsed: {
            type: 'isolated_danger',
            colour: 'black;red;black',
            colour_pattern: 'horizontal',
          },
        };
      }

      const safeWaterMatch = workingString.match(/safe water rw/);
      if (safeWaterMatch) {
        return {
          raw: safeWaterMatch[0],
          parsed: {
            type: 'safe_water',
            colour: 'red;white',
            colour_pattern: 'vertical',
          },
        };
      }

      const specialPurposeMatch = workingString.match(/special y/);
      if (specialPurposeMatch) {
        return {
          raw: specialPurposeMatch[0],
          parsed: { type: 'special_purpose', colour: 'yellow' },
        };
      }

      const topmarkMatch =
        workingString.match(
          new RegExp(
            String.raw`(?<prefix>((${reAdjectives}) )*)(top|day)mark(?<suffix> points? (up|down))?(, (?<stripes>((${reAdjectives}) )*)(stripes?))?\b`,
          ),
        ) ||
        // sometimes, "x" is written without the word "topmark", because
        // it's so well-understood.
        workingString.match(
          new RegExp(
            String.raw`\b(?<prefix>((${reAdjectives}) )*)(?<suffix>"x")`,
          ),
        );
      if (topmarkMatch) {
        const type = topmarkMatch[0].includes('daymark')
          ? 'daymark'
          : 'topmark';
        const { prefix, suffix, stripes } = topmarkMatch.groups!;

        const allWords = [
          ...(prefix?.split(' ') || []),
          ...(suffix?.split(' ') || []),
          ...(stripes?.split(' ') || []),
        ]
          .filter(isTruthy)
          .filter((word) => !JUNK_ADJECTIVES.has(word));

        const colours = allWords.filter((word) => COLOURS.has(word));
        const colourPatterns = allWords
          .filter((word) => word in COLOUR_PATTERNS)
          .map((value) => COLOUR_PATTERNS[value] || value); // maybe apply overrides

        // the word 'stripes' implies horizontal
        if (colourPatterns.length === 0 && stripes) {
          colourPatterns.push('horizontal');
        }

        const shapes = allWords
          .filter((word) => word in TOPMARK_SHAPES)
          .map((value) => TOPMARK_SHAPES[value] || value); // maybe apply overrides

        const materials = allWords.filter((word) => word in MATERIALS);

        return {
          raw: topmarkMatch[0],
          parsed: deleteUndefinedKeys<Structure>({
            type,
            colour: colours.join(';') || undefined,
            colourPattern: colourPatterns.join(';') || undefined,
            shape: shapes.join(';') || undefined,
            material: materials?.join(';') || undefined,
          }),
        };
      }

      // must come before structures, because "platforn" is a possible structure
      const helipadMatch = workingString.match(/helicopter (pad|platform)/);
      if (helipadMatch) {
        return { raw: helipadMatch[0], parsed: { type: 'helipad' } };
      }

      // this should come towards the end.
      const shapeMatch = workingString.match(
        new RegExp(String.raw`\b(((${reAdjectives}) )*)(${reNouns})\b`),
      );
      if (shapeMatch) {
        const adjectives = shapeMatch[1].trim().split(' ');
        const noun = shapeMatch[4];
        const shape = noun in SHAPES.buoy ? 'buoy' : 'beacon';

        // some values might be need to be standardised
        const mappedNoun = SHAPES[shape][noun];

        const materials: string[] = [];
        for (const adj of adjectives) {
          const value = MATERIALS[<never>adj];
          if (value) {
            // maybe apply override value
            materials.push(typeof value === 'string' ? value : adj);
          }
        }

        return {
          raw: shapeMatch[0],
          parsed: deleteUndefinedKeys<Structure>({
            type: 'shape',
            shape,
            structure:
              noun in SHAPES[shape] && mappedNoun !== true ? mappedNoun : noun,
            colour: adjectives.filter((adj) => COLOURS.has(adj)).join(';'),
            material: materials.join(';'),
          }),
        };
      }

      // the last number with no units is the height of the physical
      // structure (different to the lens height). It appears to be
      // always in feet.
      const physicalHeightMatch = workingString.match(/(^|; )((\d|\.)+)$/);
      if (physicalHeightMatch) {
        const physicalHeightFeet = +physicalHeightMatch[2];
        return {
          raw: physicalHeightMatch[0],
          parsed: Number.isNaN(physicalHeightFeet)
            ? []
            : {
                type: 'physicalHeight',
                // convert feet to metres
                metres: (physicalHeightFeet * 0.3048).toFixed(1),
              },
        };
      }

      // this MUST come after topmarks are parsed, because the stripes could relate
      // to the topmark or the structure.
      const bandMatch = workingString.match(
        new RegExp(
          String.raw`\b(((${reAdjectives}) )*)(?<bandOrStripe>band|stripe)(s|ed|d)?\b`,
        ),
      );
      if (bandMatch) {
        // semantically, "bands" implies vertical stripes, and "stripes" implies
        // horizontal. But usually they only tell us one of the colours. But there
        // has to be 2+ colours, so we assume the other colour has
        // already been parsed.
        const words = bandMatch[1].split(' ').filter(isTruthy);

        let pattern: string | undefined;
        for (const word of words) {
          if (COLOUR_PATTERNS[word]) {
            pattern = COLOUR_PATTERNS[word];
          }
        }

        // use implied pattern if still undefined
        pattern ||=
          bandMatch.groups!.bandOrStripe === 'band' ? 'vertical' : 'horizontal';

        return {
          raw: bandMatch[0],
          parsed: {
            type: 'colourPattern',
            colours: words.filter((word) => COLOURS.has(word)),
            pattern,
          },
        };
      }

      const junkMatch = workingString.match(reJunkTokens);
      if (junkMatch) {
        // these values are simply discarded
        return { raw: junkMatch[0], parsed: [] };
      }

      return undefined; // nothing found this iteration
    },
  );

  // loop is complete - that means that anything
  // left in the string is unparsable.
  if (unparsable) {
    output.push({ type: 'unknown', remainder: unparsable });
    unparsableStructureLines[unparsable] ||= 0;
    unparsableStructureLines[unparsable]++;
  }

  return output;
}
