import { useEffect, useState } from 'react';
import { roundToNearestHour } from '../utils/date';
import {
  getModelRunFrequency,
  getLatestRun,
  getPivotalImageUrl,
} from '../utils/pivotal';
import CachedImage from './CachedImage';
import { isDevMode } from '../utils/isDevMode';

/**
 * Determine the model run time and forecast hour for a given date.
 */
async function getPivotalRunInfo(
  date: Date,
  model: string,
  selectedRun: Date | undefined,
): Promise<{ runDate: Date; forecastHour: number }> {
  date = roundToNearestHour(date);
  if (selectedRun) {
    let runDate = new Date(selectedRun);
    let forecastHour = Math.max(
      Math.round((date.getTime() - runDate.getTime()) / 3600000),
      0,
    );
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

export interface ModelParam {
  model: string;
  param: string;
  selectedRun?: Date;
}

export interface PivotalImageProps {
  date: Date;
  region: string;
  modelParams: ModelParam[];
  darkMode?: boolean;
  onClick?(event: React.MouseEvent<HTMLDivElement>): void;
}

export default function PivotalImage({
  date,
  region,
  modelParams,
  darkMode,
  onClick,
}: PivotalImageProps) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadImageUrls() {
      try {
        const urlPromises = modelParams.map(
          async ({ model, param, selectedRun }) => {
            const info = await getPivotalRunInfo(date, model, selectedRun);
            if (!isDevMode) {
              return '';
            }
            return getPivotalImageUrl(
              model,
              info.runDate,
              info.forecastHour,
              param,
              region,
            );
          },
        );
        const imageUrls = await Promise.all(urlPromises);
        if (!cancelled) {
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
  }, [date, modelParams, region, isDevMode]);

  return (
    <div
      style={{ position: 'relative', background: darkMode ? 'black' : 'white' }}
      onClick={onClick}
    >
      {modelParams.map(({ model, param }, i) => (
        <CachedImage
          key={`${model}-${param}`}
          src={urls[i] || ''}
          width={1180}
          height={850}
          alt=""
          style={{
            ...(i
              ? { position: 'absolute', top: 0, left: 0, opacity: 0.5 }
              : {}),
            ...(darkMode ? { filter: 'invert(1) hue-rotate(180deg)' } : {}),
          }}
          onError={(e) => ((e.target as any).style.opacity = 0)}
          onLoad={(e) => ((e.target as any).style.opacity = i ? 0.5 : 1)}
        />
      ))}
    </div>
  );
}
