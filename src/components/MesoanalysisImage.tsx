import { roundToNearestHour } from '../utils/date';
import CachedImage from './CachedImage';

const mesoBaseUrl = 'https://www.spc.noaa.gov/exper/mesoanalysis';

function getLayerUrl(sector: string, param: string) {
  return `${mesoBaseUrl}/${sector}/${param}/${param}.gif`;
}

function getMesoanalysisUrl(
  date: Date,
  sector: string,
  param: string,
): string | undefined {
  date = roundToNearestHour(date);
  const now = new Date();
  const deltaHours = Math.round((date.getTime() - now.getTime()) / 3600000);

  if (deltaHours === 0) {
    return `${mesoBaseUrl}/${sector}/${param}/${param}.gif`;
  } else if (deltaHours > 0) {
    if (deltaHours > 6) {
      return;
    }
    return `${mesoBaseUrl}/fcst/${sector}/${param}_${String(
      date.getUTCHours(),
    ).padStart(2, '0')}_trans.gif`;
  } else {
    return `${mesoBaseUrl}/${sector}/${param}/${param}_${date
      .toISOString()
      .slice(2, 10)
      .replace(/-/g, '')}${String(date.getUTCHours()).padStart(2, '0')}.gif`;
  }
}

function getRadarUrl(date: Date, sector: string): string | undefined {
  date = roundToNearestHour(date);
  const now = new Date();
  const deltaHours = Math.round((date.getTime() - now.getTime()) / 3600000);

  if (deltaHours === 0) {
    return `${mesoBaseUrl}/${sector}/rgnlrad/rgnlrad.gif`;
  } else if (deltaHours > 0) {
    if (deltaHours > 16) {
      return;
    }
    return `${mesoBaseUrl}/fcst/${sector}/hrrr_${String(
      date.getUTCHours(),
    ).padStart(2, '0')}.gif`;
  } else {
    return `${mesoBaseUrl}/${sector}/rgnlrad/rad_${date
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '')}_${String(date.getUTCHours()).padStart(2, '0')}00.gif`;
  }
}

export interface MesoanalysisImageProps {
  date: Date;
  sector: string;
  layers: string[];
  params: string[];
}

export default function MesoanalysisImage({
  date,
  sector,
  layers,
  params,
}: MesoanalysisImageProps) {
  const urls = [
    ...layers.map((param) => getLayerUrl(sector, param)),
    getRadarUrl(date, sector),
    ...params.map((param) => getMesoanalysisUrl(date, sector, param)),
  ];
  const width = 1000;
  const height = 750;
  return (
    <div style={{ position: 'relative', background: 'white' }}>
      {urls.map(
        (url, i) =>
          !!url && (
            <CachedImage
              key={i}
              src={url}
              width={width}
              height={height}
              alt=""
              style={i ? { position: 'absolute', top: 0, left: 0 } : {}}
              onError={(e) => ((e.target as any).style.opacity = 0)}
              onLoad={(e) => ((e.target as any).style.opacity = 1)}
            />
          ),
      )}
    </div>
  );
}
