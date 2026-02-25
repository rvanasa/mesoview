const BASE_URL =
  'https://cxe1rzn9w7.execute-api.us-west-2.amazonaws.com/production';

export function isProxyUrl(url: string): boolean {
  return url.startsWith(`${BASE_URL}/`);
}

export function proxy(url: string): string {
  return `${BASE_URL}/?url=${encodeURIComponent(url)}`;
}

export function proxyImage(url: string): string {
  return `${BASE_URL}/image?url=${encodeURIComponent(url)}`;
}
