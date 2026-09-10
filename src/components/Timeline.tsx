// src/components/Timeline.tsx
import React, { useState } from 'react';
import type { TripItem, RouteData, ExpenseItem } from '../schema';
import { AddLocationForm } from './AddLocationForm';
import { db } from '../db';
import { fetchRoute } from '../routing';

interface TimelineProps {
  items: TripItem[];
  onDeleteItem: (id: string) => void;
  onCardClick: (item: TripItem) => void;
  onEditItem: (item: TripItem) => void;
  isDateOnlyMode: boolean;
}

const DropZone: React.FC<{ onDrop: (id: string) => void; isDateOnlyMode: boolean; isEnd?: boolean }> = ({ onDrop, isDateOnlyMode, isEnd }) => {
  const [isOver, setIsOver] = useState(false);
  if (!isDateOnlyMode) return null;
  return (
    <div onDragEnter={(e) => { e.preventDefault(); setIsOver(true); }} onDragOver={(e) => { e.preventDefault(); setIsOver(true); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsOver(false); }} onDrop={(e) => { e.preventDefault(); setIsOver(false); const id = e.dataTransfer.getData('text/plain'); if (id) onDrop(id); }}
      style={{ height: isOver ? '40px' : '16px', background: isOver ? '#eff6ff' : 'transparent', border: isOver ? '2px dashed #3b82f6' : '2px dashed transparent', borderRadius: '8px', margin: isEnd ? '8px 0 32px 0' : '4px 0', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isOver ? 1 : 0 }}
    >
      {isOver && <span style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 'bold', pointerEvents: 'none' }}>Drop Here</span>}
    </div>
  );
};

export const Timeline: React.FC<TimelineProps> = ({ items, onDeleteItem, onCardClick, onEditItem, isDateOnlyMode }) => {
  const sortedItems = [...items].sort((a, b) => a.timestamp - b.timestamp);
  const [loadingRouteId, setLoadingRouteId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const formatTime = (ts: number) => {
    const opts: Intl.DateTimeFormatOptions = isDateOnlyMode ? { weekday: 'short', month: 'short', day: 'numeric' } : { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
    return new Intl.DateTimeFormat('en-AU', opts).format(new Date(ts));
  };

  const getBorderColor = (type: string) => type === 'accommodation' ? '#3b82f6' : type === 'expense' ? '#10b981' : '#ef4444';

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isDateOnlyMode) return;
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnItem = async (e: React.DragEvent, targetItem: TripItem) => {
    e.preventDefault(); setDragOverId(null);
    if (!isDateOnlyMode) return;
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== targetItem.id) {
      const targetIndex = sortedItems.findIndex(i => i.id === targetItem.id);
      const prevItem = sortedItems[targetIndex - 1];
      const newTime = prevItem ? Math.round((prevItem.timestamp + targetItem.timestamp) / 2) : targetItem.timestamp - 60000;
      await db.items.update(draggedId, { timestamp: newTime });
    }
  };

  const handleCalculateRoute = async (item: TripItem, nextItem: TripItem, newMode?: RouteData['mode']) => {
    if (typeof item.lat !== 'number' || typeof item.lng !== 'number' || typeof nextItem.lat !== 'number' || typeof nextItem.lng !== 'number') return;
    setLoadingRouteId(item.id);
    try {
      const modeToUse = newMode || item.routeToNext?.mode || 'driving';
      const routeData = await fetchRoute(item.lat, item.lng, nextItem.lat, nextItem.lng, modeToUse);
      await db.items.update(item.id, { routeToNext: { ...routeData, targetId: nextItem.id } });
    } catch (error) { console.error("Routing error:", error); alert("Failed to calculate route."); } finally { setLoadingRouteId(null); }
  };

  return (
    <div style={{ width: '100%', paddingBottom: '40px' }}>
      <AddLocationForm />
      <div style={{ padding: '0 16px' }}>
        {sortedItems.length > 0 && ( <DropZone isDateOnlyMode={isDateOnlyMode} onDrop={async (draggedId) => { await db.items.update(draggedId, { timestamp: sortedItems[0].timestamp - 60000 }); }} /> )}

        {sortedItems.map((item, index) => {
          const nextItem = sortedItems[index + 1];
          // Find the NEXT item that actually has a physical location, skipping over expenses
          const nextGeocodedItem = sortedItems.slice(index + 1).find(i => typeof i.lat === 'number' && typeof i.lng === 'number');
          
          const isRouteValid = item.routeToNext && item.routeToNext.targetId === nextGeocodedItem?.id;
          const currentMode = item.routeToNext?.mode || 'driving';
          const isHovered = dragOverId === item.id;

          return (
            <React.Fragment key={item.id}>
              <div onClick={() => onCardClick(item)} draggable={isDateOnlyMode} onDragStart={(e) => handleDragStart(e, item.id)} onDragEnter={(e) => { e.preventDefault(); setDragOverId(item.id); }} onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverId(null); }} onDrop={(e) => handleDropOnItem(e, item)}
                className="modern-card" style={{ padding: '16px', position: 'relative', cursor: isDateOnlyMode ? 'grab' : 'pointer', borderLeft: `6px solid ${getBorderColor(item.type)}`, background: 'white', marginTop: isHovered ? '40px' : '0', borderTop: isHovered ? '4px dashed #3b82f6' : '1px solid #f1f5f9', transition: 'margin 0.2s ease, border 0.2s ease' }}
              >
                {isHovered && <div style={{ position: 'absolute', top: '-26px', left: '0', color: '#3b82f6', fontSize: '12px', fontWeight: 'bold' }}>Drop Above ⬇</div>}
                <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                  <button onClick={(e) => { e.stopPropagation(); onEditItem(item); }} style={{ background: '#f1f5f9', borderRadius: '50%', border: 'none', color: '#475569', cursor: 'pointer', width: '28px', height: '28px' }}>✎</button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteItem(item.id); }} style={{ background: '#fee2e2', borderRadius: '50%', border: 'none', color: '#ef4444', cursor: 'pointer', width: '28px', height: '28px' }}>✕</button>
                </div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>{isDateOnlyMode && '↕ '} {formatTime(item.timestamp)}</div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a', paddingRight: '64px' }}>{item.title}</h3>
                {item.type === 'poi' && item.description && <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>{item.description}</p>}
                
                {/* Cost cast specifically here */}
                {item.type === 'expense' && <p style={{ margin: 0, fontSize: '14px', color: '#10b981', fontWeight: 'bold' }}>${(item as ExpenseItem).cost}</p>}
              </div>

              {/* Only render transit lines between the actual locations, spanning OVER any expenses */}
              {nextGeocodedItem && typeof item.lat === 'number' && (
                <div style={{ marginLeft: '24px', borderLeft: '2px dashed #cbd5e1', paddingLeft: '16px', paddingBottom: '8px', paddingTop: '8px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <select value={currentMode} onChange={(e) => handleCalculateRoute(item, nextGeocodedItem, e.target.value as RouteData['mode'])} style={{ background: 'transparent', border: 'none', fontWeight: '600', color: '#475569', cursor: 'pointer', outline: 'none' }}>
                      <option value="driving">🚗 Drive</option><option value="walking">🚶 Walk</option><option value="cycling">🚲 Cycle</option><option value="transit">🚆 Transit</option><option value="flight">✈️ Flight</option>
                    </select>
                    <div style={{ color: '#94a3b8' }}>|</div>
                    {loadingRouteId === item.id ? <span style={{ color: '#2563eb', fontWeight: '600' }}>Calculating...</span> : isRouteValid && item.routeToNext?.durationMinutes ? <span style={{ color: '#0f172a', fontWeight: '600' }}>{item.routeToNext.durationMinutes} mins</span> : <button onClick={() => handleCalculateRoute(item, nextGeocodedItem)} style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>🔄 Calc</button>}
                  </div>
                </div>
              )}

              <DropZone isDateOnlyMode={isDateOnlyMode} isEnd={!nextItem} onDrop={async (draggedId) => { const targetTime = nextItem ? Math.round((item.timestamp + nextItem.timestamp) / 2) : item.timestamp + (60 * 60 * 1000); await db.items.update(draggedId, { timestamp: targetTime }); }} />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};