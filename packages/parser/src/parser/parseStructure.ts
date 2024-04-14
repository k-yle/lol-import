import { deleteUndefinedKeys, isTruthy } from '../helpers/general';
import type { Warning } from '../helpers/types';

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
    buoyant: true, // TODO: check examples
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
  '"x"': 'x-shape',
};
const SHAPE_ADJECTIVES = new Set([
  ...Object.keys(TOPMARK_SHAPES),
  'octagonal',
  'hexagonal',
  'quadrangular',
  'trapezoidal',
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

const reJunkTokens = new RegExp(`\\b(${JUNK_TOKENS.join('|')})\\b`);

const unparsableStructureLines: Record<string, number> = {};

export const getUnparsableStructureLines = () =>
  Object.entries(unparsableStructureLines)
    .sort((a, b) => b[1] - a[1])
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
  if (!original) return []; // TODO: how many have nothing? can we assume they're beacons?

  /**
   * we chop out parts of this string until there's
   * nothing left that we understand.
   */
  let workingString = original.toLowerCase().replaceAll(/&(l|r)dquo;/g, '"');

  function removeFromWorkingString(subString: string) {
    workingString = workingString
      .replace(subString, '')
      .replaceAll(/(^[\n ,.]+|[\n ,.]+$)/g, ''); // like String#trim, but includes punctuation
  }

  // no-op to trim existing whitespace
  removeFromWorkingString('----------');

  const output: Structure[] = [];

  let lastIteration: string | undefined;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // if nothing has changed in the last iteration, then we're done
    if (lastIteration === workingString) break;
    lastIteration = workingString;

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

      output.push({
        type: 'cardinal',
        colour,
        colour_pattern: 'horizontal',
        category,
        topmarkShape: original.toLowerCase().includes('topmark')
          ? topmarkShape
          : false,
      });

      removeFromWorkingString(cardinalMatch[0]);
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

      output.push({
        type: 'lateral',
        category: side,
        colour: VALID_COLOURS[colour],
        system: `iala-${region}`,
      });
      removeFromWorkingString(lateralMatch[0]);
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

      output.push({
        type: 'lateral',
        category: `preferred_channel_${side}`,
        colour: VALID_COLOURS[colour],
        system: `iala-${region}`,
      });
      removeFromWorkingString(preferredChannelMatch[0]);
    }

    const isoDangerMatch = workingString.match(/isolated danger brb/);
    if (isoDangerMatch) {
      output.push({
        type: 'isolated_danger',
        colour: 'black;red;black',
        colour_pattern: 'horizontal',
      });
      removeFromWorkingString(isoDangerMatch[0]);
    }

    const safeWaterMatch = workingString.match(/safe water rw/);
    if (safeWaterMatch) {
      output.push({
        type: 'safe_water',
        colour: 'red;white',
        colour_pattern: 'vertical',
      });
      removeFromWorkingString(safeWaterMatch[0]);
    }

    const specialPurposeMatch = workingString.match(/special y/);
    if (specialPurposeMatch) {
      output.push({ type: 'special_purpose', colour: 'yellow' });
      removeFromWorkingString(specialPurposeMatch[0]);
    }

    const topmarkMatch =
      workingString.match(
        new RegExp(
          `\\b(?<prefix>((${reAdjectives}) )*)(top|day)mark(?<suffix> points? (up|down))?(, (?<stripes>((${reAdjectives}) )*)(stripes?))?\\b`,
        ),
      ) ||
      // sometimes, "x" is written without the word "topmark", because
      // it's so well-understood.
      workingString.match(
        new RegExp(`\\b(?<prefix>((${reAdjectives}) )*)(?<suffix>"x")`),
      );
    if (topmarkMatch) {
      const type = topmarkMatch[0].includes('daymark') ? 'daymark' : 'topmark';
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

      // the word 'stripes' or 'bands' implies horizontal
      if (colourPatterns.length === 0 && stripes) {
        colourPatterns.push('horizontal');
      }

      const shapes = allWords
        .filter((word) => word in TOPMARK_SHAPES)
        .map((value) => TOPMARK_SHAPES[value] || value); // maybe apply overrides

      const materials = allWords.filter((word) => word in MATERIALS);

      output.push(
        deleteUndefinedKeys<Structure>({
          type,
          colour: colours.join(';') || undefined,
          colourPattern: colourPatterns.join(';') || undefined,
          shape: shapes.join(';') || undefined,
          material: materials?.join(';') || undefined,
        }),
      );

      removeFromWorkingString(topmarkMatch[0]);
    }

    // must come before structures, because "platforn" is a possible structure
    const helipadMatch = workingString.match(/helicopter (pad|platform)/);
    if (helipadMatch) {
      output.push({ type: 'helipad' });
      removeFromWorkingString(helipadMatch[0]);
    }

    // this should come towards the end.
    const shapeMatch = workingString.match(
      new RegExp(`\\b(((${reAdjectives}) )*)(${reNouns})\\b`),
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

      output.push(
        deleteUndefinedKeys<Structure>({
          type: 'shape',
          shape,
          structure:
            noun in SHAPES[shape] && mappedNoun !== true ? mappedNoun : noun,
          colour: adjectives.filter((adj) => COLOURS.has(adj)).join(';'),
          material: materials.join(';'),
        }),
      );
      removeFromWorkingString(shapeMatch[0]);
    }

    // the last number with no units is the height of the physical
    // structure (different to the lens height). It appears to be
    // always in feet.
    const physicalHeightMatch = workingString.match(/(^|; )((\d|\.)+)$/);
    if (physicalHeightMatch) {
      const physicalHeightFeet = +physicalHeightMatch[2];
      if (!Number.isNaN(physicalHeightFeet)) {
        output.push({
          type: 'physicalHeight',
          // convert feet to metres
          metres: (physicalHeightFeet * 0.3048).toFixed(1),
        });
      }
      removeFromWorkingString(physicalHeightMatch[0]);
    }

    // this MUST come after topmarks are parsed, because the stripes could relate
    // to the topmark or the structure.
    const bandMatch = workingString.match(
      new RegExp(`\\b(((${reAdjectives}) )*)(band|stripe)(s|ed|d)?\\b`),
    );
    if (bandMatch) {
      // semantically, "bands" implies horizontal stripes, but usually
      // they only tell us one of the colours. "Stripes" means there
      // has to be 2+ colours, so we assume the other colour has
      // already been parsed.
      const words = bandMatch[1].split(' ').filter(isTruthy);

      let pattern = 'horizontal';
      for (const word of words) {
        if (COLOUR_PATTERNS[word]) {
          pattern = COLOUR_PATTERNS[word];
        }
      }

      output.push({
        type: 'colourPattern',
        colours: words.filter((word) => COLOURS.has(word)),
        pattern,
      });
      removeFromWorkingString(bandMatch[0]);
    }

    const junkMatch = workingString.match(reJunkTokens);
    if (junkMatch) {
      // these values are simply discarded
      removeFromWorkingString(junkMatch[0]);
    }
  }

  // loop is complete - that means that anything
  // left in the string is unparsable.
  if (workingString) {
    output.push({ type: 'unknown', remainder: workingString });
    unparsableStructureLines[workingString] ||= 0;
    unparsableStructureLines[workingString]++;
  }

  return output;
}
