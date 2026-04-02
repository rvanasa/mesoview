import { ReactNode, useMemo } from 'react';
import { FaBolt, FaCloud, FaLayerGroup, FaMap, FaStar } from 'react-icons/fa';
import { useFavorites } from '../contexts/FavoritesContext';
import { spcMesoanalysisParams } from '../utils/mesoanalysis';
import { pivotalModels } from '../utils/pivotal';
import { ParsedView, formatFavoriteLabel } from '../utils/source';
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
  const { favorites } = useFavorites();

  const { items, initialPath } = useMemo(() => {
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
        id: 'pivotal',
        label: 'Pivotal Weather',
        icon: <FaBolt />,
        submenu: pivotalModels.map((model) => ({
          label: model.name,
          onClick: () => onSelect(`pivotal-${model.id}-sbcape_hodo`),
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
