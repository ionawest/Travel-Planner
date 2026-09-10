// src/routing.ts
import type { RouteData } from './schema';

// Helper for flights (straight line math)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c;
}

export async function fetchRoute(startLat: number, startLng: number, endLat: number, endLng: number, mode: RouteData['mode']): Promise<Omit<RouteData, 'targetId'>> {
  
  // 1. FLIGHT: Straight line distance
  if (mode === 'flight') {
    const distanceKm = getDistance(startLat, startLng, endLat, endLng);
    return { 
      mode, 
      durationMinutes: Math.round(((distanceKm / 800) * 60) + 45), 
      geometry: [[startLng, startLat], [endLng, endLat]] 
    };
  }

  // 2. GROUND: Always fetch the 'driving' profile to get the most accurate road geometry and distance
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
  );
  
  const data = await response.json();
  if (data.code !== 'Ok') throw new Error("Routing failed");

  const route = data.routes[0];
  const distanceMeters = route.distance; 
  const drivingSeconds = route.duration;
  
  // 3. SMART CALCULATION: A pure helper function to avoid linter assignment warnings
  const calculateDuration = () => {
    if (mode === 'walking') {
      return Math.round(distanceMeters / 83.33);
    } 
    if (mode === 'cycling') {
      return Math.round(distanceMeters / 250);
    } 
    if (mode === 'transit') {
      return Math.round((drivingSeconds / 60) * 1.5) + 5;
    } 
    return Math.round(drivingSeconds / 60); // Driving default
  };

  return {
    mode,
    durationMinutes: calculateDuration(),
    geometry: route.geometry.coordinates
  };
}