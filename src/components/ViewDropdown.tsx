import { ReactNode, useMemo } from 'react';
import { mesoParams } from '../utils/mesoanalysis';
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
    // Build menu structure
    const menuItems: MultiStepItem[] = [
      {
        label: 'Sounding',
        onClick: () => onSelect('sounding'),
      },
      {
        label: 'Surface Analysis',
        onClick: () => onSelect('surface'),
      },
      {
        label: 'Pivotal Weather',
        submenu: pivotalModels.map((model) => ({
          label: model.name,
          submenu: pivotalParams.map(([paramKey, paramTitle]) => ({
            label: paramTitle,
            onClick: () => onSelect(`pivotal-${model.id}-${paramKey}`),
          })),
        })),
      },
      {
        label: 'SPC Mesoanalysis',
        submenu: mesoParams.map(([paramKey, paramTitle]) => ({
          label: paramTitle,
          onClick: () => onSelect(`spc-${paramKey}`),
        })),
      },
    ];

    // Determine initial path based on current view
    let path: number[] = [];

    if (view?.source.key === 'pivotal' && view.param) {
      // Parse pivotal param to get model and param
      const parts = view.param.split('-', 2);
      if (parts.length === 2) {
        const [modelId, paramId] = parts;
        const modelIndex = pivotalModels.findIndex((m) => m.id === modelId);
        const paramIndex = pivotalParams.findIndex(([key]) => key === paramId);

        if (modelIndex !== -1) {
          if (paramIndex !== -1) {
            // Start in the specific model's param list
            path = [2, modelIndex];
          } else {
            // Start in Pivotal Weather submenu
            path = [2];
          }
        }
      }
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
