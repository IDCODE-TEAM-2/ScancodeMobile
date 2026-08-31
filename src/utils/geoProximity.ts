import * as Location from 'expo-location';
import { Platform } from 'react-native';
import { NIGERIA_STATE_CENTROIDS, type NigeriaState } from '../types';

// State-level proximity only — deliberately not true meters-level geofencing. Storefronts
// only capture a Nigerian state (see CreateStorefrontScreen), not precise coordinates, so
// the best this can honestly do is "which state is the customer probably in," using each
// state capital's coordinates as a stand-in centroid.

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Returns null whenever a state genuinely can't be determined — permission denied, no GPS
// fix, or web (expo-location's web support is unreliable inside embedded/iframe contexts) —
// never throws, since this is a "nice to have" ranking signal, not a required flow.
export async function detectCurrentState(): Promise<NigeriaState | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Platform.OS === 'web' ? Location.Accuracy.Balanced : Location.Accuracy.Low,
    });
    const here = { lat: position.coords.latitude, lng: position.coords.longitude };

    let nearest: NigeriaState | null = null;
    let nearestDistance = Infinity;
    for (const [state, centroid] of Object.entries(NIGERIA_STATE_CENTROIDS) as [NigeriaState, { lat: number; lng: number }][]) {
      const distance = haversineKm(here, centroid);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = state;
      }
    }
    return nearest;
  } catch {
    return null;
  }
}
