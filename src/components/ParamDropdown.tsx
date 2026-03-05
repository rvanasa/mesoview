import { ReactNode } from 'react';
import { mesoParams } from '../utils/mesoanalysis';
import Dropdown from './Dropdown';

export interface ViewDropdownProps {
  label: ReactNode;
  anchor: 'top' | 'bottom';
  onSelect: (view: string) => void;
}

export default function ViewDropdown({
  label,
  anchor,
  onSelect,
}: ViewDropdownProps) {
  return (
    <Dropdown label={label} anchor={anchor}>
      {[
        ['sounding', 'Sounding'],
        ['surface', 'Surface Analysis'],
        ...mesoParams.map(([key, title]) => [`spc-${key}`, title]),
      ].map(([key, title], i) => (
        <div key={i} onClick={() => onSelect(key)}>
          {title}
        </div>
      ))}
    </Dropdown>
  );
}
