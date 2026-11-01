/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Cuota, Operacion, Cliente, Configuracion, Feriado, FrecuenciaPago } from '../types';
import { esDomingo, esFeriado, safeFormatISO } from './cuotasGenerator';

export interface ParametrosMoraFrecuencia {
  intervaloDias: number;
  porcentaje: number;
}

export interface DetalleMoraCuota {
  cuota: Cuota;
  numeroCuota: number;
  fechaVencimiento: string;
  montoCapital: number;
  diasAtrasoHabiles: number;
  periodosMora: number;
  porcentajeMoraAplicado: number;
  interesMora: number;
  totalCuotaConMora: number;
  estaEnMora: boolean;
}

export interface ConsolidacionDeuda {
  cuotasImpagas: DetalleMoraCuota[];
  cuotasPagadas: Cuota[];
  totalCapitalImpago: number;
  totalMoraAcumulada: number;
  totalConsolidado: number;
  cantidadCuotasImpagas: number;
  maxDiasAtraso: number;
}

/**
 * Calcula días de atraso hábiles (excluyendo domingos y feriados).
 * El primer día de atraso es el día posterior a la fecha de vencimiento.
 */
export function calcularDiasAtrasoHabiles(
  fechaVencimientoStr: string,
  fechaCalculoStr: string,
  feriados: Feriado[] = []
): number {
  if (!fechaVencimientoStr || !fechaCalculoStr) return 0;
  if (fechaVencimientoStr >= fechaCalculoStr) return 0;

  let count = 0;
  const current = new Date(fechaVencimientoStr + 'T12:00:00');
  const target = new Date(fechaCalculoStr + 'T12:00:00');

  // Avanzamos al día siguiente del vencimiento
  current.setDate(current.getDate() + 1);

  while (current.getTime() <= target.getTime()) {
    const isoDate = safeFormatISO(current);
    if (!esDomingo(current) && !esFeriado(isoDate, feriados)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Obtiene los parámetros de mora para cada frecuencia configurada.
 */
export function obtenerParametrosMora(
  frecuencia: FrecuenciaPago = 'DIARIA',
  config: Configuracion
): ParametrosMoraFrecuencia {
  const f = frecuencia.toUpperCase();
  if (f === 'DIARIA') {
    return {
      intervaloDias: config.moraDiarioIntervaloDias && config.moraDiarioIntervaloDias > 0 ? config.moraDiarioIntervaloDias : 2,
      porcentaje: config.moraDiarioPorcentaje !== undefined && config.moraDiarioPorcentaje !== null ? config.moraDiarioPorcentaje : 50,
    };
  }
  if (f === 'SEMANAL') {
    return {
      intervaloDias: config.moraSemanalIntervaloDias && config.moraSemanalIntervaloDias > 0 ? config.moraSemanalIntervaloDias : 5,
      porcentaje: config.moraSemanalPorcentaje !== undefined && config.moraSemanalPorcentaje !== null ? config.moraSemanalPorcentaje : 50,
    };
  }
  if (f === 'QUINCENAL') {
    return {
      intervaloDias: config.moraQuincenalIntervaloDias && config.moraQuincenalIntervaloDias > 0 ? config.moraQuincenalIntervaloDias : 7,
      porcentaje: config.moraQuincenalPorcentaje !== undefined && config.moraQuincenalPorcentaje !== null ? config.moraQuincenalPorcentaje : 50,
    };
  }
  // MENSUAL
  return {
    intervaloDias: config.moraMensualIntervaloDias && config.moraMensualIntervaloDias > 0 ? config.moraMensualIntervaloDias : 10,
    porcentaje: config.moraMensualPorcentaje !== undefined && config.moraMensualPorcentaje !== null ? config.moraMensualPorcentaje : 50,
  };
}

/**
 * Calcula de manera modular e independiente la mora de una cuota individual.
 */
export function calcularMoraCuotaModular(
  cuota: Cuota,
  frecuencia: FrecuenciaPago = 'DIARIA',
  config: Configuracion,
  feriados: Feriado[] = [],
  fechaReferencia?: string
): DetalleMoraCuota {
  const hoyStr = fechaReferencia || new Date().toISOString().split('T')[0];
  const { intervaloDias, porcentaje } = obtenerParametrosMora(frecuencia, config);
  const valorBase = (cuota.saldoPendiente !== undefined && cuota.saldoPendiente > 0) 
    ? cuota.saldoPendiente 
    : (cuota.valorTotalCuota || 0);

  if (cuota.estado === 'PAGADA') {
    return {
      cuota,
      numeroCuota: cuota.numeroCuota,
      fechaVencimiento: cuota.fechaVencimiento,
      montoCapital: valorBase,
      diasAtrasoHabiles: 0,
      periodosMora: 0,
      porcentajeMoraAplicado: porcentaje,
      interesMora: 0,
      totalCuotaConMora: valorBase,
      estaEnMora: false,
    };
  }

  const diasAtrasoHabiles = calcularDiasAtrasoHabiles(cuota.fechaVencimiento, hoyStr, feriados);
  const periodosMora = intervaloDias > 0 ? Math.floor(diasAtrasoHabiles / intervaloDias) : 0;
  const interesMora = periodosMora * (valorBase * (porcentaje / 100));
  const totalCuotaConMora = Math.round(valorBase + interesMora);

  return {
    cuota,
    numeroCuota: cuota.numeroCuota,
    fechaVencimiento: cuota.fechaVencimiento,
    montoCapital: valorBase,
    diasAtrasoHabiles,
    periodosMora,
    porcentajeMoraAplicado: porcentaje,
    interesMora: Math.round(interesMora),
    totalCuotaConMora,
    estaEnMora: diasAtrasoHabiles > 0,
  };
}

/**
 * Consolida la deuda completa de una operación evaluando cada cuota de forma autónoma.
 */
export function consolidarDeudaOperacion(
  operacion: Operacion,
  cuotas: Cuota[],
  config: Configuracion,
  feriados: Feriado[] = [],
  fechaReferencia?: string
): ConsolidacionDeuda {
  const opCuotas = cuotas.filter(c => c.idOperacion === operacion.id);
  const cuotasPagadas = opCuotas.filter(c => c.estado === 'PAGADA');
  const cuotasImpagasRaw = opCuotas.filter(c => c.estado !== 'PAGADA');

  const cuotasImpagasDetalle = cuotasImpagasRaw
    .map(c => calcularMoraCuotaModular(c, operacion.frecuencia, config, feriados, fechaReferencia))
    .sort((a, b) => a.numeroCuota - b.numeroCuota);

  const totalCapitalImpago = cuotasImpagasDetalle.reduce((sum, item) => sum + item.montoCapital, 0);
  const totalMoraAcumulada = cuotasImpagasDetalle.reduce((sum, item) => sum + item.interesMora, 0);
  const totalConsolidado = totalCapitalImpago + totalMoraAcumulada;
  const maxDiasAtraso = cuotasImpagasDetalle.reduce((max, item) => Math.max(max, item.diasAtrasoHabiles), 0);

  return {
    cuotasImpagas: cuotasImpagasDetalle,
    cuotasPagadas,
    totalCapitalImpago,
    totalMoraAcumulada,
    totalConsolidado,
    cantidadCuotasImpagas: cuotasImpagasDetalle.length,
    maxDiasAtraso,
  };
}

/**
 * Genera el reporte con formato listo para WhatsApp (1 clic).
 */
export function generarReporteMoraWhatsApp(
  cliente: Cliente,
  operacion: Operacion,
  consolidacion: ConsolidacionDeuda,
  config: Configuracion,
  opciones?: {
    descuentoMoraContado?: number; // Ej: 50 para 50% de condonación de mora
    cuotasRefinanciacion?: number; // Ej: 10
    frecuenciaRefinanciacion?: FrecuenciaPago;
    valorCuotaRefinanciacion?: number;
  }
): string {
  const cbu = config.cbuOficial || '0170099220000049281729';
  const alias = config.aliasOficial || 'FINANCIERA.COBROS.OFICIAL';
  const nombreCliente = cliente.nombre || 'Estimado/a cliente';

  const lineasCuotas = consolidacion.cuotasImpagas.map(item => {
    if (item.diasAtrasoHabiles > 0) {
      return `• Cuota #${item.numeroCuota} ($${item.montoCapital.toLocaleString('es-AR')}) - Vencida: ${item.fechaVencimiento} | ${item.diasAtrasoHabiles} d. de atraso | Mora: +$${item.interesMora.toLocaleString('es-AR')}`;
    }
    return `• Cuota #${item.numeroCuota} ($${item.montoCapital.toLocaleString('es-AR')}) - Vence: ${item.fechaVencimiento} | Al día`;
  }).join('\n');

  let bloqueContado = `💵 *OPCIÓN 1: PAGO TOTAL AL CONTADO*\n• Total a cancelar hoy: *$${consolidacion.totalConsolidado.toLocaleString('es-AR')}*`;
  if (opciones?.descuentoMoraContado && opciones.descuentoMoraContado > 0) {
    const descuento = Math.round(consolidacion.totalMoraAcumulada * (opciones.descuentoMoraContado / 100));
    const totalConDescuento = consolidacion.totalConsolidado - descuento;
    bloqueContado += `\n• *Bonificación especial (${opciones.descuentoMoraContado}% quita de mora):* -$${descuento.toLocaleString('es-AR')}\n• *Importe final bonificado abonando hoy:* *$${totalConDescuento.toLocaleString('es-AR')}*`;
  }

  let bloqueRefinanciacion = '';
  if (opciones?.cuotasRefinanciacion && opciones.cuotasRefinanciacion > 0 && opciones.valorCuotaRefinanciacion) {
    bloqueRefinanciacion = `\n\n🤝 *OPCIÓN 2: PLAN DE REFINANCIACIÓN EN CUOTAS*\n• Cantidad: *${opciones.cuotasRefinanciacion} cuotas ${(opciones.frecuenciaRefinanciacion || operacion.frecuencia).toLowerCase()}s*\n• Valor de cada cuota: *$${opciones.valorCuotaRefinanciacion.toLocaleString('es-AR')}* fija`;
  }

  return `🏛️ *ESTADO DE CUENTA Y LIQUIDACIÓN - CREDICASH*
Estimado/a *${nombreCliente}*, le acercamos el detalle consolidado de su crédito:

📋 *Operación:* ${operacion.id} (${operacion.frecuencia})
📌 *Capital en mora pendiente:* $${consolidacion.totalCapitalImpago.toLocaleString('es-AR')}
⚠️ *Intereses de mora acumulados:* $${consolidacion.totalMoraAcumulada.toLocaleString('es-AR')}
📊 *Total Deuda Consolidada:* *$${consolidacion.totalConsolidado.toLocaleString('es-AR')}*

*Detalle por Cuota Impaga:*
${lineasCuotas}

${bloqueContado}${bloqueRefinanciacion}

🏦 *DATOS BANCARIOS OFICIALES PARA TRANSFERENCIA:*
• CBU: *${cbu}*
• Alias: *${alias}*
• Titular: *CrediCash Cobranzas Oficial*

_Una vez transferido, responda enviando el comprobante por este medio para su imputación inmediata._`;
}

/**
 * Obtiene el nombre seguro y anonimizado para operadores de WhatsApp (privacidad de datos).
 */
export function obtenerNombreAnonimizado(cliente: Cliente): string {
  if (cliente.aliasAnonimo && cliente.aliasAnonimo.trim() !== '') {
    return cliente.aliasAnonimo;
  }
  const primerNombre = (cliente.nombre || '').trim().split(' ')[0] || 'Cliente';
  return `${primerNombre} (${cliente.id})`;
}
