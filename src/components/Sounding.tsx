import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import 'twin.macro';
import { formatDate } from '../utils/date';
import {
  getParcel,
  mixingRatio,
  saturationVaporPressure,
  virtualTemperature,
} from '../utils/parcel';
import { getPressureForHeight, Profile } from '../utils/profile';

interface SoundingProps {
  profile: Profile | undefined;
  aspectRatio?: number;
}

const Sounding: React.FC<SoundingProps> = ({ profile, aspectRatio = 0.75 }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
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
    const pressureExtent = d3.extent(profile.pressureHPa) as [number, number];
    const yScale = d3
      .scaleLog()
      .domain([1000, 100]) // Standard pressure range for soundings
      .range([chartHeight, 0]);

    // Temperature scale (horizontal, skewed) - fixed range -40C to 40C
    const xScale = d3.scaleLinear().domain([-40, 40]).range([0, chartWidth]);

    // Skew function for temperature lines
    const skewFactor = 1.5; // Controls the skew amount
    const skewX = (temp: number, pressure: number) => {
      const logP = Math.log(pressure);
      const skew = skewFactor * (Math.log(1000) - logP);
      return xScale(temp) + skew * 50; // 30 is a scaling factor
    };

    // Draw pressure grid lines (horizontal)
    const pressureLevels = [
      100, 150, 200, 250, 300, 400, 500, 600, 700, 850, 925, 1000,
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
        .attr('stroke', temp === -20 || temp === 0 ? '#1662ac' : '#888')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2')
        .attr('fill', 'none');
    });

    // Draw height AGL lines
    const heightLevels = [
      { height: 0, label: 'Surface', color: heightColors.surface },
      { height: 1000, label: '1km', color: heightColors['1km'] },
      { height: 3000, label: '3km', color: heightColors['3km'] },
      { height: 6000, label: '6km', color: heightColors['6km'] },
      { height: 9000, label: '9km', color: heightColors['9km'] },
      { height: 12000, label: '12km', color: heightColors['12km'] },
    ];

    heightLevels.forEach(({ height, label, color }) => {
      const targetHeightMSL = surfaceHeight + height;
      const pressure = getPressureForHeight(profile, targetHeightMSL);

      if (pressure !== undefined) {
        const y = yScale(pressure);

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
        .attr('stroke', 'black')
        .attr('opacity', 0.25)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,3')
        .attr('fill', 'none');
    }

    // Add axes
    const yAxis = d3
      .axisLeft(yScale)
      .tickValues(
        pressureLevels.filter(
          (p) => p >= pressureExtent[0] && p <= pressureExtent[1],
        ),
      )
      .tickFormat((d) => `${d}`);

    g.append('g').attr('class', 'y-axis').call(yAxis);

    // Temperature axis (bottom)
    const xAxis = d3.axisBottom(xScale).ticks(10);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis);

    // Add axis labels
    g.append('text')
      .attr('class', 'y-label')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -chartHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .text('Pressure (hPa)');

    g.append('text')
      .attr('class', 'x-label')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .text('Temperature (°C)');

    // Add title
    svg
      .append('text')
      .attr('class', 'title')
      .attr('x', margin.left)
      .attr('y', 15)
      .attr('text-anchor', 'start')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text(
        `${formatDate(new Date(profile.time))} ${profile.model.toUpperCase()} ${profile.station.toUpperCase()}`,
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
    const hodoSize = Math.min(chartWidth * 0.4, 200);
    const hodoMargin = 0;
    const hodoX = chartWidth - hodoSize - hodoMargin;
    const hodoY = hodoMargin;

    const hodoG = g
      .append('g')
      .attr('transform', `translate(${hodoX},${hodoY})`);

    // Find max wind speed for scaling
    const maxWindKt = 60;
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
        .attr('stroke', i % 2 === 0 ? '#888' : '#ccc')
        .attr('stroke-width', 0.5)
        .attr('stroke-dasharray', '2,2');

      if (i % 2 === 1) {
        // Add speed label
        hodoG
          .append('text')
          .attr('x', center + radius)
          .attr('y', center - 2)
          .attr('font-size', '8px')
          .attr('fill', '#666')
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
      .attr('stroke', '#ccc')
      .attr('stroke-width', 0.5);

    hodoG
      .append('line')
      .attr('x1', 0)
      .attr('x2', hodoSize)
      .attr('y1', center)
      .attr('y2', center)
      .attr('stroke', '#ccc')
      .attr('stroke-width', 0.5);

    // Draw hodograph as colored segments
    for (let i = 0; i < profile.pressureHPa.length - 1; i++) {
      const heightAGL = profile.heightM[i] - surfaceHeight;
      if (heightAGL >= 12000) continue;

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
  }, [width, height, profile, parcel]);

  if (!profile || !profile.tempC?.length) {
    return (
      <div tw="flex items-center justify-center h-64 bg-gray-100 rounded">
        <p tw="text-gray-500">No profile data available</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} tw="bg-white p-4 rounded shadow w-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        tw="border border-gray-200 w-full"
      />
    </div>
  );
};

export default Sounding;
