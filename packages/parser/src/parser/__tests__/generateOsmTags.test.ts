import { describe, expect, it } from 'vitest';
import { generateOsmTags } from '../generateOsmTags';
import type { LolFeature } from '../../helpers/types';

describe(generateOsmTags, () => {
  it('splits the multi-light and uses the correct height and range per lamp', () => {
    const light: LolFeature = {
      volumeNumber: 'PUB 114',
      aidType: 'Lighted Aids',
      geopoliticalHeading: 'DENMARK-NORTH SEA',
      regionHeading: null,
      subregionHeading: null,
      localHeading: null,
      precedingNote: null,
      featureNumber: '11000\nB2098',
      name: 'Lildstrand Ranges.',
      position: '57°09\'11.99"N \n8°57\'54"E',
      charNo: 1,
      characteristic: '3 F.W.\n',
      heightFeetMeters: '40\n12\n71\n22\n40\n12',
      range: '7 ; 8 ; 7',
      structure: 'Unpainted wooden masts.\n',
      remarks:
        'Visible 127°-149°.  Range lights.  Moved as channel changes.\nOccasional. \n',
      postNote: null,
      noticeNumber: 201604,
      removeFromList: 'N',
      deleteFlag: 'Y',
      noticeWeek: '04',
      noticeYear: '2016',
    };
    expect(generateOsmTags(light, 'DK', '1970')).toStrictEqual({
      ialaId: 'B 2098',
      tags: {
        'seamark:type': 'light_minor',
        'seamark:name': 'Lildstrand Ranges',
        'seamark:light:reference': 'B 2098',
        'seamark:information':
          'unpainted wooden masts;Range lights. Moved as channel changes',
        source: 'US NGA Pub. 114. 1970.',

        'seamark:light:1:character': 'F',
        'seamark:light:1:colour': 'white',
        'seamark:light:1:exhibition': 'occasional',
        'seamark:light:1:height': '12',
        'seamark:light:1:range': '7',
        'seamark:light:1:sector_start': '127',
        'seamark:light:1:sector_end': '149',

        'seamark:light:2:character': 'F',
        'seamark:light:2:colour': 'white',
        'seamark:light:2:exhibition': 'occasional',
        'seamark:light:2:height': '22',
        'seamark:light:2:range': '8',
        'seamark:light:2:sector_start': '127',
        'seamark:light:2:sector_end': '149',

        'seamark:light:3:character': 'F',
        'seamark:light:3:colour': 'white',
        'seamark:light:3:exhibition': 'occasional',
        'seamark:light:3:height': '12',
        'seamark:light:3:range': '7',
        'seamark:light:3:sector_start': '127',
        'seamark:light:3:sector_end': '149',
      },
      warnings: [],
    });
  });
});
