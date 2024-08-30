"use client";

import Image from "next/image";
import { useState } from "react";
import { useQueryParams } from "./hooks/useQueryParam";

const mesoParams = [
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

const mesoBaseUrl = "https://www.spc.noaa.gov/exper/mesoanalysis";

function getMesoanalysisUrl(date: Date, sector: string, param: string) {
  const now = new Date();
  const deltaHours = Math.round((date.getTime() - now.getTime()) / 3600000);

  if (deltaHours === 0) {
    return `${mesoBaseUrl}/${sector}/${param}/${param}.gif`;
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
  const now = new Date();
  const deltaHours = Math.round((date.getTime() - now.getTime()) / 3600000);

  if (deltaHours === 0) {
    return `${mesoBaseUrl}/${sector}/rgnlrad/rgnlrad.gif`;
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

export default function Home() {
  const [params, setParams] = useQueryParams("param");
  const [date, setDate] = useState<Date>(new Date());
  const [sectorNumber, setSectorNumber] = useState<number>(14);

  const sector = `s${sectorNumber}`;

  return (
    <>
      {/* <div className="p-3">
        
      </div> */}
      {params.map((param, i) => (
        <MesoanalysisImage
          key={i}
          date={date}
          sector={sector}
          params={[
            "cnty",
            "hiway",
            ...param.split(" ").filter((param) => param),
          ]}
        />
      ))}
    </>
  );
}

interface MesoanalysisImageProps {
  date: Date;
  sector: string;
  params: string[];
}

function MesoanalysisImage({ date, sector, params }: MesoanalysisImageProps) {
  const urls = [
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
          alt=""
          style={i ? { position: "absolute", top: 0, left: 0 } : {}}
        ></Image>
      ))}
    </div>
  );
}
