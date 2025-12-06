import { MINUTE } from './date';
import { Profile, ForecastModel } from './profile';
import { proxy } from './proxy';

export interface BufkitSounding {
  stationId: string;
  stationNumber: number;
  time: string; // YYMMDD/HHMM format
  latitude: number;
  longitude: number;
  elevation: number;
  sounding: {
    pressure: number[]; // hPa (PRES)
    tempC: number[]; // °C (TMPC)
    wetBulbC: number[]; // °C (TMWC)
    dewC: number[]; // °C (DWPC)
    thetaE: number[]; // K (THTE)
    windDir: number[]; // degrees (DRCT)
    windSpeedKt: number[]; // knots (SKNT)
    omega: number[]; // Pa/s (OMEG)
    height: number[]; // meters (HGHT)
  };
}

export function parseBufkitFile(fileContent: string): BufkitSounding[] {
  const soundings: BufkitSounding[] = [];
  const lines = fileContent.split('\n');

  let bufkit: Partial<BufkitSounding> | null = null;
  let inDataSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for new sounding header
    if (line.startsWith('STID')) {
      // Save previous sounding if exists
      if (bufkit && bufkit.sounding) {
        soundings.push(bufkit as BufkitSounding);
      }

      // Parse header line: STID = TBL STNM = 73 TIME = 251205/2000
      const stidMatch = line.match(/STID\s*=\s*(\S+)/);
      const stnmMatch = line.match(/STNM\s*=\s*(\d+)/);
      const timeMatch = line.match(/TIME\s*=\s*(\S+)/);

      bufkit = {
        stationId: stidMatch ? stidMatch[1] : '',
        stationNumber: stnmMatch ? parseInt(stnmMatch[1]) : 0,
        time: timeMatch ? timeMatch[1] : '',
        sounding: {
          pressure: [],
          tempC: [],
          wetBulbC: [],
          dewC: [],
          thetaE: [],
          windDir: [],
          windSpeedKt: [],
          omega: [],
          height: [],
        },
      };
      inDataSection = false;
    }

    // Parse location data
    if (line.startsWith('SLAT')) {
      const slatMatch = line.match(/SLAT\s*=\s*([-\d.]+)/);
      const slonMatch = line.match(/SLON\s*=\s*([-\d.]+)/);
      const selvMatch = line.match(/SELV\s*=\s*([-\d.]+)/);

      if (bufkit && slatMatch && slonMatch && selvMatch) {
        bufkit.latitude = parseFloat(slatMatch[1]);
        bufkit.longitude = parseFloat(slonMatch[1]);
        bufkit.elevation = parseFloat(selvMatch[1]);
      }
    }

    // Check if we're starting the data section
    if (
      line.startsWith('PRES') &&
      line.includes('TMPC') &&
      line.includes('DWPC')
    ) {
      inDataSection = true;
      continue;
    }

    // Parse data lines
    if (inDataSection && bufkit && bufkit.sounding) {
      // Stop at next section or empty lines
      if (line.startsWith('STID') || line.startsWith('STN ') || line === '') {
        inDataSection = false;
        continue;
      }

      // Skip the CFRL HGHT header line
      if (line.startsWith('CFRL') && line.includes('HGHT')) {
        continue;
      }

      // Parse data line: PRES TMPC TMWC DWPC THTE DRCT SKNT OMEG CFRL HGHT
      // Data might be on one line (10+ parts) or two lines (8 parts + 2 parts)
      const parts = line.split(/\s+/);

      if (parts.length >= 8) {
        let pressure,
          temp,
          wetBulb,
          dew,
          thetaE,
          windDir,
          windSpeedKt,
          omega,
          height;

        if (parts.length >= 10) {
          // All data on one line
          pressure = parseFloat(parts[0]); // PRES
          temp = parseFloat(parts[1]); // TMPC
          wetBulb = parseFloat(parts[2]); // TMWC
          dew = parseFloat(parts[3]); // DWPC
          thetaE = parseFloat(parts[4]); // THTE
          windDir = parseFloat(parts[5]); // DRCT
          windSpeedKt = parseFloat(parts[6]); // SKNT
          omega = parseFloat(parts[7]); // OMEG
          height = parseFloat(parts[9]); // HGHT
        } else if (parts.length === 8 && i + 1 < lines.length) {
          // Data split across two lines
          pressure = parseFloat(parts[0]); // PRES
          temp = parseFloat(parts[1]); // TMPC
          wetBulb = parseFloat(parts[2]); // TMWC
          dew = parseFloat(parts[3]); // DWPC
          thetaE = parseFloat(parts[4]); // THTE
          windDir = parseFloat(parts[5]); // DRCT
          windSpeedKt = parseFloat(parts[6]); // SKNT
          omega = parseFloat(parts[7]); // OMEG

          // Get next line for CFRL and HGHT
          i++;
          const nextLine = lines[i].trim();
          const nextParts = nextLine.split(/\s+/);
          if (nextParts.length >= 2) {
            height = parseFloat(nextParts[1]); // HGHT (CFRL is nextParts[0])
          } else {
            continue; // Skip if next line doesn't have the expected data
          }
        } else {
          continue; // Skip if line doesn't have expected format
        }

        // Only include valid data points
        if (
          !isNaN(pressure) &&
          !isNaN(temp) &&
          !isNaN(dew) &&
          !isNaN(height) &&
          pressure > 0 &&
          pressure < 1100
        ) {
          bufkit.sounding.pressure.push(pressure);
          bufkit.sounding.tempC.push(temp);
          bufkit.sounding.wetBulbC.push(wetBulb);
          bufkit.sounding.dewC.push(dew);
          bufkit.sounding.thetaE.push(thetaE);
          bufkit.sounding.windDir.push(windDir);
          bufkit.sounding.windSpeedKt.push(windSpeedKt);
          bufkit.sounding.omega.push(omega);
          bufkit.sounding.height.push(height);
        }
      }
    }
  }

  // Save last sounding
  if (bufkit && bufkit.sounding && bufkit.sounding.pressure.length > 0) {
    soundings.push(bufkit as BufkitSounding);
  }

  return soundings;
}

/**
 * Convert wind direction and speed to U and V components
 * @param direction Wind direction in degrees (direction FROM which wind blows)
 * @param speedKt Wind speed in knots
 * @returns Object with u and v components in knots
 */
function windToComponents(
  direction: number,
  speedKt: number,
): { u: number; v: number } {
  // Convert direction to radians
  // Meteorological convention: direction FROM which wind blows
  // U component is positive for eastward wind (270°)
  // V component is positive for northward wind (180°)
  const radians = (direction * Math.PI) / 180;

  // U = -speed * sin(dir), V = -speed * cos(dir)
  const u = -speedKt * Math.sin(radians);
  const v = -speedKt * Math.cos(radians);

  return { u, v };
}

/**
 * Convert Pa/s to µb/s (microbars per second)
 * @param omegaPa Omega in Pa/s
 * @returns Omega in µb/s
 */
function paToMicrobar(omegaPa: number): number {
  // 1 Pa = 10 µb
  return omegaPa * 10;
}

/**
 * Convert a BufkitSounding to a Profile for display
 * @param sounding The Bufkit sounding to convert
 * @param model The model name (e.g., "rap", "hrrr")
 * @returns A Profile object
 */
export function bufkitSoundingToProfile(
  sounding: BufkitSounding,
  model: ForecastModel,
): Profile {
  // Convert wind components for each level
  const windComponents = sounding.sounding.windDir.map((dir, i) =>
    windToComponents(dir, sounding.sounding.windSpeedKt[i]),
  );

  const uKt = windComponents.map((w) => w.u);
  const vKt = windComponents.map((w) => w.v);

  // Convert omega from Pa/s to µb/s
  const omegaMicrobar = sounding.sounding.omega.map(paToMicrobar);

  return {
    time: formatBufkitTime(sounding.time),
    model: model,
    station: sounding.stationId,
    latitude: sounding.latitude,
    longitude: sounding.longitude,
    tempC: sounding.sounding.tempC,
    dewC: sounding.sounding.dewC,
    pressureHPa: sounding.sounding.pressure,
    elevationM: [sounding.elevation], // Array for consistency with other fields
    heightM: sounding.sounding.height, // Geopotential height MSL
    omega: omegaMicrobar,
    thetaE: sounding.sounding.thetaE,
    uKt,
    vKt,
  };
}

/**
 * Format Bufkit time string (YYMMDD/HHMM) to ISO format
 * @param bufkitTime Time string in YYMMDD/HHMM format
 * @returns ISO date string
 */
function formatBufkitTime(bufkitTime: string): number {
  // Parse YYMMDD/HHMM
  const match = bufkitTime.match(/(\d{2})(\d{2})(\d{2})\/(\d{2})(\d{2})/);
  if (!match) {
    throw new Error(`Unexpected Bufkit time format: ${bufkitTime}`);
  }

  const [, yy, mm, dd, hh, min] = match;
  const year = 2000 + parseInt(yy);

  // Use Date.UTC to create a UTC date, not local time
  return new Date(
    Date.UTC(year, parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(min)),
  ).getTime();
}

/**
 * Get a sounding at a specific time index
 * @param soundings Array of soundings
 * @param timeIndex Index of the sounding to retrieve (0 = first/earliest, -1 = last/latest)
 * @returns The sounding at the specified index or null if not found
 */
export function getSoundingAtTimeIndex(
  soundings: BufkitSounding[],
  timeIndex: number = -1,
): BufkitSounding | null {
  if (soundings.length === 0) return null;

  // Handle negative indices (e.g., -1 for last)
  const index = timeIndex < 0 ? soundings.length + timeIndex : timeIndex;

  if (index < 0 || index >= soundings.length) return null;

  return soundings[index];
}

/**
 * Find the sounding closest to a given date
 * @param soundings Array of soundings
 * @param date Target date to find the closest sounding to
 * @param toleranceHours Maximum time difference in hours to accept (default: 1 hour)
 * @returns The sounding closest to the target date or null if none found within tolerance
 */
export function findClosestSounding(
  soundings: BufkitSounding[],
  date: Date,
  toleranceMs = 30 * MINUTE,
): BufkitSounding | undefined {
  if (soundings.length === 0) return;

  const targetTime = date.getTime();
  let closestSounding: BufkitSounding | undefined;
  let minDiff = Infinity;

  for (let i = 0; i < soundings.length; i++) {
    const soundingTime = parseBufkitTimeToDate(soundings[i].time).getTime();
    const diff = Math.abs(soundingTime - targetTime);

    if (diff < minDiff && diff <= toleranceMs) {
      minDiff = diff;
      closestSounding = soundings[i];
    }
  }

  return closestSounding;
}

/**
 * Parse Bufkit time string (YYMMDD/HHMM) to Date object
 * @param bufkitTime Time string in YYMMDD/HHMM format
 * @returns Date object
 */
function parseBufkitTimeToDate(bufkitTime: string): Date {
  const match = bufkitTime.match(/(\d{2})(\d{2})(\d{2})\/(\d{2})(\d{2})/);
  if (!match) return new Date();

  const [, yy, mm, dd, hh, min] = match;
  const year = 2000 + parseInt(yy);

  return new Date(
    Date.UTC(year, parseInt(mm) - 1, parseInt(dd), parseInt(hh), parseInt(min)),
  );
}

/**
 * Fetch the latest Bufkit file from PSU server
 * @param model Model name (e.g. "rap" or "hrrr")
 * @param station Station identifier (e.g. "tbl" or "den")
 * @returns The raw file content
 */
export async function fetchLatestBufkit(
  model: ForecastModel,
  station: string,
): Promise<string> {
  const modelUpper = model.toUpperCase();
  const modelLower = model.toLowerCase();
  const stationLower = station.toLowerCase();

  const url = `http://www.meteo.psu.edu/bufkit/data/${modelUpper}/latest/${modelLower}_${stationLower}.buf`;

  console.log('GET sounding', url);
  const response = await fetch(proxy(url));
  if (!response.ok) {
    throw new Error(
      `Failed to fetch Bufkit data: ${response.status} ${response.statusText}`,
    );
  }

  return await response.text();
}

/**
 * Fetch archived Bufkit file from IEM archive
 * @param time Date object for the archive time
 * @param model Model name (e.g. "rap" or "hrrr")
 * @param station Station identifier (e.g. "tbl" or "den")
 * @returns The raw file content
 */
export async function fetchArchiveBufkit(
  time: Date,
  model: ForecastModel,
  station: string,
): Promise<string> {
  const modelLower = model.toLowerCase();
  const stationLower = station.toLowerCase();

  const year = time.getUTCFullYear();
  const month = String(time.getUTCMonth() + 1).padStart(2, '0');
  const day = String(time.getUTCDate()).padStart(2, '0');
  const hour = String(time.getUTCHours()).padStart(2, '0');

  const url = `https://mtarchive.geol.iastate.edu/${year}/${month}/${day}/bufkit/${hour}/${modelLower}/${modelLower}_${stationLower}.buf`;

  console.log('GET sounding', url);
  const response = await fetch(proxy(url));
  if (!response.ok) {
    throw new Error(
      `Failed to fetch archived Bufkit data: ${response.status} ${response.statusText}`,
    );
  }

  return await response.text();
}
