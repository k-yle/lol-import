import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { USER_AGENT, lolFile, osmFile } from '../helpers/constants';
import type { LolFile, OsmFile } from '../helpers/types';

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
      join(__dirname, '../query.overpassql'),
      'utf8',
    );
    const fetched = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
      { headers: { 'User-Agent': USER_AGENT } },
    ).then((response) => <Promise<OsmFile>>response.json());

    fetched.timestamp = new Date().toISOString();

    // save to cache
    await fs.writeFile(osmFile, JSON.stringify(fetched));
    return fetched;
  }
}
