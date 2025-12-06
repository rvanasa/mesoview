export function proxy(url: string): string {
  return `https://u7wxi2nd1e.execute-api.us-west-2.amazonaws.com/production/?url=${encodeURIComponent(url)}`;
}
