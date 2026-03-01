import { roundToNearestHour } from '../utils/date';
import { proxyImage } from '../utils/proxy';
import CachedImage from './CachedImage';

function roundToNearest3Hours(date: Date): Date {
  const rounded = new Date(date);
  rounded.setUTCHours(Math.floor(date.getUTCHours() / 3) * 3);
  rounded.setUTCMinutes(0, 0, 0);
  return rounded;
}

function getSurfaceAnalysisUrl(wpcSector: string, date: Date): string {
  const roundedDate = roundToNearestHour(date);
  const now = new Date();
  const nowRounded = new Date(now);
  nowRounded.setUTCMinutes(0, 0, 0);
  const product = `nam${wpcSector}sfc`;
  if (roundedDate >= nowRounded) {
    return proxyImage(`https://www.wpc.ncep.noaa.gov/sfc/${product}wbg.gif`);
  }
  const archiveDate = roundToNearest3Hours(roundedDate);
  const hour = String(archiveDate.getUTCHours()).padStart(2, '0');
  if (archiveDate >= new Date(now.getTime() - 1000 * 60 * 60 * 24)) {
    return proxyImage(
      `https://www.wpc.ncep.noaa.gov/sfc/${/* product */ 'namussfc'}${hour}wbg.gif`,
    );
  }
  const year = archiveDate.getUTCFullYear();
  const month = String(archiveDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(archiveDate.getUTCDate()).padStart(2, '0');
  return proxyImage(
    `https://www.wpc.ncep.noaa.gov/archives/sfc/${year}/${product}${year}${month}${day}${hour}.gif`,
  );
}

export interface SurfaceAnalysisImageProps {
  wpcSector: string;
  date: Date;
  darkMode?: boolean;
  onClick?(event: React.MouseEvent<HTMLDivElement>): void;
}

export default function SurfaceAnalysisImage({
  wpcSector,
  date,
  darkMode,
  onClick,
}: SurfaceAnalysisImageProps) {
  const url = getSurfaceAnalysisUrl(wpcSector, date);
  const width = 1000;
  const height = 750;

  return (
    <div
      style={{ position: 'relative', background: darkMode ? 'black' : 'white' }}
      onClick={onClick}
    >
      <CachedImage
        src={url}
        width={width}
        height={height}
        alt="Surface Analysis"
        style={{
          ...(darkMode ? { filter: 'invert(1) hue-rotate(180deg)' } : {}),
        }}
        onError={(e) => ((e.target as any).style.opacity = 0)}
        onLoad={(e) => ((e.target as any).style.opacity = 1)}
      />
    </div>
  );
}
