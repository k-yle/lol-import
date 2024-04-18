/* eslint-disable no-param-reassign */
import type { Tags } from 'osm-api';
import type { Warning } from '../../helpers/types';
import { getHighestSector } from '../../stages/merge';
import { duplicateLightTags } from '../../helpers/duplicateLightTags';
import { allowOverride } from '../../helpers/proxy';

/**
 * if there are multiple ranges and/or lensHeights, but only 1 light,
 * then split the light so we can add the correct ranges and/or lensHeights
 */
export function splitMultiLights(
  tags: Tags,
  warnings: Warning[],
  {
    range,
    lensHeight,
  }: { range: string | string[]; lensHeight: string | string[] },
) {
  const highestSector = getHighestSector(tags);

  const requiredSectorsForLens = Array.isArray(lensHeight)
    ? lensHeight.length
    : 1;
  const requiredSectorsForRange = Array.isArray(range) ? range.length : 1;

  if (requiredSectorsForLens > 1 || requiredSectorsForRange > 1) {
    if (
      requiredSectorsForLens > 1 &&
      requiredSectorsForRange > 1 &&
      requiredSectorsForLens !== requiredSectorsForRange
    ) {
      warnings.push({
        type: 'range_lens_mismatch',
        value: `${requiredSectorsForLens} different lens heights, but ${requiredSectorsForRange} different ranges.`,
      });
    } else {
      // one of them could be 1, but not both. So find the highest
      const requiredSectors = Math.max(
        requiredSectorsForRange,
        requiredSectorsForLens,
      );

      // if there's only 1 sector, it's the same as 0, just a different tag name
      const multipleKey =
        highestSector === 1
          ? 'seamark:light:1:multiple'
          : 'seamark:light:multiple';
      const multiple = tags[multipleKey];

      if (multiple) {
        if (requiredSectors === +multiple) {
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete tags[multipleKey]; // no longer required since we've split the light
          duplicateLightTags(tags, requiredSectors, highestSector);

          for (let index = 0; index < requiredSectors; index++) {
            // `allowOverride` is safe here, since we just created these tags
            // a few lines above using `duplicateLightTags`.
            if (Array.isArray(range)) {
              tags[`seamark:light:${index + 1}:range`] = allowOverride(
                range[index] || '',
              );
            }
            if (Array.isArray(lensHeight)) {
              tags[`seamark:light:${index + 1}:height`] = allowOverride(
                lensHeight[index],
              );
            }
          }
        } else {
          // mismatch
          throw new Error('Mismatched number of lights vs lens heights');
        }
      } else {
        warnings.push({
          type: 'invalid_lens_height_or_range',
          value: `${requiredSectors} sectors required for lens and/or range, but only 1 light was detected`,
        });
      }
    }
  }
}
