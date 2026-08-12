import { Operacion, Cuota, Pago, Configuracion, FrecuenciaPago } from '../types';
import { calcularDiasAtrasoSinDomingos } from './cuotasGenerator';

export interface DetalleInteresCuota {
  numeroCuota: number;
  fechaVencimiento: string;
  fechaPago: string;
  diasAtraso: number;
  umbralDiasAplicado: number;
  periodosAtraso: number;
  unidadPeriodo: string;
  porcentajeAplicado: number;
  interesGenerado: number;
}

export interface ResumenInteresesCredito {
  idOperacion: string;
  idCliente: string;
  nombreCliente: string;
  frecuencia: FrecuenciaPago;
  valorCuota: number;
  cuotasTotales: number;
  cuotasConAtraso: number;
  totalDiasAtraso: number;
  detalles: DetalleInteresCuota[];
  totalIntereses: number;
  cuotasInteresEquivalentes: number;
  esAptoRenovacionDirecta: boolean;
  requiereRefinanciacionMora: boolean;
}

/**
 * Calcula detalladamente los intereses por atraso de una operación
 * basándose en la Política de Intereses por Atraso configurable.
 */
export function calcularInteresesAtrasoCredito(
  operacion: Operacion,
  cuotasOperacion: Cuota[],
  configuracion?: Configuracion
): ResumenInteresesCredito {
  const hoyStr = new Date().toISOString().split('T')[0];
  const frecuencia = operacion.frecuencia || 'DIARIA';
  const valorCuota = operacion.valorCuota || (cuotasOperacion[0]?.valorTotalCuota || 0);

  // Configured rates (default 50%)
  const rateDiario = configuracion?.interesAtrasoDiario ?? 50;
  const rateSemanal = configuracion?.interesAtrasoSemanal ?? 50;
  const rateQuincenal = configuracion?.interesAtrasoQuincenal ?? 50;
  const rateMensual = configuracion?.interesAtrasoMensual ?? 50;

  // Configured grace thresholds (default: 3 días diario, 4 semanal, 5 quincenal, 7 mensual)
  const umbralDiario = configuracion?.moraDiarioAplicaDesdeDias ?? 3;
  const umbralSemanal = configuracion?.moraSemanalAplicaDesdeDias ?? 4;
  const umbralQuincenal = configuracion?.moraQuincenalAplicaDesdeDias ?? 5;
  const umbralMensual = configuracion?.moraMensualAplicaDesdeDias ?? 7;

  const detalles: DetalleInteresCuota[] = [];
  let totalIntereses = 0;
  let totalDiasAtraso = 0;

  // Sort cuotas by number
  const sortedCuotas = [...cuotasOperacion].sort((a, b) => a.numeroCuota - b.numeroCuota);

  sortedCuotas.forEach(c => {
    let fechaPagoFinal = c.fechaPago || (c.estado === 'PAGADA' ? hoyStr : '');
    let dias = 0;

    if (fechaPagoFinal && fechaPagoFinal > c.fechaVencimiento) {
      dias = calcularDiasAtrasoSinDomingos(c.fechaVencimiento, fechaPagoFinal);
    } else if (!fechaPagoFinal && c.fechaVencimiento < hoyStr) {
      dias = calcularDiasAtrasoSinDomingos(c.fechaVencimiento, hoyStr);
    } else if (c.diasAtraso && c.diasAtraso > 0) {
      dias = c.diasAtraso;
    }

    let umbral = umbralDiario;
    let pct = rateDiario;
    let periodos = 0;
    let unidad = 'días';

    switch (frecuencia) {
      case 'DIARIA':
        umbral = umbralDiario;
        pct = rateDiario;
        periodos = dias;
        unidad = 'días';
        break;
      case 'SEMANAL':
        umbral = umbralSemanal;
        pct = rateSemanal;
        periodos = Math.max(1, Math.ceil(dias / 7));
        unidad = 'semanas';
        break;
      case 'QUINCENAL':
        umbral = umbralQuincenal;
        pct = rateQuincenal;
        periodos = Math.max(1, Math.ceil(dias / 15));
        unidad = 'quincenas';
        break;
      case 'MENSUAL':
        umbral = umbralMensual;
        pct = rateMensual;
        periodos = Math.max(1, Math.ceil(dias / 30));
        unidad = 'meses';
        break;
    }

    // A partir del umbral configurable (ej. a partir del día 3 de atraso) se aplica el interés
    if (dias >= umbral && dias > 0) {
      totalDiasAtraso += dias;
      const cuotaRef = c.valorTotalCuota || valorCuota || 0;
      const interes = Math.round(cuotaRef * (pct / 100) * periodos);
      totalIntereses += interes;

      detalles.push({
        numeroCuota: c.numeroCuota,
        fechaVencimiento: c.fechaVencimiento,
        fechaPago: fechaPagoFinal || 'PENDIENTE',
        diasAtraso: dias,
        umbralDiasAplicado: umbral,
        periodosAtraso: periodos,
        unidadPeriodo: unidad,
        porcentajeAplicado: pct,
        interesGenerado: interes
      });
    }
  });

  const cuotasInteresEquivalentes = valorCuota > 0 ? Math.round((totalIntereses / valorCuota) * 10) / 10 : 0;
  const esAptoRenovacionDirecta = detalles.length === 0 || totalIntereses === 0;
  const requiereRefinanciacionMora = detalles.length > 0 && totalIntereses > 0;

  return {
    idOperacion: operacion.id,
    idCliente: operacion.idCliente,
    nombreCliente: operacion.nombreCliente,
    frecuencia: frecuencia,
    valorCuota,
    cuotasTotales: cuotasOperacion.length || operacion.cantidadCuotas || 0,
    cuotasConAtraso: detalles.length,
    totalDiasAtraso,
    detalles,
    totalIntereses,
    cuotasInteresEquivalentes,
    esAptoRenovacionDirecta,
    requiereRefinanciacionMora
  };
}
