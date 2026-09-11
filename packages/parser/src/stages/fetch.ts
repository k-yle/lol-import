import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import {
  USER_AGENT,
  ignoreFile,
  lolFile,
  osmFile,
} from '../helpers/constants.js';
import type { IgnoreFile, LolFile, OsmFile } from '../helpers/types.js';
import { BASE_URL } from '../helpers/taginfo.js';

export async function loadLolFile() {
  try {
    const file: LolFile = JSON.parse(await fs.readFile(lolFile, 'utf8'));
    console.log('Using cached lol data');
    return file;
  } catch {
    console.log('Fetching data from the US DoD...');
    const fetched = await fetch(
      'https://msi.nga.mil/api/publications/ngalol/lights-buoys?output=json&includeRemovals=false',
      { headers: { 'User-Agent': USER_AGENT } },
    ).then((response) => <Promise<LolFile>>response.json());

    fetched.timestamp = new Date().toISOString();

    // save to cache
    await fs.writeFile(lolFile, JSON.stringify(fetched));
    return fetched;
  }
}

export async function loadOsmFile() {
  try {
    const file: OsmFile = JSON.parse(await fs.readFile(osmFile, 'utf8'));
    console.log('Using cached osm data');
    return file;
  } catch {
    console.log('Fetching data from overpass...');
    const query = await fs.readFile(
      join(import.meta.dirname, '../query.overpassql'),
      'utf8',
    );
    const fetched = await fetch(
      `https://maps.mail.ru/osm/tools/overpass/api/interpreter?data=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': USER_AGENT } },
    ).then((response) => <Promise<OsmFile>>response.json());

    fetched.timestamp = new Date().toISOString();

    // save to cache
    await fs.writeFile(osmFile, JSON.stringify(fetched));
    return fetched;
  }
}

export async function loadIgnoreFile() {
  try {
    const file: IgnoreFile = JSON.parse(await fs.readFile(ignoreFile, 'utf8'));
    console.log('Using cached ignore data');
    return file;
  } catch {
    console.log('Fetching ignore data from our api...');
    const fetched = await fetch(`${BASE_URL}/api/ignore`).then(
      (response) => <Promise<IgnoreFile>>response.json(),
    );

    // save to cache
    await fs.writeFile(ignoreFile, JSON.stringify(fetched));
    return fetched;
  }
}
