import { usePathname, useSearchParams, useRouter } from 'next/navigation';

export function useQueryParam(
  key: string,
  defaultValue?: string | undefined,
): [string | undefined, (value: string | undefined) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return [
    searchParams.get(key) ?? defaultValue,
    (value) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === undefined) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(pathname + '?' + params.toString());
    },
  ];
}

export function useQueryParams(
  key: string,
  defaultValues?: string[],
): [string[], (values: string[]) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return [
    searchParams.has(key) ? searchParams.getAll(key) : defaultValues,
    (values) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      values.forEach((value) => params.append(key, value));
      router.push(pathname + '?' + params.toString());
    },
  ];
}
