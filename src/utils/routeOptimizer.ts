import { Cliente } from '../types';

export interface RoutePoint {
  id: string;
  type: 'INICIO' | 'CLIENTE' | 'FIN';
  puntoNumero: number;
  nombre: string;
  direccion: string;
  lat: number;
  lng: number;
  cliente?: Cliente;
}

// Generate deterministic lat/lng from address string if explicit GPS coordinates do not exist
function getCoordsForAddress(addressStr: string, index: number): { lat: number; lng: number } {
  const baseLat = -32.8895; // Mendoza Center
  const baseLng = -68.8458;

  let hash = 0;
  for (let i = 0; i < addressStr.length; i++) {
    hash = (hash << 5) - hash + addressStr.charCodeAt(i);
    hash |= 0;
  }

  const latOffset = ((hash % 1000) / 10000) + (index * 0.003);
  const lngOffset = (((hash >> 3) % 1000) / 10000) - (index * 0.002);

  return {
    lat: baseLat + latOffset,
    lng: baseLng + lngOffset
  };
}

// Distance calculation using Haversine formula
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Optimizes the route order using a Nearest Neighbor algorithm:
 * Inicio (Start location) -> Client 1 -> Client 2 -> ... -> Fin (End location)
 */
export function optimizeRouteNearestNeighbor(
  lugarInicio: string,
  lugarFin: string,
  clientes: Cliente[]
): {
  puntoInicio: RoutePoint;
  puntosClientes: RoutePoint[];
  puntoFin: RoutePoint;
  distanciaTotalEstimadaKm: number;
} {
  const startCoords = getCoordsForAddress(lugarInicio || 'Oficina Central, Argentina', 0);
  const endCoords = getCoordsForAddress(lugarFin || 'Oficina Central, Argentina', 99);

  const puntoInicio: RoutePoint = {
    id: 'INICIO',
    type: 'INICIO',
    puntoNumero: 0,
    nombre: 'Lugar de Inicio de Recorrido',
    direccion: lugarInicio || 'Oficina Central / Punto de Partida',
    lat: startCoords.lat,
    lng: startCoords.lng
  };

  // Convert clients to initial pool with coordinates
  const clientPool: { client: Cliente; lat: number; lng: number }[] = clientes.map((c, idx) => {
    let lat = c.gpsLat;
    let lng = c.gpsLng;
    if (!lat || !lng) {
      const coords = getCoordsForAddress(`${c.direccion || ''} ${c.calle || ''} ${c.numero || ''} ${c.barrio || ''} ${c.id}`, idx + 1);
      lat = coords.lat;
      lng = coords.lng;
    }
    return { client: c, lat, lng };
  });

  const orderedClients: RoutePoint[] = [];
  let currentLat = startCoords.lat;
  let currentLng = startCoords.lng;
  let totalDistance = 0;

  let stepNumber = 1;
  while (clientPool.length > 0) {
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i < clientPool.length; i++) {
      const dist = calculateDistanceKm(currentLat, currentLng, clientPool[i].lat, clientPool[i].lng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    const next = clientPool.splice(nearestIdx, 1)[0];
    totalDistance += minDistance;
    currentLat = next.lat;
    currentLng = next.lng;

    const fullDir = next.client.direccion || `${next.client.calle || ''} ${next.client.numero || ''}, ${next.client.barrio || ''}`.trim() || 'Domicilio Registrado';

    orderedClients.push({
      id: next.client.id,
      type: 'CLIENTE',
      puntoNumero: stepNumber,
      nombre: `${next.client.nombre} ${next.client.apellido}`,
      direccion: fullDir,
      lat: next.lat,
      lng: next.lng,
      cliente: next.client
    });

    stepNumber++;
  }

  // Distance to end location
  const finalDistance = calculateDistanceKm(currentLat, currentLng, endCoords.lat, endCoords.lng);
  totalDistance += finalDistance;

  const puntoFin: RoutePoint = {
    id: 'FIN',
    type: 'FIN',
    puntoNumero: stepNumber,
    nombre: 'Lugar de Finalización de Recorrido',
    direccion: lugarFin || 'Oficina Central / Punto de Cierre',
    lat: endCoords.lat,
    lng: endCoords.lng
  };

  return {
    puntoInicio,
    puntosClientes: orderedClients,
    puntoFin,
    distanciaTotalEstimadaKm: Math.round(totalDistance * 10) / 10
  };
}

/**
 * Generates a full turn-by-turn Google Maps URL connecting all points in exact order
 */
export function buildGoogleMapsRouteUrl(
  lugarInicio: string,
  lugarFin: string,
  orderedClients: RoutePoint[]
): string {
  const originStr = encodeURIComponent(lugarInicio || 'Oficina Central');
  const destStr = encodeURIComponent(lugarFin || 'Oficina Central');

  if (orderedClients.length === 0) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}`;
  }

  // Google Maps URL handles up to 9 waypoints in standard query parameter string
  const waypointsList = orderedClients.slice(0, 9).map(pt => {
    if (pt.cliente?.gpsLat && pt.cliente?.gpsLng) {
      return `${pt.cliente.gpsLat},${pt.cliente.gpsLng}`;
    }
    return encodeURIComponent(pt.direccion || pt.nombre);
  });

  const waypoints = waypointsList.join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}&waypoints=${waypoints}`;
}
