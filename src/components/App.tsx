'use client';

import { Button, Card, Datepicker, Dropdown } from 'flowbite-react';
import Slider from 'rc-slider';
import { useCallback, useEffect, useState } from 'react';
import {
  FaAngleLeft,
  FaAngleRight,
  FaRegCalendarAlt,
  FaShareAlt,
  FaTimes,
} from 'react-icons/fa';
import { useQueryParam, useQueryParams } from '../hooks/useQueryParam';

import 'rc-slider/assets/index.css';
import { FaGear } from 'react-icons/fa6';
import 'twin.macro';
import useListener from '../hooks/useListener';
import spliced from '../utils/spliced';
import MesoanalysisImage from './MesoanalysisImage';
import { PrimaryButton } from './PrimaryButton';
import {
  formatDate,
  parseDate,
  plusHours,
  roundToNearestHour,
} from '../utils/date';
import {
  mesoParamMap,
  mesoParams,
  mesoSectorMap,
  mesoSectors,
} from '../utils/mesoanalysis';
import NumberInput from './NumberInput';

export default function App() {
  const [params, setParams] = useQueryParams('param', ['500mb']);
  const [sectorString, setSectorString] = useQueryParam('sector');
  const [hourOffset, setHourOffset] = useState(0);
  const [inputDateString, setInputDateString] = useQueryParam('time');
  const [menu, setMenu] = useState<'calendar' | 'settings'>();
  const [sliderRange, setSliderRange] = useState(1);
  const [sliderInterval, setSliderInterval] = useState(1);

  const sectorNumber =
    sectorString === undefined || isNaN(+sectorString) ? 19 : +sectorString;

  const inputDate = inputDateString
    ? parseDate(inputDateString, 12)
    : roundToNearestHour(new Date());
  const setInputDate = useCallback(
    (date: Date | undefined) => {
      setInputDateString(date && formatDate(date));
    },
    [setInputDateString],
  );

  useListener(document, 'keydown', (event: KeyboardEvent) => {
    const hours = event.ctrlKey ? 6 : 1;
    if (event.key === 'ArrowLeft') {
      setInputDate(plusHours(inputDate, -hours));
    } else if (event.key === 'ArrowRight') {
      setInputDate(plusHours(inputDate, hours));
    }
  });

  const date = new Date(inputDate.getTime() + 3600000 * hourOffset);

  const nowOffset = Math.round((date.getTime() - Date.now()) / 3600000);

  const sector = `s${sectorNumber}`;
  const sectorName = mesoSectorMap.get(sectorNumber) || '(Unknown region)';

  useEffect(() => {
    document.title = `${inputDateString ? (inputDateString.toLowerCase().endsWith('z') ? inputDateString : `${inputDateString}z`) : 'Current time'} | ${sectorName} | Mesoview`;
  }, [inputDateString, sectorName]);

  return (
    <div style={{ maxWidth: 1000 }} tw="mx-auto">
      {params.map((param, i) => (
        <div key={i}>
          <div tw="flex justify-between p-2">
            <div>
              <Dropdown
                label={mesoParamMap.get(param) || param || 'Choose parameter'}
                inline
              >
                {/* <div style={{ maxHeight: "70vh" }} tw="overflow-y-scroll"> */}
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
            {params.length > 1 && (
              <Button
                color="gray"
                size="xs"
                tw="px-0 py-1 text-red-700"
                onClick={() => setParams(spliced(params, i, 1))}
              >
                <FaTimes style={{ fontSize: 11 }} />
              </Button>
            )}
          </div>
          <MesoanalysisImage
            date={date}
            sector={sector}
            layers={['cnty', 'hiway']}
            params={param.split(' ').filter((param) => param)}
          />
        </div>
      ))}
      <div tw="p-3 flex justify-between">
        <Dropdown label="Add parameter" inline>
          {mesoParams.map(([key, title], i) => (
            <Dropdown.Item key={i} onClick={() => setParams([...params, key])}>
              {title}
            </Dropdown.Item>
          ))}
        </Dropdown>
      </div>
      <div style={{ paddingBottom: 130 }}></div>
      <div
        tw="fixed bottom-0 rounded-t-lg w-full bg-white"
        style={{ maxWidth: 1000 }}
      >
        <div tw="p-3">
          <div tw="flex items-center justify-between gap-x-3">
            <Button
              color="gray"
              onClick={() =>
                setMenu(menu !== 'calendar' ? 'calendar' : undefined)
              }
            >
              <FaRegCalendarAlt />
            </Button>
            <code tw="font-bold flex-1 text-left text-lg">
              {formatDate(date)}
              {nowOffset >= -12 && (
                <span tw="ml-3 opacity-70 text-green-700">
                  {nowOffset > 0 && '+'}
                  {nowOffset === 0 ? 'Now' : `${nowOffset}h`}
                </span>
              )}
            </code>
            <Button.Group>
              <Button
                color="gray"
                onClick={() => setInputDate(plusHours(inputDate, -1))}
              >
                <FaAngleLeft />
              </Button>
              <Button
                color="gray"
                onClick={() => setInputDate(plusHours(inputDate, 1))}
              >
                <FaAngleRight />
              </Button>
            </Button.Group>
          </div>
        </div>
        <Slider
          tw="flex-1"
          styles={{
            handle: {
              borderColor: '#222',
              boxShadow: 'none',
              // transform: 'scale(1.5)',
              width: 20,
              height: 20,
              borderWidth: 3,
              top: 3,
            },
            rail: {
              height: 6,
            },
            track: {
              backgroundColor: '#222',
              height: 6,
            },
          }}
          value={hourOffset}
          min={-12 * sliderRange}
          max={12 * sliderRange}
          step={sliderInterval}
          startPoint={0}
          onChange={(value) => setHourOffset(value as number)}
          onChangeComplete={() => setHourOffset(0)}
        />
        {menu === 'calendar' ? (
          <Datepicker
            value={inputDate.toDateString()}
            style={{ maxWidth: 180 }}
            showTodayButton={false}
            labelClearButton="Reset"
            inline
            onSelectedDateChanged={(date) => {
              setInputDate(
                Math.abs(date.getTime() - Date.now()) < 1000
                  ? undefined
                  : roundToNearestHour(
                      new Date(
                        date.getTime() +
                          3600000 * 12 -
                          60000 * date.getTimezoneOffset(),
                      ),
                    ),
              );
              setMenu(undefined);
            }}
          />
        ) : menu === 'settings' ? (
          <Card tw="text-lg">
            <label tw="flex items-center justify-between">
              <span>Slider range (days):</span>
              <NumberInput
                min={1}
                step={1}
                defaultValue={sliderRange}
                tw="ml-2 w-20"
                onChangeValue={setSliderRange}
              />
            </label>
            <label tw="flex items-center justify-between">
              <span>Slider interval (hours):</span>
              <NumberInput
                min={1}
                step={1}
                defaultValue={sliderInterval}
                tw="ml-2 w-20"
                onChangeValue={setSliderInterval}
              />
            </label>
            <PrimaryButton onClick={() => setMenu(undefined)}>
              Done
            </PrimaryButton>
          </Card>
        ) : (
          <div tw="flex justify-between p-3">
            <Dropdown
              tw="flex-1"
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
            <Button.Group>
              {!!navigator.share && (
                <Button
                  color="gray"
                  // tw="text-blue-700"
                  onClick={() =>
                    navigator.share({
                      title:
                        params
                          .map((param) => mesoParamMap.get(param))
                          .join(', ') || 'Mesoanalysis',
                      url: window.location.href,
                    })
                  }
                >
                  <FaShareAlt />
                </Button>
              )}
              <Button
                color="gray"
                onClick={() =>
                  setMenu(menu !== 'settings' ? 'settings' : undefined)
                }
              >
                <FaGear />
              </Button>
            </Button.Group>
          </div>
        )}
      </div>
    </div>
  );
}
