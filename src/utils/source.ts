import { mesoParamMap } from './mesoanalysis';
import { pivotalModelMap, pivotalParamMap } from './pivotal';

export type SourceKey = 'unknown' | 'spc' | 'sounding' | 'surface' | 'pivotal';
export interface Source {
  key: SourceKey;
  name: string;
  combinable: boolean;
}

export const sources: Source[] = [
  {
    key: 'spc',
    name: 'Mesoanalysis',
    combinable: true,
  },
  {
    key: 'pivotal',
    name: 'Pivotal Weather',
    combinable: true,
  },
  {
    key: 'sounding',
    name: 'Sounding',
    combinable: false,
  },
  {
    key: 'surface',
    name: 'Surface Analysis',
    combinable: false,
  },
];
export const unknownSource: Source = {
  key: 'unknown',
  name: 'Unknown',
  combinable: false,
};

export const sourceMap = new Map(sources.map((source) => [source.key, source]));

export interface ParsedView {
  source: Source;
  param: string | undefined;
  name: string;
}

export function parseView(view: string): ParsedView {
  const splitIndex = view.indexOf('-');
  if (splitIndex !== -1) {
    const sourceKey = view.substring(0, splitIndex) as SourceKey;
    const param = view.substring(splitIndex + 1);
    const source = sourceMap.get(sourceKey) || unknownSource;
    return {
      source,
      param,
      name: resolveParamName(sourceKey, param) || view,
    };
  }
  const source = sourceMap.get(view as SourceKey) || unknownSource;
  return {
    source: source,
    param: undefined,
    name: source.name,
  };
}

/**
 * Produce a friendly label for a favorite view without changing dropdown labels.
 * Examples:
 * - pivotal-rrfs_a-refcmp_uh001h -> "RRFS · Reflectivity"
 * - sounding-rap-kcef -> "Sounding · RAP · KCEF"
 */
export function formatFavoriteLabel(view: string): string {
  const parsed = parseView(view);
  const { source, param } = parsed;

  if (!param) return parsed.name || view;

  if (source.key === 'pivotal') {
    const parts = param.split(' ').filter((p) => p);
    const labels = parts.map((part) => {
      const [model, p] = part.split('-', 2);
      const modelName = pivotalModelMap.get(model) || model.toUpperCase();
      const paramName = p ? pivotalParamMap.get(p) || p : '';
      return paramName ? `${modelName} · ${paramName}` : modelName;
    });
    return labels.join(' + ');
  }

  if (source.key === 'sounding') {
    const match = param.match(/^([^-]+)-(.+)$/);
    const model = match ? match[1] : param.split('-', 1)[0];
    const station = match ? match[2] : undefined;
    const modelLabel = model ? model.toUpperCase() : '';
    if (station)
      return `${source.name} · ${modelLabel} · ${station.toUpperCase()}`;
    if (model) return `${source.name} · ${modelLabel}`;
    return source.name;
  }

  // Default: fall back to existing parseView name (which resolves meso params)
  return parsed.name || view;
}

function resolveParamName(
  sourceKey: SourceKey,
  param: string,
): string | undefined {
  if (sourceKey === 'spc') {
    return param ? mesoParamMap.get(param) || param : undefined;
  }
  if (sourceKey === 'pivotal') {
    const parts = param.split('-', 2); // TODO: escape dashes in param parts?
    if (parts.length === 2) {
      const [model] = parts;
      const modelName = pivotalModelMap.get(model);
      if (modelName) {
        return modelName;
      }
    }
    return param;
  }
  return;
}

export function isSameSource(view1: string, view2: string): boolean {
  return parseView(view1).source.key === parseView(view2).source.key;
}

export function canCombine(view1: string, view2: string): boolean {
  return isSameSource(view1, view2) && parseView(view1).source.combinable;
}
