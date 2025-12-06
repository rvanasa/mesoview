import {
  BufkitSounding,
  bufkitSoundingToProfile,
  fetchLatestBufkit,
  findClosestSounding,
  parseBufkitFile,
} from './bufkit';

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

interface CacheEntry {
  soundings: BufkitSounding[];
  timestamp: number;
}

const soundingsCache = new Map<string, CacheEntry>();
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

async function requestBufkitSoundings(
  model: ForecastModel,
  station: string,
): Promise<BufkitSounding[]> {
  const cacheKey = `${model}-${station}`;
  const cached = soundingsCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
    return cached.soundings;
  }

  const fileContent = await fetchLatestBufkit(model, station);
  const soundings = parseBufkitFile(fileContent);

  soundingsCache.set(cacheKey, { soundings, timestamp: now });

  return soundings;
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
