import type { Tags } from 'osm-api';
import type { Warning } from '../../helpers/types';

/**  sanity check that the period = ∑ of the sequence */
export function checkPeriodSum(tags: Tags, warnings: Warning[]) {
  for (const key in tags) {
    const sequenceKey = key.replace(':period', ':sequence');
    if (key.endsWith(':period') && tags[sequenceKey]) {
      const period = +tags[key];
      const sequence = tags[sequenceKey]
        .replaceAll(/[()]/g, '')
        .split('+')
        .map(Number);
      const sequenceSum = sequence.reduce((a, b) => a + b, 0);
      if (period !== sequenceSum) {
        warnings.push({
          type: 'period_sum',
          value: `The ${key.split(':')[1]} sequence “${tags[sequenceKey]}” does not add up to ${period}.`,
        });
      }
    }
  }
}
