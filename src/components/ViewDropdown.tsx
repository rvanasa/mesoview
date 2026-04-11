import { ReactNode, useCallback, useMemo } from 'react';
import { FaBolt, FaCloud, FaLayerGroup, FaMap, FaStar } from 'react-icons/fa';
import { useFavorites } from '../contexts/FavoritesContext';
import useDevMode from '../hooks/useDevMode';
import { spcMesoanalysisParams } from '../utils/mesoanalysis';
import { isParamAvailableForModel, pivotalModels } from '../utils/pivotal';
import { ParsedView, formatFavoriteLabel } from '../utils/source';
import MesoParamSearch from './MesoParamSearch';
import MultiStepDropdown, { MultiStepItem } from './MultiStepDropdown';
import { trackEvent } from '../utils/analytics';

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
  onSelect: onSelect_,
}: ViewDropdownProps) {
  const { favorites } = useFavorites();
  const isDevMode = useDevMode();

  const onSelect = useCallback(
    (paramKey: string) => {
      trackEvent('param_selected', { key: paramKey });
      onSelect_(paramKey);
    },
    [onSelect_],
  );

  const { items, initialPath } = useMemo(() => {
    // Extract current parameter if viewing a Pivotal Weather model
    let currentPivotalParam = 'sbcape_hodo';
    if (view?.source.key === 'pivotal' && view?.param) {
      // Parse the param format: "model-param" or "model-param model2-param2"
      const match = view.param.match(/^[^-]+-(.+?)(?:\s|$)/);
      if (match) {
        currentPivotalParam = match[1];
      }
    }

    const menuItems: MultiStepItem[] = [
      {
        id: 'spc',
        label: 'Mesoanalysis',
        icon: <FaLayerGroup />,
        submenu: spcMesoanalysisParams.map(([category, params]) => ({
          label: category,
          submenu: params.map(([paramKey, paramTitle]) => ({
            label: paramTitle,
            onClick: () => onSelect(`spc-${paramKey}`),
          })),
        })),
      },
      ...(isDevMode
        ? [
            {
              id: 'pivotal',
              label: 'Pivotal Weather',
              icon: <FaBolt />,
              submenu: pivotalModels.map((model) => {
                // Use current parameter if it exists in the new model, otherwise default
                const paramToUse = isParamAvailableForModel(
                  model.id,
                  currentPivotalParam,
                )
                  ? currentPivotalParam
                  : 'sbcape_hodo';
                return {
                  label: model.name,
                  onClick: () => onSelect(`pivotal-${model.id}-${paramToUse}`),
                };
              }),
            },
          ]
        : []),
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
  }, [view, onSelect, favorites, isDevMode]);

  return (
    <MultiStepDropdown
      label={label}
      anchor={anchor}
      items={items}
      initialPath={initialPath}
      searchComponent={(close) => (
        <MesoParamSearch
          onSelect={(paramKey) => onSelect(`spc-${paramKey}`)}
          onClose={close}
        />
      )}
      searchAtPath={[0]}
    />
  );
}
