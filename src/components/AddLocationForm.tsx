// src/components/AddLocationForm.tsx
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import type { TripItem, PoiItem, AccommodationItem } from '../schema';

interface SearchResult { place_id: number; lat: string; lon: string; display_name: string; }

export const AddLocationForm: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<SearchResult | null>(null);
  
  const [itemType, setItemType] = useState<'poi' | 'accommodation'>('poi');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  const getDefaultDateTime = () => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  };
  const [startTime, setStartTime] = useState(getDefaultDateTime());
  const [endTime, setEndTime] = useState(getDefaultDateTime());

  const searchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`);
      const data: SearchResult[] = await response.json();
      setResults(data);
    } catch (error) { console.error("Geocoding failed:", error); }
  };

  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlace || !startTime) return;

    const startTimestamp = new Date(startTime).getTime();
    const endTimestamp = endTime ? new Date(endTime).getTime() : startTimestamp;
    let newItem: TripItem;

    if (itemType === 'accommodation') {
      newItem = {
        id: uuidv4(), tripId: 'demo-trip', timestamp: startTimestamp, type: 'accommodation',
        title: title || selectedPlace.display_name.split(',')[0],
        lat: parseFloat(selectedPlace.lat), lng: parseFloat(selectedPlace.lon),
        address: selectedPlace.display_name, checkInTimestamp: startTimestamp, checkOutTimestamp: endTimestamp
      } as AccommodationItem;
    } else {
      newItem = {
        id: uuidv4(), tripId: 'demo-trip', timestamp: startTimestamp, type: 'poi',
        title: title || selectedPlace.display_name.split(',')[0],
        lat: parseFloat(selectedPlace.lat), lng: parseFloat(selectedPlace.lon),
        description: description
      } as PoiItem;
    }

    await db.items.add(newItem);
    setSelectedPlace(null); setQuery(''); setTitle(''); setDescription(''); setResults([]);
  };

  return (
    <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '16px' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Add Location</h3>
      {!selectedPlace && (
        <form onSubmit={searchLocation} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input type="text" placeholder="Search Location..." value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          <button type="submit" style={{ padding: '8px 12px', background: '#334155', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Search</button>
        </form>
      )}

      {!selectedPlace && results.length > 0 && (
        <div style={{ border: '1px solid #cbd5e1', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', marginBottom: '12px' }}>
          {results.map((result) => (
            <div key={result.place_id} onClick={() => { setSelectedPlace(result); setTitle(result.display_name.split(',')[0]); }} style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', fontSize: '12px' }}>{result.display_name}</div>
          ))}
        </div>
      )}

      {selectedPlace && (
        <form onSubmit={handleSavePlace} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
           <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
            <strong>Selected:</strong> {selectedPlace.display_name}
            <button type="button" onClick={() => setSelectedPlace(null)} style={{ marginLeft: '8px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Change</button>
          </div>
          <select value={itemType} onChange={(e) => setItemType(e.target.value as 'poi' | 'accommodation')} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
            <option value="poi">Point of Interest</option>
            <option value="accommodation">Accommodation / Hotel</option>
          </select>
          <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>{itemType === 'accommodation' ? 'Check-in' : 'Time'}</label>
            <input type="datetime-local" required value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
          </div>
          {itemType === 'accommodation' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
               <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Check-out</label>
               <input type="datetime-local" required value={endTime} onChange={(e) => setEndTime(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
             </div>
          )}
          {itemType === 'poi' && (
            <textarea placeholder="Notes..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', resize: 'vertical' }} />
          )}
          <button type="submit" style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '4px' }}>Save Location</button>
        </form>
      )}
    </div>
  );
};