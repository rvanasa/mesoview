import { ReactNode } from 'react';
import { mesoParams } from '../utils/mesoanalysis';
import { pivotalModels, pivotalParams } from '../utils/pivotal';
import { ParsedView } from '../utils/source';
import Dropdown from './Dropdown';

export interface ViewDropdownProps {
  view?: ParsedView;
  label: ReactNode;
  anchor: 'top' | 'bottom';
  onSelect: (view: string) => void;
}

export default function ViewDropdown({
  view,
  label,
  anchor,
  onSelect,
}: ViewDropdownProps) {
  return (
    <Dropdown label={label} anchor={anchor}>
      {[
        ['sounding', 'Sounding'],
        ['surface', 'Surface Analysis'],
        ...pivotalModels.map((model) => [
          'pivotal-' +
            model.id +
            '-' +
            ((view?.source.key === 'pivotal' &&
              view.param &&
              view.param.split('-', 2)[1]) ||
              pivotalParams[0][0]),
          model.name,
        ]),
        ...mesoParams.map(([key, title]) => [`spc-${key}`, title]),
      ].map(([key, title], i) => (
        <div
          key={i}
          onClick={key ? () => onSelect(key) : undefined}
          style={
            !key
              ? {
                  fontWeight: 'bold',
                  cursor: 'default',
                  paddingTop: '8px',
                  borderTop: '1px solid #ccc',
                }
              : undefined
          }
        >
          {title}
        </div>
      ))}
    </Dropdown>
  );
}
