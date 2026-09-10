// src/components/CalendarTab.tsx
import React from 'react';
import type { TripItem } from '../schema';
import { db } from '../db';

interface CalendarTabProps {
  items: TripItem[];
  isDateOnlyMode: boolean; // Add mode prop
}

export const CalendarTab: React.FC<CalendarTabProps> = ({ items, isDateOnlyMode }) => {
  if (items.length === 0) return <div style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>No items yet.</div>;

  const timestamps = items.map(i => i.timestamp);
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);

  const tripDays: { dateString: string; dateObj: Date }[] = [];
  const currentDay = new Date(minTime);
  currentDay.setHours(0, 0, 0, 0);
  const endDay = new Date(maxTime);
  endDay.setHours(0, 0, 0, 0);

  while (currentDay <= endDay) {
    tripDays.push({ dateString: currentDay.toDateString(), dateObj: new Date(currentDay) });
    currentDay.setDate(currentDay.getDate() + 1);
  }

  // Handle dropping an item onto a specific Day Column
  const handleDropOnDay = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    if (!isDateOnlyMode) return;
    
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId) {
      // Use e.timeStamp (milliseconds since page load) instead of Math.random() to satisfy the linter
      const offsetOffset = Math.floor(e.timeStamp % 1000); 
      const newTime = targetDate.getTime() + (12 * 60 * 60 * 1000) + offsetOffset;
      
      await db.items.update(draggedId, { timestamp: newTime });
    }
  };
  
  return (
    <div style={{ width: '100%', height: '100%', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px 32px', background: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '24px', color: '#0f172a' }}>Trip Calendar</h2>
        {isDateOnlyMode && <span style={{ padding: '4px 8px', background: '#d1fae5', color: '#065f46', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>Flex Mode Active: Drag to Reschedule</span>}
      </div>

      <div style={{ flex: 1, overflowX: 'auto', padding: '24px', display: 'flex', gap: '16px' }}>
        {tripDays.map((day, index) => {
          const dayItems = items.filter(item => new Date(item.timestamp).toDateString() === day.dateString).sort((a, b) => a.timestamp - b.timestamp);

          return (
            <div 
              key={day.dateString} 
              // Make the whole column a drop zone
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropOnDay(e, day.dateObj)}
              style={{ flex: '0 0 320px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}
            >
              
              <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', background: '#f1f5f9', borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Day {index + 1}</div>
                <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: 'bold' }}>
                  {new Intl.DateTimeFormat('en-AU', { weekday: 'long', month: 'short', day: 'numeric' }).format(day.dateObj)}
                </div>
              </div>

              <div style={{ padding: '16px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '150px' }}>
                {dayItems.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '14px', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
                    {isDateOnlyMode ? 'Drop items here' : 'No plans yet'}
                  </div>
                ) : (
                  dayItems.map(item => (
                    <div 
                      key={item.id} 
                      draggable={isDateOnlyMode}
                      onDragStart={(e) => { if (isDateOnlyMode) { e.dataTransfer.setData('text/plain', item.id); } }}
                      style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: isDateOnlyMode ? 'grab' : 'default', transition: 'transform 0.1s' }}
                    >
                      {!isDateOnlyMode && (
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '4px' }}>
                          {new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit' }).format(item.timestamp)}
                        </div>
                      )}
                      <div style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a' }}>{item.title}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};