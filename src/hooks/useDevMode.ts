import { useLocalStorage } from 'usehooks-ts';

const localStorageKey = 'mesoview.devMode';
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('dev')) {
  const devValue = urlParams.get('dev');
  if (devValue === 'false') {
    localStorage.removeItem(localStorageKey);
  } else {
    localStorage.setItem(localStorageKey, 'true');
  }

  urlParams.delete('dev');
  const newSearch = urlParams.toString();
  const newUrl =
    window.location.pathname +
    (newSearch ? '?' + newSearch : '') +
    window.location.hash;
  window.history.replaceState({}, '', newUrl);
}

export default function useDevMode(): boolean {
  return useLocalStorage(localStorageKey, false)[0];
}
