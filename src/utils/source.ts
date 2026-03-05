import { mesoParamMap } from './mesoanalysis';

export type SourceKey = 'unknown' | 'spc' | 'sounding' | 'surface';
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
  return;
}

export function isSameSource(view1: string, view2: string): boolean {
  return parseView(view1).source.key === parseView(view2).source.key;
}

export function canCombine(view1: string, view2: string): boolean {
  return isSameSource(view1, view2) && parseView(view1).source.combinable;
}
