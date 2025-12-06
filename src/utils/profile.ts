import {
  BufkitSounding,
  bufkitSoundingToProfile,
  fetchLatestBufkit,
  findClosestSounding,
  parseBufkitFile,
} from './bufkit';
import { MINUTE } from './date';

export type ForecastModel = 'rap' | 'hrrr';

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
  omega: number[];
  thetaE: number[];
  uKt: number[];
  vKt: number[];
}

const cache = new Map<
  string,
  {
    promise: Promise<BufkitSounding[]>;
    timestamp: number;
  }
>();
const cacheDuration = 10 * MINUTE;

async function requestBufkitSoundings(
  model: ForecastModel,
  station: string,
): Promise<BufkitSounding[]> {
  const cacheKey = `${model}:${station}`;
  const cached = cache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < cacheDuration) {
    return cached.promise;
  }
  const promise = (async () =>
    parseBufkitFile(await fetchLatestBufkit(model, station)))();
  cache.set(cacheKey, {
    promise,
    timestamp: now,
  });
  return promise;
}

export async function fetchProfileAtDate(
  model: ForecastModel,
  station: string,
  date: Date,
): Promise<Profile | undefined> {
  const soundings = await requestBufkitSoundings(model, station);
  if (soundings.length === 0) {
    throw new Error('No soundings found in Bufkit file');
  }
  const closestSounding = findClosestSounding(soundings, date);
  if (!closestSounding) {
    throw new Error('Failed to find sounding for the specified date');
  }
  return bufkitSoundingToProfile(closestSounding, model);
}
