import {
  COLOURS,
  type Colour,
  type LightCategory,
  type LightCharacteristic,
  encodeLight,
} from 'light-characteristics';
import type { Tags } from '../components/TagDiff';

/**
 * Converts the OSM tags back into a compressed light
 * characteristic string.
 */
export function reëncodeLight(tags: Tags, sector = '') {
  return encodeLight({
    COLOUR: (tags[`seamark:light:${sector}colour`]?.split(';') || []).map(
      (colourName) =>
        Object.entries(COLOURS).find(
          ([, name]) => name === colourName,
        )?.[0] as Colour,
    ),
    LITCHR: tags[`seamark:light:${sector}character`] as LightCharacteristic,
    HEIGHT: +tags[`seamark:light:${sector}height`]! || undefined,
    CATLIT: tags[`seamark:light:${sector}category`] as LightCategory,
    MLTYLT: +tags[`seamark:light:${sector}multiple`]! || undefined,
    SIGGRP: tags[`seamark:light:${sector}group`] || undefined,
    SIGPER: +tags[`seamark:light:${sector}period`]! || undefined,
    VALMXR: +tags[`seamark:light:${sector}range`]! || undefined,
  });
}
