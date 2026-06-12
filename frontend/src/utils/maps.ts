/**
 * VITMATERNA — Deep-link a mapas para ubicar el domicilio de la gestante
 * en visitas domiciliarias.
 */
import { Linking, Platform } from 'react-native';

/** Construye una URL de Google Maps para unas coordenadas. */
export function buildMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/** Abre la app de mapas con la ubicación dada. Devuelve true si se pudo abrir. */
export async function openInMaps(lat?: number | null, lng?: number | null): Promise<boolean> {
  if (lat == null || lng == null) return false;
  // En iOS, geo: abre Apple Maps; usamos Google Maps web como destino universal.
  const url = Platform.OS === 'ios'
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : buildMapsUrl(lat, lng);
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
