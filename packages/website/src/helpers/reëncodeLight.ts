import {
  COLOURS,
  type Colour,
  type LightCategory,
  type LightCharacteristic,
  encodeLight,
} from 'light-characteristics';
import type { FELight } from '../../../parser/src/helpers/types';

/**
 * Converts the OSM tags back into a compressed light
 * characteristic string.
 */
export function reëncodeLight(light: FELight) {
  return encodeLight({
    COLOUR: (light.tags['seamark:light:colour']?.split(';') || []).map(
      (colourName) =>
        Object.entries(COLOURS).find(
          ([, name]) => name === colourName,
        )?.[0] as Colour,
    ),
    LITCHR: light.tags['seamark:light:character'] as LightCharacteristic,
    HEIGHT: +light.tags['seamark:light:height'] || undefined,
    CATLIT: light.tags['seamark:light:category'] as LightCategory,
    MLTYLT: +light.tags['seamark:light:multiple'] || undefined,
    SIGGRP: light.tags['seamark:light:group'],
    SIGPER: +light.tags['seamark:light:period'] || undefined,
    VALMXR: +light.tags['seamark:light:range'] || undefined,
  });
}
