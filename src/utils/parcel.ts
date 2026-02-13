import { Profile } from './profile';

export interface Parcel {
  pressureHPa: number[];
  tempC: number[]; // Parcel temperature
  lcl?: { pressureHPa: number; tempC: number };
  lfc?: { pressureHPa: number; tempC: number };
  el?: { pressureHPa: number; tempC: number };
  cape?: number;
  cin?: number;
}

// Calculate saturation vapor pressure using Bolton (1980)
export function saturationVaporPressure(tempC: number): number {
  return 6.112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
}

// Calculate mixing ratio (g/kg)
export function mixingRatio(
  pressureHPa: number,
  vaporPressureHPa: number,
): number {
  return 621.97 * (vaporPressureHPa / (pressureHPa - vaporPressureHPa));
}

// Calculate virtual temperature (K) from temperature (K) and mixing ratio (g/kg)
export function virtualTemperature(
  tempK: number,
  mixingRatioGkg: number,
): number {
  const epsilon = 0.622; // Ratio of molecular weights (water vapor / dry air)
  const w = mixingRatioGkg / 1000; // Convert g/kg to kg/kg
  return (tempK * (1 + w / epsilon)) / (1 + w);
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
  const steps = 100;
  const dp = (targetPressureHPa - lclP) / steps;

  for (let i = 0; i < steps; i++) {
    const es = saturationVaporPressure(tempK - 273.15);
    const ws = mixingRatio(pressureHPa, es) / 1000; // Convert to kg/kg
    const epsilon = 0.622;

    // Moist adiabatic lapse rate: dT/dp
    const numerator =
      ((Rd * tempK) / pressureHPa) * (1 + (Lv * ws) / (Rd * tempK));
    const denominator =
      Cp * (1 + (epsilon * Lv * Lv * ws) / (Cp * Rd * tempK * tempK));
    const gamma = numerator / denominator;

    tempK = tempK + gamma * dp;
    pressureHPa = pressureHPa + dp;
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

  // Calculate initial mixing ratio (conserved during dry adiabatic lift)
  const es0 = saturationVaporPressure(initialDew);
  const initialMixingRatio = mixingRatio(initialPressure, es0);

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
    const envDew = profile.dewC[i];
    const parcelTemp = liftParcel(
      initialTemp,
      initialDew,
      initialPressure,
      pressure,
      lcl.pressureHPa,
    );

    parcelPressures.push(pressure);
    parcelTemps.push(parcelTemp);

    // Calculate virtual temperatures for buoyancy
    const passedLCL = pressure <= lcl.pressureHPa;
    let parcelMixingRatio: number;

    if (passedLCL) {
      // Above LCL: parcel is saturated
      const esParcel = saturationVaporPressure(parcelTemp);
      parcelMixingRatio = mixingRatio(pressure, esParcel);
    } else {
      // Below LCL: conserve initial mixing ratio
      parcelMixingRatio = initialMixingRatio;
    }

    const parcelTempK = parcelTemp + 273.15;
    const parcelVirtTempK = virtualTemperature(parcelTempK, parcelMixingRatio);

    // Calculate CAPE/CIN using virtual temperature
    if (i > startIndex) {
      const prevPressure = profile.pressureHPa[i - 1];
      const prevEnvTemp = profile.tempC[i - 1];
      const prevEnvDew = profile.dewC[i - 1];
      const prevParcelTemp = parcelTemps[parcelTemps.length - 2];

      // Calculate previous parcel virtual temperature
      const prevPassedLCL = prevPressure <= lcl.pressureHPa;
      let prevParcelMixingRatio: number;

      if (prevPassedLCL) {
        const esPrevParcel = saturationVaporPressure(prevParcelTemp);
        prevParcelMixingRatio = mixingRatio(prevPressure, esPrevParcel);
      } else {
        prevParcelMixingRatio = initialMixingRatio;
      }

      const prevParcelTempK = prevParcelTemp + 273.15;
      const prevParcelVirtTempK = virtualTemperature(
        prevParcelTempK,
        prevParcelMixingRatio,
      );

      // Environment mixing ratios
      const esEnv = saturationVaporPressure(envDew);
      const envMixingRatio = mixingRatio(pressure, esEnv);
      const esPrevEnv = saturationVaporPressure(prevEnvDew);
      const prevEnvMixingRatio = mixingRatio(prevPressure, esPrevEnv);

      // Calculate virtual temperatures for environment
      const envTempK = envTemp + 273.15;
      const prevEnvTempK = prevEnvTemp + 273.15;

      const envVirtTempK = virtualTemperature(envTempK, envMixingRatio);
      const prevEnvVirtTempK = virtualTemperature(
        prevEnvTempK,
        prevEnvMixingRatio,
      );

      // Average virtual temperatures for the layer
      const avgParcelVirtTempK = (parcelVirtTempK + prevParcelVirtTempK) / 2;
      const avgEnvVirtTempK = (envVirtTempK + prevEnvVirtTempK) / 2;

      // Buoyancy calculation using virtual temperature
      const buoyancy =
        Rd *
        (avgParcelVirtTempK - avgEnvVirtTempK) *
        Math.log(prevPressure / pressure);

      // Check for LFC and EL (only after passing LCL)
      const passedLCLprev = prevPressure <= lcl.pressureHPa;

      if (
        passedLCLprev &&
        prevParcelVirtTempK <= prevEnvVirtTempK &&
        parcelVirtTempK >= envVirtTempK &&
        !lfc
      ) {
        // Found LFC - transition from negative to positive buoyancy
        lfc = { pressureHPa: pressure, tempC: parcelTemp };
      } else if (
        passedLCLprev &&
        prevParcelVirtTempK >= prevEnvVirtTempK &&
        parcelVirtTempK <= envVirtTempK &&
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
