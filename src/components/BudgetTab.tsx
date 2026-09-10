// src/components/BudgetTab.tsx
import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import type { TripItem, ExpenseItem } from '../schema';

interface BudgetTabProps {
  items: TripItem[];
  onDeleteItem: (id: string) => void;
  onEditItem: (item: TripItem) => void;
}

export const BudgetTab: React.FC<BudgetTabProps> = ({ items, onDeleteItem, onEditItem }) => {
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('');

  // Strictly filter only items typed as expenses
  const expenses = items
    .filter((i): i is ExpenseItem => i.type === 'expense')
    .sort((a, b) => a.timestamp - b.timestamp);
    
  const total = expenses.reduce((sum, item) => sum + item.cost, 0);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !cost) return;

    const tripStart = items.length > 0 ? Math.min(...items.map(i => i.timestamp)) : Date.now();
    
    const newExpense: ExpenseItem = {
      id: uuidv4(),
      tripId: 'demo-trip',
      timestamp: tripStart - 1000, 
      type: 'expense',
      title,
      cost: parseFloat(cost)
    };

    await db.items.add(newExpense);
    setTitle('');
    setCost('');
  };

  return (
    <div style={{ width: '100%', height: '100%', background: '#f8fafc', padding: '40px', overflowY: 'auto', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '24px', padding: '40px', color: 'white', marginBottom: '24px', boxShadow: '0 20px 25px -5px rgba(15,23,42,0.2)' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Trip Cost</h2>
          <div style={{ fontSize: '56px', fontWeight: '700', letterSpacing: '-1px' }}>
            ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="modern-card" style={{ padding: '24px', marginBottom: '32px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#0f172a' }}>Add Standalone Expense</h3>
          <form onSubmit={handleAddExpense} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: '200px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Description</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Flights, Travel Insurance..." required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'block', marginBottom: '4px' }}>Cost ($)</label>
              <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} placeholder="0.00" required style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', height: '42px' }}>+ Add</button>
          </form>
        </div>

        <h3 style={{ fontSize: '18px', marginBottom: '16px', color: '#334155' }}>Itemised Expenses</h3>
        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}><p style={{ color: '#64748b' }}>No expenses recorded yet.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {expenses.map(item => (
              <div key={item.id} className="modern-card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>{item.type}</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a' }}>{item.title}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>${item.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => onEditItem(item)} style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', border: 'none', color: '#475569', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Edit</button>
                    <button onClick={() => onDeleteItem(item.id)} style={{ background: '#fee2e2', padding: '8px 12px', borderRadius: '8px', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};