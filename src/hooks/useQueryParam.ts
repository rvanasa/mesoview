import { useSearchParams } from 'react-router-dom';

export function useQueryParam(
  key: string,
  defaultValue?: string | undefined,
): [string | undefined, (value: string | undefined) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  return [
    searchParams.get(key) ?? defaultValue,
    (value) => {
      setSearchParams({ ...searchParams, [key]: value });
      // const params = new URLSearchParams(searchParams.toString());
      // if (value === null || value === undefined) {
      //   params.delete(key);
      // } else {
      //   params.set(key, value);
      // }
      // window.history.replaceState(
      //   {},
      //   '',
      //   window.location.pathname + '?' + params.toString(),
      // );
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
      setSearchParams({ ...searchParams, [key]: values });
      // const params = new URLSearchParams(searchParams.toString());
      // params.delete(key);
      // values.forEach((value) => params.append(key, value));
      // window.history.replaceState(
      //   {},
      //   '',
      //   window.location.pathname + '?' + params.toString(),
      // );
    },
  ];
}
