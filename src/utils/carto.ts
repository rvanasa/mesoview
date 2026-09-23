// Lambert conformal conic projection matching SPC's mesoanalysis carto.js,
// used to place a lat/lon marker on the static mesoanalysis map images.

const EARTH_RADIUS_KM = 6371;
const rad = Math.PI / 180;

interface SectorMapParams {
  clat: number;
  clon: number;
  slat1: number;
  slat2: number;
  slon: number;
  zoom: number;
  meshSize: number;
}

// The actual rendered images are 1000x750, but carto.js's initmap() is called with its
// `hgt`/`wid` args swapped relative to the real image dimensions (verified against the
// live tool's own `cart` state), so the center-offset uses these swapped constants.
const screenCenterOffsetX = 750 / 2;
const screenCenterOffsetY = 1000 / 2;

// Values taken from SPC's setMap()/initmap() in carto.js, keyed by SPC sector number.
const sectorMapParams: Record<number, SectorMapParams> = {
  11: { clat: 41.9, clon: -116.4, slat1: 35, slat2: 50, slon: -98.5, zoom: 20.0, meshSize: 40 },
  12: { clat: 33.07, clon: -114.67, slat1: 35, slat2: 50, slon: -98.5, zoom: 20.0, meshSize: 40 },
  13: { clat: 42.38, clon: -99.85, slat1: 35, slat2: 50, slon: -98.5, zoom: 21.9, meshSize: 40 },
  14: { clat: 35.7, clon: -99.86, slat1: 35, slat2: 50, slon: -98.0, zoom: 22.5, meshSize: 40 },
  15: { clat: 29.5, clon: -99.7, slat1: 35, slat2: 50, slon: -97.8, zoom: 19.1, meshSize: 40 },
  16: { clat: 42.5, clon: -80.9, slat1: 35, slat2: 50, slon: -96.5, zoom: 22.5, meshSize: 40 },
  17: { clat: 35.2, clon: -85.1, slat1: 35, slat2: 50, slon: -97.0, zoom: 23.1, meshSize: 40 },
  18: { clat: 28.45, clon: -89.2, slat1: 35, slat2: 50, slon: -97.0, zoom: 19.2, meshSize: 40 },
  19: { clat: 32.6, clon: -103.2, slat1: 35, slat2: 45, slon: -98.0, zoom: 8.3, meshSize: 40 },
  20: { clat: 37.2, clon: -94.6, slat1: 35, slat2: 50, slon: -97.5, zoom: 21.5, meshSize: 40 },
  21: { clat: 42.8, clon: -88.8, slat1: 35, slat2: 50, slon: -97.0, zoom: 25.0, meshSize: 40 },
  22: { clat: 38.35, clon: -112.3, slat1: 35, slat2: 50, slon: -99.0, zoom: 23.4, meshSize: 40 },
};

function coneConstant(slat1: number, slat2: number): number {
  const term1 = Math.log(Math.cos(slat1 * rad) / Math.cos(slat2 * rad));
  const term2 = Math.log(
    Math.tan((45 - slat1 / 2) * rad) / Math.tan((45 - slat2 / 2) * rad),
  );
  return term2 === 0 ? 1 : term1 / term2;
}

function latLonToXY(
  lat: number,
  lon: number,
  params: SectorMapParams,
  coneConst: number,
): { x: number; y: number } {
  const theta = (lon - params.slon) * rad * coneConst;
  const term1 = EARTH_RADIUS_KM * Math.cos(params.slat1 * rad);
  const term2 = Math.pow(Math.tan((45 - params.slat1 / 2) * rad), coneConst);
  const psi = term1 / (coneConst * term2);
  const rho1 = psi * term2;
  const rho = psi * Math.pow(Math.tan((45 - lat / 2) * rad), coneConst);
  return {
    x: (rho * Math.sin(theta)) / params.meshSize,
    y: (rho1 - rho * Math.cos(theta)) / params.meshSize,
  };
}

// Projects a lat/lon to pixel coordinates on the 1000x750 mesoanalysis image
// for the given SPC sector number, or undefined if the sector isn't known.
export function projectLocationToImage(
  sectorNumber: number,
  lat: number,
  lon: number,
): { x: number; y: number } | undefined {
  const params = sectorMapParams[sectorNumber];
  if (!params) return undefined;
  const coneConst = coneConstant(params.slat1, params.slat2);
  const center = latLonToXY(params.clat, params.clon, params, coneConst);
  const point = latLonToXY(lat, lon, params, coneConst);
  return {
    x: (point.x - center.x) * params.zoom + screenCenterOffsetX,
    y: -(point.y - center.y) * params.zoom + screenCenterOffsetY,
  };
}
