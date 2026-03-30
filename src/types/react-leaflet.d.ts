declare module 'react-leaflet' {
  import * as React from 'react';

  export const MapContainer: React.ComponentType<any>;
  export const TileLayer: React.ComponentType<any>;
  export const Popup: React.ComponentType<any>;
  export const CircleMarker: React.ComponentType<any>;
  export function useMapEvents(handlers: any): any;

  const _default: any;
  export default _default;
}
