import { Cliente } from '../types';

export function optimizeRouteNearestNeighbor(lugarInicio: string, lugarFin: string, clientes: Cliente[]) {
  const puntosClientes = clientes.map((c, idx) => ({
    id: c.id,
    puntoNumero: idx + 1,
    nombre: `${c.nombre} ${c.apellido}`,
    direccion: c.direccion || `${c.calle || ''} ${c.numero || ''}`,
    cliente: c
  }));

  return {
    puntoInicio: { nombre: lugarInicio },
    puntoFin: { puntoNumero: puntosClientes.length + 1, nombre: lugarFin },
    puntosClientes,
    distanciaTotalEstimadaKm: Math.round(puntosClientes.length * 3.5)
  };
}

export function buildGoogleMapsRouteUrl(inicio: string, fin: string, puntosClientes: any[]) {
  const waypoints = puntosClientes.map(p => encodeURIComponent(p.direccion)).join('|');
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(inicio)}&destination=${encodeURIComponent(fin)}&waypoints=${waypoints}`;
}
