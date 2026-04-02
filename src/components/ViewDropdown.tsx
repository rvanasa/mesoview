import { ReactNode, useMemo } from 'react';
import { spcMesoanalysisParams } from '../utils/mesoanalysis';
import { pivotalModels, pivotalParams, pivotalParamCategories } from '../utils/pivotal';
import { ParsedView, formatFavoriteLabel } from '../utils/source';
import MultiStepDropdown, { MultiStepItem } from './MultiStepDropdown';
import { useFavorites } from '../contexts/FavoritesContext';
import {
  FaLayerGroup,
  FaMap,
  FaCloud,
  FaBolt,
  FaStar,
} from 'react-icons/fa';

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
  const { favorites } = useFavorites();

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
        id: 'spc',
        label: 'SPC Mesoanalysis',
        icon: <FaLayerGroup />,
        submenu: spcMesoanalysisParams.map(([category, params]) => ({
          label: category,
          submenu: params.map(([paramKey, paramTitle]) => ({
            label: paramTitle,
            onClick: () => onSelect(`spc-${paramKey}`),
          })),
        })),
      },
      {
        id: 'surface',
        label: 'Surface Analysis',
        icon: <FaMap />,
        onClick: () => onSelect('surface'),
      },
      {
        id: 'sounding',
        label: 'Sounding',
        icon: <FaCloud />,
        onClick: () => onSelect('sounding'),
      },
      {
        id: 'pivotal',
        label: 'Pivotal Weather',
        icon: <FaBolt />,
        submenu: pivotalModels.map((model) => ({
          label: model.name,
          submenu: pivotalParamCategories.map(([category, params]) => ({
            label: category,
            submenu: params.map(([paramKey, paramTitle]) => ({
              label: paramTitle,
              onClick: () => onSelect(`pivotal-${model.id}-${paramKey}`),
            })),
          })),
        })),
      },
    ];

    if (favorites && favorites.length > 0) {
      const uniqueFavs = Array.from(new Set(favorites));
      menuItems.push({ label: 'Favorites', isHeader: true });
      for (const fav of uniqueFavs) {
        menuItems.push({
          id: `fav-${fav}`,
          label: formatFavoriteLabel(fav),
          icon: <FaStar />,
          onClick: () => onSelect(fav),
        });
      }
    }

    let path: number[] = [];

    // if (view?.source.key === 'pivotal') {
    //   const idx = menuItems.findIndex((it) => it.id === 'pivotal');
    //   path = idx >= 0 ? [idx] : [];
    // } else if (view?.source.key === 'spc') {
    //   const idx = menuItems.findIndex((it) => it.id === 'spc');
    //   path = idx >= 0 ? [idx] : [];
    // }

    return { items: menuItems, initialPath: path };
  }, [view, onSelect, favorites]);

  return (
    <MultiStepDropdown
      label={label}
      anchor={anchor}
      items={items}
      initialPath={initialPath}
    />
  );
}
