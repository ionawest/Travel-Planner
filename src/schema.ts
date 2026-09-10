// src/schema.ts

export type ItemType = 'poi' | 'accommodation' | 'note' | 'expense';

export interface RouteData {
  mode: 'driving' | 'walking' | 'cycling' | 'transit' | 'flight';
  targetId: string; 
  durationMinutes?: number;
  geometry?: [number, number][]; 
}

export interface BaseTripItem {
  id: string;
  tripId: string;
  timestamp: number;
  type: ItemType;
  title: string;
  lat?: number;
  lng?: number;
  routeToNext?: RouteData;
}

export interface PoiItem extends BaseTripItem {
  type: 'poi';
  description?: string;
}

export interface AccommodationItem extends BaseTripItem {
  type: 'accommodation';
  address?: string;
  checkInTimestamp: number;
  checkOutTimestamp: number;
}

export interface NoteItem extends BaseTripItem {
  type: 'note';
  content: string;
}

export interface ExpenseItem extends BaseTripItem {
  type: 'expense';
  cost: number; // Cost is now strictly isolated to expenses
}

export type TripItem = PoiItem | AccommodationItem | NoteItem | ExpenseItem;