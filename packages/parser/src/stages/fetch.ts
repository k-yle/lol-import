import { promises as fs } from 'node:fs';
import { USER_AGENT, lolFile } from '../helpers/constants.js';
import type { LolFile } from '../helpers/types.js';

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
