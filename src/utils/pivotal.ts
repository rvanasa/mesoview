import { roundToNearestHour } from './date';
import { proxy, loadDocument } from './proxy';

export interface PivotalRegion {
  id: string;
  name: string;
  spcSector?: number;
}

export const pivotalRegions: PivotalRegion[] = [
  { id: 'conus', name: 'Continental U.S.', spcSector: 19 },
  { id: 'us_nw', name: 'Northwest', spcSector: 11 },
  { id: 'us_sw', name: 'Southwest', spcSector: 12 },
  { id: 'us_nc', name: 'Northern Plains', spcSector: 13 },
  { id: 'us_c', name: 'Central Plains', spcSector: 14 },
  { id: 'us_sc', name: 'Southern Plains', spcSector: 15 },
  { id: 'us_ne', name: 'Northeast', spcSector: 16 },
  { id: 'us_se', name: 'Southeast', spcSector: 18 },
  { id: 'us_ma', name: 'Atlantic', spcSector: 17 },
  { id: 'us_mw', name: 'Midwest', spcSector: 20 },
  { id: 'us_ov', name: 'Great Lakes', spcSector: 21 },
  { id: 'us_nr', name: 'Rocky Mountains', spcSector: 22 },
];

export interface PivotalModel {
  id: string;
  name: string;
  subdomain?: string;
  runFrequency: number;
}

export const pivotalModels: PivotalModel[] = [
  { id: 'hrrr', name: 'HRRR', runFrequency: 1 },
  { id: 'rap', name: 'RAP', runFrequency: 1 },
  { id: 'rrfs_a', name: 'RRFS', runFrequency: 3 },
  {
    id: 'nam4km',
    name: 'NAM 3km',
    subdomain: 'm1o',
    runFrequency: 6,
  },
  { id: 'hrwarw', name: 'HRW ARW', runFrequency: 12 },
  { id: 'hrwnssl', name: 'HRW NSSL', runFrequency: 12 },
  { id: 'hrwfv3', name: 'HRW FV3', runFrequency: 12 },
    // { id: 'gfs', name: 'GFS', runFrequency: 6 },
    // { id: 'ecmwf_full', name: 'ECMWF', runFrequency: 12 },
];

export const pivotalParams: [string, string][] = [
  ['sbcape_hodo', 'Hodographs'],
  ['cape03', '3CAPE'],
  ['sfctd_b-imp', 'Dewpoint'],
  ['sfct_b-imp', 'Temperature'],
  ['sfcrh', 'Humidity'],
  ['refcmp_uh001h', 'Reflectivity'],
  ['sim_ir', 'IR Satellite'],
  ['cloudcover_levels', 'Cloud Cover'],
  ['200wh', '200 mb Wind'],
  ['300wh', '300 mb Wind'],
  ['500wh', '500 mb Wind'],
  ['700wh', '700 mb Wind'],
  ['850wh', '850 mb Wind'],
  ['scp', 'Supercell'],
  ['stp', 'SigTor'],
];

export const pivotalRegionMap = new Map(
  pivotalRegions.map((r) => [r.id, r.name]),
);
export const pivotalModelMap = new Map(
  pivotalModels.map((m) => [m.id, m.name]),
);
export const pivotalParamMap = new Map(pivotalParams);

/**
 * Get the region ID from an SPC sector number
 */
export function getRegionFromSpcSector(spcSector: number): string {
  const region = pivotalRegions.find((r) => r.spcSector === spcSector);
  return region?.id || 'conus';
}

/**
 * Construct a Pivotal Weather image URL
 * @param model Model ID (e.g., 'hrrr', 'rap')
 * @param date Model run date (UTC)
 * @param forecastHour Forecast hour (0-48)
 * @param param Parameter ID (e.g., 'sbcape_hodo', 'cape03')
 * @param region Region ID (e.g., 'conus', 'us_c')
 * @param subdomain Optional subdomain override (e.g., 'm1o' for NAM)
 */
export function getPivotalImageUrl(
  model: string,
  date: Date,
  forecastHour: number,
  param: string,
  region: string,
): string {
  const modelData = pivotalModels.find((m) => m.id === model);
  const sub = modelData?.subdomain || 'm2o';

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const fh = String(forecastHour).padStart(3, '0');

  return `https://${sub}.pivotalweather.com/maps/models/${model}/${year}${month}${day}${hour}/${fh}/${param}.${region}.png`;
}

/**
 * Get the run frequency for a model (in hours)
 */
export function getModelRunFrequency(model: string): number {
  const modelData = pivotalModels.find((m) => m.id === model);
  return modelData?.runFrequency ?? 1;
}

// Cache for available runs (5 minute TTL)
const availableRunsCache = new Map<
  string,
  { runs: Date[]; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const latestRunPromiseCache = new Map<string, Promise<Date>>();

/**
 * Get available model runs by fetching from Pivotal Weather
 * Returns an array of recent run dates based on the model's run frequency
 * @param model Model ID (e.g., 'hrrr', 'rap')
 * @param count Number of runs to return (default: 10)
 */
export async function getAvailableRuns(
  model: string,
  count: number = 10,
): Promise<Date[]> {
  const cacheKey = `${model}-${count}`;
  const cached = availableRunsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.runs;
  }

  const runs: Date[] = [];
  const runFrequency = getModelRunFrequency(model);

  try {
    // Fetch the latest available run from Pivotal Weather
    const doc = await loadDocument(
      proxy(`https://www.pivotalweather.com/model.php?m=${model}`, {
        headers: { 'user-agent': navigator.userAgent },
      }),
    );
    const text =
      doc.querySelector('#rh')?.children[0]?.textContent ?? undefined;
    const match = text?.match(/(\d\d)z$/);

    if (match) {
      // Use the latest run hour from Pivotal Weather
      const latestHour = parseInt(match[1], 10);
      const now = new Date();
      const baseDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          latestHour,
          0,
          0,
          0,
        ),
      );

      // If the latest run would be in the future, go back one day
      if (baseDate.getTime() > now.getTime()) {
        baseDate.setUTCDate(baseDate.getUTCDate() - 1);
      }

      // Generate runs working backwards from the latest available run
      for (let i = 0; i < count; i++) {
        const runDate = new Date(
          baseDate.getTime() - i * runFrequency * 60 * 60 * 1000,
        );
        runs.push(runDate);
      }

      availableRunsCache.set(cacheKey, { runs, timestamp: Date.now() });
      return runs;
    }
  } catch (error) {
    console.warn('Failed to fetch available runs from Pivotal Weather:', error);
  }

  let date = roundToNearestHour(new Date());

  for (let i = 0; i < count; i++) {
    const hoursBack = i * runFrequency;
    const runDate = new Date(date.getTime() - hoursBack * 60 * 60 * 1000);

    const runHour =
      Math.floor(runDate.getUTCHours() / runFrequency) * runFrequency;
    runDate.setUTCHours(runHour, 0, 0, 0);

    if (i === 0 || runDate.getTime() !== runs[runs.length - 1].getTime()) {
      runs.push(runDate);
    }
  }

  availableRunsCache.set(cacheKey, { runs, timestamp: Date.now() });
  return runs;
}

/**
 * Get the most recent available model run
 * @param model Model ID (e.g., 'hrrr', 'rap')
 */
export async function getLatestRun(model: string): Promise<Date> {
  const cachedPromise = latestRunPromiseCache.get(model);
  if (cachedPromise) {
    return cachedPromise;
  }
  const promise = getAvailableRuns(model, 1)
    .then((runs) => {
      setTimeout(() => latestRunPromiseCache.delete(model), 100);
      return runs[0];
    })
    .catch((error) => {
      latestRunPromiseCache.delete(model);
      throw error;
    });

  latestRunPromiseCache.set(model, promise);
  return promise;
}

/**
 * Format a model run date for display
 * @param date The run date to format
 */
export function formatModelRun(date: Date): string {
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
    date.getUTCDay()
  ];
  const hour = String(date.getUTCHours()).padStart(2, '0');
  return `${hour}z ${weekday}`;
}
