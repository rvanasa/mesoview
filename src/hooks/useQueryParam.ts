import { useSearchParams } from 'react-router-dom';

export function useQueryParam(
  key: string,
  defaultValue?: string | undefined,
): [string | undefined, (value: string | undefined) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  return [
    searchParams.get(key) ?? defaultValue,
    (value) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === undefined) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      setSearchParams(params);
    },
  ];
}

export function useQueryParams(
  key: string,
  defaultValues?: string[],
): [string[], (values: string[]) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  return [
    searchParams.has(key) || defaultValues === undefined
      ? searchParams.getAll(key)
      : defaultValues,
    (values) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      values.forEach((value) => params.append(key, value));
      setSearchParams(params);
    },
  ];
}
