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

export const mesoParams: [string, string][] = [
  ['300mb', '300 mb Analysis'],
  ['500mb', '500 mb Analysis'],
  ['700mb', '700 mb Analysis'],
  ['850mb', '850 mb Analysis'],
  ['ageo', '300 mb Jet Circulation'],
  ['pmsl', 'Sfc Pressure / Wind'],
  ['ttd', 'Temp / Dewpoint / Wind'],
  ['3cvr', 'Sfc Vorticity / 3CAPE'],
  ['stor', 'Sig Tornado (fixed layer)'],
  ['stpc', 'Sig Tornado (effective layer)'],
  ['stpc5', 'Sig Tornado (0-500m SRH)'],
  ['dvvr', 'Sfc Convergence & Vorticity'],
  ['scp', 'Supercell Composite'],
  ['lr3c', '0-3km Lapse Rate & ML3CAPE'],
  ['lclh', 'Cloud Base Height'],
  ['nstp', 'Non-supercell Tornado'],
  ['desp', 'Enhanced Stretching Potential'],
  ['effh', 'Eff. inflow base + ESRH'],
  ['srh5', 'Eff. inflow base + 0-500m SRH'],
  ['mlcp', 'MLCAPE / MLCIN'],
  ['hail', 'Hail Parameters'],
  ['mbcp', 'Microburst Composite'],
  ['vadv', 'Vorticity Advection'],
  ['ddrh', 'Dendritic Growth Layer'],
  ['snsq', 'Snow Squall'],
  ['oprh', 'OPRH'],
];

export const mesoSectorMap = new Map(mesoSectors);
export const mesoParamMap = new Map(mesoParams);
