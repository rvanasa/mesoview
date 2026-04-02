import Slider from 'rc-slider';
import { useEffect, useState } from 'react';
import {
  FaAngleDoubleUp,
  FaArrowDown,
  FaArrowUp,
  FaBolt,
  FaCloudRain,
  FaEllipsisV,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaRegStar,
  FaSnowflake,
  FaTimes,
  FaWind,
} from 'react-icons/fa';
import 'twin.macro';
import { useFavorites } from '../contexts/FavoritesContext';
import { wpcSectorMap } from '../utils/mesoanalysis';
import {
  formatModelRun,
  getAvailableRuns,
  getRegionFromSpcSector,
  pivotalParamCategories,
  pivotalParamMap,
} from '../utils/pivotal';
import { ForecastModel, soundingModels } from '../utils/profile';
import { canCombine, parseView } from '../utils/source';
import spliced from '../utils/spliced';
import BufkitSounding from './BufkitSounding';
import Dropdown from './Dropdown';
import MesoanalysisImage from './MesoanalysisImage';
import MultiStepDropdown from './MultiStepDropdown';
import PivotalImage from './PivotalImage';
import StationMap from './StationMap';
import SurfaceAnalysisImage from './SurfaceAnalysisImage';
import { ToolButton } from './ToolButton';
import ViewDropdown from './ViewDropdown';

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
  const soundingStation = soundingMatch?.[2];

  // Parse pivotal params: format is "model1-param1 model2-param2 model3-param3"
  // e.g., "hrrr-sfctd" or "hrrr-sfctd nam-refcmp"
  const pivotalModelParams: { model: string; param: string }[] = [];
  if (source.key === 'pivotal' && param) {
    const parts = param.split(' ').filter((p) => p);
    for (const part of parts) {
      const match = part.match(/^([^-]+)-(.+)$/);
      if (match) {
        pivotalModelParams.push({ model: match[1], param: match[2] });
      }
    }
  }
  const primaryPivotalModel = pivotalModelParams[0]?.model || 'hrrr';
  const primaryPivotalParam = pivotalModelParams[0]?.param || '';
  const pivotalRegion = getRegionFromSpcSector(sectorNumber);

  // State for selected model run (undefined = use most recent)
  const [selectedModelRun, setSelectedModelRun] = useState<Date>();
  const [modelRunOptions, setModelRunOptions] = useState<
    { date: Date | undefined; label: string }[]
  >([{ date: undefined, label: 'Latest' }]);

  const { favorites, setFavorites, toggleFavorite, isFavorite } =
    useFavorites();
  const favorited = isFavorite(view);

  // Load available runs when pivotal model changes
  useEffect(() => {
    if (source.key === 'pivotal') {
      setModelRunOptions([{ date: undefined, label: 'Latest' }]);
      getAvailableRuns(primaryPivotalModel).then((runs) => {
        setModelRunOptions([
          { date: undefined, label: 'Latest' },
          ...runs.map((run) => ({
            date: run,
            label: formatModelRun(run),
          })),
        ]);
      });
    }
  }, [source.key, primaryPivotalModel]);

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
              {soundingStation ? (
                <div
                  tw="flex cursor-pointer"
                  onClick={() =>
                    setViews(spliced(views, i, 1, `sounding-${soundingModel}-`))
                  }
                >
                  <span tw="min-w-[60px]">{soundingStation.toUpperCase()}</span>
                  <ToolButton title="Select on map">
                    <FaMapMarkerAlt />
                  </ToolButton>
                </div>
              ) : null}
            </>
          )}
          {source.key === 'pivotal' && (
            <>
              <MultiStepDropdown
                label={
                  <div tw="text-left min-w-[3rem]">
                    {primaryPivotalParam
                      ? pivotalParamMap.get(primaryPivotalParam) ||
                        primaryPivotalParam
                      : 'Param'}
                  </div>
                }
                anchor="bottom"
                items={pivotalParamCategories.map(([categoryName, params]) => {
                  // Map category names to icons
                  let icon;
                  if (
                    categoryName.includes('Upper-Air') &&
                    categoryName.includes('Dynamics')
                  ) {
                    icon = <FaLayerGroup />;
                  } else if (categoryName.includes('Upper-Air')) {
                    icon = <FaWind />;
                  } else if (
                    categoryName.includes('Surface') ||
                    categoryName.includes('Precipitation')
                  ) {
                    icon = <FaCloudRain />;
                  } else if (categoryName.includes('Severe')) {
                    icon = <FaBolt />;
                  } else if (categoryName.includes('Winter')) {
                    icon = <FaSnowflake />;
                  }

                  return {
                    label: categoryName,
                    icon,
                    submenu: params.map(([paramKey, paramName]) => ({
                      label: paramName,
                      onClick: () => {
                        // Keep overlay layers by preserving all but the first model-param
                        const overlayParts = pivotalModelParams
                          .slice(1)
                          .map((mp) => `${mp.model}-${mp.param}`)
                          .join(' ');
                        const newParam = overlayParts
                          ? `${primaryPivotalModel}-${paramKey} ${overlayParts}`
                          : `${primaryPivotalModel}-${paramKey}`;
                        setViews(spliced(views, i, 1, `pivotal-${newParam}`));
                      },
                    })),
                  };
                })}
              />
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
          {(() => {
            const viewParts = view.split(' ').filter((p) => p);
            const overlayCount =
              source.combinable && viewParts.length > 1
                ? viewParts.length - 1
                : 0;

            const items = [
              i > 0 && canCombine(views[i - 1], views[i]) && (
                <div
                  key="stack"
                  tw="flex items-center gap-3"
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
                  <div>Stack with Above</div>
                </div>
              ),
              source.combinable && view.includes(' ') && (
                <div
                  key="unstack"
                  tw="flex items-center gap-3"
                  onClick={() => {
                    const parts = view.split(' ');
                    const expandedViews = parts.map((part, idx) =>
                      idx === 0 ? part : `${source.key}-${part}`,
                    );
                    setViews(spliced(views, i, 1, ...expandedViews));
                  }}
                >
                  <FaLayerGroup />
                  <div>Unstack</div>
                </div>
              ),
              i > 0 && (
                <div
                  key="move-up"
                  tw="flex items-center gap-3"
                  onClick={() =>
                    setViews(spliced(views, i - 1, 2, views[i], views[i - 1]))
                  }
                >
                  <FaArrowUp />
                  <div>Move Up</div>
                </div>
              ),
              i < views.length - 1 && (
                <div
                  key="move-down"
                  tw="flex items-center gap-3"
                  onClick={() =>
                    setViews(spliced(views, i, 2, views[i + 1], views[i]))
                  }
                >
                  <FaArrowDown />
                  <div>Move Down</div>
                </div>
              ),
              <div
                key="favorite"
                tw="flex items-center gap-3"
                onClick={() => toggleFavorite(view)}
              >
                {favorited ? <FaRegStar tw="text-yellow-500" /> : <FaRegStar />}
                <div>{favorited ? 'Unfavorite' : 'Favorite'}</div>
              </div>,
              views.length > 1 && (
                <div
                  key="remove"
                  tw="flex items-center gap-3"
                  onClick={() => setViews(spliced(views, i, 1))}
                >
                  <FaTimes tw="text-red-700 dark:text-red-400" />
                  <div>Remove</div>
                </div>
              ),
            ].filter(Boolean);

            return (
              <Dropdown
                label={
                  <div tw="flex items-center gap-2 px-2 py-1">
                    {overlayCount > 0 && (
                      <span tw="ml-1 text-sm text-gray-600 dark:text-gray-300 opacity-80">
                        +{overlayCount}
                      </span>
                    )}
                    <FaEllipsisV />
                  </div>
                }
                anchor="bottom"
                noCaret
              >
                {items}
              </Dropdown>
            );
          })()}
        </div>
      </div>
      {source.key === 'sounding' ? (
        soundingModel && soundingStation ? (
          <BufkitSounding
            model={soundingModel}
            station={soundingStation}
            date={date}
            detailed={detailedSoundings}
            darkMode={darkMode}
          />
        ) : (
          <StationMap
            darkMode={darkMode}
            onSelectStation={(srcid) =>
              setViews(
                spliced(
                  views,
                  i,
                  1,
                  `sounding-${soundingModel || 'rap'}-${srcid}`,
                ),
              )
            }
          />
        )
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
          region={pivotalRegion}
          modelParams={pivotalModelParams.map((mp) => ({
            ...mp,
            selectedRun: selectedModelRun,
          }))}
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
