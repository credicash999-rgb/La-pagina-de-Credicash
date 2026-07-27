import { Cliente, Operacion, Cuota } from '../types';

export function exportDailyRoutePDF(
  cobradorNombre: string,
  fecha: string,
  clientes: Cliente[],
  _operaciones: Operacion[],
  _cuotas: Cuota[],
  totalCobro: number,
  totalGanancia: number,
  tiempoEstimado: string
) {
  window.print();
}
