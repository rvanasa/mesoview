import { ReactNode, useMemo } from 'react';
import { mesoParamCategories } from '../utils/mesoanalysis';
import { pivotalModels, pivotalParams } from '../utils/pivotal';
import { ParsedView } from '../utils/source';
import MultiStepDropdown, { MultiStepItem } from './MultiStepDropdown';

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
  const { items, initialPath } = useMemo(() => {
    let currentParam = pivotalParams[0][0]; // Default to first param
    if (view?.source.key === 'pivotal' && view.param) {
      const parts = view.param.split('-', 2);
      if (parts.length === 2) {
        const paramId = parts[1];
        // Verify this is a valid parameter
        if (pivotalParams.some(([key]) => key === paramId)) {
          currentParam = paramId;
        }
      }
    }

    const menuItems: MultiStepItem[] = [
      {
        label: 'SPC Mesoanalysis',
        submenu: mesoParamCategories.map(([category, params]) => ({
          label: category,
          submenu: params.map(([paramKey, paramTitle]) => ({
            label: paramTitle,
            onClick: () => onSelect(`spc-${paramKey}`),
          })),
        })),
      },
      {
        label: 'Surface Analysis',
        onClick: () => onSelect('surface'),
      },
      {
        label: 'Sounding',
        onClick: () => onSelect('sounding'),
      },
      {
        label: 'Pivotal Weather',
        submenu: pivotalModels.map((model) => ({
          label: model.name,
          onClick: () => onSelect(`pivotal-${model.id}-${currentParam}`),
        })),
      },
    ];

    let path: number[] = [];

    if (view?.source.key === 'pivotal') {
      // Start in Pivotal Weather submenu (list of models)
      path = [2];
    } else if (view?.source.key === 'spc') {
      // Start in SPC Mesoanalysis submenu
      path = [3];
    }

    return { items: menuItems, initialPath: path };
  }, [view, onSelect]);

  return (
    <MultiStepDropdown
      label={label}
      anchor={anchor}
      items={items}
      initialPath={initialPath}
    />
  );
}
