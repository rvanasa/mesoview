import { ChangeEvent, useCallback, useState } from 'react';

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> {
  defaultValue: number;
  onChangeValue(value: number): void;
}

export default function NumberInput({
  defaultValue,
  onChangeValue,
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
    <input
      type="number"
      value={input}
      onChange={handleChange}
      tw="p-1 rounded border text-center"
      {...rest}
    />
  );
}
