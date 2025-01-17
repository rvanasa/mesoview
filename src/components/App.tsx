import Slider from 'rc-slider';
import { useCallback, useEffect, useState } from 'react';
import {
  FaAngleLeft,
  FaAngleRight,
  FaLayerGroup,
  FaRegCalendarAlt,
  FaShareAlt,
  FaTimes,
} from 'react-icons/fa';
import { FaGear, FaTurnUp } from 'react-icons/fa6';
import 'twin.macro';
import useListener from '../hooks/useListener';
import { useQueryParam, useQueryParams } from '../hooks/useQueryParam';
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
import spliced from '../utils/spliced';
import { Button } from './Button';
import { ButtonGroup } from './ButtonGroup';
import Calendar from './Calendar';
import Card from './Card';
import MesoanalysisImage from './MesoanalysisImage';
import NumberInput from './NumberInput';
import { ToolButton } from './ToolButton';
import Dropdown from './Dropdown';

export default function App() {
  const [params, setParams] = useQueryParams('param', ['500mb', '3cvr']);
  const [sectorString, setSectorString] = useQueryParam('sector');
  const [hourOffset, setHourOffset] = useState(0);
  const [inputDateString, setInputDateString] = useQueryParam('time');
  const [modal, setModal] = useState<'calendar' | 'settings'>();
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
      {!!modal && (
        <div
          tw="flex justify-center items-center bg-[#0005] absolute top-0 bottom-0 left-0 right-0 z-10"
          onClick={() => setModal(undefined)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            {modal === 'calendar' ? (
              <Card tw="text-lg flex flex-col gap-4 w-full">
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
                                  3600000 * 12 -
                                  60000 * date.getTimezoneOffset(),
                              ),
                            )
                        : undefined,
                    );
                    setModal(undefined);
                  }}
                />
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
              <Card tw="text-lg flex flex-col gap-4 w-full [min-width:350px]">
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
                <Button type="primary" onClick={() => setModal(undefined)}>
                  Done
                </Button>
              </Card>
            ) : null}
          </div>
        </div>
      )}
      {params.map((param, i) => (
        <div key={i}>
          <div tw="flex justify-between p-2">
            <div>
              <Dropdown
                label={mesoParamMap.get(param) || param || 'Choose parameter'}
                anchor="bottom"
              >
                {/* <div style={{ maxHeight: "70vh" }} tw="overflow-y-scroll"> */}
                {mesoParams.map(([key, title], j) => (
                  <div
                    key={j}
                    onClick={() => setParams(spliced(params, i, 1, key))}
                  >
                    {title}
                  </div>
                ))}
                {/* </div> */}
              </Dropdown>
            </div>
            <div tw="flex space-x-2">
              {param.includes(' ') && (
                <ToolButton
                  onClick={() =>
                    setParams(spliced(params, i, 1, ...param.split(' ')))
                  }
                >
                  <FaLayerGroup />
                </ToolButton>
              )}
              {i > 0 && (
                <ToolButton
                  onClick={() =>
                    setParams(
                      spliced(
                        params,
                        i - 1,
                        2,
                        `${params[i - 1]} ${params[i]}`,
                      ),
                    )
                  }
                >
                  <FaTurnUp />
                </ToolButton>
              )}
              {params.length > 1 && (
                <ToolButton onClick={() => setParams(spliced(params, i, 1))}>
                  <FaTimes tw="text-red-700" />
                </ToolButton>
              )}
            </div>
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
        <Dropdown label="Add parameter" anchor="top">
          {mesoParams.map(([key, title], i) => (
            <div key={i} onClick={() => setParams([...params, key])}>
              {title}
            </div>
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
              onClick={() =>
                setModal(modal !== 'calendar' ? 'calendar' : undefined)
              }
            >
              <FaRegCalendarAlt />
            </Button>
            <code tw="font-bold flex-1 text-left text-lg select-none">
              {formatDate(date)}
              {nowOffset >= -12 && (
                <span tw="ml-3 opacity-70 text-green-700">
                  {nowOffset > 0 && '+'}
                  {nowOffset === 0 ? 'Now' : `${nowOffset}h`}
                </span>
              )}
            </code>
            <ButtonGroup>
              <Button onClick={() => setInputDate(plusHours(inputDate, -1))}>
                <FaAngleLeft />
              </Button>
              <Button onClick={() => setInputDate(plusHours(inputDate, 1))}>
                <FaAngleRight />
              </Button>
            </ButtonGroup>
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
        <div tw="flex justify-between p-3">
          <Dropdown
            label={sectorName || 'Choose region...'}
            anchor="top"
            tw="flex-1"
          >
            {mesoSectors.map(([number, name], i) => (
              <div key={i} onClick={() => setSectorString(String(number))}>
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
