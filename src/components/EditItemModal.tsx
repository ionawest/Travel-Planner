// src/components/EditItemModal.tsx
import React, { useState } from 'react';
import { db } from '../db';
import type { TripItem, PoiItem, AccommodationItem, ExpenseItem } from '../schema';

interface EditItemModalProps {
  item: TripItem;
  onClose: () => void;
}

const toLocalDatetime = (ts: number) => {
  const d = new Date(ts);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export const EditItemModal: React.FC<EditItemModalProps> = ({ item, onClose }) => {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.type === 'poi' ? (item as PoiItem).description || '' : '');
  const [address, setAddress] = useState(item.type === 'accommodation' ? (item as AccommodationItem).address || '' : '');
  const [cost, setCost] = useState(item.type === 'expense' ? (item as ExpenseItem).cost.toString() : '');
  
  const [startTime, setStartTime] = useState(toLocalDatetime(item.timestamp));
  const [endTime, setEndTime] = useState(
    item.type === 'accommodation' ? toLocalDatetime((item as AccommodationItem).checkOutTimestamp) : toLocalDatetime(item.timestamp)
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const startTimestamp = new Date(startTime).getTime();

    const baseUpdates = {
      title,
      timestamp: startTimestamp,
    };

    if (item.type === 'poi') {
      await db.items.update(item.id, { ...baseUpdates, description } as Partial<PoiItem>);
    } else if (item.type === 'accommodation') {
      await db.items.update(item.id, { 
        ...baseUpdates, address, checkInTimestamp: startTimestamp, checkOutTimestamp: new Date(endTime).getTime() 
      } as Partial<AccommodationItem>);
    } else if (item.type === 'expense') {
      await db.items.update(item.id, { ...baseUpdates, cost: parseFloat(cost) } as Partial<ExpenseItem>);
    } else {
      await db.items.update(item.id, baseUpdates);
    }

    onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#0f172a', textTransform: 'capitalize' }}>Edit {item.type}</h2>
        
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Title" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>{item.type === 'accommodation' ? 'Check-in' : 'Date & Time'}</label>
            <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          </div>

          {item.type === 'accommodation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Check-out</label>
              <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} required style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
            </div>
          )}

          {item.type === 'poi' && (
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Notes..." rows={3} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }} />
          )}

          {item.type === 'accommodation' && (
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Address" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
          )}

          {item.type === 'expense' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>Cost ($)</label>
              <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} required placeholder="0.00" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc' }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button type="submit" style={{ flex: 1, padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Save Changes</button>
            <button type="button" onClick={onClose} style={{ padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};