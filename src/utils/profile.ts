import {
  BufkitSounding,
  bufkitSoundingToProfile,
  fetchArchiveBufkit,
  fetchLatestBufkit,
  findClosestSounding,
  parseBufkitFile,
} from './bufkit';
import { MINUTE, roundToNearestHour } from './date';

export const soundingModels = [
  { key: 'rap', label: 'RAP' },
  { key: 'hrrr', label: 'HRRR' },
] as const;
export type ForecastModel = (typeof soundingModels)[number]['key'];

// TODO: fetch
export const soundingStations: { key: string; label: string }[] = [
  { key: 'tbl', label: 'TBL' },
  { key: 'kbjc', label: 'KBJC' },
  { key: 'den', label: 'DEN' },
  { key: 'kcef', label: 'KCEF' },
  { key: 'korh', label: 'KORH' },
];

export interface Profile {
  time: number;
  model: ForecastModel;
  station: string;
  latitude: number;
  longitude: number;
  tempC: number[];
  dewC: number[];
  pressureHPa: number[];
  elevationM: number[];
  heightM: number[];
  omega: number[];
  thetaE: number[];
  uKt: number[];
  vKt: number[];
}

const cache = new Map<
  string,
  {
    promise: Promise<BufkitSounding[]>;
    expiry: number;
  }
>();

async function requestLatestSounding(
  model: ForecastModel,
  station: string,
  date: Date,
): Promise<BufkitSounding | undefined> {
  const cacheKey = `latest:${model}:${station}`;
  const cached = cache.get(cacheKey);
  const now = Date.now();
  let promise: Promise<BufkitSounding[]>;
  if (cached && now < cached.expiry) {
    promise = cached.promise;
  } else {
    promise = (async () =>
      parseBufkitFile(await fetchLatestBufkit(model, station)))();
    cache.set(cacheKey, {
      promise,
      expiry: now + 10 * MINUTE,
    });
  }
  return findClosestSounding(await promise, date);
}

async function requestArchivedSounding(
  model: ForecastModel,
  station: string,
  date: Date,
): Promise<BufkitSounding | undefined> {
  const roundedDate = roundToNearestHour(date);
  const cacheKey = `archive:${model}:${station}:${roundedDate.getTime()}`;

  const cached = cache.get(cacheKey);
  const now = Date.now();
  let promise: Promise<BufkitSounding[]>;
  if (cached && now < cached.expiry) {
    promise = cached.promise;
  } else {
    promise = (async () =>
      parseBufkitFile(await fetchArchiveBufkit(roundedDate, model, station)))();
    cache.set(cacheKey, {
      promise,
      expiry: Infinity,
    });
  }
  return findClosestSounding(await promise, date);
}

export async function fetchProfileAtDate(
  model: ForecastModel,
  station: string,
  date: Date,
): Promise<Profile | undefined> {
  let sounding = await requestLatestSounding(model, station, date);
  if (!sounding) {
    sounding = await requestArchivedSounding(model, station, date);
    if (!sounding) {
      return;
    }
  }
  return bufkitSoundingToProfile(sounding, model);
}
