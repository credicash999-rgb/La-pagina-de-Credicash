import { Cuota, Operacion } from '../types';

export function calcularDiasAtrasoSinDomingos(fechaVencimiento: string, fechaActual: string): number {
  if (fechaVencimiento >= fechaActual) return 0;
  const start = new Date(fechaVencimiento + 'T00:00:00');
  const end = new Date(fechaActual + 'T00:00:00');
  let count = 0;
  let cur = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  while (cur <= end) {
    if (cur.getDay() !== 0) { // skip Sundays
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export function sortCuotasByPaymentPriority(cuotas: Cuota[], _fechaPago: string, _modalidad?: string): Cuota[] {
  return [...cuotas].sort((a, b) => a.numeroCuota - b.numeroCuota);
}

export function generarPlanCuotas(op: Operacion, _feriados: string[] = []): Cuota[] {
  const list: Cuota[] = [];
  const cantidad = op.cantidadCuotas || op.cuotasTotales || 10;
  const valCuota = op.valorCuota || Math.round((op.totalFinanciado || 10000) / cantidad);
  const startDay = new Date(op.fechaInicio || op.primerVencimiento || new Date().toISOString().split('T')[0]);

  for (let i = 0; i < cantidad; i++) {
    const cur = new Date(startDay.getTime() + i * 24 * 60 * 60 * 1000);
    if (cur.getDay() === 0) cur.setDate(cur.getDate() + 1);
    const dateStr = cur.toISOString().split('T')[0];

    list.push({
      id: `${op.id}-CUO-${i + 1}`,
      idOperacion: op.id,
      idCliente: op.idCliente,
      nombreCliente: op.nombreCliente || '',
      numeroCuota: i + 1,
      fechaVencimiento: dateStr,
      capitalCuota: Math.round(valCuota * 0.7),
      interesCuota: Math.round(valCuota * 0.3),
      valorTotalCuota: valCuota,
      estado: i < op.cuotasPagadas ? 'PAGADA' : 'PENDIENTE',
      importePagado: i < op.cuotasPagadas ? valCuota : 0,
      saldoPendiente: i < op.cuotasPagadas ? 0 : valCuota,
    });
  }
  return list;
}
