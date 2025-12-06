import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import 'twin.macro';
import { Profile } from '../utils/profile';

interface SoundingProps {
  profile: Profile | undefined;
  aspectRatio?: number;
}

const Sounding: React.FC<SoundingProps> = ({ profile, aspectRatio = 0.5 }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [height, setHeight] = useState(width * aspectRatio);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.offsetWidth;
        setWidth(newWidth);
        setHeight(newWidth * aspectRatio);
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

    const margin = { top: 20, right: 40, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

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
    g.selectAll('.pressure-line')
      .data(
        pressureLevels.filter(
          (p) => p >= pressureExtent[0] && p <= pressureExtent[1],
        ),
      )
      .enter()
      .append('line')
      .attr('class', 'pressure-line')
      .attr('x1', 0)
      .attr('x2', chartWidth)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', '#e0e0e0')
      .attr('stroke-width', 0.5);

    // Draw skewed temperature lines
    const tempLevels = [-40, -20, 0, 20, 40];
    tempLevels.forEach((temp) => {
      const line = d3
        .line<number>()
        .x((p) => skewX(temp, p))
        .y((p) => yScale(p));

      g.append('path')
        .datum(pressureLevels.filter((p) => p >= 100 && p <= 1000))
        .attr('class', 'temp-line')
        .attr('d', line)
        .attr('stroke', temp === -20 || temp === 0 ? '#1662ac' : '#888')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2')
        .attr('fill', 'none');
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

    // Draw dewpoint profile
    g.append('path')
      .datum(profile.dewC)
      .attr('class', 'dew-profile')
      .attr('d', dewLine)
      .attr('stroke', '#00aa00')
      .attr('stroke-width', 2)
      .attr('fill', 'none');

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
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(10)
      .tickFormat((d) => `${d}°C`);

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
      .text(`${profile.model.toUpperCase()} ${profile.station.toUpperCase()}`);

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
        .attr('y', tempY + 18)
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
        .attr('y', dewY + 18)
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', '#00aa00')
        .attr('text-anchor', 'end')
        .text(`${surfaceDewF.toFixed(0)}°F`);
    }
  }, [profile, width, height]);

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
