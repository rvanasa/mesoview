import { useEffect, useState } from 'react';
import { roundToNearestHour } from '../utils/date';
import {
  getModelRunFrequency,
  getLatestRun,
  getPivotalImageUrl,
} from '../utils/pivotal';
import CachedImage from './CachedImage';

/**
 * Determine the model run time and forecast hour for a given date.
 */
async function getPivotalRunInfo(
  date: Date,
  model: string,
  selectedRun: Date | null = null,
): Promise<{ runDate: Date; forecastHour: number }> {
  date = roundToNearestHour(date);
  if (selectedRun) {
    const runFrequency = getModelRunFrequency(model);
    let runDate = new Date(selectedRun);
    let forecastHour = Math.round(
      (date.getTime() - runDate.getTime()) / 3600000,
    );
    while (forecastHour < 0) {
      runDate = new Date(runDate.getTime() - runFrequency * 3600000);
      forecastHour = Math.round((date.getTime() - runDate.getTime()) / 3600000);
    }
    return { runDate, forecastHour };
  }
  const runFrequency = getModelRunFrequency(model);
  let runDate = await getLatestRun(model);
  let forecastHour = Math.round((date.getTime() - runDate.getTime()) / 3600000);
  while (forecastHour < 0) {
    runDate = new Date(runDate.getTime() - runFrequency * 3600000);
    forecastHour = Math.round((date.getTime() - runDate.getTime()) / 3600000);
  }
  return { runDate, forecastHour };
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
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadImageUrls() {
      try {
        const info = await getPivotalRunInfo(date, model, selectedRun ?? null);
        if (!cancelled) {
          const imageUrls = params.map((param) =>
            getPivotalImageUrl(
              model,
              info.runDate,
              info.forecastHour,
              param,
              region,
            ),
          );
          setUrls(imageUrls);
        }
      } catch (error) {
        console.error('Error loading run info:', error);
      }
    }

    loadImageUrls();

    return () => {
      cancelled = true;
    };
  }, [date, model, selectedRun, params, region]);

  const width = 1180;
  const height = 850;

  return (
    <div
      style={{ position: 'relative', background: darkMode ? 'black' : 'white' }}
      onClick={onClick}
    >
      {params.map((param, i) => (
        <CachedImage
          key={param}
          src={urls[i] || ''}
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
