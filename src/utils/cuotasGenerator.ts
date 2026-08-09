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
    const todayStr = new Date().toISOString().split('T')[0];
    const fechaVenc = fechasVencimiento[i];
    const esVencida = !esPagada && fechaVenc < todayStr;

    cuotas.push({
      id: `${idOperacion}-CUO-${String(cuotaNumero).padStart(2, '0')}`,
      idOperacion,
      idCliente,
      nombreCliente,
      numeroCredito,
      numeroCuota: cuotaNumero,
      frecuencia,
      fechaVencimiento: fechaVenc,
      capitalCuota: cap,
      interesCuota: int,
      valorTotalCuota: tot,
      estado: esPagada ? 'PAGADA' : (esVencida ? 'VENCIDA' : 'PENDIENTE'),
      fechaPago: esPagada ? (operacion.ultimoPago || (operacion as any).fechaEntrega || operacion.fechaOtorgamiento || '') : '',
      importePagado: esPagada ? tot : 0,
      saldoPendiente: esPagada ? 0 : tot,
      diasAtraso: esVencida ? Math.max(1, Math.floor((new Date(todayStr + 'T00:00:00').getTime() - new Date(fechaVenc + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))) : 0,
      cobrador: operacion.cobrador,
      observaciones: '',
    });
  }

  return cuotas;
}

/**
 * Normaliza cualquier string de fecha al formato canónico ISO YYYY-MM-DD.
 * Admite: YYYY-MM-DD, DD/MM/YYYY, D/M/YYYY, D/M, DD/MM, YYYY/MM/DD, etc.
 */
export function normalizeDateToISO(dateStr?: string): string {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0].trim();
  if (!clean) return '';

  const currentYear = new Date().getFullYear().toString();

  if (clean.includes('/')) {
    const parts = clean.split('/').map(p => p.trim());
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      // DD/MM/YYYY or D/M/YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    if (parts.length === 2) {
      // D/M or DD/MM -> assume current year DD/MM/YYYY
      return `${currentYear}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  if (clean.includes('-')) {
    const parts = clean.split('-').map(p => p.trim());
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD or YYYY-M-D
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      // DD-MM-YYYY
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    if (parts.length === 2) {
      // D-M or DD-MM -> assume current year DD-MM-YYYY
      return `${currentYear}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  return clean;
}

/**
 * Parsea una fecha a timestamp numérico para ordenamiento seguro sin errores de zona horaria o locale.
 */
export function parseDateToTimestamp(dateStr?: string): number {
  const iso = normalizeDateToISO(dateStr);
  if (!iso) return 0;
  const parts = iso.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return Date.UTC(y, m, d);
    }
  }
  return new Date(iso).getTime() || 0;
}

/**
 * Ordena las cuotas impagas para imputar un pago según la prioridad de negocio:
 * 1. Cuota seleccionada manualmente por el usuario (si aplica).
 * 2. Cuota cuya fecha de vencimiento coincida EXACTAMENTE con la fecha del pago registrado (refDate).
 * 3. Demás cuotas impagas en estricto orden cronológico ascendente (de la cuota más antigua a la más nueva).
 */
export function sortCuotasByPaymentPriority(
  cuotas: Cuota[], 
  referenceDateStr: string, 
  modalidad?: string,
  selectedCuotaId?: string
): Cuota[] {
  const currentList = [...cuotas];

  if (modalidad === 'PAGO_ADELANTADO_OPCION_A') {
    // Opción A: Descontar desde el final hacia atrás (últimas cuotas del plan)
    return currentList
      .filter(c => c.estado !== 'PAGADA' && (c.saldoPendiente === undefined || c.saldoPendiente > 0))
      .sort((a, b) => b.numeroCuota - a.numeroCuota);
  }

  const refDate = normalizeDateToISO(referenceDateStr);

  // Filtrar solo cuotas impagas o parcialmente pagadas
  const unpaid = currentList.filter(c => c.estado !== 'PAGADA' && (c.saldoPendiente === undefined || c.saldoPendiente > 0));

  return unpaid.sort((a, b) => {
    // 0. Prioridad a la cuota seleccionada manualmente por el usuario
    if (selectedCuotaId) {
      if (a.id === selectedCuotaId) return -1;
      if (b.id === selectedCuotaId) return 1;
    }

    const aFec = normalizeDateToISO(a.fechaVencimiento);
    const bFec = normalizeDateToISO(b.fechaVencimiento);

    // 1. Prioridad a la cuota que coincide exactamente con la fecha de vencimiento del pago registrado
    const aIsExactRef = (refDate && aFec === refDate) ? 1 : 0;
    const bIsExactRef = (refDate && bFec === refDate) ? 1 : 0;
    if (aIsExactRef !== bIsExactRef) return bIsExactRef - aIsExactRef;

    // 2. Para las demás cuotas impagas, orden cronológico ascendente (de la más antigua a la más reciente)
    if (aFec !== bFec) {
      return aFec.localeCompare(bFec);
    }

    // Desempate por número de cuota
    return a.numeroCuota - b.numeroCuota;
  });
}

