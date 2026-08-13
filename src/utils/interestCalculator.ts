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
  const frecuencia = operacion?.frecuencia || 'DIARIA';
  
  const opValCuota = Number(operacion?.valorCuota);
  const firstCuotaVal = Array.isArray(cuotasOperacion) && cuotasOperacion.length > 0 ? Number(cuotasOperacion[0]?.valorTotalCuota) : 0;
  const valorCuota = (!isNaN(opValCuota) && opValCuota > 0) ? opValCuota : ((!isNaN(firstCuotaVal) && firstCuotaVal > 0) ? firstCuotaVal : 0);

  // Configured rates (default 50%)
  const rateDiario = Number(configuracion?.interesAtrasoDiario) || 50;
  const rateSemanal = Number(configuracion?.interesAtrasoSemanal) || 50;
  const rateQuincenal = Number(configuracion?.interesAtrasoQuincenal) || 50;
  const rateMensual = Number(configuracion?.interesAtrasoMensual) || 50;

  // Configured grace thresholds (default: 3 días diario, 4 semanal, 5 quincenal, 7 mensual)
  const umbralDiario = Number(configuracion?.moraDiarioAplicaDesdeDias) || 3;
  const umbralSemanal = Number(configuracion?.moraSemanalAplicaDesdeDias) || 4;
  const umbralQuincenal = Number(configuracion?.moraQuincenalAplicaDesdeDias) || 5;
  const umbralMensual = Number(configuracion?.moraMensualAplicaDesdeDias) || 7;

  const detalles: DetalleInteresCuota[] = [];
  let totalIntereses = 0;
  let totalDiasAtraso = 0;

  // Safe sort cuotas by number
  const safeCuotas = Array.isArray(cuotasOperacion) ? cuotasOperacion.filter(Boolean) : [];
  const sortedCuotas = [...safeCuotas].sort((a, b) => (a.numeroCuota || 0) - (b.numeroCuota || 0));

  sortedCuotas.forEach(c => {
    let fechaPagoFinal = c.fechaPago || (c.estado === 'PAGADA' ? hoyStr : '');
    let dias = 0;

    if (c.fechaVencimiento) {
      if (fechaPagoFinal && fechaPagoFinal > c.fechaVencimiento) {
        dias = calcularDiasAtrasoSinDomingos(c.fechaVencimiento, fechaPagoFinal);
      } else if (!fechaPagoFinal && c.fechaVencimiento < hoyStr) {
        dias = calcularDiasAtrasoSinDomingos(c.fechaVencimiento, hoyStr);
      } else if (typeof c.diasAtraso === 'number' && c.diasAtraso > 0) {
        dias = c.diasAtraso;
      }
    }

    if (isNaN(dias) || dias < 0) dias = 0;

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
      const cValNum = Number(c.valorTotalCuota);
      const cuotaRef = (!isNaN(cValNum) && cValNum > 0) ? cValNum : valorCuota;
      const interes = Math.round(cuotaRef * (pct / 100) * periodos);
      const interesValido = isNaN(interes) ? 0 : interes;
      totalIntereses += interesValido;

      detalles.push({
        numeroCuota: c.numeroCuota || 0,
        fechaVencimiento: c.fechaVencimiento || '-',
        fechaPago: fechaPagoFinal || 'PENDIENTE',
        diasAtraso: dias,
        umbralDiasAplicado: umbral,
        periodosAtraso: periodos,
        unidadPeriodo: unidad,
        porcentajeAplicado: pct,
        interesGenerado: interesValido
      });
    }
  });

  const totalInteresesSafe = isNaN(totalIntereses) ? 0 : totalIntereses;
  const cuotasInteresEquivalentes = valorCuota > 0 ? Math.round((totalInteresesSafe / valorCuota) * 10) / 10 : 0;
  const cuotasEquivSafe = isNaN(cuotasInteresEquivalentes) ? 0 : cuotasInteresEquivalentes;

  return {
    idOperacion: operacion?.id || '',
    idCliente: operacion?.idCliente || '',
    nombreCliente: operacion?.nombreCliente || '',
    frecuencia: frecuencia,
    valorCuota,
    cuotasTotales: sortedCuotas.length || operacion?.cantidadCuotas || 0,
    cuotasConAtraso: detalles.length,
    totalDiasAtraso,
    detalles,
    totalIntereses: totalInteresesSafe,
    cuotasInteresEquivalentes: cuotasEquivSafe,
    esAptoRenovacionDirecta: detalles.length === 0 || totalInteresesSafe === 0,
    requiereRefinanciacionMora: detalles.length > 0 && totalInteresesSafe > 0
  };
}
