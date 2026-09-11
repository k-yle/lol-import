import { join } from 'node:path';

export const tempFolder = join(import.meta.dirname, '../../tmp');
export const outputFolder = join(import.meta.dirname, '../../out');

export const lolFile = join(tempFolder, 'lol.json');
export const osmFile = join(tempFolder, 'osm.json');
export const ignoreFile = join(tempFolder, 'ignore.json');

export const outputStatsFile = join(outputFolder, 'stats.json');
export const warningsFile = join(outputFolder, 'warnings.json');
export const unparsableFile = (type: string) =>
  join(outputFolder, `unparsable_${type}.txt`);
export const outputFullFile = join(outputFolder, 'full', '%s.json');
export const taginfoFile = join(outputFolder, 'taginfo.json');

/* https://osm.wiki/File:IALA_Maritime_Buoyage_System_Regions.svg */
export const IALA_B = new Set([
  // East Asia
  'JP',
  'KR',
  'PH',
  'TW',
  // North America
  'US',
  'CA',
  // South America
  'BR',
  'BO',
  'PE',
  'CO',
  'EC',
  'VE',
  'GY',
  'AR',
  'PY',
  'UY',
  'CL',
  'FK',
  'SR',
  'GF',
  // Central America
  'MX',
  'HN',
  'GT',
  'SV',
  'NI',
  'CR',
  'PA',
  // Caribbean
  'CU',
  'BS',
  'TC',
  'DO',
  'HT',
  'JM',
  'TT',
  'GD',
  'VC',
  'BB',
  'LC',
  'MQ',
  'DM',
  'GP',
  'MS',
  'AG',
  'MF',
  'BL',
  'VG',
  'AI',
  'SX',
  'BQ',
  'CW',
  'AW',
  'BM',
  'KN',
]);

export const USER_AGENT = 'https://github.com/k-yle/lol-import';
