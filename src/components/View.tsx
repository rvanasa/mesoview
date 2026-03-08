import Slider from 'rc-slider';
import { useState, useEffect } from 'react';
import {
  FaAngleDoubleUp,
  FaArrowDown,
  FaArrowUp,
  FaLayerGroup,
  FaTimes,
} from 'react-icons/fa';
import 'twin.macro';
import { wpcSectorMap } from '../utils/mesoanalysis';
import {
  formatModelRun,
  getAvailableRuns,
  getRegionFromSpcSector,
  pivotalParamMap,
} from '../utils/pivotal';
import {
  ForecastModel,
  soundingModels,
  soundingStations,
} from '../utils/profile';
import { canCombine, parseView } from '../utils/source';
import spliced from '../utils/spliced';
import BufkitSounding from './BufkitSounding';
import Dropdown from './Dropdown';
import MesoanalysisImage from './MesoanalysisImage';
import ViewDropdown from './ParamDropdown';
import PivotalImage from './PivotalImage';
import SurfaceAnalysisImage from './SurfaceAnalysisImage';
import { ToolButton } from './ToolButton';

export const viewCategories: { param: string; label: string }[][] = [
  [
    { param: 'spc-pmsl', label: 'Surface' },
    { param: 'spc-850mb', label: '850 mb' },
    { param: 'spc-700mb', label: '700 mb' },
    { param: 'spc-500mb', label: '500 mb' },
    { param: 'spc-300mb', label: '300 mb' },
  ],
];
export const viewCategoryLabelMap = new Map(
  viewCategories.flatMap((category) =>
    category.map(({ param, label }) => [param, label]),
  ),
);

interface ViewProps {
  view: string;
  index: number;
  views: string[];
  setViews: (views: string[]) => void;
  darkMode: boolean;
  date: Date;
  sectorNumber: number;
  sector: string;
  layers: string[];
  radar: boolean;
  detailedSoundings: boolean;
  onClickImage: () => void;
}

export default function View({
  view,
  index: i,
  views,
  setViews,
  darkMode,
  date,
  sectorNumber,
  sector,
  layers,
  radar,
  detailedSoundings,
  onClickImage,
}: ViewProps) {
  const parsedView = parseView(view);
  const { source, param, name } = parsedView;
  const soundingMatch =
    source.key === 'sounding' && param
      ? param.match(/^([^-]+)-([^-]+)$/)
      : null;
  const soundingModel =
    (soundingMatch?.[1] as ForecastModel | undefined) || 'rap';
  const soundingStation = soundingMatch?.[2] || 'kcef';

  // Parse pivotal params: format is "model-param1 param2 param3"
  // e.g., "hrrr-sfctd" or "hrrr-sfctd refcmp"
  const pivotalMatch =
    source.key === 'pivotal' && param ? param.match(/^([^-]+)-(.+)$/) : null;
  const pivotalModel = pivotalMatch?.[1] || 'hrrr';
  const pivotalParams = pivotalMatch?.[2]?.split(' ').filter((p) => p) || [];
  const pivotalRegion = getRegionFromSpcSector(sectorNumber);

  // State for selected model run (undefined = use most recent)
  const [selectedModelRun, setSelectedModelRun] = useState<Date>();
  const [modelRunOptions, setModelRunOptions] = useState<
    { date: Date | undefined; label: string }[]
  >([{ date: undefined, label: 'Latest' }]);

  // Load available runs when pivotal model changes
  useEffect(() => {
    if (source.key === 'pivotal') {
      setModelRunOptions([{ date: undefined, label: 'Latest' }]);
      getAvailableRuns(pivotalModel).then((runs) => {
        setModelRunOptions([
          { date: undefined, label: 'Latest' },
          ...runs.map((run) => ({
            date: run,
            label: formatModelRun(run),
          })),
        ]);
      });
    }
  }, [source.key, pivotalModel]);

  return (
    <div>
      <div tw="flex items-center justify-between p-2">
        <div tw="flex gap-4">
          <ViewDropdown
            view={parsedView}
            label={
              source.key === 'sounding' ? (
                'Sounding'
              ) : viewCategoryLabelMap.has(view) ? (
                <div tw="text-left min-w-[4rem]">
                  {viewCategoryLabelMap.get(view)}
                </div>
              ) : (
                name || 'Choose parameter'
              )
            }
            anchor="bottom"
            onSelect={(view) => setViews(spliced(views, i, 1, view))}
          />
          {source.key === 'sounding' && (
            <>
              <Dropdown
                label={
                  <div tw="text-left min-w-[3rem]">
                    {soundingModels.find((m) => m.key === soundingModel)
                      ?.label ||
                      soundingModel?.toUpperCase() ||
                      'Model'}
                  </div>
                }
                anchor="bottom"
              >
                {soundingModels.map((model) => (
                  <div
                    key={model.key}
                    onClick={() =>
                      setViews(
                        spliced(
                          views,
                          i,
                          1,
                          `sounding-${model.key}-${soundingStation}`,
                        ),
                      )
                    }
                  >
                    {model.label}
                  </div>
                ))}
              </Dropdown>
              <Dropdown
                label={
                  <div tw="text-left min-w-[3rem]">
                    {soundingStations.find((s) => s.key === soundingStation)
                      ?.label ||
                      soundingStation?.toUpperCase() ||
                      'Station'}
                  </div>
                }
                anchor="bottom"
              >
                {soundingStations.map((station) => (
                  <div
                    key={station.key}
                    onClick={() =>
                      setViews(
                        spliced(
                          views,
                          i,
                          1,
                          `sounding-${soundingModel}-${station.key}`,
                        ),
                      )
                    }
                  >
                    {station.label}
                  </div>
                ))}
              </Dropdown>
            </>
          )}
          {source.key === 'pivotal' && (
            <>
              <Dropdown
                label={
                  <div tw="text-left min-w-[3rem]">
                    {pivotalParams.length > 0
                      ? pivotalParamMap.get(pivotalParams[0]) ||
                        pivotalParams[0]
                      : 'Param'}
                  </div>
                }
                anchor="bottom"
              >
                {[...pivotalParamMap.entries()].map(([paramKey, paramName]) => (
                  <div
                    key={paramKey}
                    onClick={() =>
                      setViews(
                        spliced(
                          views,
                          i,
                          1,
                          `pivotal-${pivotalModel}-${paramKey}`,
                        ),
                      )
                    }
                  >
                    {paramName}
                  </div>
                ))}
              </Dropdown>
              <Dropdown
                label={
                  <div tw="text-left min-w-[3rem]">
                    {selectedModelRun
                      ? formatModelRun(selectedModelRun)
                      : 'Latest'}
                  </div>
                }
                anchor="bottom"
              >
                {modelRunOptions.map((option) => (
                  <div
                    key={option.date?.toISOString() ?? 'latest'}
                    onClick={() => setSelectedModelRun(option.date)}
                  >
                    {option.label}
                  </div>
                ))}
              </Dropdown>
            </>
          )}
        </div>
        {source.key !== 'sounding' &&
          viewCategoryLabelMap.has(view) &&
          (() => {
            let category!: { param: string; label: string }[];
            let entryIndex = 0;
            outer: for (category of viewCategories) {
              for (entryIndex = 0; entryIndex < category.length; entryIndex++) {
                if (category[entryIndex].param === view) {
                  break outer;
                }
              }
            }
            return (
              <div tw="w-full flex justify-end mx-5">
                <Slider
                  styles={{
                    handle: {
                      borderColor: darkMode ? '#9ca3af' : '#605f60',
                      boxShadow: 'none',
                      width: 20,
                      height: 20,
                      borderWidth: 3,
                      top: 3,
                    },
                    rail: {
                      height: 6,
                      backgroundColor: darkMode ? '#374151' : undefined,
                    },
                    track: {
                      backgroundColor: darkMode ? '#9ca3af' : '#605f60',
                      height: 6,
                    },
                  }}
                  value={entryIndex}
                  min={0}
                  max={category.length - 1}
                  step={1}
                  onChange={(value) =>
                    setViews(
                      spliced(views, i, 1, category[value as number].param),
                    )
                  }
                />
              </div>
            );
          })()}
        <div tw="flex space-x-2">
          {source.combinable && view.includes(' ') && (
            <ToolButton
              onClick={() => {
                const parts = view.split(' ');
                const expandedViews = parts.map((part, idx) =>
                  idx === 0 ? part : `${source.key}-${part}`,
                );
                setViews(spliced(views, i, 1, ...expandedViews));
              }}
            >
              <FaLayerGroup />
            </ToolButton>
          )}
          {i > 0 && canCombine(views[i - 1], views[i]) && (
            <ToolButton
              onClick={() =>
                setViews(
                  spliced(
                    views,
                    i - 1,
                    2,
                    `${views[i - 1]} ${parseView(views[i]).param}`,
                  ),
                )
              }
            >
              <FaAngleDoubleUp />
            </ToolButton>
          )}
          {i > 0 && (
            <ToolButton
              onClick={() =>
                setViews(spliced(views, i - 1, 2, views[i], views[i - 1]))
              }
            >
              <FaArrowUp />
            </ToolButton>
          )}
          {i < views.length - 1 && (
            <ToolButton
              onClick={() =>
                setViews(spliced(views, i, 2, views[i + 1], views[i]))
              }
            >
              <FaArrowDown />
            </ToolButton>
          )}
          {views.length > 1 && (
            <ToolButton onClick={() => setViews(spliced(views, i, 1))}>
              <FaTimes tw="text-red-700 dark:text-red-400" />
            </ToolButton>
          )}
        </div>
      </div>
      {source.key === 'sounding' && soundingModel && soundingStation ? (
        <BufkitSounding
          model={soundingModel}
          station={soundingStation}
          date={date}
          detailed={detailedSoundings}
          darkMode={darkMode}
        />
      ) : source.key === 'surface' ? (
        <SurfaceAnalysisImage
          wpcSector={wpcSectorMap.get(sectorNumber) || 'us'}
          date={date}
          darkMode={darkMode}
          onClick={onClickImage}
        />
      ) : source.key === 'pivotal' ? (
        <PivotalImage
          date={date}
          model={pivotalModel}
          region={pivotalRegion}
          params={pivotalParams}
          selectedRun={selectedModelRun}
          darkMode={darkMode}
          onClick={onClickImage}
        />
      ) : (
        <MesoanalysisImage
          date={date}
          sector={sector}
          layers={layers}
          radar={radar}
          params={param ? param.split(' ').filter((param) => param) : []}
          darkMode={darkMode}
          onClick={onClickImage}
        />
      )}
    </div>
  );
}
