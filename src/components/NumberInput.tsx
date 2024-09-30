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
    (e: ChangeEvent<HTMLInputElement>) => {
      const newInput = e.target.value;
      setInput(newInput);
      onChangeValue(+newInput);
    },
    [onChangeValue],
  );

  return (
    <input type="number" value={input} onChange={handleChange} {...rest} />
  );
}
