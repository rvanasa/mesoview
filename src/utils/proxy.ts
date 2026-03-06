const BASE_URL =
  'https://cxe1rzn9w7.execute-api.us-west-2.amazonaws.com/production';

export function isProxyUrl(url: string): boolean {
  return url.startsWith(`${BASE_URL}/`);
}

export function proxy(
  url: string,
  { headers }: { headers?: Record<string, string> } = {},
): string {
  return `${BASE_URL}/?url=${encodeURIComponent(url)}${headers ? `&headers=${encodeURIComponent(JSON.stringify(headers))}` : ''}`;
}

export function proxyImage(url: string): string {
  return `${BASE_URL}/image?url=${encodeURIComponent(url)}`;
}

/**
 * Make an HTTP request and throw on non-OK responses
 */
export async function httpRequest(
  ...args: Parameters<typeof fetch>
): Promise<Response> {
  const response = await fetch(...args);
  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}${
        response.statusText ? ` ${response.statusText}` : ''
      }`,
    );
  }
  return response;
}

/**
 * Load and parse an HTML document from a URL
 */
export async function loadDocument(
  ...args: Parameters<typeof httpRequest>
): Promise<Document> {
  const response = await httpRequest(...args);
  const html = await response.text();
  return new DOMParser().parseFromString(html, 'text/html');
}
