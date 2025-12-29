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
  { key: 'kbaf', label: 'KBAF - Westfield' },
  { key: 'kcef', label: 'KCEF - Holyoke' },
  { key: 'kore', label: 'KORE - Orange' },
  { key: 'korh', label: 'KORH - Worcester' },
  { key: 'kbed', label: 'KBED - Bedford' },
  { key: 'kbos', label: 'KBOS - Boston' },
];

export interface Profile {
  time: number;
  model: ForecastModel;
  station: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  tempC: number[];
  dewC: number[];
  pressureHPa: number[];
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

export function getPressureForHeight(
  profile: Profile,
  targetHeightMSL: number,
): number | undefined {
  let lowerIdx = -1;
  let upperIdx = -1;
  for (let i = 0; i < profile.heightM.length - 1; i++) {
    const h1 = profile.heightM[i];
    const h2 = profile.heightM[i + 1];
    if (
      (h1 <= targetHeightMSL && h2 >= targetHeightMSL) ||
      (h1 >= targetHeightMSL && h2 <= targetHeightMSL)
    ) {
      lowerIdx = i;
      upperIdx = i + 1;
      break;
    }
  }
  if (lowerIdx === -1) {
    let closestIdx = 0;
    let minDiff = Infinity;
    for (let i = 0; i < profile.heightM.length; i++) {
      const diff = Math.abs(profile.heightM[i] - targetHeightMSL);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }
    // Only return if within 500m
    if (minDiff < 500) {
      return profile.pressureHPa[closestIdx];
    }
  }
  const h1 = profile.heightM[lowerIdx];
  const h2 = profile.heightM[upperIdx];
  const p1 = profile.pressureHPa[lowerIdx];
  const p2 = profile.pressureHPa[upperIdx];
  const t = (targetHeightMSL - h1) / (h2 - h1);
  return p1 + t * (p2 - p1);
}
