import type { OsmFeature, Tags } from 'osm-api';

export interface LatLon {
  lat: number;
  lon: number;
}

export interface LolFeature {
  volumeNumber: `PUB ${number}`;
  aidType: 'Lighted Aids';
  /** e.g. `NORWAY-SOUTH COAST` */
  geopoliticalHeading: string;
  regionHeading: string | null;
  subregionHeading: string | null;
  localHeading: string | null;
  /** this is the PDF header, added to the first row of the page */
  precedingNote: string | null;
  featureNumber: `${/* US NGA ID */ number}\n${/* IALA ID */ string}`;
  name: string;
  /** e.g. `44°03'07.2"S \n176°19'58.8"W` */
  position: string;
  charNo: number;
  /**
   * A string like
   * - `Fl.W.R.G.\nperiod 3s \n`
   * - `V.Q.(3)W.R.\nperiod 5s \n`
   * - `"Fl.(3)W.\nperiod 15s \nfl. 0.1s, ec. 2.4s \nfl. 0.1s, ec. 2.4s \nfl. 0.1s, ec. 9.9s \n"`
   */
  characteristic: string;
  /** feet first, then metres. Sometimes there are bogus lines */
  heightFeetMeters: string | null;
  /**
   * In nautical miles? Either a single number, or a string
   * like `W. 6 ; R. 4 ; G. 3`, corresponding to the sector
   * colour. Unclear how this works when there are multiple
   * sectors with the same colour...
   */
  // TODO: parse range
  range: string | null;
  structure: string | null;
  /**
   * For sectored lights, these "remarks" include the sectors. For example:
   * - `W. 145°-040°, R.-058°, obsc.-119°, R.-145°.\n`
   * - `G. 240°06`-246°18`, R.-063°18`, W.-091°12`, G.-091°36`.  Shown Jul. 1 to Jun. 10.\n`
   */
  remarks: string | null;
  /** this is the PDF footer, added to the last row of the page */
  postNote: string | null;
  noticeNumber: number;
  /** always no, because our query filters out removed lights */
  removeFromList: 'Y' | 'N';
  /** TODO: unclear what this means, not included in the PDF */
  deleteFlag: 'Y' | 'N';
  /** stringified number */
  noticeWeek: string;
  /** stringified number */
  noticeYear: string;
}

export interface LolFile {
  /** ISO Date */
  timestamp: string;
  ngalol: LolFeature[];
}

export interface OsmFile {
  /** ISO Date */
  timestamp: string;
  elements: OsmFeature[];
}

export interface Warning {
  type: string;
  value: string;
}

export const emptyStats = () => ({
  ids: <string[]>[],
  existsAndPerfect: 0,
  existsButNeedsUpdate: 0,
  missing: 0,
  unexpected: 0,
});

export type Stats = ReturnType<typeof emptyStats>;
export interface StatsFile {
  /** ISO Date */
  timestamp: string;
  /** ISO Date */
  timestampNoTime: string;
  global: Stats;
  byCountry: { [countryCode: string]: Stats };
  continents: { [continentName: string]: string[] };
}

export type FELight = LatLon & {
  country: string;
  tags: Tags;
  warnings: Warning[];
  orig: Pick<
    LolFeature,
    | 'remarks'
    | 'characteristic'
    | 'structure'
    | 'name'
    | 'range'
    | 'heightFeetMeters'
  >;
  osm?: {
    id: string;
    verdict: string;
    currentTags: Tags;
    diff: Tags;
  };
};

export interface FullFile {
  [country: string]: {
    [ref: string]: FELight;
  };
}
