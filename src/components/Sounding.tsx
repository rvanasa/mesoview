import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import 'twin.macro';
import { formatDate, formatLocalTime } from '../utils/date';
import {
  getParcel,
  mixingRatio,
  saturationVaporPressure,
  virtualTemperature,
} from '../utils/parcel';
import { getPressureForHeight, Profile } from '../utils/profile';
import { useSessionStorage } from 'usehooks-ts';

interface SoundingProps {
  profile: Profile | undefined;
  aspectRatio?: number;
  detailed?: boolean;
  darkMode?: boolean;
}

const Sounding: React.FC<SoundingProps> = ({
  profile,
  aspectRatio = 0.75,
  detailed,
  darkMode,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [zoomed, setZoomed] = useSessionStorage('mesoview.soundingZoom', false);
  const height = width * aspectRatio;

  const parcel = useMemo(
    () => (profile ? getParcel(profile, 0) : undefined),
    [profile],
  );

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.offsetWidth;
        setWidth(newWidth);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [aspectRatio]);

  useEffect(() => {
    if (!svgRef.current || !profile) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous content

    svg
      .append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', darkMode ? '#000000' : '#ffffff');

    // Increase right margin in zoomed mode to accommodate more lapse rate text
    const margin = { top: 20, right: 55, bottom: 45, left: 55 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    const heightColors = {
      surface: '#888888', // grey
      '1km': '#9333ea', // purple
      '3km': '#dc2626', // red
      '6km': '#16a34a', // green
      '9km': '#eab308', // yellow
      '12km': '#14b8a6', // teal
    };

    const getColorForHeight = (heightAGL: number): string => {
      if (heightAGL < 1000) return heightColors['1km'];
      if (heightAGL < 3000) return heightColors['3km'];
      if (heightAGL < 6000) return heightColors['6km'];
      if (heightAGL < 9000) return heightColors['9km'];
      if (heightAGL < 12000) return heightColors['12km'];
      return 'none'; // hide above 12km
    };

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Calculate surface elevation for height AGL calculations
    const surfaceHeight = profile.heightM[0];

    // Pressure scale (vertical, logarithmic)
    // For 0-6km zoom, calculate the pressure at 6km AGL
    const pressureDomain: [number, number] = [1000, zoomed ? 500 : 100];

    const yScale = d3.scaleLog().domain(pressureDomain).range([chartHeight, 0]);

    const tempRange: [number, number] = [-40, 40];
    const xScale = d3.scaleLinear().domain(tempRange).range([0, chartWidth]);

    // Skew function for temperature lines
    const skewFactor = zoomed ? 0 : 1.5; // Controls the skew amount
    const skewScaling = chartWidth * 0.2; // Scale skew based on chart width
    const skewX = (temp: number, pressure: number) => {
      const logP = Math.log(pressure);
      const skew = skewFactor * (Math.log(1000) - logP);
      return xScale(temp) + skew * skewScaling;
    };

    // Draw pressure grid lines (horizontal)
    const pressureLevels = [
      100, 150, 200, 250, 300, 400, 500, 600, 700, 850, 1000,
    ];
    // g.selectAll('.pressure-line')
    //   .data(
    //     pressureLevels.filter(
    //       (p) => p >= pressureExtent[0] && p <= pressureExtent[1],
    //     ),
    //   )
    //   .enter()
    //   .append('line')
    //   .attr('class', 'pressure-line')
    //   .attr('x1', 0)
    //   .attr('x2', chartWidth)
    //   .attr('y1', (d) => yScale(d))
    //   .attr('y2', (d) => yScale(d))
    //   .attr('stroke', '#e0e0e0')
    //   .attr('stroke-width', 0.5);

    // Draw skewed temperature lines
    const tempLevels = [-40, -20, 0, 20, 40];
    tempLevels.forEach((temp) => {
      const line = d3
        .line<number>()
        .x((p) => skewX(temp, p))
        .y((p) => yScale(p));

      g.append('path')
        .datum([1000, 100])
        .attr('class', 'temp-line')
        .attr('d', line)
        .attr(
          'stroke',
          temp === -20 || temp === 0 ? '#1662ac' : darkMode ? '#666' : '#888',
        )
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2')
        .attr('fill', 'none');
    });

    // Helper function to get temperature at a given height MSL
    const getTemperatureAtHeight = (heightMSL: number): number | undefined => {
      // Find the two points that bracket this height
      for (let i = 0; i < profile.heightM.length - 1; i++) {
        const h1 = profile.heightM[i];
        const h2 = profile.heightM[i + 1];

        if (h1 <= heightMSL && h2 >= heightMSL) {
          // Linear interpolation
          const t1 = profile.tempC[i];
          const t2 = profile.tempC[i + 1];
          const fraction = (heightMSL - h1) / (h2 - h1);
          return t1 + fraction * (t2 - t1);
        }
      }
      return undefined;
    };

    const heightLevels = [
      { height: 0, label: 'Surface', color: heightColors.surface },
      { height: 1000, label: '1km', color: heightColors['1km'] },
      { height: 3000, label: '3km', color: heightColors['3km'] },
      { height: 6000, label: '6km', color: heightColors['6km'] },
      { height: 9000, label: '9km', color: heightColors['9km'] },
      { height: 12000, label: '12km', color: heightColors['12km'] },
    ];

    const heightTemps: Array<{
      height: number;
      temp: number | undefined;
      pressure: number | undefined;
      y: number | undefined;
    }> = [];

    heightLevels.forEach(({ height, label, color }) => {
      const targetHeightMSL = surfaceHeight + height;
      const pressure = getPressureForHeight(profile, targetHeightMSL);
      const temp = getTemperatureAtHeight(targetHeightMSL);
      const y = pressure !== undefined ? yScale(pressure) : undefined;

      heightTemps.push({ height, temp, pressure, y });

      if (pressure !== undefined && y !== undefined) {
        g.append('line')
          .attr('x1', 0)
          .attr('x2', chartWidth)
          .attr('y1', y)
          .attr('y2', y)
          .attr('stroke', color)
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,3');

        // Add label on the left side (to the right of y-axis)
        g.append('text')
          .attr('x', 5)
          .attr('y', y + 10)
          .attr('font-size', '9px')
          .attr('fill', color)
          .attr('font-weight', 'bold')
          .text(label);
      }
    });

    // Draw LCL level if available
    if (parcel?.lcl) {
      const lclPressure = parcel.lcl.pressureHPa;
      const lclTempC = parcel.lcl.tempC;

      // Find height MSL for LCL pressure by interpolation
      let lclHeightMSL: number | undefined;
      for (let i = 0; i < profile.pressureHPa.length - 1; i++) {
        const p1 = profile.pressureHPa[i];
        const p2 = profile.pressureHPa[i + 1];

        // Pressure decreases with height, so p1 > p2
        if (
          (p1 >= lclPressure && p2 <= lclPressure) ||
          (p1 <= lclPressure && p2 >= lclPressure)
        ) {
          const h1 = profile.heightM[i];
          const h2 = profile.heightM[i + 1];
          const t = (lclPressure - p1) / (p2 - p1);
          lclHeightMSL = h1 + t * (h2 - h1);
          break;
        }
      }

      if (lclHeightMSL !== undefined) {
        const lclHeightAGL = lclHeightMSL - surfaceHeight;
        const lclY = yScale(lclPressure);
        const barStartX = skewX(lclTempC + 5, lclPressure);
        const barEndX = skewX(lclTempC + 9, lclPressure);
        g.append('line')
          .attr('x1', barStartX)
          .attr('x2', barEndX)
          .attr('y1', lclY)
          .attr('y2', lclY)
          .attr('stroke', 'green')
          .attr('stroke-width', 2);
        g.append('text')
          .attr('x', barEndX + 5)
          .attr('y', lclY + 4)
          .attr('font-size', '11px')
          .attr('fill', 'green')
          .attr('font-weight', 'bold')
          .text(`${(lclHeightAGL / 1000).toFixed(1)} km`);
      }
    }

    // Helper function to calculate moist adiabatic lapse rate (°C/km)
    const calculateMoistAdiabaticLapseRate = (
      tempC: number,
      pressureHPa: number,
    ): number => {
      const g = 9.8; // m/s^2
      const Cp = 1004; // J/(kg*K)
      const Lv = 2.5e6; // J/kg
      const Rd = 287; // J/(kg*K)
      const epsilon = 0.622;

      const tempK = tempC + 273.15;
      const es = saturationVaporPressure(tempC);
      const ws = mixingRatio(pressureHPa, es) / 1000; // Convert g/kg to kg/kg

      const numerator = g * (1 + (Lv * ws) / (Rd * tempK));
      const denominator = Cp + (Lv * Lv * ws * epsilon) / (Rd * tempK * tempK);

      return (numerator / denominator) * 1000; // Convert K/m to °C/km
    };

    // Calculate and display lapse rates
    const lapseRateInterval = zoomed ? 250 : 500;
    const lapseRateHeights: number[] = [];
    for (let h = 0; h <= 6000; h += lapseRateInterval) {
      lapseRateHeights.push(h);
    }

    for (let i = 0; i < lapseRateHeights.length - 1; i++) {
      const lowerHeightAGL = lapseRateHeights[i];
      const upperHeightAGL = lapseRateHeights[i + 1];

      const lowerHeightMSL = surfaceHeight + lowerHeightAGL;
      const upperHeightMSL = surfaceHeight + upperHeightAGL;

      const lowerPressure = getPressureForHeight(profile, lowerHeightMSL);
      const upperPressure = getPressureForHeight(profile, upperHeightMSL);
      const lowerTemp = getTemperatureAtHeight(lowerHeightMSL);
      const upperTemp = getTemperatureAtHeight(upperHeightMSL);

      if (
        lowerTemp !== undefined &&
        upperTemp !== undefined &&
        lowerPressure !== undefined &&
        upperPressure !== undefined
      ) {
        const heightDiffKm = (upperHeightAGL - lowerHeightAGL) / 1000;
        const tempDiff = lowerTemp - upperTemp; // temp decrease with height
        const lapseRate = tempDiff / heightDiffKm; // C/km

        // Calculate moist adiabatic lapse rate at the mid-level
        const midTemp = (lowerTemp + upperTemp) / 2;
        const midPressure = (lowerPressure + upperPressure) / 2;
        const moistAdiabaticLapseRate = calculateMoistAdiabaticLapseRate(
          midTemp,
          midPressure,
        );

        const lowerY = yScale(lowerPressure);
        const upperY = yScale(upperPressure);
        const midY = (lowerY + upperY) / 2;

        const lapseRateColor =
          lapseRate < moistAdiabaticLapseRate
            ? heightColors['12km']
            : lapseRate > 9
              ? heightColors['1km']
              : lapseRate > 8
                ? heightColors['3km']
                : lapseRate > 7
                  ? heightColors['9km']
                  : '#888888';

        // Adjust font size and spacing for zoomed view
        g.append('text')
          .attr('x', chartWidth + 18)
          .attr('y', midY + 4)
          .attr('font-size', '10px')
          .attr('fill', lapseRateColor)
          .attr('opacity', 0.5)
          .attr('text-anchor', 'end')
          .attr('font-weight', 'normal')
          .text(lapseRate.toFixed(1));
      }
    }

    if (detailed && profile.omega?.length) {
      const omegaScale = d3.scaleLinear().range([0, chartWidth * 0.005]);
      profile.omega.forEach((omega, i) => {
        const pressure = profile.pressureHPa[i];
        if (!isNaN(omega) && pressure !== undefined) {
          const y = yScale(pressure);
          const lineLength = Math.abs(omegaScale(omega));
          const color = omega < 0 ? '#ff8c00' : '#40e0d0';
          g.append('line')
            .attr('x1', 0)
            .attr('x2', lineLength)
            .attr('y1', y)
            .attr('y2', y)
            .attr('stroke', color)
            .attr('stroke-width', 1.5)
            .attr('opacity', 0.75);
        }
      });
    }

    // Create line generators
    const tempLine = d3
      .line<number>()
      .x((d, i) => skewX(profile.tempC[i], profile.pressureHPa[i]))
      .y((d, i) => yScale(profile.pressureHPa[i]))
      .curve(d3.curveLinear);

    const dewLine = d3
      .line<number>()
      .x((d, i) => skewX(profile.dewC[i], profile.pressureHPa[i]))
      .y((d, i) => yScale(profile.pressureHPa[i]))
      .curve(d3.curveLinear);

    // Draw temperature profile
    g.append('path')
      .datum(profile.tempC)
      .attr('class', 'temp-profile')
      .attr('d', tempLine)
      .attr('stroke', '#ff0000')
      .attr('stroke-width', 2)
      .attr('fill', 'none');

    // Calculate and draw virtual temperature profile
    const virtualTempC = profile.tempC.map((temp, i) => {
      const tempK = temp + 273.15;
      const dewC = profile.dewC[i];
      const pressure = profile.pressureHPa[i];

      const es = saturationVaporPressure(dewC);
      const mr = mixingRatio(pressure, es);
      const virtTempK = virtualTemperature(tempK, mr);

      return virtTempK - 273.15;
    });

    const virtTempLine = d3
      .line<number>()
      .x((d, i) => skewX(virtualTempC[i], profile.pressureHPa[i]))
      .y((d, i) => yScale(profile.pressureHPa[i]))
      .curve(d3.curveLinear);

    g.append('path')
      .datum(virtualTempC)
      .attr('class', 'virt-temp-profile')
      .attr('d', virtTempLine)
      .attr('stroke', '#ff0000')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4')
      .attr('fill', 'none');

    // Draw dewpoint profile
    g.append('path')
      .datum(profile.dewC)
      .attr('class', 'dew-profile')
      .attr('d', dewLine)
      .attr('stroke', '#00aa00')
      .attr('stroke-width', 2)
      .attr('fill', 'none');

    // Draw parcel trace
    if (parcel && parcel.tempC.length > 0) {
      const parcelLine = d3
        .line<number>()
        .x((d, i) => skewX(parcel.tempC[i], parcel.pressureHPa[i]))
        .y((d, i) => yScale(parcel.pressureHPa[i]))
        .curve(d3.curveLinear);

      g.append('path')
        .datum(parcel.tempC)
        .attr('class', 'parcel-profile')
        .attr('d', parcelLine)
        .attr('stroke', darkMode ? 'white' : 'black')
        .attr('opacity', 0.25)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,3')
        .attr('fill', 'none');
    }

    const yAxis = d3
      .axisLeft(yScale)
      .tickValues(pressureLevels)
      .tickFormat((d) => `${d}`);

    const yAxisGroup = g.append('g').attr('class', 'y-axis').call(yAxis);

    // Style y-axis for dark mode
    if (darkMode) {
      yAxisGroup.selectAll('line').attr('stroke', '#9ca3af');
      yAxisGroup.selectAll('path').attr('stroke', '#9ca3af');
      yAxisGroup.selectAll('text').attr('fill', '#e5e7eb');
    }

    // Temperature axis (bottom)
    const xAxis = d3.axisBottom(xScale).ticks(10);

    const xAxisGroup = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis);

    // Style x-axis for dark mode
    if (darkMode) {
      xAxisGroup.selectAll('line').attr('stroke', '#9ca3af');
      xAxisGroup.selectAll('path').attr('stroke', '#9ca3af');
      xAxisGroup.selectAll('text').attr('fill', '#e5e7eb');
    }

    // Add axis labels
    g.append('text')
      .attr('class', 'y-label')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -chartHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', darkMode ? '#e5e7eb' : '#000000')
      .text('Pressure (hPa)');

    g.append('text')
      .attr('class', 'x-label')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', darkMode ? '#e5e7eb' : '#000000')
      .text('Temperature (°C)');

    // Add title
    const date = new Date(profile.time);
    svg
      .append('text')
      .attr('class', 'title')
      .attr('x', margin.left)
      .attr('y', 15)
      .attr('text-anchor', 'start')
      .attr('font-size', '14px')
      .style('white-space', 'pre')
      .attr('font-family', 'monospace')
      .attr('font-weight', 'bold')
      .attr('fill', darkMode ? '#e5e7eb' : '#000000')
      .text(
        `${formatDate(date)} ${profile.model.toUpperCase()} ${profile.station.toUpperCase()}${profile.timeZone ? ` ${formatLocalTime(date)}` : ''}`,
      );

    // // Add CAPE/CIN display
    // if (parcel) {
    //   const thermBox = g
    //     .append('g')
    //     .attr('class', 'thermo-indices')
    //     .attr('transform', `translate(10, 10)`);

    //   // Background box
    //   thermBox
    //     .append('rect')
    //     .attr('x', 0)
    //     .attr('y', 0)
    //     .attr('width', 110)
    //     .attr('height', 40)
    //     .attr('fill', 'white')
    //     .attr('fill-opacity', 0.8)
    //     .attr('rx', 4);

    //   let yOffset = 16;

    //   // CAPE
    //   if (parcel.cape !== undefined) {
    //     thermBox
    //       .append('text')
    //       .attr('x', 8)
    //       .attr('y', yOffset)
    //       .attr('font-size', '12px')
    //       .attr('font-weight', 'bold')
    //       .attr('fill', '#cc0000')
    //       .text(`CAPE: ${Math.round(parcel.cape)} J/kg`);
    //     yOffset += 18;
    //   }

    //   // CIN
    //   if (parcel.cin !== undefined) {
    //     thermBox
    //       .append('text')
    //       .attr('x', 8)
    //       .attr('y', yOffset)
    //       .attr('font-size', '12px')
    //       .attr('font-weight', 'bold')
    //       .attr('fill', '#0066cc')
    //       .text(`CIN: ${Math.round(parcel.cin)} J/kg`);
    //   }
    // }

    // Add surface temperature and dewpoint labels in Fahrenheit
    if (profile.tempC.length > 0 && profile.dewC.length > 0) {
      const surfaceTemp = profile.tempC[0];
      const surfaceDew = profile.dewC[0];
      const surfaceTempF = (surfaceTemp * 9) / 5 + 32;
      const surfaceDewF = (surfaceDew * 9) / 5 + 32;
      const surfacePressure = profile.pressureHPa[0];

      // Label for surface temperature
      const tempX = skewX(surfaceTemp, surfacePressure);
      const tempY = yScale(surfacePressure);

      g.append('text')
        .attr('x', tempX)
        .attr('y', tempY + 12)
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', '#ff0000')
        .attr('text-anchor', 'start')
        .text(`${surfaceTempF.toFixed(0)}°F`);

      // Label for surface dewpoint
      const dewX = skewX(surfaceDew, surfacePressure);
      const dewY = yScale(surfacePressure);

      g.append('text')
        .attr('x', dewX)
        .attr('y', dewY + 12)
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', '#00aa00')
        .attr('text-anchor', 'end')
        .text(`${surfaceDewF.toFixed(0)}°F`);
    }

    // Draw hodograph in top right
    // Make smaller in zoomed mode to provide more space for main chart
    const hodoSize = Math.min(chartWidth * (zoomed ? 0.3 : 0.4), 200);
    const hodoMargin = 0;
    const hodoX = chartWidth - hodoSize - hodoMargin - (zoomed ? 10 : 0);
    const hodoY = hodoMargin;

    const hodoG = g
      .append('g')
      .attr('transform', `translate(${hodoX},${hodoY})`);

    // Find max wind speed for scaling
    const maxWindKt = zoomed ? 20 : 60;
    const windScale = Math.max(maxWindKt, 30); // At least 30kt scale for better spacing

    const center = hodoSize / 2;

    // Draw concentric circles for wind speed rings
    const speedRings = [10, 20, 30, 40, 50, 60, 70].filter(
      (s) => s <= windScale,
    );
    speedRings.forEach((speed, i) => {
      const radius = (speed / windScale) * (hodoSize / 2);
      hodoG
        .append('circle')
        .attr('cx', center)
        .attr('cy', center)
        .attr('r', radius)
        .attr('fill', 'none')
        .attr(
          'stroke',
          i % 2 === 0
            ? darkMode
              ? '#555'
              : '#888'
            : darkMode
              ? '#333'
              : '#ccc',
        )
        .attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '2,2');

      if (zoomed || i % 2 === 1) {
        // Add speed label
        hodoG
          .append('text')
          .attr('x', center + radius)
          .attr('y', center - 2)
          .attr('font-size', '8px')
          .attr('fill', darkMode ? '#aaa' : '#666')
          .attr('text-anchor', 'middle')
          .text(`${speed}`);
      }
    });

    // Draw crosshairs
    hodoG
      .append('line')
      .attr('x1', center)
      .attr('x2', center)
      .attr('y1', 0)
      .attr('y2', hodoSize)
      .attr('stroke', darkMode ? '#444' : '#ccc')
      .attr('stroke-width', 0.5);

    hodoG
      .append('line')
      .attr('x1', 0)
      .attr('x2', hodoSize)
      .attr('y1', center)
      .attr('y2', center)
      .attr('stroke', darkMode ? '#444' : '#ccc')
      .attr('stroke-width', 0.5);

    // Draw hodograph as colored segments
    const maxHodoHeight = 12000;
    for (let i = 0; i < profile.pressureHPa.length - 1; i++) {
      const heightAGL = profile.heightM[i] - surfaceHeight;
      if (heightAGL >= maxHodoHeight) continue;

      const color = getColorForHeight(heightAGL);
      const x1 = center + (profile.uKt[i] / windScale) * (hodoSize / 2);
      const y1 = center - (profile.vKt[i] / windScale) * (hodoSize / 2);
      const x2 = center + (profile.uKt[i + 1] / windScale) * (hodoSize / 2);
      const y2 = center - (profile.vKt[i + 1] / windScale) * (hodoSize / 2);

      hodoG
        .append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', color)
        .attr('stroke-width', 2.5)
        .attr('stroke-linecap', 'round');
    }
  }, [width, height, profile, parcel, detailed, darkMode, zoomed]);

  if (!profile || !profile.tempC?.length) {
    return (
      <div tw="flex items-center justify-center h-64 bg-gray-100 rounded">
        <p tw="text-gray-500">No profile data available</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tw="p-4 rounded shadow w-full"
      style={{ backgroundColor: darkMode ? '#1f2937' : '#ffffff' }}
      onClick={() => setZoomed(!zoomed)}
    >
      <svg
        ref={svgRef}
        width={width}
        height={height}
        tw="w-full"
        style={{ border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}` }}
      />
    </div>
  );
};

export default Sounding;
