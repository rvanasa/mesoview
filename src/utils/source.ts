import { mesoParamMap } from './mesoanalysis';
import { pivotalModelMap } from './pivotal';

export type SourceKey = 'unknown' | 'spc' | 'sounding' | 'surface' | 'pivotal';
export interface Source {
  key: SourceKey;
  name: string;
  combinable: boolean;
}

export const sources: Source[] = [
  {
    key: 'spc',
    name: 'SPC Mesoanalysis',
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
