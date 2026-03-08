import Slider from 'rc-slider';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaAngleLeft,
  FaAngleRight,
  FaGlobe,
  FaRegCalendarAlt,
  FaShareAlt,
  FaUndoAlt,
} from 'react-icons/fa';
import { FaGear } from 'react-icons/fa6';
import { useSearchParams } from 'react-router-dom';
import 'twin.macro';
import { useLocalStorage } from 'usehooks-ts';
import useListener from '../hooks/useListener';
import { useQueryParam, useQueryParams } from '../hooks/useQueryParam';
import {
  formatDate,
  parseDate,
  plusHours,
  roundToNearestHour,
} from '../utils/date';
import {
  continentalMesoSector,
  mesoSectorMap,
  mesoSectors,
} from '../utils/mesoanalysis';
import { parseView } from '../utils/source';
import { Button } from './Button';
import { ButtonGroup } from './ButtonGroup';
import Calendar from './Calendar';
import Card from './Card';
import Dropdown from './Dropdown';
import NumberInput from './NumberInput';
import ViewDropdown from './ParamDropdown';
import View from './View';

const defaultMesoSector = 13; // Central U.S.
const defaultHour = 23;

type CheckboxKey = 'counties' | 'highways' | 'radar' | 'warnings' | 'spcday1';
const checkboxLabels: Record<CheckboxKey, string> = {
  counties: 'Counties',
  highways: 'Highways',
  radar: 'Radar',
  warnings: 'Watches, warnings',
  spcday1: 'SPC day 1 outlook',
  // location: 'Device location',
};
const checkboxKeys = Object.keys(checkboxLabels) as CheckboxKey[];
const defaultCheckboxes: CheckboxKey[] = ['counties', 'radar', 'warnings'];

const checkboxLayers: Partial<Record<CheckboxKey, string>> = {
  counties: 'cnty',
  highways: 'hiway',
  warnings: 'warns',
  spcday1: 'otlk',
};

export default function App() {
  const [queryParams, setQueryParams] = useSearchParams();
  useEffect(() => {
    if (queryParams.has('param')) {
      const views = queryParams.getAll('param').map((param) => param === 'surface' || param.startsWith('sounding-') ? param : `spc-${param}`);
      queryParams.delete('param');
      views.forEach((view) => queryParams.append('view', view));
      setQueryParams(queryParams.toString(), { replace: true });
    }
  }, [queryParams, setQueryParams]);

  const [views, setViews] = useQueryParams('view', ['spc-500mb', 'spc-3cvr']);
  const [sectorQueryParam, setSectorQueryParam] = useQueryParam('sector');
  const [inputDateString, setInputDateString] = useQueryParam('time');
  const [modal, setModal] = useState<'calendar' | 'settings'>();
  const [sliderRange, setSliderRange] = useState(
    +queryParams.get('range')! || 1,
  );
  const [sliderInterval, setSliderInterval] = useState(
    +queryParams.get('interval')! || 1,
  );
  const [toggleSector, setToggleSector] = useLocalStorage<number>(
    'mesoview.toggleMesoSector',
    continentalMesoSector,
  );
  const [detailedSoundings, setDetailedSoundings] = useState(false);
  const [darkMode, setDarkMode] = useLocalStorage<boolean>(
    'mesoview.darkMode',
    false,
  );

  // const [showKeys, setShowKeys] = useQueryParams('show');
  // const [hideKeys, setHideKeys] = useQueryParams('hide');
  const [checkboxes, setCheckboxes] = useState(() => {
    const checkboxes: Partial<Record<CheckboxKey, boolean>> = {};
    defaultCheckboxes.forEach((key) => (checkboxes[key] = true));
    // showKeys.forEach((key) => (checkboxes[key] = true));
    // hideKeys.forEach((key) => (checkboxes[key] = false));
    return checkboxes;
  });

  const setCheckbox = useCallback(
    (key: CheckboxKey, checked: boolean) => {
      checked = !!checked;
      if (checkboxes[key] !== checked) {
        setCheckboxes({ ...checkboxes, [key]: checked });
      }
    },
    [checkboxes],
  );

  const sectorNumber =
    sectorQueryParam === undefined || isNaN(+sectorQueryParam)
      ? continentalMesoSector
      : +sectorQueryParam;

  const inputDate = inputDateString
    ? parseDate(inputDateString, defaultHour)
    : roundToNearestHour(new Date());
  const setInputDate = useCallback(
    (date: Date | undefined) => {
      setInputDateString(date && formatDate(date));
      setHourOffset(0);
    },
    [setInputDateString],
  );
  const [hourOffset, setHourOffset] = useState(
    // inputDateString ? 0 : 1 /* +1 hour by default */,
    0,
  );

  useListener(document, 'keydown', (event: KeyboardEvent) => {
    const hours = event.ctrlKey ? 6 : 1;
    // if (event.key === 'ArrowLeft') {
    //   setInputDate(plusHours(inputDate, -hours));
    // } else if (event.key === 'ArrowRight') {
    //   setInputDate(plusHours(inputDate, hours));
    // }
    if (event.key === 'ArrowLeft') {
      setHourOffset(hourOffset - hours);
    } else if (event.key === 'ArrowRight') {
      setHourOffset(hourOffset + hours);
    }
  });

  const date = new Date(inputDate.getTime() + 3600000 * hourOffset);

  const nowOffset = Math.round((date.getTime() - Date.now()) / 3600000);

  const layers: string[] = useMemo(
    () =>
      Object.entries(checkboxes)
        .map(([key_, value]) => {
          const key = key_ as CheckboxKey;
          if (
            value &&
            (key !== 'warnings' || nowOffset === 0) &&
            (key !== 'spcday1' || nowOffset >= -24)
          ) {
            return checkboxLayers[key];
          }
          return undefined;
        })
        .filter((layer) => layer) as string[],
    [checkboxes, nowOffset],
  );

  const sector = `s${sectorNumber}`;
  const sectorName = mesoSectorMap.get(sectorNumber) || '(Unknown region)';

  const onClickMesoanalysisImage = useCallback(() => {
    if (sectorNumber === continentalMesoSector) {
      setSectorQueryParam(
        String(
          toggleSector === continentalMesoSector
            ? defaultMesoSector
            : toggleSector,
        ),
      );
    } else {
      setSectorQueryParam(undefined);
    }
  }, [sectorNumber, setSectorQueryParam, toggleSector]);

  useEffect(() => {
    document.title = `${inputDateString ? (inputDateString.toLowerCase().endsWith('z') ? inputDateString : `${inputDateString}z`) : 'Current time'} | ${sectorName} | Mesoview`;
  }, [inputDateString, sectorName]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div
      style={{ maxWidth: 1000 }}
      tw="mx-auto dark:bg-gray-900 dark:text-white min-h-screen"
      onKeyDown={(e) => e.stopPropagation()}
    >
      {!!modal && (
        <div
          tw="flex justify-center items-center bg-[#0005] dark:bg-[#000a] fixed top-0 bottom-0 left-0 right-0 z-10"
          onClick={() => setModal(undefined)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            {modal === 'calendar' ? (
              <Card tw="text-lg flex flex-col gap-4 w-full">
                <div tw="min-h-[340px]">
                  <Calendar
                    value={inputDate}
                    onChange={(date) => {
                      setInputDate(
                        date
                          ? Math.abs(date.getTime() - Date.now()) < 1000
                            ? undefined
                            : roundToNearestHour(
                                new Date(
                                  date.getTime() +
                                    3600000 * defaultHour -
                                    60000 * date.getTimezoneOffset(),
                                ),
                              )
                          : undefined,
                      );
                      setModal(undefined);
                    }}
                  />
                </div>
                <Button
                  onClick={() => {
                    setInputDate(undefined);
                    setModal(undefined);
                  }}
                >
                  Reset
                </Button>
                {/* <Button type="primary" onClick={() => setModal(undefined)}>
                  Done
                </Button> */}
              </Card>
            ) : modal === 'settings' ? (
              <Card tw="text-lg flex flex-col gap-4 w-full min-w-[350px]">
                {checkboxKeys.map((key) => (
                  <label key={key} tw="flex items-center justify-between">
                    <span>{checkboxLabels[key]}</span>
                    <input
                      type="checkbox"
                      checked={!!checkboxes[key]}
                      onChange={() => setCheckbox(key, !checkboxes[key])}
                    />
                  </label>
                ))}
                <label tw="flex items-center justify-between">
                  <span>Detailed soundings</span>
                  <input
                    type="checkbox"
                    checked={detailedSoundings}
                    onChange={(e) => setDetailedSoundings(e.target.checked)}
                  />
                </label>
                <label tw="flex items-center justify-between">
                  <span>Dark mode</span>
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                  />
                </label>
                <label tw="flex items-center justify-between">
                  <span>Slider range (days):</span>
                  <NumberInput
                    min={1}
                    step={1}
                    defaultValue={sliderRange}
                    onChangeValue={setSliderRange}
                  />
                </label>
                <label tw="flex items-center justify-between">
                  <span>Slider interval (hours):</span>
                  <NumberInput
                    min={1}
                    step={1}
                    defaultValue={sliderInterval}
                    onChangeValue={setSliderInterval}
                  />
                </label>
                <Button type="primary" onClick={() => setModal(undefined)}>
                  Done
                </Button>
              </Card>
            ) : null}
          </div>
        </div>
      )}
      {views.map((view, i) => (
        <View
          key={i}
          view={view}
          index={i}
          views={views}
          setViews={setViews}
          darkMode={darkMode}
          date={date}
          sectorNumber={sectorNumber}
          sector={sector}
          layers={layers}
          radar={!!checkboxes['radar']}
          detailedSoundings={detailedSoundings}
          onClickImage={onClickMesoanalysisImage}
        />
      ))}
      <div tw="p-3 flex justify-between">
        <ViewDropdown
          label="Add parameter"
          anchor="top"
          onSelect={(view) => setViews([...views, view])}
        />
      </div>

      <div style={{ paddingBottom: 130 }}></div>
      <div
        tw="fixed bottom-0 rounded-t-lg w-full bg-[#fffe] dark:bg-gray-800"
        style={{ maxWidth: 1000 }}
      >
        <div tw="p-3">
          <div tw="flex items-center justify-between gap-x-3">
            <Button
              onClick={() =>
                setModal(modal !== 'calendar' ? 'calendar' : undefined)
              }
            >
              <FaRegCalendarAlt />
            </Button>
            <code tw="font-bold flex-1 text-left text-lg select-none">
              {formatDate(date)}
              {nowOffset >= -12 && (
                <span tw="ml-3 opacity-70 text-green-700 dark:text-green-400">
                  {nowOffset > 0 && '+'}
                  {nowOffset === 0
                    ? 'Now'
                    : `${nowOffset}${Math.abs(nowOffset) < 10 ? 'h' : ''}`}
                </span>
              )}
            </code>
            {hourOffset ? (
              <Button onClick={() => setHourOffset(0)}>
                <FaUndoAlt />
              </Button>
            ) : (
              !!inputDateString && (
                <ButtonGroup>
                  <Button
                    onClick={(event) =>
                      setInputDate(
                        plusHours(inputDate, event.ctrlKey ? -6 : -1),
                      )
                    }
                  >
                    <FaAngleLeft />
                  </Button>
                  <Button
                    onClick={(event) =>
                      setInputDate(plusHours(inputDate, event.ctrlKey ? 6 : 1))
                    }
                  >
                    <FaAngleRight />
                  </Button>
                </ButtonGroup>
              )
            )}
          </div>
        </div>
        <Slider
          tw="flex-1"
          styles={{
            handle: {
              borderColor: darkMode ? '#e5e7eb' : '#222',
              boxShadow: 'none',
              // transform: 'scale(1.5)',
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
              backgroundColor: darkMode ? '#e5e7eb' : '#222',
              height: 6,
            },
          }}
          value={hourOffset}
          min={-12 * sliderRange}
          max={12 * sliderRange}
          step={sliderInterval}
          startPoint={0}
          onChange={(value) => setHourOffset(value as number)}
        />
        <div tw="flex justify-between p-3">
          <Dropdown
            label={
              <>
                <FaGlobe tw="text-[#222] dark:text-gray-300" />{' '}
                {sectorName || 'Choose region...'}
              </>
            }
            anchor="top"
            tw="flex-1"
          >
            {mesoSectors.map(([number, name], i) => (
              <div
                key={i}
                onClick={() => {
                  setSectorQueryParam(String(number));
                  if (number !== continentalMesoSector) {
                    setToggleSector(number);
                  }
                }}
              >
                {name}
              </div>
            ))}
          </Dropdown>
          <ButtonGroup>
            {!!navigator.share && (
              <Button
                onClick={() =>
                  navigator.share({
                    title:
                      views.map((view) => parseView(view).name).join(', ') ||
                      'Mesoanalysis',
                    url: window.location.href,
                  })
                }
              >
                <FaShareAlt />
              </Button>
            )}
            <Button
              onClick={() =>
                setModal(modal !== 'settings' ? 'settings' : undefined)
              }
            >
              <FaGear />
            </Button>
          </ButtonGroup>
        </div>
      </div>
    </div>
  );
}
