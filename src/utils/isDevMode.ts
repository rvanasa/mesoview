const localStorageKey = 'mesoview.devMode';

let _isDevMode = localStorage.getItem(localStorageKey) === 'true';
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('dev')) {
  const devValue = urlParams.get('dev');
  if (devValue === 'false') {
    localStorage.removeItem(localStorageKey);
  } else {
    localStorage.setItem(localStorageKey, 'true');
    _isDevMode = true;
  }

  urlParams.delete('dev');
  const newSearch = urlParams.toString();
  const newUrl =
    window.location.pathname +
    (newSearch ? '?' + newSearch : '') +
    window.location.hash;
  window.history.replaceState({}, '', newUrl);
}

export const isDevMode = _isDevMode;
