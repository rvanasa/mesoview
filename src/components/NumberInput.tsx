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

  const update = (newInput: number) => {
    setInput(String(newInput));
    onChangeValue(newInput);
  };

  return (
    <div tw="flex text-sm" {...rest}>
      {step !== undefined && (
        <ToolButton
          tw="p-2 rounded-r-none sm:hidden"
          onClick={() =>
            update(
              min !== undefined ? Math.max(+input - step, min) : +input - step,
            )
          }
        >
          <FaMinus />
        </ToolButton>
      )}
      <input
        tw="w-10 p-1 rounded-none border text-center dark:bg-gray-700 dark:border-gray-600 sm:(rounded w-12)"
        type="number"
        min={min}
        max={max}
        step={step}
        value={input}
        onChange={handleChange}
      />
      {step !== undefined && (
        <ToolButton
          tw="p-2 rounded-l-none sm:hidden"
          onClick={() =>
            update(
              max !== undefined ? Math.min(+input + step, max) : +input + step,
            )
          }
        >
          <FaPlus />
        </ToolButton>
      )}
    </div>
  );
}
