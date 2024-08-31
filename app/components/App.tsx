'use client';

import Slider from 'rc-slider';
import { Button, Datepicker, Dropdown } from 'flowbite-react';
import Image from 'next/image';
import { useCallback, useState } from 'react';
import { FaMinus, FaPlus, FaTimes } from 'react-icons/fa';
import { useQueryParam, useQueryParams } from '../hooks/useQueryParam';

import 'rc-slider/assets/index.css';

const mesoSectors: [number, string][] = [
  [19, 'Continental U.S.'],
  [11, 'Northwest'],
  [12, 'Southwest'],
  [13, 'Northern Plains'],
  [14, 'Central Plains'],
  [15, 'Southern Plains'],
  [16, 'Northeast'],
  [17, 'Atlantic'],
  [18, 'Deep South'],
  [20, 'Midwest'],
  [21, 'Great Lakes'],
  [22, 'Mountain West'],
];

const mesoParams: [string, string][] = [
  ['300mb', '300 mb Analysis'],
  ['500mb', '500 mb Analysis'],
  ['700mb', '700 mb Analysis'],
  ['850mb', '850 mb Analysis'],
  ['ageo', '300 mb Jet Circulation'],
  ['pmsl', 'MSL Pressure / Wind'],
  ['ttd', 'Temp / Dewpoint / Wind'],
  ['scp', 'Supercell Composite'],
  ['3cvr', 'Sfc Vorticity / 3CAPE'],
  ['stor', 'Sig Tornado (fixed layer)'],
  ['stpc', 'Sig Tornado (effective layer)'],
  ['stpc5', 'Sig Tornado (0-500m SRH)'],
  ['dvvr', 'Sfc Convergence & Vorticity'],
  ['lr3c', '0-3km Lapse Rate & ML3CAPE'],
  ['nstp', 'Non-supercell Tornado'],
  ['effh', 'Eff. inflow base + ESRH'],
  ['srh5', 'Eff. inflow base + 0-500m SRH'],
  ['mlcp', 'MLCAPE / MLCIN'],
  ['hail', 'Hail Parameters'],
  ['mbcp', 'Microburst Composite'],
  ['ddrh', 'Dendritic Growth Layer'],
  ['snsq', 'Snow Squall'],
  ['oprh', 'OPRH'],
];

const mesoSectorMap = new Map(mesoSectors);
const mesoParamMap = new Map(mesoParams);

const mesoBaseUrl = 'https://www.spc.noaa.gov/exper/mesoanalysis';

function getLayerUrl(sector: string, param: string) {
  return `${mesoBaseUrl}/${sector}/${param}/${param}.gif`;
}

function getMesoanalysisUrl(date: Date, sector: string, param: string) {
  date = roundToNearestHour(date);
  const now = new Date();
  const deltaHours = Math.round((date.getTime() - now.getTime()) / 3600000);

  if (deltaHours === 0) {
    return `${mesoBaseUrl}/${sector}/${param}/${param}.gif?${date.getTime()}`;
  } else if (deltaHours > 0) {
    return `${mesoBaseUrl}/fcst/${sector}/${param}_${String(
      date.getUTCHours(),
    ).padStart(2, '0')}_trans.gif`;
  } else {
    return `${mesoBaseUrl}/${sector}/${param}/${param}_${date
      .toISOString()
      .slice(2, 10)
      .replace(/-/g, '')}${String(date.getUTCHours()).padStart(2, '0')}.gif`;
  }
}

function getRadarUrl(date: Date, sector: string) {
  date = roundToNearestHour(date);
  const now = new Date();
  const deltaHours = Math.round((date.getTime() - now.getTime()) / 3600000);

  if (deltaHours === 0) {
    return `${mesoBaseUrl}/${sector}/rgnlrad/rgnlrad.gif?${date.getTime()}`;
  } else if (deltaHours > 0) {
    return `${mesoBaseUrl}/fcst/${sector}/hrrr_${String(
      date.getUTCHours(),
    ).padStart(2, '0')}.gif`;
  } else {
    return `${mesoBaseUrl}/${sector}/rgnlrad/rad_${date
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '')}_${String(date.getUTCHours()).padStart(2, '0')}00.gif`;
  }
}

function roundToNearestHour(date: Date) {
  date = new Date(date);
  date.setUTCHours(date.getUTCHours() + Math.round(date.getUTCMinutes() / 60));
  date.setUTCMinutes(0, 0, 0);
  return date;
}

function spliced<T>(
  array: T[],
  index: number,
  count: number,
  ...items: T[]
): T[] {
  const newArray = [...array];
  newArray.splice(index, count, ...items);
  console.log(array, index, count, newArray);
  return newArray;
}

function zeroPad(value: number, digits: number): string {
  return String(value).padStart(digits, '0');
}

function formatDate(date: Date): string {
  return `${date.toISOString().slice(0, 10)} ${zeroPad(
    date.getUTCHours(),
    2,
  )}z`;
}

function parseDate(dateString: string, defaultHour: number): Date;
function parseDate(dateString: string): Date | undefined;
function parseDate(dateString: string, defaultHour?: number): Date | undefined {
  const [date, time] = dateString.split(' ');
  const [year, month, day] = date.split('-').map(Number);
  const hour = parseInt(time, 10);
  if (isNaN(hour) && arguments.length < 2) {
    return;
  }
  return new Date(
    Date.UTC(year, month - 1, day, isNaN(hour) ? defaultHour : hour),
  );
}

export default function App() {
  const [params, setParams] = useQueryParams('param', ['500mb']);
  const [sectorString, setSectorString] = useQueryParam('sector');
  const [hourOffset, setHourOffset] = useState(0);
  const [inputDateString, setInputDateString] = useQueryParam('time');

  const sectorNumber =
    sectorString === undefined || isNaN(+sectorString) ? 19 : +sectorString;

  const inputDate = inputDateString
    ? parseDate(inputDateString, 12)
    : new Date();
  const setInputDate = useCallback(
    (date: Date) => {
      setInputDateString(formatDate(date));
    },
    [setInputDateString],
  );

  const date = new Date(inputDate.getTime() + 3600000 * hourOffset);

  const sector = `s${sectorNumber}`;
  const sectorName = mesoSectorMap.get(sectorNumber);

  return (
    <div
      style={{ maxWidth: 1000 }}
      className="mx-auto bg-white pb-3 rounded-b-lg"
    >
      {params.map((param, i) => (
        <div key={i}>
          <div className="flex justify-between p-2">
            <div>
              <Dropdown
                label={mesoParamMap.get(param) || param || 'Choose parameter'}
                inline
              >
                {/* <div style={{ maxHeight: "70vh" }} className="overflow-y-scroll"> */}
                {mesoParams.map(([key, title], j) => (
                  <Dropdown.Item
                    key={j}
                    onClick={() => setParams(spliced(params, i, 1, key))}
                  >
                    {title}
                  </Dropdown.Item>
                ))}
                {/* </div> */}
              </Dropdown>
            </div>
            <Button
              color="gray"
              size="xs"
              className="px-0 py-1"
              onClick={() => setParams(spliced(params, i, 1))}
            >
              <FaTimes style={{ fontSize: 11 }} />
            </Button>
          </div>
          <MesoanalysisImage
            date={date}
            sector={sector}
            layers={['cnty', 'hiway']}
            params={param.split(' ').filter((param) => param)}
          />
        </div>
      ))}
      <div className="p-3">
        <Dropdown label="Add parameter" inline>
          {mesoParams.map(([key, title], i) => (
            <Dropdown.Item key={i} onClick={() => setParams([...params, key])}>
              {title}
            </Dropdown.Item>
          ))}
        </Dropdown>
      </div>
      <div className="p-3">
        <div className="flex justify-between">
          <code className="font-bold">
            {formatDate(date)}
            {hourOffset !== 0 && (
              <span className="ml-3 opacity-70">
                {hourOffset > 0 && '+'}
                {hourOffset}
              </span>
            )}
          </code>
          <Button.Group>
            <Button
              color="gray"
              size="xs"
              className="px-1 py-1"
              onClick={() => {
                setInputDate(new Date(inputDate.getTime() - 3600000));
                setHourOffset(0);
              }}
            >
              <FaMinus style={{ fontSize: 11 }} />
            </Button>
            <Button
              color="gray"
              size="xs"
              className="px-1 py-1"
              onClick={() => {
                setInputDate(new Date(inputDate.getTime() + 3600000));
                setHourOffset(0);
              }}
            >
              <FaPlus style={{ fontSize: 11 }} />
            </Button>
          </Button.Group>
        </div>
        {/* <RangeSlider
          className="flex-1"
          value={hourOffset}
          min={-12}
          max={12}
          onChange={(e) => setHourOffset(+e.target.value)}
        /> */}
        <Slider
          className="flex-1"
          value={hourOffset}
          min={-12}
          max={12}
          // marks={{ '0': { style: {}, label: '0' } }}
          styles={{
            handle: { borderColor: '#222' },
            track: { backgroundColor: '#222' },
          }}
          startPoint={0}
          onChange={(value) => setHourOffset(value as number)}
        />
      </div>
      <div className="flex justify-between p-3">
        <Datepicker
          value={inputDate.toDateString()}
          style={{ maxWidth: 180 }}
          showTodayButton={false}
          labelClearButton="Reset"
          onSelectedDateChanged={(date) => {
            setInputDate(
              Math.abs(date.getTime() - Date.now()) < 1000
                ? date
                : new Date(
                    date.getTime() +
                      3600000 * 12 -
                      60000 * date.getTimezoneOffset(),
                  ),
            );
            setHourOffset(0);
          }}
        />
        <Dropdown
          className="flex-1"
          inline
          label={sectorName || 'Choose region...'}
        >
          {mesoSectors.map(([number, name], i) => (
            <Dropdown.Item
              key={i}
              onClick={() => setSectorString(String(number))}
            >
              {name}
            </Dropdown.Item>
          ))}
        </Dropdown>
      </div>
    </div>
  );
}

interface MesoanalysisImageProps {
  date: Date;
  sector: string;
  layers: string[];
  params: string[];
}

function MesoanalysisImage({
  date,
  sector,
  layers,
  params,
}: MesoanalysisImageProps) {
  const urls = [
    ...layers.map((param) => getLayerUrl(sector, param)),
    getRadarUrl(date, sector),
    ...params.map((param) => getMesoanalysisUrl(date, sector, param)),
  ];
  return (
    <div style={{ position: 'relative', background: 'white' }}>
      {urls.map((url, i) => (
        <Image
          key={i}
          src={url}
          width={1000}
          height={750}
          quality={100}
          priority
          alt=""
          style={i ? { position: 'absolute', top: 0, left: 0 } : {}}
          onError={(e) => ((e.target as any).style.opacity = 0)}
        ></Image>
      ))}
    </div>
  );
}
