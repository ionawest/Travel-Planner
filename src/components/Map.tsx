// src/components/Map.tsx
import React from 'react';
import Map, { NavigationControl, Marker, Source, Layer } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { TripItem } from '../schema';

interface MapViewProps {
  items: TripItem[];
  viewState: { longitude: number; latitude: number; zoom: number };
  setViewState: (viewState: { longitude: number; latitude: number; zoom: number }) => void;
  onSelectPin?: (item: TripItem) => void;
}

export const MapView: React.FC<MapViewProps> = ({ items, viewState, setViewState, onSelectPin }) => {
  const geocodedItems = items.filter(
    (item): item is TripItem & { lat: number; lng: number } =>
      typeof item.lat === 'number' && typeof item.lng === 'number'
  );

  const sortedGeocoded = [...geocodedItems].sort((a, b) => a.timestamp - b.timestamp);

  // Explicitly tell TypeScript that nulls are filtered out
  const validRoutes = sortedGeocoded.map((item, index) => {
    const nextItem = sortedGeocoded[index + 1];
    if (nextItem && item.routeToNext && item.routeToNext.targetId === nextItem.id && item.routeToNext.geometry) {
      return { id: item.id, geometry: item.routeToNext.geometry };
    }
    return null;
  }).filter((route): route is { id: string; geometry: [number, number][] } => route !== null);

  const routeGeoJson = {
    type: 'FeatureCollection' as const,
    features: validRoutes.map((route: { id: string; geometry: [number, number][] }) => ({
      type: 'Feature' as const,
      properties: { id: route.id },
      geometry: { type: 'LineString' as const, coordinates: route.geometry },
    })),
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Map
        {...viewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://tiles.openfreemap.org/styles/liberty"
        onMove={(evt: { viewState: typeof viewState }) => setViewState(evt.viewState)}
      >
        <NavigationControl position="top-right" />

        {validRoutes.length > 0 && (
          <Source id="routes" type="geojson" data={routeGeoJson}>
            <Layer id="route-layer" type="line" paint={{ 'line-color': '#2563eb', 'line-width': 4, 'line-dasharray': [2, 2] }} />
          </Source>
        )}

        {sortedGeocoded.map((item) => (
          <Marker key={item.id} longitude={item.lng} latitude={item.lat} anchor="bottom">
            <div
              onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                e.stopPropagation();
                onSelectPin?.(item);
              }}
              style={{
                background: item.type === 'accommodation' ? '#1d4ed8' : '#dc2626',
                color: '#fff', padding: '6px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '4px', border: '2px solid white',
              }}
            >
              <span>{item.type === 'accommodation' ? '🏨' : '📍'}</span>
              <span>{item.title}</span>
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
};