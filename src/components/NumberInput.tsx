import { ChangeEvent, useCallback, useState } from 'react';
import { FaMinus, FaPlus } from 'react-icons/fa';
import 'twin.macro';
import { ToolButton } from './ToolButton';
import React from 'react';

export interface NumberInputProps
  extends React.InputHTMLAttributes<HTMLDivElement> {
  defaultValue: number;
  onChangeValue(value: number): void;
  min?: number;
  max?: number;
  step?: number;
}

export default function NumberInput({
  defaultValue,
  onChangeValue,
  min,
  max,
  step,
  ...rest
}: NumberInputProps) {
  const [input, setInput] = useState(() => String(defaultValue));

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const newInput = event.target.value;
      setInput(newInput);
      onChangeValue(+newInput);
    },
    [onChangeValue],
  );

  return (
    <div tw="flex text-sm" {...rest}>
      {step !== undefined && (
        <ToolButton tw="p-2 rounded-r-none">
          <FaMinus
            onClick={() =>
              setInput(
                String(
                  min !== undefined
                    ? Math.max(+input - step, min)
                    : +input - step,
                ),
              )
            }
          />
        </ToolButton>
      )}
      <input
        tw="w-10 p-1 rounded-none border text-center"
        type="number"
        min={min}
        max={max}
        step={step}
        value={input}
        onChange={handleChange}
      />
      {step !== undefined && (
        <ToolButton tw="p-2 rounded-l-none">
          <FaPlus
            onClick={() =>
              setInput(
                String(
                  max !== undefined
                    ? Math.min(+input + step, max)
                    : +input + step,
                ),
              )
            }
          />
        </ToolButton>
      )}
    </div>
  );
}
