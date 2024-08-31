"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { useQueryParam, useQueryParams } from "./hooks/useQueryParam";
import { Button, Dropdown, RangeSlider } from "flowbite-react";
import { FaTimes } from "react-icons/fa";

const mesoParams: [string, string][] = [
  ["300mb", "300 mb Analysis"],
  ["500mb", "500 mb Analysis"],
  ["700mb", "700 mb Analysis"],
  ["850mb", "850 mb Analysis"],
  ["ageo", "300 mb Jet Circulation"],
  ["pmsl", "MSL Pressure / Wind"],
  ["ttd", "Temp / Dewpoint / Wind"],
  ["scp", "Supercell Composite"],
  ["3cvr", "Sfc Vorticity / 3CAPE"],
  ["stor", "Sig Tornado (fixed layer)"],
  ["stpc", "Sig Tornado (effective layer)"],
  ["stpc5", "Sig Tornado (0-500m SRH)"],
  ["dvvr", "Sfc Convergence & Vorticity"],
  ["lr3c", "0-3km Lapse Rate & ML3CAPE"],
  ["nstp", "Non-supercell Tornado"],
  ["effh", "Eff. inflow base + ESRH"],
  ["srh5", "Eff. inflow base + 0-500m SRH"],
  ["mlcp", "MLCAPE / MLCIN"],
  ["hail", "Hail Parameters"],
  ["mbcp", "Microburst Composite"],
  ["ddrh", "Dendritic Growth Layer"],
  ["snsq", "Snow Squall"],
  ["oprh", "OPRH"],
];

const mesoParamNames = new Map(mesoParams);

const mesoBaseUrl = "https://www.spc.noaa.gov/exper/mesoanalysis";

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
      date.getUTCHours()
    ).padStart(2, "0")}_trans.gif`;
  } else {
    return `${mesoBaseUrl}/${sector}/${param}/${param}_${date
      .toISOString()
      .slice(2, 10)
      .replace(/-/g, "")}${String(date.getUTCHours()).padStart(2, "0")}.gif`;
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
      date.getUTCHours()
    ).padStart(2, "0")}.gif`;
  } else {
    return `${mesoBaseUrl}/${sector}/rgnlrad/rad_${date
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, "")}_${String(date.getUTCHours()).padStart(2, "0")}00.gif`;
  }
}

function roundToNearestHour(date: Date) {
  date = new Date(date);
  date.setHours(date.getHours() + Math.round(date.getMinutes() / 60));
  date.setMinutes(0, 0, 0);
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

export default function Home() {
  // const [paramString, setParamString] = useQueryParam("params");
  const [params, setParams] = useQueryParams("param");
  // const [date, setDate] = useState<Date>();
  const [sectorNumber, setSectorNumber] = useState(14);
  const [hourOffset, setHourOffset] = useState(0);

  const inputDate = new Date();

  const date = new Date(inputDate.getTime() + 3600000 * hourOffset);

  const sector = `s${sectorNumber}`;

  // const params = paramString?.split(",") ?? [];
  // const setParams = useCallback(
  //   (params: string[]) => {
  //     setParamString(params.join(","));
  //   },
  //   [setParamString]
  // );

  return (
    <div>
      <div className="p-3">
        <RangeSlider
          className="flex-1"
          value={hourOffset}
          min={-12}
          max={12}
          onChange={(e) => setHourOffset(+e.target.value)}
        ></RangeSlider>
        {/* <Button onClick={() => setHourOffset(0)}>Reset</Button> */}
      </div>
      {params.map((param, i) => (
        <div key={i}>
          <div className="flex content-between m-2">
            <div className="flex-1">
              <Dropdown
                label={mesoParamNames.get(param) || param || "Choose parameter"}
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
              outline
              color="gray"
              size="xs"
              className="flex items-center p-0 py-1"
              onClick={() => setParams(spliced(params, i, 1))}
            >
              <FaTimes style={{ fontSize: 11 }} />
            </Button>
          </div>
          <MesoanalysisImage
            date={date}
            sector={sector}
            layers={["cnty", "hiway"]}
            params={param.split(" ").filter((param) => param)}
          />
        </div>
      ))}
      <div className="p-2">
        <Dropdown label="Add parameter" inline>
          {mesoParams.map(([key, title], i) => (
            <Dropdown.Item key={i} onClick={() => setParams([...params, key])}>
              {title}
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
    <div style={{ position: "relative", background: "white" }}>
      {urls.map((url, i) => (
        <Image
          key={i}
          src={url}
          width={1000}
          height={750}
          quality={100}
          priority
          alt=""
          style={i ? { position: "absolute", top: 0, left: 0 } : {}}
        ></Image>
      ))}
    </div>
  );
}
