import {
  MapContainer,
  TileLayer,
  Popup,
  CircleMarker,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState, Fragment } from 'react';
import { useSessionStorage } from 'usehooks-ts';
import { getSoundingStations } from '../utils/profile';

export interface Station {
  srcid: string;
  name: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
}

// Component to handle map events and store position
function MapEventHandler({
  onMapMove,
}: {
  onMapMove: (center: [number, number], zoom: number) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      onMapMove([center.lat, center.lng], map.getZoom());
    },
    zoomend: () => {
      const center = map.getCenter();
      onMapMove([center.lat, center.lng], map.getZoom());
    },
  });
  return null;
}

export default function StationMap({
  onSelectStation,
  darkMode,
}: {
  onSelectStation: (srcid: string) => void;
  darkMode?: boolean;
}) {
  const [stations, setStations] = useSessionStorage<Station[]>(
    'mesoview.stations.rap',
    [],
  );
  const [loading, setLoading] = useState(stations.length === 0);

  // Store map position per view in sessionStorage
  const [mapCenter, setMapCenter] = useSessionStorage<[number, number]>(
    'mesoview.map.sounding.center',
    [39, -98],
  );
  const [mapZoom, setMapZoom] = useSessionStorage<number>(
    'mesoview.map.sounding.zoom',
    4,
  );

  const handleMapMove = (center: [number, number], zoom: number) => {
    setMapCenter(center);
    setMapZoom(zoom);
  };

  useEffect(() => {
    if (stations.length > 0) {
      setLoading(false);
      return;
    }
    let mounted = true;
    getSoundingStations('rap')
      .then((rows) => {
        if (!mounted) return;
        const parsedStations: Station[] = rows
          .map((r) => ({
            srcid: (r.key || '').toUpperCase(),
            name: r.label || (r.key || '').toUpperCase(),
            state: '',
            country: '',
            lat: r.lat ?? 0,
            lon: r.lon ?? 0,
          }))
          .filter((s) => !isNaN(s.lat) && !isNaN(s.lon));
        setStations(parsedStations);
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [stations.length, setStations]);

  if (loading) return <div tw="p-8 text-center">Loading stations...</div>;

  return (
    <MapContainer
      center={mapCenter}
      zoom={mapZoom}
      style={{ height: 500, width: '100%', zIndex: 0 }}
      scrollWheelZoom={true}
      preferCanvas={true}
      attributionControl={false}
    >
      <MapEventHandler onMapMove={handleMapMove} />
      <TileLayer
        url={
          darkMode
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        }
      />
      {stations.map((station) => {
        const name = station.name || station.srcid;
        const radius = 5;
        const tapRadius = 15; // Larger invisible area for easier tapping
        return (
          <Fragment key={station.srcid}>
            {/* Invisible larger circle for easier tapping on mobile */}
            <CircleMarker
              center={[station.lat, station.lon]}
              radius={tapRadius}
              pathOptions={{
                fillOpacity: 0,
                opacity: 0,
                interactive: true,
              }}
              eventHandlers={{ click: () => onSelectStation(station.srcid) }}
            />
            {/* Visible marker */}
            <CircleMarker
              center={[station.lat, station.lon]}
              radius={radius}
              pathOptions={{
                color: darkMode ? '#93c5fd' : '#1d4ed8',
                fillColor: darkMode ? '#60a5fa' : '#3b82f6',
                weight: 1,
                fillOpacity: 0.9,
              }}
              eventHandlers={{ click: () => onSelectStation(station.srcid) }}
            >
              <Popup>
                <div>
                  <b>{name}</b>
                  {station.state || station.country ? (
                    <>
                      <br />
                      {station.state} {station.country}
                    </>
                  ) : null}
                </div>
              </Popup>
            </CircleMarker>
          </Fragment>
        );
      })}
    </MapContainer>
  );
}
