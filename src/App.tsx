// src/App.tsx
import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { MapView } from './components/Map';
import { Timeline } from './components/Timeline';
import { FullscreenSchedule } from './components/FullscreenSchedule';
import { HotelsTab } from './components/HotelsTab';
import { CalendarTab } from './components/CalendarTab';
import { BudgetTab } from './components/BudgetTab';
import { EditItemModal } from './components/EditItemModal';
import { db } from './db';
import type { TripItem, AccommodationItem, ExpenseItem } from './schema';

type TabType = 'workspace' | 'schedule' | 'calendar' | 'hotels' | 'budget';

const TABS: { id: TabType; label: string; icon: string }[] = [
  { id: 'workspace', label: 'Workspace', icon: '📍' },
  { id: 'schedule', label: 'Schedule', icon: '📝' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'hotels', label: 'Hotels', icon: '🏨' },
  { id: 'budget', label: 'Budget', icon: '💳' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('workspace');
  const [selectedItem, setSelectedItem] = useState<TripItem | null>(null);
  const [editingItem, setEditingItem] = useState<TripItem | null>(null);
  
  const [isDateOnlyMode, setIsDateOnlyMode] = useState(true); 
  const [viewState, setViewState] = useState({ longitude: 139.6917, latitude: 35.6895, zoom: 11 });
  const [isMapInitialized, setIsMapInitialized] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const items = useLiveQuery(() => db.items.toArray()) || [];

  if (items.length > 0 && !isMapInitialized) {
    const sortedItems = [...items].sort((a, b) => a.timestamp - b.timestamp);
    const firstGeocoded = sortedItems.find((i) => typeof i.lat === 'number' && typeof i.lng === 'number');
    if (firstGeocoded) {
      setViewState({ longitude: firstGeocoded.lng!, latitude: firstGeocoded.lat!, zoom: 11 });
    }
    setIsMapInitialized(true); 
  }

  const flyToItem = (item: TripItem) => {
    setSelectedItem(item);
    if (typeof item.lat === 'number' && typeof item.lng === 'number') {
      setViewState({ longitude: item.lng, latitude: item.lat, zoom: 14 });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this itinerary item?")) {
      await db.items.delete(id);
    }
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'travel-backup.json';
    link.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedData)) {
          if (window.confirm("This will replace your current itinerary. Proceed?")) {
            await db.items.clear();
            await db.items.bulkAdd(importedData);
            alert("Itinerary restored successfully!");
          }
        } else {
          alert("Invalid backup file format.");
        }
      } catch (error) {
        console.error("Import error:", error);
        alert("Could not read the backup file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = ''; 
  };

  const handleExportICS = () => {
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//TravelPlanner//EN\n";
    
    items.forEach(item => {
      const formatICSDate = (ts: number) => new Date(ts).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const start = formatICSDate(item.timestamp);
      
      let endTs = item.timestamp + (2 * 60 * 60 * 1000); 
      if (item.type === 'accommodation') {
        endTs = (item as AccommodationItem).checkOutTimestamp;
      } else if (item.routeToNext && item.routeToNext.durationMinutes) {
        endTs = item.timestamp + (item.routeToNext.durationMinutes * 60 * 1000);
      }
      const end = formatICSDate(endTs);
      
      icsContent += "BEGIN:VEVENT\n";
      icsContent += `UID:${item.id}@travelplanner\n`;
      icsContent += `DTSTAMP:${start}\n`;
      icsContent += `DTSTART:${start}\n`;
      icsContent += `DTEND:${end}\n`;
      icsContent += `SUMMARY:${item.title}\n`;
      
      let desc = item.type.toUpperCase();
      if (item.type === 'poi' && item.description) desc += `\\n\\n${item.description.replace(/\n/g, '\\n')}`;
      if (item.type === 'accommodation' && (item as AccommodationItem).address) {
        desc += `\\n\\nAddress: ${(item as AccommodationItem).address?.replace(/\n/g, '\\n')}`;
      }
      
      // Changed cost mapping to strictly check for expenses
      if (item.type === 'expense') desc += `\\n\\nCost: $${(item as ExpenseItem).cost}`;
      
      icsContent += `DESCRIPTION:${desc}\n`;
      icsContent += "END:VEVENT\n";
    });
    
    icsContent += "END:VCALENDAR";
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'itinerary.ics';
    link.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden', background: '#f8fafc' }}>
      
      <div style={{ width: '100%', background: 'white', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', zIndex: 50, flexWrap: 'wrap', gap: '12px' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <h1 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#0f172a', letterSpacing: '-0.5px' }}>
            Travel<span style={{ color: '#2563eb' }}>Planner</span>
          </h1>
          
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={handleExportJSON} title="Backup to JSON" style={{ padding: '6px 10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>📥 Backup</button>
            <button onClick={() => fileInputRef.current?.click()} title="Restore from JSON" style={{ padding: '6px 10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>📤 Restore</button>
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleImportJSON} style={{ display: 'none' }} />
            <button onClick={handleExportICS} title="Add to Apple/Google Calendar" style={{ padding: '6px 10px', background: '#dbeafe', color: '#1d4ed8', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700', marginLeft: '8px' }}>📅 Export to Calendar</button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => setIsDateOnlyMode(!isDateOnlyMode)} style={{ marginRight: '16px', padding: '8px 12px', background: isDateOnlyMode ? '#10b981' : '#e2e8f0', color: isDateOnlyMode ? 'white' : '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
            {isDateOnlyMode ? '🔓 Flex Mode' : '🔒 Strict Time'}
          </button>

          <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px 48px', borderRadius: '12px', flexWrap: 'wrap' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '8px 12px', background: activeTab === tab.id ? 'white' : 'transparent', color: activeTab === tab.id ? '#0f172a' : '#64748b', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{tab.icon}</span> <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {activeTab === 'schedule' && <FullscreenSchedule items={items} onBackToMap={() => setActiveTab('workspace')} onDeleteItem={handleDelete} onEditItem={setEditingItem} isDateOnlyMode={isDateOnlyMode} />}
        {activeTab === 'hotels' && <HotelsTab items={items} />}
        {activeTab === 'calendar' && <CalendarTab items={items} isDateOnlyMode={isDateOnlyMode} />}
        {activeTab === 'budget' && <BudgetTab items={items} onDeleteItem={handleDelete} onEditItem={setEditingItem} />}
        
        {activeTab === 'workspace' && (
          <div style={{ display: 'flex', width: '100%', height: '100%' }}>
            <div style={{ width: '420px', height: '100%', display: 'flex', flexDirection: 'column', background: '#f8fafc', borderRight: '1px solid #f1f5f9', zIndex: 10 }}>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <Timeline items={items} onDeleteItem={handleDelete} onCardClick={flyToItem} onEditItem={setEditingItem} isDateOnlyMode={isDateOnlyMode} />
              </div>
            </div>

            <div style={{ flex: 1, height: '100%', position: 'relative' }}>
              <MapView items={items} viewState={viewState} setViewState={setViewState} onSelectPin={flyToItem} />

              {selectedItem && (
                <div className="modern-card" style={{ position: 'absolute', bottom: 24, right: 24, padding: '24px', zIndex: 10, width: '320px' }}>
                  <h3 style={{ margin: '0 0 4px 0', color: '#0f172a', fontSize: '18px' }}>{selectedItem.title}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>{selectedItem.type}</span>
                    {/* The cost span that was here has been cleanly removed since expenses don't drop map pins! */}
                  </div>
                  {selectedItem.type === 'poi' && <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>{selectedItem.description}</p>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }} onClick={() => setEditingItem(selectedItem)}>Edit</button>
                    <button style={{ flex: 1, padding: '10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }} onClick={() => { handleDelete(selectedItem.id); setSelectedItem(null); }}>Delete</button>
                    <button style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }} onClick={() => setSelectedItem(null)}>Close</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {editingItem && (
        <EditItemModal item={editingItem} onClose={() => setEditingItem(null)} />
      )}
    </div>
  );
}