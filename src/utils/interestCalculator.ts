import { Operacion, Cuota, Pago, Configuracion, FrecuenciaPago } from '../types';
import { calcularDiasAtrasoSinDomingos } from './cuotasGenerator';

export interface DetalleInteresCuota {
  numeroCuota: number;
  fechaVencimiento: string;
  fechaPago: string;
  diasAtraso: number;
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
  cuotasTotales: number;
  cuotasConAtraso: number;
  totalDiasAtraso: number;
  detalles: DetalleInteresCuota[];
  totalIntereses: number;
  esAptoRenovacionDirecta: boolean;
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

  // Configured rates (default 50%)
  const rateDiario = configuracion?.interesAtrasoDiario ?? 50;
  const rateSemanal = configuracion?.interesAtrasoSemanal ?? 50;
  const rateQuincenal = configuracion?.interesAtrasoQuincenal ?? 50;
  const rateMensual = configuracion?.interesAtrasoMensual ?? 50;

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

    if (dias > 0) {
      totalDiasAtraso += dias;
      let periodos = 0;
      let unidad = 'días';
      let pct = 50;

      switch (frecuencia) {
        case 'DIARIA':
          periodos = dias;
          unidad = 'días';
          pct = rateDiario;
          break;
        case 'SEMANAL':
          periodos = Math.max(1, Math.ceil(dias / 7));
          unidad = 'semanas';
          pct = rateSemanal;
          break;
        case 'QUINCENAL':
          periodos = Math.max(1, Math.ceil(dias / 15));
          unidad = 'quincenas';
          pct = rateQuincenal;
          break;
        case 'MENSUAL':
          periodos = Math.max(1, Math.ceil(dias / 30));
          unidad = 'meses';
          pct = rateMensual;
          break;
      }

      const interes = Math.round((c.valorTotalCuota || 0) * (pct / 100) * periodos);
      totalIntereses += interes;

      detalles.push({
        numeroCuota: c.numeroCuota,
        fechaVencimiento: c.fechaVencimiento,
        fechaPago: fechaPagoFinal || 'PENDIENTE',
        diasAtraso: dias,
        periodosAtraso: periodos,
        unidadPeriodo: unidad,
        porcentajeAplicado: pct,
        interesGenerado: interes
      });
    }
  });

  const esAptoRenovacionDirecta = detalles.length === 0;

  return {
    idOperacion: operacion.id,
    idCliente: operacion.idCliente,
    nombreCliente: operacion.nombreCliente,
    frecuencia: frecuencia,
    cuotasTotales: cuotasOperacion.length || operacion.cantidadCuotas || 0,
    cuotasConAtraso: detalles.length,
    totalDiasAtraso,
    detalles,
    totalIntereses,
    esAptoRenovacionDirecta
  };
}
