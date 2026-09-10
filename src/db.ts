// src/db.ts
import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { TripItem } from './schema';

export class TravelDatabase extends Dexie {
  // Declare the table and the TypeScript interface it uses.
  // The second type 'string' tells Dexie that the primary key (id) is a string.
  items!: Table<TripItem, string>;

  constructor() {
    super('TravelPlannerDB');
    
    // We specify the indexes here. 
    // '&id' means it is a unique primary key.
    // 'tripId' lets us filter by a specific trip.
    // 'timestamp' lets us easily sort items for the chronological timeline.
    this.version(1).stores({
      items: '&id, tripId, timestamp, type'
    });
  }
}

// Export a single instance of the database to use across the app
export const db = new TravelDatabase();