import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { promisify } from 'node:util';
import { exec } from 'node:child_process';
import type { Point } from 'geojson';
import type { Tags } from 'osm-api';
import { format } from 'prettier';
import { iso1A2Code } from '@rapideditor/country-coder';
import {
  type Config,
  type DatasetId,
  type OsmFeature,
  type Vec2,
  run,
  writeJsonL,
} from '@osm-conflation-engine/cli';
import {
  lolConvertedFile,
  lolFile,
  outputFolder,
  outputFullFile,
  outputStatsFile,
  taginfoFile,
  tempFolder,
  unparsableFile,
  warningsFile,
} from './helpers/constants.js';
import { getContinents, parseCoords } from './helpers/geo.js';
import { loadLolFile } from './stages/fetch.js';
import { TRIVIAL_KEYS, conflateTags } from './stages/conflate.js';
import { generateOsmTags } from './parser/generateOsmTags.js';
import { getUnparsableCharactericLines } from './parser/lexer/parseCharacteristics.js';
import { getUnparsableRemarks } from './parser/lexer/parseRemarks.js';
import { getUnparsableStructureLines } from './parser/lexer/parseStructure.js';
import { generateTagInfoFile } from './helpers/taginfo.js';
import {
  type FELight,
  type FELightGeoJson,
  type FullFile,
  type StatsFile,
  type Verdict,
  type Warning,
  emptyStats,
} from './helpers/types.js';
import {
  isTruthy,
  removeTrailingZeros,
  sortObject,
} from './helpers/general.js';
import { mergeLights } from './stages/merge.js';
import { removeDuplicateSectors } from './parser/work/removeDuplicateSectors.js';

const REF_KEY = 'seamark:light:reference';
const CHECK_DATE_KEY = 'seamark:date'; // stupid tag

const config: Config = {
  $schema:
    'https://unpkg.com/@osm-conflation-engine/cli/dist/config.schema.json',
  metadata: {
    region: '001',
    name: 'List of Lights',
    description:
      'Lighthouses and Maritime Aids to Navigation from the US Department of Defense',
    git_repository: 'https://github.com/k-yle/lol-import',
    wiki_page: 'https://osm.wiki/OpenSeaMap/List_of_Lights_Import',
  },
  source_data: {
    type: 'file',
    file: lolConvertedFile,
  },
  o_data: {
    check_date_key: CHECK_DATE_KEY,
    source: {
      type: 'postpass',
      // postpass_query_file is not specified, so it'll default to downloading everything with seamark:light:reference=*
    },
    tags_to_keep: [REF_KEY, CHECK_DATE_KEY, '/.+/'],
  },
  merge: {
    osm_key: REF_KEY,
    dataset_column: 'ialaId',
  },
  output: { folder: outputFolder },
};

function getRegion(pos: FELight | OsmFeature) {
  const centroid: Vec2 = 'lat' in pos ? [pos.lon, pos.lat] : pos.centroid;
  return iso1A2Code(centroid, { level: 'territory' }) || '--';
}

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

  // make debugging the massive json files a bit easier
  await fs.writeFile(
    lolFile.replace('.json', '_head.json'),
    JSON.stringify(lolData.ngalol.slice(0, 1000), null, 2),
  );

  console.log(lolData.ngalol.length, 'in lol');

  const timestampNoTime = lolData.timestamp.split('T', 1)[0]; // date only

  const stats: StatsFile = {
    timestamp: lolData.timestamp,
    timestampNoTime,
    global: emptyStats(),
    byCountry: {},
    continents: {},
    TRIVIAL_KEYS: [...TRIVIAL_KEYS],
  };
  const fullData: FullFile = {};
  let allWarnings: { [warningType: string]: string[] } = {};

  const uniqueWarnings = new Set<string>();

  const addWarning = (
    country: string,
    ialaId: string,
    { type, value }: Warning,
  ) => {
    allWarnings[type] ||= [];
    allWarnings[type].push(`[${country}] [${ialaId}] ${value}`);
    uniqueWarnings.add(`[${type}] ${value}`);
  };

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

    const newLight: FELight = {
      ialaId: ialaId as DatasetId,
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

    if (mergeWarnings.length) {
      fullData[country][ialaId].warnings ||= [];
      fullData[country][ialaId].warnings?.push(...mergeWarnings);
    }

    for (const warning of [...warnings, ...mergeWarnings]) {
      addWarning(country, ialaId, warning);
    }
  }

  const allLights: FELightGeoJson[] = Object.values(fullData)
    .flatMap((v) => Object.values(v))
    .map((f) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [f.lon, f.lat] },
      properties: f,
    }));

  const seen = new Set<string>();

  function recordVerdict(country: string, ialaId: string, verdict: Verdict) {
    if (verdict !== 'unexpected') seen.add(ialaId);
    stats.global[verdict]++;
    stats.byCountry[country] ||= emptyStats();
    stats.byCountry[country][verdict]++;
  }

  function recordMatch(source: FELight, osm: OsmFeature) {
    const light = fullData[source.country][source.ialaId];
    const diff = conflateTags(source.tags, osm.tags);
    const verdict: Verdict = Object.keys(diff).length
      ? 'existsButNeedsUpdate'
      : 'existsAndPerfect';

    light.tags = source.tags;
    light.osm = {
      id: osm.id,
      currentTags: osm.tags,
      diff,
      verdict,
    };
    recordVerdict(source.country, source.ialaId, verdict);
    return diff;
  }

  await writeJsonL(lolConvertedFile, allLights);

  await run<Point, FELight>(
    config,
    {
      getAltRefs(ref) {
        // OSM sometimes has a trailing zero (e.g. `K 1234.50` vs `K 1234.5`)
        // so we need to match on both variants.
        const alternatives = new Set([
          removeTrailingZeros(ref),
          ref.includes('.') ? `${ref}0` : `${ref}.0`,
        ]);
        alternatives.delete(ref);
        return [...alternatives] as DatasetId[];
      },

      // setting these to the primary key is basically a no-op.
      // in the future we can make this a bit smarter, maybe
      // based on `seamark:name`.
      getLocalKeyForOsm: (osm) => osm.tags[REF_KEY] || osm.id,
      getLocalKeyForSource: (row) => row.properties.ialaId,

      create({ source }) {
        recordVerdict(
          source.properties.country,
          source.properties.ialaId,
          'missing',
        );
        return {
          diff: { tags: source.properties.tags },
          category: '',
          group: getRegion(source.properties),
          selection: undefined, // not implemented yet
        };
      },

      mergeOneToOne({ osm, source }) {
        const tagDiff = recordMatch(source.properties, osm);
        return {
          diff: { tags: { ...tagDiff } },
          category: '',
          group: getRegion(source.properties),
        };
      },

      mergeOneToMany({ osm, source }) {
        // arbitrarily pick the first OSM feature for recording a match,
        // since the old FE doesn't have a way to render 1:many
        if (osm.length) recordMatch(source.properties, osm[0]);
        addWarning(source.properties.country, source.properties.ialaId, {
          type: '1:many',
          value: `${REF_KEY} exists on ${osm.length} OSM features (${osm.map((f) => f.id).join(', ')})`,
        });
        return undefined;
      },

      mergeManyToOne({ osm, source }) {
        // this callback is just to collect, we don't actually propose any modifications.

        for (const sourceFeature of source) {
          recordMatch(sourceFeature.properties, osm);
          addWarning(
            sourceFeature.properties.country,
            sourceFeature.properties.ialaId,
            {
              type: 'many:1',
              value: `${osm.id} has a semicolon-delimited ${REF_KEY}`,
            },
          );
        }
        return undefined;
      },

      mergeManyToMany({ osm, source }) {
        // this callback is just to collect, we don't actually propose any modifications.

        for (const sourceFeature of source) {
          if (osm.length) recordMatch(sourceFeature.properties, osm[0]);
          addWarning(
            sourceFeature.properties.country,
            sourceFeature.properties.ialaId,
            {
              type: 'many:many',
              value: `${osm.map((f) => f.id).join(', ')} have a semicolon-delimited ${REF_KEY}`,
            },
          );
        }
        return undefined;
      },

      deleteFeature({ osm }) {
        // this callback is just to collect, we don't actually propose any modifications.
        recordVerdict(getRegion(osm), osm.tags[REF_KEY], 'unexpected');
        return undefined;
      },

      addCustomLayers() {
        return { '': { '': { warnings: [...uniqueWarnings] } } };
      },
    },
    { use_cache: true },
  );

  // collect stats for any missing ones (e.g. items on the ignore list)
  for (const country in fullData) {
    for (const ialaId in fullData[country]) {
      if (seen.has(ialaId)) continue;

      recordVerdict(country, ialaId, 'existsAndPerfect');
      addWarning(country, ialaId, {
        type: 'skipped',
        value: `${ialaId} skipped by osm-conflation-engine for whatever reason`,
      });
    }
    stats.byCountry[country].ids = Object.keys(fullData[country]).toSorted();
  }
  stats.byCountry = sortObject(stats.byCountry);

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
