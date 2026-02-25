import CachedImage from './CachedImage';
import { proxyImage } from '../utils/proxy';

const surfaceDisplay = 'namussfc'; // Default display type

function roundDownToNearest3Hours(date: Date): Date {
  const rounded = new Date(date);
  rounded.setUTCHours(Math.floor(date.getUTCHours() / 3) * 3);
  rounded.setUTCMinutes(0, 0, 0);
  return rounded;
}

function getSurfaceAnalysisUrl(date: Date): string {
  // Round down to nearest hour
  const roundedDate = new Date(date);
  roundedDate.setUTCMinutes(0, 0, 0);

  const now = new Date();
  const nowRounded = new Date(now);
  nowRounded.setUTCMinutes(0, 0, 0);

  // If the time is >= current hour, use latest URL
  if (roundedDate >= nowRounded) {
    return proxyImage(
      `https://www.wpc.ncep.noaa.gov/sfc/${surfaceDisplay}wbg.gif`,
    );
  }

  // Otherwise, round down to nearest 3-hour interval and use archive URL
  const archiveDate = roundDownToNearest3Hours(roundedDate);
  const year = archiveDate.getUTCFullYear();
  const month = String(archiveDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(archiveDate.getUTCDate()).padStart(2, '0');
  const hour = String(archiveDate.getUTCHours()).padStart(2, '0');

  return `https://www.wpc.ncep.noaa.gov/archives/sfc/${year}/${surfaceDisplay}${year}${month}${day}${hour}.gif`;
}

export interface SurfaceAnalysisImageProps {
  date: Date;
  darkMode?: boolean;
  onClick?(event: React.MouseEvent<HTMLDivElement>): void;
}

export default function SurfaceAnalysisImage({
  date,
  darkMode,
  onClick,
}: SurfaceAnalysisImageProps) {
  const url = getSurfaceAnalysisUrl(date);
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
