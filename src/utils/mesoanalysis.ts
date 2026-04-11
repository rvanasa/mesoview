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

// List of mesoanalysis parameters to exclude
const excludedMesoParams = new Set([
  'pdfsfc', // Printable Surface Map [PDF]
]);

// Filter out excluded parameters from the categories
const rawCategories = spcMesoanalysisJson as [string, [string, string][]][];
const filteredCategories: [string, [string, string][]][] = rawCategories
  .map(([category, params]) => {
    const filteredParams = params.filter(
      ([paramKey]) => !excludedMesoParams.has(paramKey),
    );
    return [category, filteredParams] as [string, [string, string][]];
  })
  .filter(([_category, params]) => params.length > 0);

export const mesoParamCategories: [string, [string, string][]][] =
  filteredCategories;

// Alias for compatibility with ViewDropdown component
export const spcMesoanalysisParams = mesoParamCategories;

export const mesoParams: [string, string][] = mesoParamCategories.flatMap(
  ([_category, params]) => params,
);

export const mesoSectorMap = new Map(mesoSectors);
export const wpcSectorMap = new Map(wcpSectors);
export const mesoParamMap = new Map(mesoParams);
