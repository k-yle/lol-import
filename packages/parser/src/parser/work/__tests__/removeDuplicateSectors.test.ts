import { describe, expect, it } from 'vitest';
import {
  deleteSector,
  removeDuplicateSectors,
  reshuffleSectors,
} from '../removeDuplicateSectors';
import type { FELight, Warning } from '../../../helpers/types';

describe(deleteSector, () => {
  it('works', () => {
    expect(
      deleteSector(
        {
          'seamark:light:1:colour': 'red',
          'seamark:light:1:character': 'Fl',
          'seamark:light:2:colour': 'green',
          'seamark:light:2:character': 'Oc',
          'seamark:light:3:colour': 'blue',
          'seamark:light:3:character': 'F',
        },
        2,
      ),
    ).toStrictEqual({
      'seamark:light:1:colour': 'red',
      'seamark:light:1:character': 'Fl',
      'seamark:light:3:colour': 'blue',
      'seamark:light:3:character': 'F',
    });
  });
});

describe(reshuffleSectors, () => {
  it('fills up the gaps of sectors', () => {
    expect(
      reshuffleSectors({
        'seamark:light:1:colour': 'red',
        'seamark:light:1:character': 'Fl',
        'seamark:light:3:colour': 'green',
        'seamark:light:3:character': 'Oc',
        'seamark:light:6:colour': 'blue',
        'seamark:light:6:character': 'F',
      }),
    ).toStrictEqual({
      'seamark:light:1:colour': 'red',
      'seamark:light:1:character': 'Fl',
      'seamark:light:2:colour': 'green',
      'seamark:light:2:character': 'Oc',
      'seamark:light:3:colour': 'blue',
      'seamark:light:3:character': 'F',
    });
  });

  it('does nothing if all is well', () => {
    const okay = {
      'seamark:light:1:colour': 'red',
      'seamark:light:1:character': 'Fl',
      'seamark:light:2:colour': 'green',
      'seamark:light:2:character': 'Oc',
      'seamark:light:3:colour': 'blue',
      'seamark:light:3:character': 'F',
    };
    expect(reshuffleSectors(okay)).toStrictEqual(okay);
  });
});

describe(removeDuplicateSectors, () => {
  it('works', () => {
    const warnings: Warning[] = [];
    const light: Partial<FELight> = {
      tags: {
        'seamark:light:1:colour': 'red',
        'seamark:light:1:character': 'Fl',
        'seamark:light:2:colour': 'red',
        'seamark:light:2:character': 'Fl',
        'seamark:light:3:colour': 'red',
        'seamark:light:3:character': 'Fl',
        'seamark:light:4:colour': 'blue',
        'seamark:light:4:character': 'F',
      },
    };

    removeDuplicateSectors(<FELight>light, warnings);

    expect(warnings).toStrictEqual([
      {
        severity: 'info',
        type: 'duplicate_sectors',
        value: 'Removed 2 sector(s)',
      },
    ]);
    expect(light).toStrictEqual({
      tags: {
        'seamark:light:1:colour': 'red',
        'seamark:light:1:character': 'Fl',
        // sector 2 and 3 were removed
        'seamark:light:2:colour': 'blue', // sector 4 became sector 2
        'seamark:light:2:character': 'F',
      },
    });
  });
});
