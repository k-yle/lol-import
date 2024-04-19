import {
  COLOURS,
  type Colour,
  type Light,
  decodeLight,
} from 'light-characteristics';
import type { LolFeature, Warning } from '../../helpers/types';
import { isTruthy } from '../../helpers/general';

const unparsableCharactericLines: Record<string, number> = {};

export const getUnparsableCharactericLines = () =>
  Object.entries(unparsableCharactericLines)
    .sort((a, b) => b[1] - a[1])
    .map((line) => line.join('\t'))
    .join('\n');

export type Characteric =
  | { type: 'period'; seconds: number }
  | { type: 'morse'; letters: string }
  | { type: 'sequence'; flash: number; eclipse: number }
  | { type: 'characteristic'; parsed: Light }
  | { type: 'unsupported'; line: string }
  | { type: 'unknown'; line: string };

/** The lol format needs a bit of tweaking before our library understands it */
function cleanCharacteristic(str: string) {
  return str
    .replace(/^(\d) +/i, '$1') // remove space after the first number (MLTYLT)
    .replace('(vert.)', '(vert)')
    .replace('(horiz.)', '(hor)')
    .replace('(hor.)', '(hor)')
    .replace('.Vi.', '.V.') // violet
    .replace('.Or.', '.O.') // orange

    .replace(/(?:^|Al.|Dir.)(\d)?F.L.Fl/, '$1FLFl') // remove dot for fixed/long flash
    .replace(/(?:^|Al.|Dir.)(\d)?L\.Fl/, '$1LFl') // remove dot for long flash
    .replace(/(?:^|Al.|Dir.)(\d)?I\.V.Q/, '$1IVQ') // remove dot for interrupted very quick
    .replace(/(?:^|Al.|Dir.)(\d)?I\.Q/, '$1IQ') // remove dot for interrupted quick
    .replace(/(?:^|Al.|Dir.)(\d)?V\.Q/, '$1VQ') // remove dot for very quick
    .replace(/(?:^|Al.|Dir.)(\d)?U\.Q/, '$1UQ') // remove dot for ultra quick
    .replace(/(?:^|Al.|Dir.)(\d)?F\.Fl/, '$1FFl') // remove dot for fixed/flash
    .replace(/^Dir\./, 'Dir') // remove dot between Dir and rest of the sequence
    .replace(/^Aero(\.| )/, 'Aero'); // remove dot/space between Aero and rest of the sequence
}

export function parseCharacteristics(
  lol: LolFeature,
  warnings: Warning[],
): Characteric[] {
  const lines = lol.characteristic
    .split('\n')
    .map((line) => line.trim())
    .filter(isTruthy);

  return lines.map((line): Characteric => {
    const periodMatch = line.match(/period ((\d|.)+)s/i);
    if (periodMatch) {
      return { type: 'period', seconds: +periodMatch[1] };
    }

    const morseMatch = line.match(/^(\w+)? ?\([ •-]+\)\.?$/);
    if (morseMatch) {
      if (!morseMatch[1]) {
        warnings.push({ type: 'invalid_morse', value: morseMatch[0] });
      }
      return { type: 'morse', letters: morseMatch[1] || '' };
    }

    const sequenceMatch = line.match(/^(null)?fl. ((\d|.)+)s, ec. ((\d|.)+)s$/);
    if (sequenceMatch) {
      return {
        type: 'sequence',
        flash: +sequenceMatch[2],
        eclipse: +sequenceMatch[4],
      };
    }

    // this is commented out, because plusses are valid when
    // within the SIGGRP (in parentheses), so checking for plus
    // is non-trivial, and there are hardly any examples of this.
    // if (line.includes('+')) {
    //   // multiple characteristics, not supported
    //   return { type: 'unsupported', line };
    // }

    // this one appears 236 times, it's invalid because it's missing the LITCHR,
    // but it's common enough that we'll special case it
    if (line === 'Dir.W.R.G.') {
      return {
        type: 'characteristic',
        parsed: {
          COLOUR: ['W', 'R', 'G'],
          LITCHR: <never>'', // this is why it's invalid
          CATLIT: 'directional',
        },
      };
    }

    // finally, try to parse the line as a light characteristic
    try {
      const parsed = decodeLight(cleanCharacteristic(line));
      return { type: 'characteristic', parsed };
    } catch {
      unparsableCharactericLines[line] ||= 0;
      unparsableCharactericLines[line]++;

      return { type: 'unknown', line };
    }
  });
}

export function parseCharacteristicForSector(
  str: string | undefined,
): Partial<Light> | undefined {
  try {
    if (!str) return undefined;
    if (str in COLOURS) {
      // it's just a colour
      return { COLOUR: [<Colour>str] };
    }

    return decodeLight(cleanCharacteristic(str));
  } catch {
    const key = `[Sector] ${str}`;
    unparsableCharactericLines[key] ||= 0;
    unparsableCharactericLines[key]++;
    return undefined;
  }
}
