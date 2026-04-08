import { useLocalStorage } from 'usehooks-ts';

export default function useDevMode(): [boolean, (value: boolean) => void] {
  const [isDevMode, setDevMode] = useLocalStorage('mesoview.devMode', false);

  return [isDevMode, setDevMode];
}
