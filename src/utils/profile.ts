import {
  BufkitSounding,
  bufkitSoundingToProfile,
  fetchArchiveBufkit,
  fetchLatestBufkit,
  findClosestSounding,
  parseBufkitFile,
} from './bufkit';
import { MINUTE, roundToNearestHour } from './date';
import tzLookup from 'tz-lookup';
import { parseCSV } from './csv';

export const soundingModels = [
  { key: 'rap', label: 'RAP' },
  { key: 'hrrr', label: 'HRRR' },
] as const;
export type ForecastModel = (typeof soundingModels)[number]['key'];

// Station CSV cache (per model)
const stationCsvCache = new Map<
  string,
  {
    promise: Promise<{
      key: string;
      label: string;
      lat?: number;
      lon?: number;
      timeZone?: string;
    }[]>;
    expiry: number;
  }
>();

/**
 * Get station list from SHARPpy CSV for a given model (cached)
 */
export async function getSoundingStations(
  model: ForecastModel = 'rap',
): Promise<{
  key: string;
  label: string;
  lat?: number;
  lon?: number;
  timeZone?: string;
}[]> {
  const cacheKey = `stations:${model}`;
  const cached = stationCsvCache.get(cacheKey);
  const now = Date.now();
  if (cached && now < cached.expiry) return cached.promise;

  const promise = (async () => {
    console.log('GET sounding stations');
    const resp = await fetch(`https://raw.githubusercontent.com/sharppy/SHARPpy/refs/heads/main/datasources/${model}.csv`);
    if (!resp.ok) return [];
    const text = await resp.text();
    const rows = parseCSV(text);
    if (rows.length === 0) return [];
    const header = rows[0];
    const idx = (name: string) => header.indexOf(name);
    const srcidIdx = idx('srcid');
    const icaoIdx = idx('icao');
    const iataIdx = idx('iata');
    const nameIdx = idx('name');
    const latIdx = idx('lat');
    const lonIdx = idx('lon');

    const stations = rows
      .slice(1)
      .map((row) => {
        const id = (row[srcidIdx] || row[icaoIdx] || row[iataIdx] || '').trim();
        if (!id) return null;
        const key = id.toLowerCase();
        const labelPiece = (row[nameIdx] || '').trim();
        const label =
          labelPiece && labelPiece.toLowerCase() !== id.toLowerCase()
            ? `${id.toUpperCase()} - ${labelPiece}`
            : id.toUpperCase();
        const lat = parseFloat(row[latIdx]);
        const lon = parseFloat(row[lonIdx]);
        let timeZone: string | undefined;
        if (!isNaN(lat) && !isNaN(lon)) {
          try {
            timeZone = tzLookup(lat, lon);
          } catch (e) {
            // ignore
          }
        }
        return {
          key,
          label,
          lat: isNaN(lat) ? undefined : lat,
          lon: isNaN(lon) ? undefined : lon,
          timeZone,
        };
      })
      .filter(
        (s): s is { key: string; label: string; lat: number; lon: number; timeZone: string | undefined } =>
          !!s && s.lat !== undefined && s.lon !== undefined,
      );

    return stations;
  })();

  stationCsvCache.set(cacheKey, { promise, expiry: Infinity });
  return promise;
}

/**
 * Resolve station label and timezone using CSV and/or sounding coordinates
 */
export async function resolveStationMeta(
  model: ForecastModel,
  stationKey: string,
  sounding?: BufkitSounding,
): Promise<{ label?: string; timeZone?: string }> {
  const stations = await getSoundingStations(model);
  const keyLower = stationKey.toLowerCase();
  const match = stations.find(
    (s) => s.key === keyLower || s.key === `k${keyLower}` || (keyLower === s.key.replace(/^k/, '')),
  );
    if (match) {
    if (match.timeZone) return { label: match.label, timeZone: match.timeZone };
    if (match.lat !== undefined && match.lon !== undefined) {
      try {
        const tz = tzLookup(match.lat, match.lon);
        return { label: match.label, timeZone: tz };
      } catch (e) {
        return { label: match.label };
      }
    }
    return { label: match.label };
  }

  // Fallback: use sounding coordinates to compute timezone
  if (sounding && sounding.latitude !== undefined && sounding.longitude !== undefined) {
    try {
      const tz = tzLookup(sounding.latitude, sounding.longitude);
      return { label: sounding.stationId?.toUpperCase() || stationKey.toUpperCase(), timeZone: tz };
    } catch (e) {
      return { label: sounding.stationId?.toUpperCase() || stationKey.toUpperCase() };
    }
  }

  return { label: stationKey.toUpperCase() };
}

export interface Profile {
  time: number;
  timeZone: string | undefined;
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
  if (date.getTime() > Date.now()) {
    return;
  }
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
  const meta = await resolveStationMeta(model, station, sounding);
  const profile = bufkitSoundingToProfile(sounding, model, meta.timeZone);
  // Use only the station ID for profile/sounding label (don't include full CSV label)
  profile.station = (sounding.stationId || station).toUpperCase();
  return profile;
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
