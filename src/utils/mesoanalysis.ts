import spcMesoanalysisJson from '../generated/spcMesoanalysis.json';

export const continentalMesoSector = 19;

export const mesoSectors: [number, string][] = [
  [19, 'Continental U.S.'],
  [11, 'Northwest'],
  [12, 'Southwest'],
  [13, 'Northern Plains'],
  [14, 'Central Plains'],
  [15, 'Southern Plains'],
  [16, 'Northeast'],
  [18, 'Southeast'],
  [17, 'Atlantic'],
  [20, 'Midwest'],
  [21, 'Great Lakes'],
  [22, 'Mountain West'],
];

export const wcpSectors: [number, string][] = [
  [19, 'us'],
  [11, 'nw'],
  [12, 'sw'],
  [13, 'nc'],
  [14, 'cc'],
  [15, 'sc'],
  [16, 'ne'],
  [18, 'se'],
  [17, 'ce'],
  // TODO: "North America" / `na`
];

export const mesoParamCategories: [string, [string, string][]][] =
  spcMesoanalysisJson as [string, [string, string][]][];

export const mesoParams: [string, string][] = mesoParamCategories.flatMap(
  ([_category, params]) => params,
);

export const mesoSectorMap = new Map(mesoSectors);
export const wpcSectorMap = new Map(wcpSectors);
export const mesoParamMap = new Map(mesoParams);
