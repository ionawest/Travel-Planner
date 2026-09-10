// src/components/FullscreenSchedule.tsx
import React, { useState } from 'react';
import type { TripItem, RouteData, ExpenseItem } from '../schema';
import { db } from '../db';
import { fetchRoute } from '../routing';

interface FullscreenScheduleProps {
  items: TripItem[];
  onBackToMap: () => void;
  onDeleteItem: (id: string) => void;
  onEditItem: (item: TripItem) => void;
  isDateOnlyMode: boolean;
}

const DropZone: React.FC<{ onDrop: (id: string) => void; isDateOnlyMode: boolean; isEnd?: boolean }> = ({ onDrop, isDateOnlyMode, isEnd }) => {
  const [isOver, setIsOver] = useState(false);
  if (!isDateOnlyMode) return null;
  return (
    <div onDragEnter={(e) => { e.preventDefault(); setIsOver(true); }} onDragOver={(e) => { e.preventDefault(); setIsOver(true); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsOver(false); }} onDrop={(e) => { e.preventDefault(); setIsOver(false); const id = e.dataTransfer.getData('text/plain'); if (id) onDrop(id); }}
      style={{ height: isOver ? '48px' : '16px', background: isOver ? '#eff6ff' : 'transparent', border: isOver ? '2px dashed #3b82f6' : '2px dashed transparent', borderRadius: '12px', margin: isEnd ? '16px 0 64px 0' : '4px 0', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isOver ? 1 : 0 }}
    >
      {isOver && <span style={{ color: '#3b82f6', fontSize: '14px', fontWeight: 'bold', pointerEvents: 'none' }}>Drop Here</span>}
    </div>
  );
};

export const FullscreenSchedule: React.FC<FullscreenScheduleProps> = ({ items, onBackToMap, onDeleteItem, onEditItem, isDateOnlyMode }) => {
  const sortedItems = [...items].sort((a, b) => a.timestamp - b.timestamp);
  const [loadingRouteId, setLoadingRouteId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const formatDate = (ts: number) => {
    const opts: Intl.DateTimeFormatOptions = isDateOnlyMode ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' } : { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' };
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
    <div style={{ width: '100vw', height: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      <div style={{ padding: '20px 32px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><h1 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>Master Travel Schedule</h1><p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>{isDateOnlyMode ? 'Flex Mode: Drag items to reorder.' : 'Strict Time Mode: Exact itinerary.'}</p></div>
        <button onClick={onBackToMap} style={{ padding: '10px 20px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Back to Map</button>
      </div>

      <div style={{ flex: 1, padding: '32px', overflowY: 'auto', maxWidth: '800px', width: '100%', margin: '0 auto' }}>
        {sortedItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px', color: '#64748b' }}><h2>No items found</h2></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <DropZone isDateOnlyMode={isDateOnlyMode} onDrop={async (draggedId) => { await db.items.update(draggedId, { timestamp: sortedItems[0].timestamp - 60000 }); }} />

            {sortedItems.map((item, index) => {
              const nextItem = sortedItems[index + 1];
              const nextGeocodedItem = sortedItems.slice(index + 1).find(i => typeof i.lat === 'number' && typeof i.lng === 'number');
              
              const isRouteValid = item.routeToNext && item.routeToNext.targetId === nextGeocodedItem?.id;
              const currentMode = item.routeToNext?.mode || 'driving';
              const isHovered = dragOverId === item.id;

              return (
                <React.Fragment key={item.id}>
                  <div draggable={isDateOnlyMode} onDragStart={(e) => handleDragStart(e, item.id)} onDragEnter={(e) => { e.preventDefault(); setDragOverId(item.id); }} onDragOver={(e) => { e.preventDefault(); setDragOverId(item.id); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverId(null); }} onDrop={(e) => handleDropOnItem(e, item)}
                    className="modern-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: isDateOnlyMode ? 'grab' : 'default', borderLeft: `6px solid ${getBorderColor(item.type)}`, background: 'white', position: 'relative', marginTop: isHovered ? '60px' : '0', borderTop: isHovered ? '4px dashed #3b82f6' : '1px solid #f1f5f9', transition: 'margin 0.2s ease, border 0.2s ease' }}
                  >
                    {isHovered && <div style={{ position: 'absolute', top: '-30px', left: '0', color: '#3b82f6', fontSize: '14px', fontWeight: 'bold' }}>Drop Above ⬇</div>}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', padding: '4px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#475569' }}>#{index + 1} {item.type}</span>
                        <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>{formatDate(item.timestamp)}</span>
                      </div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: '#0f172a' }}>{item.title}</h3>
                      {item.type === 'poi' && item.description && <p style={{ margin: 0, color: '#475569', fontSize: '15px', lineHeight: '1.5' }}>{item.description}</p>}
                      {item.type === 'accommodation' && <p style={{ margin: 0, color: '#475569', fontSize: '15px' }}><strong>Checkout:</strong> {formatDate(item.checkOutTimestamp)}</p>}
                      
                      {/* Cost cast specifically here */}
                      {item.type === 'expense' && <p style={{ margin: 0, fontSize: '16px', color: '#10b981', fontWeight: 'bold' }}>${(item as ExpenseItem).cost}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => onEditItem(item)} style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: '6px', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: '600' }}>Edit</button>
                      <button onClick={() => onDeleteItem(item.id)} style={{ background: '#fee2e2', padding: '8px 12px', borderRadius: '6px', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '600' }}>Delete</button>
                    </div>
                  </div>

                  {nextGeocodedItem && typeof item.lat === 'number' && (
                    <div style={{ marginLeft: '40px', borderLeft: '2px dashed #cbd5e1', paddingLeft: '24px', paddingBottom: '8px', paddingTop: '12px' }}>
                      <div style={{ background: 'white', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '12px', fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <select value={currentMode} onChange={(e) => handleCalculateRoute(item, nextGeocodedItem, e.target.value as RouteData['mode'])} style={{ background: 'transparent', border: 'none', fontWeight: '600', color: '#475569', cursor: 'pointer', outline: 'none' }}>
                          <option value="driving">🚗 Drive</option><option value="walking">🚶 Walk</option><option value="cycling">🚲 Cycle</option><option value="transit">🚆 Transit</option><option value="flight">✈️ Flight</option>
                        </select>
                        <div style={{ color: '#94a3b8' }}>|</div>
                        {loadingRouteId === item.id ? <span style={{ color: '#2563eb', fontWeight: '600' }}>Calculating...</span> : isRouteValid && item.routeToNext?.durationMinutes ? <span style={{ color: '#0f172a', fontWeight: '600' }}>{item.routeToNext.durationMinutes} mins</span> : <button onClick={() => handleCalculateRoute(item, nextGeocodedItem)} style={{ background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>🔄 Calc</button>}
                      </div>
                    </div>
                  )}

                  <DropZone isDateOnlyMode={isDateOnlyMode} isEnd={!nextItem} onDrop={async (draggedId) => { const targetTime = nextItem ? Math.round((item.timestamp + nextItem.timestamp) / 2) : item.timestamp + (60 * 60 * 1000); await db.items.update(draggedId, { timestamp: targetTime }); }} />
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};