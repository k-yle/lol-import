import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { promisify } from 'node:util';
import { exec } from 'node:child_process';
import type { OsmFeature, Tags } from 'osm-api';
import { format } from 'prettier';
import { iso1A2Code } from '@rapideditor/country-coder';
import {
  lolFile,
  osmFile,
  outputFolder,
  outputFullFile,
  outputStatsFile,
  taginfoFile,
  tempFolder,
  unparsableFile,
  warningsFile,
} from './helpers/constants';
import { getContinents, parseCoords } from './helpers/geo';
import { loadIgnoreFile, loadLolFile, loadOsmFile } from './stages/fetch';
import { conflateTags } from './stages/conflate';
import { generateOsmTags } from './parser/generateOsmTags';
import { getUnparsableCharactericLines } from './parser/lexer/parseCharacteristics';
import { getUnparsableRemarks } from './parser/lexer/parseRemarks';
import { getUnparsableStructureLines } from './parser/lexer/parseStructure';
import { generateTagInfoFile } from './helpers/taginfo';
import {
  type FELight,
  type FullFile,
  type IgnoreInfo,
  type StatsFile,
  type Verdict,
  type Warning,
  emptyStats,
} from './helpers/types';
import { isTruthy, removeTrailingZeros, sortObject } from './helpers/general';
import { mergeLights } from './stages/merge';
import { createDiffHash } from './helpers/createDiffHash';
import { removeDuplicateSectors } from './parser/work/removeDuplicateSectors';

/** if the only thing that needs changing are these keys, then abort */
const TRIVIAL_KEYS = new Set(['source', 'seamark:name', 'seamark:information']);

async function main() {
  // create folder if they doesn't exist
  await fs.mkdir(tempFolder, { recursive: true });
  await fs.mkdir(outputFolder, { recursive: true });

  // when running locally, create a git repo in the output folder
  // so we can easily see the diff of what changed since the last
  // execution.
  if (!process.env.CI) {
    await promisify(exec)(
      [
        'rm -rf .git',
        'git init',
        'git add .',
        "git commit -m '.' --allow-empty",
      ].join(' && '),
      { cwd: outputFolder },
    );
  }

  const lolData = await loadLolFile();
  const osmData = await loadOsmFile();
  const ignoreData = await loadIgnoreFile();

  // make debugging the massive json files a bit easier
  await fs.writeFile(
    lolFile.replace('.json', '_head.json'),
    JSON.stringify(lolData.ngalol.slice(0, 1000), null, 2),
  );
  await fs.writeFile(
    osmFile.replace('.json', '_head.json'),
    JSON.stringify(osmData.elements.slice(0, 1000), null, 2),
  );

  console.log(lolData.ngalol.length, 'in lol');
  console.log(osmData.elements.length, 'in osm');

  const osmByRef: Record<string, OsmFeature> = {};
  for (const feature of osmData.elements) {
    const ref = feature.tags!['seamark:light:reference'];
    osmByRef[removeTrailingZeros(ref)] = feature;
  }

  const allIDsInLOL = new Set<string>();

  const timestampNoTime = lolData.timestamp.split('T', 1)[0]; // date only

  const stats: StatsFile = {
    timestamp: lolData.timestamp,
    timestampNoTime,
    global: emptyStats(),
    byCountry: {},
    continents: {},
  };
  const fullData: FullFile = {};
  let allWarnings: { [warningType: string]: string[] } = {};

  for (const lol of lolData.ngalol) {
    if (!lol.position.trim()) continue; // broken row

    const pos = parseCoords(lol.position);
    const country =
      iso1A2Code([pos.lon, pos.lat], { level: 'territory' }) || '--';

    // temporarily set to the raw value until we parse it
    let ialaId: string = lol.featureNumber;

    let expectedTags: Tags | undefined;
    let warnings: Warning[] | undefined;
    try {
      const result = generateOsmTags(lol, country, timestampNoTime);
      expectedTags = result.tags;
      ialaId = result.ialaId;

      warnings = result.warnings; // store for later
    } catch (ex) {
      const newError = new Error(
        `[${country}] [${ialaId.replaceAll('\n', '|')}] ${(<Error>ex).message}`,
      );
      newError.cause = ex;
      throw newError;
    }
    if (!expectedTags) continue; // invalid entry, skip it

    let verdict: Verdict;

    allIDsInLOL.add(removeTrailingZeros(ialaId));

    const newLight: FELight = {
      country,
      ...pos,
      warnings,
      orig: {
        characteristic: lol.characteristic,
        name: [
          lol.geopoliticalHeading,
          lol.regionHeading,
          lol.subregionHeading,
          lol.localHeading,
          lol.name,
        ]
          .filter(isTruthy)
          .join('\n'),
        remarks: lol.remarks,
        structure: lol.structure,
        heightFeetMeters: lol.heightFeetMeters,
        range: lol.range,
      },
      tags: expectedTags,
      osm: undefined, // added later
    };

    fullData[country] ||= {};

    // merge first, then diff with osm
    const mergeWarnings: Warning[] = [];
    fullData[country][ialaId] = fullData[country][ialaId]
      ? mergeLights(fullData[country][ialaId], newLight, mergeWarnings)
      : newLight;

    removeDuplicateSectors(fullData[country][ialaId], mergeWarnings);

    const osm = osmByRef[removeTrailingZeros(ialaId)];

    let tagDiff: Tags | undefined;
    if (osm) {
      // exists in OSM
      tagDiff = conflateTags(fullData[country][ialaId].tags, osm.tags!);
      const nonTrivialKeysToUpdate = Object.keys(tagDiff).filter(
        (key) => !TRIVIAL_KEYS.has(key),
      );
      if (nonTrivialKeysToUpdate.length) {
        verdict = 'existsButNeedsUpdate';
      } else {
        verdict = 'existsAndPerfect';
        tagDiff = {};
      }

      const diffHash = createDiffHash(osm.tags!, tagDiff);

      // check if someone has ignored this suggested change
      let ignored: IgnoreInfo | undefined;
      if (
        verdict === 'existsButNeedsUpdate' &&
        ignoreData.ignored[ialaId]?.diffHash === diffHash
      ) {
        verdict = 'existsAndSuggestionsIgnored';
        ignored = ignoreData.ignored[ialaId];
      }

      fullData[country][ialaId].osm = {
        id: osm.type[0] + osm.id,
        verdict,
        currentTags: osm.tags!,
        diff: tagDiff,
        diffHash,
        ignored,
      };
    } else {
      verdict = 'missing';
    }

    stats.global[verdict]++;
    stats.byCountry[country] ||= emptyStats();
    stats.byCountry[country].ids.push(ialaId);
    stats.byCountry[country][verdict]++;

    if (mergeWarnings.length) {
      fullData[country][ialaId].warnings ||= [];
      fullData[country][ialaId].warnings?.push(...mergeWarnings);
    }

    for (const warning of [...warnings, ...mergeWarnings]) {
      allWarnings[warning.type] ||= [];
      allWarnings[warning.type].push(
        `[${country}] [${ialaId}] ${warning.value}`,
      );
    }
  }

  // now find all the refs that exist in OSM but not in IALA
  for (const ialaId in osmByRef) {
    if (!allIDsInLOL.has(ialaId)) {
      const osmFeature = osmByRef[ialaId];
      // @ts-expect-error -- no typedefs
      const pos = osmFeature?.center || osmFeature;
      const country =
        iso1A2Code([pos.lon, pos.lat], { level: 'territory' }) || '--';

      stats.global.unexpected++;
      stats.byCountry[country] ||= emptyStats();
      stats.byCountry[country].unexpected++;
    }
  }

  console.warn('Warnings:');
  allWarnings = sortObject(allWarnings);
  for (const type in allWarnings) {
    console.warn(allWarnings[type].length, type);
  }

  stats.continents = getContinents(Object.keys(stats.byCountry));

  // split by country so that you don't need to download 26MB of JSON when opening the website
  for (const country in fullData) {
    const path = outputFullFile.replace('%s', country);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, JSON.stringify(fullData[country], null, 2));
  }

  await fs.writeFile(outputStatsFile, JSON.stringify(stats, null, 2));
  await fs.writeFile(warningsFile, JSON.stringify(allWarnings, null, 2));

  await fs.writeFile(unparsableFile('remark'), getUnparsableRemarks());
  await fs.writeFile(unparsableFile('struct'), getUnparsableStructureLines());
  await fs.writeFile(
    unparsableFile('characteristic'),
    getUnparsableCharactericLines(),
  );

  await fs.writeFile(
    taginfoFile,
    await format(JSON.stringify(generateTagInfoFile()), {
      parser: 'json',
      printWidth: 150,
    }),
  );
}

main();
