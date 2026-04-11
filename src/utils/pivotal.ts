import { roundToNearestHour, floorNearestHour } from './date';
import { proxy } from './proxy';
import pivotalWeatherData from '../generated/pivotalWeather.json';

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

// Model-specific parameter data
const pivotalModelParamsData = pivotalWeatherData as unknown as Record<
  string,
  [string, [string, string][]][]
>;

// For backward compatibility, use HRRR params as default
export const pivotalParamCategories: [string, [string, string][]][] =
  pivotalModelParamsData['hrrr'] || [];

// Get all unique parameters from all models
export const pivotalParams: [string, string][] = Array.from(
  new Map(
    Object.values(pivotalModelParamsData).flatMap((categories) =>
      categories.flatMap(([_, params]) => params),
    ),
  ).entries(),
);

/**
 * Get parameter categories for a specific model
 */
export function getParamCategoriesForModel(
  model: string,
): [string, [string, string][]][] {
  return pivotalModelParamsData[model] || pivotalParamCategories;
}

/**
 * Get all parameters for a specific model
 */
export function getParamsForModel(model: string): [string, string][] {
  const categories = getParamCategoriesForModel(model);
  return categories.flatMap(([_, params]) => params);
}

/**
 * Check if a parameter is available for a specific model
 */
export function isParamAvailableForModel(
  model: string,
  param: string,
): boolean {
  const params = getParamsForModel(model);
  return params.some(([paramId]) => paramId === param);
}

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

/**
 * Get the forecast interval for a model (in hours)
 */
export function getModelForecastInterval(model: string): number {
  return 1; // TODO: implement
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
  const interval = getModelRunFrequency(model);
  const forecastInterval = getModelForecastInterval(model);
  const modelData = pivotalModels.find((m) => m.id === model);
  const host = modelData?.subdomain || 'm2o';

  // Calculate the aligned hour based on the model's run interval
  const now = floorNearestHour(new Date());
  const currentHour = now.getUTCHours();
  const alignedHour = Math.floor(currentHour / interval) * interval;
  const hoursToSubtract = currentHour - alignedHour;
  const alignedNow = new Date(now.getTime() - hoursToSubtract * 60 * 60 * 1000);
  // Determine how many attempts to check based on interval
  // For 1-hour models, check the current aligned hour and one hour back
  const maxAttempts = interval === 1 ? 2 : 1;
  let baseDate: Date | undefined;
  // Try to find the latest available run
  for (let hoursBack = 0; hoursBack <= 3; hoursBack += interval) {
    const testDate = roundToNearestHour(
      new Date(alignedNow.getTime() - hoursBack * 60 * 60 * 1000),
    );
    const res = await fetch(
      proxy(
        `https://${host}.pivotalweather.com/maps/models/${model}/${testDate.getUTCFullYear()}${(testDate.getUTCMonth() + 1).toString().padStart(2, '0')}${testDate.getUTCDate().toString().padStart(2, '0')}${testDate.getUTCHours().toString().padStart(2, '0')}/${forecastInterval.toString().padStart(3, '0')}/sbcape_hodo.conus.png`,
      ),
      { method: 'HEAD' },
    );
    baseDate = testDate;
    if (res.ok) {
      break;
    } else if (res.status === 404) {
      continue;
    } else {
      console.error(
        `Error checking model run availability: ${res.status} ${res.statusText}`,
      );
    }
  }

  // If no run was found after all attempts, fall back to the last attempted date
  if (!baseDate) {
    baseDate = roundToNearestHour(
      new Date(
        alignedNow.getTime() - (maxAttempts - 1) * interval * 60 * 60 * 1000,
      ),
    );
  }

  // Generate runs working backwards from the confirmed latest available run
  for (let i = 0; i < count; i++) {
    const runDate = new Date(
      baseDate.getTime() - i * interval * 60 * 60 * 1000,
    );
    runs.push(runDate);
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
