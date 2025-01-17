import React from 'react';
import 'twin.macro';

export interface ParamDropdownProps {
  options: string[];
  onChange: (option: string) => void;
}

export default function ParamDropdown({
  options,
  onChange,
}: ParamDropdownProps) {
  return (
    <div tw="p-2 rounded-xl">
      <select onChange={(e) => onChange(e.target.value)} tw="rounded-md">
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
