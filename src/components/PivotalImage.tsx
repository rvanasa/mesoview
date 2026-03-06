import { useEffect, useState } from 'react';
import { roundToNearestHour } from '../utils/date';
import {
  getModelRunFrequency,
  getLatestRun,
  getPivotalImageUrl,
} from '../utils/pivotal';
import CachedImage from './CachedImage';

/**
 * Check if an image URL exists
 */
async function checkImageExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Determine the model run time and forecast hour for a given date.
 * Try the most recent run first, then fall back to the most recent previous run for the selected time.
 */
async function getPivotalRunInfo(
  date: Date,
  model: string,
  region: string,
  params: string[],
  selectedRun: Date | null = null,
): Promise<{ runDate: Date; forecastHour: number } | undefined> {
  date = roundToNearestHour(date);
  const runFrequency = getModelRunFrequency(model);

  // If a specific run is selected, use it
  if (selectedRun) {
    let forecastHour = Math.round(
      (date.getTime() - selectedRun.getTime()) / 3600000,
    );
    let runDate = new Date(selectedRun);

    // If forecast hour is negative, use previous runs
    while (forecastHour < 0) {
      runDate = new Date(runDate.getTime() - runFrequency * 3600000);
      forecastHour = Math.round((date.getTime() - runDate.getTime()) / 3600000);
    }

    return { runDate, forecastHour };
  }

  // Try the most recent available run
  const latestRun = await getLatestRun(model);
  const forecastHour = Math.round(
    (date.getTime() - latestRun.getTime()) / 3600000,
  );

  // Check if this forecast image exists
  const url = getPivotalImageUrl(
    model,
    latestRun,
    forecastHour,
    params[0],
    region,
  );
  const exists = await checkImageExists(url);

  if (exists) {
    return { runDate: latestRun, forecastHour };
  }

  // Fallback: Use the selected date as the run time with forecast hour 0
  let fallbackRunDate = roundToNearestHour(date);
  const targetHour = fallbackRunDate.getUTCHours();
  const runHour = Math.round(targetHour / runFrequency) * runFrequency;
  fallbackRunDate.setUTCHours(runHour, 0, 0, 0);

  return { runDate: fallbackRunDate, forecastHour: 0 };
}

export interface PivotalImageProps {
  date: Date;
  model: string;
  region: string;
  params: string[];
  selectedRun?: Date | null;
  darkMode?: boolean;
  onClick?(event: React.MouseEvent<HTMLDivElement>): void;
}

export default function PivotalImage({
  date,
  model,
  region,
  params,
  selectedRun,
  darkMode,
  onClick,
}: PivotalImageProps) {
  const [runInfo, setRunInfo] = useState<
    { runDate: Date; forecastHour: number } | undefined | null
  >(undefined);

  useEffect(() => {
    let cancelled = false;

    async function loadRunInfo() {
      try {
        const info = await getPivotalRunInfo(
          date,
          model,
          region,
          params,
          selectedRun ?? null,
        );
        if (!cancelled) {
          setRunInfo(info ?? null);
        }
      } catch (error) {
        console.error('Error loading run info:', error);
        if (!cancelled) {
          setRunInfo(null);
        }
      }
    }

    setRunInfo(undefined);
    loadRunInfo();

    return () => {
      cancelled = true;
    };
  }, [date, model, region, params, selectedRun]);

  const { runDate, forecastHour } = runInfo || {
    runDate: new Date(),
    forecastHour: 0,
  };
  const urls = params.map((param) =>
    getPivotalImageUrl(model, runDate, forecastHour, param, region),
  );

  const width = 1180;
  const height = 850;

  return (
    <div
      style={{ position: 'relative', background: darkMode ? 'black' : 'white' }}
      onClick={onClick}
    >
      {urls.map((url, i) => (
        <CachedImage
          key={i}
          src={url}
          width={width}
          height={height}
          alt=""
          style={{
            ...(i ? { position: 'absolute', top: 0, left: 0 } : {}),
            ...(darkMode ? { filter: 'invert(1) hue-rotate(180deg)' } : {}),
          }}
          onError={(e) => ((e.target as any).style.opacity = 0)}
          onLoad={(e) => ((e.target as any).style.opacity = 1)}
        />
      ))}
    </div>
  );
}
