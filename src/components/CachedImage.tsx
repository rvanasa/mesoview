import { useEffect, useState } from 'react';
import { isProxyUrl, proxyImage } from '../utils/proxy';

const imageCache = new Map<string, string>();
const imageLoadingCache = new Map<string, Promise<string>>();

setInterval(
  () => {
    imageCache.clear();
    imageLoadingCache.clear();
  },
  1000 * 60 * 30,
);

export interface CachedImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export default function CachedImage({ src, alt, ...rest }: CachedImageProps) {
  const [data, setData] = useState<string | undefined>();
  useEffect(() => {
    const data = imageCache.get(src);
    if (data) {
      setData(data);
      return;
    }
    const promise = imageLoadingCache.get(src);
    if (promise) {
      promise.then((data) => setData(data));
      return;
    }
    const loadingPromise = new Promise<string>((resolve, reject) => {
      const attemptFetch = async (
        url: string,
        isRetry = false,
      ): Promise<void> => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            if (
              (response.status === 403 || response.status === 0) &&
              !isRetry &&
              !isProxyUrl(url)
            ) {
              console.warn(`HTTP ${response.status} ${url}`);
              return attemptFetch(proxyImage(url), true);
            }
            throw new Error(`HTTP ${response.status} ${url}`);
          }
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
              resolve(result);
            } else {
              reject(new Error('Unexpected result from FileReader'));
            }
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(blob);
        } catch (err) {
          if (!isRetry && !isProxyUrl(url)) {
            console.warn(err);
            return attemptFetch(proxyImage(url), true);
          }
          reject(err);
        }
      };

      attemptFetch(src);
    });
    imageLoadingCache.set(src, loadingPromise);
    let cancelled = false;
    loadingPromise
      .then((data) => {
        imageCache.set(src, data);
        imageLoadingCache.delete(src);
        if (!cancelled) {
          setData(data);
        }
      })
      .catch((err) => {
        console.error(err);
        imageLoadingCache.delete(src);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return <img src={data ?? ''} alt={alt} {...rest} />;
}
