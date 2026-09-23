export interface LatLon {
  lat: number;
  lon: number;
}

// Parses a "lat,lon" string (e.g. from the `location` query param) into coordinates.
export function parseLocation(value: string | undefined): LatLon | undefined {
  if (!value) return undefined;
  const parts = value.split(',').map((part) => parseFloat(part.trim()));
  if (parts.length !== 2 || parts.some((n) => isNaN(n))) return undefined;
  const [lat, lon] = parts;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return undefined;
  return { lat, lon };
}
