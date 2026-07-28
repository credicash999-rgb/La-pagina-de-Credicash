/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FrecuenciaPago, Cuota, Operacion } from '../types';

/**
 * Verifica si una fecha dada es domingo.
 */
export function esDomingo(fecha: Date): boolean {
  return fecha.getDay() === 0;
}

/**
 * Calcula la cantidad de días de atraso entre dos fechas (excluyendo domingos).
 * Retorna 0 si la fecha de vencimiento es hoy o futura.
 */
export function calcularDiasAtrasoSinDomingos(fechaVencimientoStr: string, fechaHastaStr: string): number {
  if (fechaVencimientoStr >= fechaHastaStr) return 0;
  
  let count = 0;
  let current = new Date(fechaVencimientoStr + 'T12:00:00');
  const target = new Date(fechaHastaStr + 'T12:00:00');
  
  while (current.getTime() <= target.getTime()) {
    if (!esDomingo(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

/**
 * Verifica si una fecha (formato YYYY-MM-DD) está en la lista de feriados.
 */
export function esFeriado(fechaStr: string, feriados: string[]): boolean {
  return feriados.includes(fechaStr);
}

/**
 * Obtiene el próximo día hábil (evitando domingos y feriados).
 */
export function obtenerProximoDiaHabil(fecha: Date, feriados: string[]): Date {
  const temp = new Date(fecha.getTime());
  while (true) {
    const año = temp.getFullYear();
    const mes = String(temp.getMonth() + 1).padStart(2, '0');
    const dia = String(temp.getDate()).padStart(2, '0');
    const fechaStr = `${año}-${mes}-${dia}`;

    if (esDomingo(temp) || esFeriado(fechaStr, feriados)) {
      // Sumar un día
      temp.setDate(temp.getDate() + 1);
    } else {
      break;
    }
  }
  return temp;
}

/**
 * Calcula la cantidad aproximada de meses financiados.
 */
export function calcularMesesFinanciados(frecuencia: FrecuenciaPago, cantidadCuotas: number): number {
  switch (frecuencia) {
    case 'DIARIA':
      return 1; // Por filosofía de negocio de Credi-Cash, diaria siempre es 1 mes
    case 'SEMANAL':
      // 8 cuotas = 2 meses, 4 cuotas = 1 mes, etc.
      return Math.ceil(cantidadCuotas / 4);
    case 'QUINCENAL':
      // 2 cuotas = 1 mes, 4 cuotas = 2 meses, etc.
      return Math.ceil(cantidadCuotas / 2);
    case 'MENSUAL':
      return cantidadCuotas;
    default:
      return 1;
  }
}

/**
 * Genera el plan de cuotas para una operación.
 */
export function generarPlanCuotas(
  operacion: Operacion,
  feriados: string[]
): Cuota[] {
  const cuotas: Cuota[] = [];
  const {
    id: idOperacion,
    idCliente,
    nombreCliente,
    numeroCredito,
    frecuencia,
    cantidadCuotas,
    primerVencimiento,
    totalFinanciado,
    capitalEntregado,
  } = operacion;

  // El interés total es la diferencia entre el total financiado y el capital entregado
  const interesTotal = Math.max(0, totalFinanciado - capitalEntregado);

  const capitalPorCuota = parseFloat((capitalEntregado / cantidadCuotas).toFixed(2));
  const interesPorCuota = parseFloat((interesTotal / cantidadCuotas).toFixed(2));
  const valorTotalCuota = parseFloat((totalFinanciado / cantidadCuotas).toFixed(2));

  let fechasVencimiento: string[] = [];

  // Generación de fechas base según la frecuencia
  if (frecuencia === 'DIARIA') {
    let current = new Date(primerVencimiento + 'T12:00:00'); // Evitar problemas de zona horaria usando mediodía
    for (let i = 0; i < cantidadCuotas; i++) {
      if (i > 0) {
        current.setDate(current.getDate() + 1);
      }
      const adjusted = obtenerProximoDiaHabil(current, feriados);
      fechasVencimiento.push(adjusted.toISOString().split('T')[0]);
      current = new Date(adjusted.getTime());
    }
  } else if (frecuencia === 'SEMANAL') {
    for (let i = 0; i < cantidadCuotas; i++) {
      const current = new Date(primerVencimiento + 'T12:00:00');
      current.setDate(current.getDate() + i * 7);
      const adjusted = obtenerProximoDiaHabil(current, feriados);
      fechasVencimiento.push(adjusted.toISOString().split('T')[0]);
    }
  } else if (frecuencia === 'QUINCENAL') {
    // Quincenal: Se definen dos días de cobro basados en el día de primerVencimiento
    const baseDate = new Date(primerVencimiento + 'T12:00:00');
    const d = baseDate.getDate();
    let day1 = 5;
    let day2 = 20;

    if (d <= 15) {
      day1 = d;
      day2 = d + 15;
    } else {
      day2 = d;
      day1 = d - 15;
    }

    let current = new Date(baseDate.getTime());
    for (let i = 0; i < cantidadCuotas; i++) {
      const adjusted = obtenerProximoDiaHabil(current, feriados);
      fechasVencimiento.push(adjusted.toISOString().split('T')[0]);

      // Mover a la siguiente quincena
      const currDay = current.getDate();
      const currMonth = current.getMonth();
      const currYear = current.getFullYear();

      if (currDay <= 15) {
        current = new Date(currYear, currMonth, day2, 12, 0, 0);
      } else {
        current = new Date(currYear, currMonth + 1, day1, 12, 0, 0);
      }
    }
  } else if (frecuencia === 'MENSUAL') {
    const baseDate = new Date(primerVencimiento + 'T12:00:00');
    for (let i = 0; i < cantidadCuotas; i++) {
      const current = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate(), 12, 0, 0);
      const adjusted = obtenerProximoDiaHabil(current, feriados);
      fechasVencimiento.push(adjusted.toISOString().split('T')[0]);
    }
  }

  // Ajustes de redondeo para que sumen exactamente el total
  let sumaCapital = 0;
  let sumaInteres = 0;
  let sumaTotal = 0;

  for (let i = 0; i < cantidadCuotas; i++) {
    const esUltima = i === cantidadCuotas - 1;

    const cap = esUltima ? parseFloat((capitalEntregado - sumaCapital).toFixed(2)) : capitalPorCuota;
    const int = esUltima ? parseFloat((interesTotal - sumaInteres).toFixed(2)) : interesPorCuota;
    const tot = esUltima ? parseFloat((totalFinanciado - sumaTotal).toFixed(2)) : valorTotalCuota;

    sumaCapital += cap;
    sumaInteres += int;
    sumaTotal += tot;

    const cuotaNumero = i + 1;
    const esPagada = cuotaNumero <= (operacion.cuotasPagadas || 0);

    cuotas.push({
      id: `${idOperacion}-CUO-${String(cuotaNumero).padStart(2, '0')}`,
      idOperacion,
      idCliente,
      nombreCliente,
      numeroCredito,
      numeroCuota: cuotaNumero,
      frecuencia,
      fechaVencimiento: fechasVencimiento[i],
      capitalCuota: cap,
      interesCuota: int,
      valorTotalCuota: tot,
      estado: esPagada ? 'PAGADA' : 'PENDIENTE',
      fechaPago: esPagada ? (operacion.ultimoPago || (operacion as any).fechaEntrega || operacion.fechaOtorgamiento || '') : '',
      importePagado: esPagada ? tot : 0,
      saldoPendiente: esPagada ? 0 : tot,
      diasAtraso: 0,
      cobrador: operacion.cobrador,
      observaciones: '',
    });
  }

  return cuotas;
}

/**
 * Ordena las cuotas impagas para imputar un pago según la prioridad de negocio:
 * 1. Cuota de HOY (fechaVencimiento === fechaReferencia)
 * 2. Cuotas VENCIDAS (fechaVencimiento < fechaReferencia), en orden DESCENDENTE de fecha (ayer antes que antes de ayer)
 * 3. Cuotas FUTURAS (fechaVencimiento > fechaReferencia), en orden ASCENDENTE de fecha
 */
export function sortCuotasByPaymentPriority(cuotas: Cuota[], referenceDateStr: string, modalidad?: string): Cuota[] {
  const currentList = [...cuotas];

  if (modalidad === 'PAGO_ADELANTADO_OPCION_A') {
    // Opción A: Descontar desde el final hacia atrás (últimas cuotas del plan)
    return currentList
      .filter(c => c.estado !== 'PAGADA')
      .sort((a, b) => b.numeroCuota - a.numeroCuota);
  }

  // Regular / Opción B / Parcial:
  return currentList.sort((a, b) => {
    // 1. Unpaid first
    const aPaid = a.estado === 'PAGADA' ? 1 : 0;
    const bPaid = b.estado === 'PAGADA' ? 1 : 0;
    if (aPaid !== bPaid) return aPaid - bPaid;

    if (a.estado === 'PAGADA') return 0;

    // 2. Today's cuota (fechaVencimiento === referenceDateStr) gets TOP priority
    const aIsToday = a.fechaVencimiento === referenceDateStr ? 1 : 0;
    const bIsToday = b.fechaVencimiento === referenceDateStr ? 1 : 0;
    if (aIsToday !== bIsToday) return bIsToday - aIsToday;

    // 3. Overdue cuotas (fechaVencimiento < referenceDateStr) get second priority,
    // sorted DESCENDING by date (yesterday before 2 days ago)
    const aIsOverdue = a.fechaVencimiento < referenceDateStr ? 1 : 0;
    const bIsOverdue = b.fechaVencimiento < referenceDateStr ? 1 : 0;
    if (aIsOverdue !== bIsOverdue) return bIsOverdue - aIsOverdue;

    if (aIsOverdue && bIsOverdue) {
      return b.fechaVencimiento.localeCompare(a.fechaVencimiento);
    }

    // 4. Future cuotas (fechaVencimiento > referenceDateStr): sorted ASCENDING (closest future first)
    if (a.fechaVencimiento !== b.fechaVencimiento) {
      return a.fechaVencimiento.localeCompare(b.fechaVencimiento);
    }

    // 5. Fallback tie-breaker by cuota number
    return a.numeroCuota - b.numeroCuota;
  });
}

