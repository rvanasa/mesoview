declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js',
      targetId: string,
      params?: any,
    ) => void;
  }
}

/**
 * Send an event to Google Analytics
 * @param eventName - The name of the event
 * @param eventParams - Additional parameters for the event
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, any>,
) {
  try {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, eventParams);
    }
  } catch (err) {
    console.error(`Error during '${eventName}' event:`, err);
  }
}
