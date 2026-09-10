// src/components/HotelsTab.tsx
import React from 'react';
import type { TripItem, AccommodationItem } from '../schema';

interface HotelsTabProps {
  items: TripItem[];
}

export const HotelsTab: React.FC<HotelsTabProps> = ({ items }) => {
  // Filter and sort only the accommodation items
  const hotels = items
    .filter((item): item is AccommodationItem => item.type === 'accommodation')
    .sort((a, b) => a.checkInTimestamp - b.checkInTimestamp);

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('en-AU', {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(new Date(ts));
  };

  return (
    <div style={{ width: '100%', height: '100%', background: '#f8fafc', padding: '32px', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '24px', color: '#0f172a', marginBottom: '8px' }}>Accommodations & Lodging</h2>
        <p style={{ color: '#64748b', marginBottom: '24px' }}>All your check-ins and check-outs at a glance.</p>

        {hotels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <p style={{ color: '#64748b' }}>No hotels booked yet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {hotels.map(hotel => (
              <div key={hotel.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                <div style={{ background: '#1d4ed8', color: 'white', padding: '12px 20px', fontWeight: 'bold' }}>
                  {hotel.title}
                </div>
                <div style={{ padding: '20px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>Check-in</div>
                    <div style={{ fontSize: '16px', color: '#0f172a' }}>{formatDate(hotel.checkInTimestamp)}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}>Check-out</div>
                    <div style={{ fontSize: '16px', color: '#0f172a' }}>{formatDate(hotel.checkOutTimestamp)}</div>
                  </div>
                  {hotel.address && (
                    <div style={{ flex: '100%' }}>
                      <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', marginBottom: '4px', marginTop: '12px' }}>Address</div>
                      <div style={{ fontSize: '14px', color: '#334155' }}>{hotel.address}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};