import { Profile } from './profile';

export interface Parcel {
  pressureHPa: number[];
  tempC: number[];
  lcl?: { pressureHPa: number; tempC: number };
  lfc?: { pressureHPa: number; tempC: number };
  el?: { pressureHPa: number; tempC: number };
  cape?: number;
  cin?: number;
}

// Calculate saturation vapor pressure using Bolton (1980)
function saturationVaporPressure(tempC: number): number {
  return 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
}

// Calculate mixing ratio (g/kg)
function mixingRatio(pressureHPa: number, vaporPressureHPa: number): number {
  return 621.97 * (vaporPressureHPa / (pressureHPa - vaporPressureHPa));
}

// Calculate temperature of a lifted parcel using dry/moist adiabatic processes
function liftParcel(
  initialTempC: number,
  initialDewC: number,
  initialPressureHPa: number,
  targetPressureHPa: number,
  lclPressureHPa?: number,
): number {
  const Rd = 287.05; // Gas constant for dry air (J/kg/K)
  const Cp = 1005; // Specific heat at constant pressure (J/kg/K)
  const Lv = 2.5e6; // Latent heat of vaporization (J/kg)

  // Determine LCL pressure if not provided
  const lclP =
    lclPressureHPa ||
    calculateLCL(initialTempC, initialDewC, initialPressureHPa).pressureHPa;

  if (targetPressureHPa >= initialPressureHPa) {
    return initialTempC;
  }

  // Lift dry adiabatically to LCL
  if (targetPressureHPa > lclP) {
    const tempK =
      (initialTempC + 273.15) *
      Math.pow(targetPressureHPa / initialPressureHPa, Rd / Cp);
    return tempK - 273.15;
  }

  // First get temperature at LCL
  const lclTempK =
    (initialTempC + 273.15) * Math.pow(lclP / initialPressureHPa, Rd / Cp);

  // Lift moist adiabatically from LCL to target pressure
  let tempK = lclTempK;
  let pressureHPa = lclP;
  const steps = 50;
  const dp = (targetPressureHPa - lclP) / steps;

  for (let i = 0; i < steps; i++) {
    const p = pressureHPa + dp;
    const es = saturationVaporPressure(tempK - 273.15);
    const ws = mixingRatio(pressureHPa, es);

    // Moist adiabatic lapse rate (dT/dp)
    const gamma =
      (((Rd * tempK) / (Cp * pressureHPa)) *
        (1 + (Lv * ws) / (Rd * tempK * 1000))) /
      (1 + (Lv * Lv * ws) / (Cp * Rd * tempK * tempK * 1000));

    tempK = tempK + gamma * dp;
    pressureHPa = p;
  }

  return tempK - 273.15;
}

// Calculate LCL using Bolton (1980) approximation
function calculateLCL(
  tempC: number,
  dewC: number,
  pressureHPa: number,
): { pressureHPa: number; tempC: number } {
  const tempK = tempC + 273.15;
  const dewK = dewC + 273.15;

  // Bolton's formula for LCL
  const tlcl = 1 / (1 / (dewK - 56) + Math.log(tempK / dewK) / 800) + 56;
  const plcl = pressureHPa * Math.pow(tlcl / tempK, 3.5);

  return {
    pressureHPa: plcl,
    tempC: tlcl - 273.15,
  };
}

export function getParcel(profile: Profile, startIndex: number): Parcel {
  if (startIndex < 0 || startIndex >= profile.pressureHPa.length) {
    return { pressureHPa: [], tempC: [] };
  }

  const initialTemp = profile.tempC[startIndex];
  const initialDew = profile.dewC[startIndex];
  const initialPressure = profile.pressureHPa[startIndex];

  // Calculate LCL
  const lcl = calculateLCL(initialTemp, initialDew, initialPressure);

  // Calculate parcel temperature at each pressure level
  const parcelTemps: number[] = [];
  const parcelPressures: number[] = [];

  let lfc: { pressureHPa: number; tempC: number } | undefined;
  let el: { pressureHPa: number; tempC: number } | undefined;
  let cape = 0;
  let cin = 0;

  const Rd = 287.05;

  // Trace parcel from starting level upward (decreasing pressure/increasing altitude)
  // In the profile arrays, index 0 is surface, higher indices are higher altitudes
  for (let i = startIndex; i < profile.pressureHPa.length; i++) {
    const pressure = profile.pressureHPa[i];
    const envTemp = profile.tempC[i];
    const parcelTemp = liftParcel(
      initialTemp,
      initialDew,
      initialPressure,
      pressure,
      lcl.pressureHPa,
    );

    parcelPressures.push(pressure);
    parcelTemps.push(parcelTemp);

    // Calculate CAPE/CIN
    if (i > startIndex) {
      const prevPressure = profile.pressureHPa[i - 1];
      const prevEnvTemp = profile.tempC[i - 1];
      const prevParcelTemp = parcelTemps[parcelTemps.length - 2];

      // Average buoyancy
      const avgParcelTempK = (parcelTemp + prevParcelTemp) / 2 + 273.15;
      const avgEnvTempK = (envTemp + prevEnvTemp) / 2 + 273.15;
      const buoyancy =
        Rd * (avgParcelTempK - avgEnvTempK) * Math.log(prevPressure / pressure);

      // Check for LFC and EL (only after passing LCL)
      const passedLCL = pressure <= lcl.pressureHPa;

      if (
        passedLCL &&
        prevParcelTemp <= prevEnvTemp &&
        parcelTemp >= envTemp &&
        !lfc
      ) {
        // Found LFC - transition from negative to positive buoyancy
        lfc = { pressureHPa: pressure, tempC: parcelTemp };
      } else if (
        passedLCL &&
        prevParcelTemp >= prevEnvTemp &&
        parcelTemp <= envTemp &&
        lfc &&
        !el
      ) {
        // Found EL - transition from positive to negative buoyancy
        el = { pressureHPa: pressure, tempC: parcelTemp };
      }

      // Accumulate CAPE/CIN
      if (buoyancy > 0 && lfc) {
        cape += buoyancy;
      } else if (buoyancy < 0 && !lfc) {
        cin += Math.abs(buoyancy);
      }
    }
  }

  return {
    pressureHPa: parcelPressures,
    tempC: parcelTemps,
    lcl,
    lfc,
    el,
    cape,
    cin,
  };
}
