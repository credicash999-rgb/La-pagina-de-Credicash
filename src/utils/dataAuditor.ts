import { Cliente, Operacion, Cuota, Pago } from '../types';
import { parseDateToTimestamp, normalizeDateToISO, sortCuotasByPaymentPriority } from './cuotasGenerator';

export interface AuditResult {
  repairedClientes: Cliente[];
  repairedOperaciones: Operacion[];
  repairedCuotas: Cuota[];
  repairedPagos: Pago[];
  logs: string[];
  summary: {
    totalClientes: number;
    totalOperaciones: number;
    totalCuotas: number;
    totalPagosProcesados: number;
    operacionesFinalizadasCorregidas: number;
    cuotasAjustadas: number;
    clientesActualizados: number;
  };
}

/**
 * Reconstruye y audita todo el estado financiero de CrediCash basándose en los registros reales de Pago y fechas.
 * Garantiza consistencia matemática absoluta entre Pagos -> Cuotas -> Operaciones -> Clientes.
 */
export function reconstructAndRepairData(
  clientes: Cliente[],
  operaciones: Operacion[],
  cuotas: Cuota[],
  pagos: Pago[]
): AuditResult {
  const logs: string[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  let cuotasAjustadas = 0;
  let operacionesFinalizadasCorregidas = 0;
  let clientesActualizados = 0;

  // Clone payments & normalize dates and modalities
  const repairedPagosMap = new Map<string, Pago>();
  const newPagos: Pago[] = pagos.map(p => {
    const normDate = normalizeDateToISO(p.fechaPago) || todayStr;
    // Auto-correct erroneous OP_A (prepayment from back) to OP_B (consecutive starting from target/due date)
    let normModality = p.modalidad;
    if (normModality === 'PAGO_ADELANTADO_OPCION_A') {
      normModality = 'PAGO_ADELANTADO_OPCION_B';
    }
    const updatedPago: Pago = {
      ...p,
      fechaPago: normDate,
      modalidad: normModality
    };
    repairedPagosMap.set(updatedPago.id, updatedPago);
    return updatedPago;
  });

  // 1. Index payments by operation ID
  const pagosPorOperacion = new Map<string, Pago[]>();
  newPagos.forEach(pago => {
    if (!pago.idOperacion) return;
    const existing = pagosPorOperacion.get(pago.idOperacion) || [];
    existing.push(pago);
    pagosPorOperacion.set(pago.idOperacion, existing);
  });

  // Clone deep enough to avoid mutating props directly
  const newCuotas: Cuota[] = cuotas.map(c => ({ ...c }));
  const cuotasPorOperacion = new Map<string, Cuota[]>();
  newCuotas.forEach(cuota => {
    const existing = cuotasPorOperacion.get(cuota.idOperacion) || [];
    existing.push(cuota);
    cuotasPorOperacion.set(cuota.idOperacion, existing);
  });

  // Process each Operation
  const newOperaciones: Operacion[] = operaciones.map(op => {
    const opPagos = pagosPorOperacion.get(op.id) || [];
    const opCuotas = (cuotasPorOperacion.get(op.id) || []).sort((a, b) => a.numeroCuota - b.numeroCuota);

    // Reset all cuotas for this operation to initial baseline
    opCuotas.forEach(c => {
      c.importePagado = 0;
      c.saldoPendiente = c.valorTotalCuota;
      c.estado = 'PENDIENTE';
      c.fechaPago = '';
      c.fechaVencimiento = normalizeDateToISO(c.fechaVencimiento);
    });

    const resetCuotasMap = new Map<string, Cuota>(opCuotas.map(c => [c.id, c]));

    // Sort operation payments chronologically
    const sortedOpPagos = [...opPagos].sort((a, b) => parseDateToTimestamp(a.fechaPago) - parseDateToTimestamp(b.fechaPago));

    let totalCapitalPaid = 0;
    let totalInteresPaid = 0;
    let totalAmountPaid = 0;
    let lastPaymentDate = op.ultimoPago || '';

    sortedOpPagos.forEach(p => {
      p.fechaPago = normalizeDateToISO(p.fechaPago);
      let rem = p.importe;
      totalAmountPaid += p.importe;
      lastPaymentDate = p.fechaPago;

      const currentCuotasList = Array.from(resetCuotasMap.values());
      const processOrder = sortCuotasByPaymentPriority(currentCuotasList, p.fechaPago, p.modalidad);

      const affectedCuotaDetails: string[] = [];

      processOrder.forEach(cuo => {
        if (rem <= 0) return;
        const currentCuo = resetCuotasMap.get(cuo.id)!;
        const cuoSaldo = currentCuo.saldoPendiente;

        if (rem >= cuoSaldo) {
          const paidThis = cuoSaldo;
          rem = parseFloat((rem - paidThis).toFixed(2));

          const ratioCap = currentCuo.valorTotalCuota > 0 ? (currentCuo.capitalCuota / currentCuo.valorTotalCuota) : 0;
          const ratioInt = currentCuo.valorTotalCuota > 0 ? (currentCuo.interesCuota / currentCuo.valorTotalCuota) : 0;

          totalCapitalPaid += parseFloat((paidThis * ratioCap).toFixed(2));
          totalInteresPaid += parseFloat((paidThis * ratioInt).toFixed(2));

          currentCuo.importePagado = parseFloat((currentCuo.importePagado + paidThis).toFixed(2));
          currentCuo.saldoPendiente = 0;
          currentCuo.estado = 'PAGADA';
          currentCuo.fechaPago = p.fechaPago;
          currentCuo.cobrador = p.cobrador || currentCuo.cobrador;

          affectedCuotaDetails.push(`Cuota N° ${currentCuo.numeroCuota} (${currentCuo.fechaVencimiento})`);
          cuotasAjustadas++;
        } else {
          const paidThis = rem;
          rem = 0;

          const ratioCap = currentCuo.valorTotalCuota > 0 ? (currentCuo.capitalCuota / currentCuo.valorTotalCuota) : 0;
          const ratioInt = currentCuo.valorTotalCuota > 0 ? (currentCuo.interesCuota / currentCuo.valorTotalCuota) : 0;

          totalCapitalPaid += parseFloat((paidThis * ratioCap).toFixed(2));
          totalInteresPaid += parseFloat((paidThis * ratioInt).toFixed(2));

          currentCuo.importePagado = parseFloat((currentCuo.importePagado + paidThis).toFixed(2));
          currentCuo.saldoPendiente = parseFloat((currentCuo.saldoPendiente - paidThis).toFixed(2));
          currentCuo.estado = 'PAGO_PARCIAL';
          currentCuo.fechaPago = p.fechaPago;
          currentCuo.cobrador = p.cobrador || currentCuo.cobrador;

          affectedCuotaDetails.push(`Cuota N° ${currentCuo.numeroCuota} (Parcial $${paidThis})`);
          cuotasAjustadas++;
        }
        resetCuotasMap.set(currentCuo.id, currentCuo);
      });

      if (affectedCuotaDetails.length > 0) {
        const pInMap = repairedPagosMap.get(p.id);
        if (pInMap) {
          pInMap.cuotasAfectadas = affectedCuotaDetails.join(', ');
        }
      }
    });

    let maxDiasMoraOp = 0;
    let cuotasPagadasCount = 0;
    Array.from(resetCuotasMap.values()).forEach(c => {
      if (c.estado === 'PAGADA') {
        cuotasPagadasCount++;
      } else if (c.fechaVencimiento < todayStr) {
        if (c.estado !== 'PAGO_PARCIAL') c.estado = 'VENCIDA';
        const dueTs = parseDateToTimestamp(c.fechaVencimiento);
        const todayTs = parseDateToTimestamp(todayStr);
        const diffMs = todayTs - dueTs;
        const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (dias > maxDiasMoraOp) maxDiasMoraOp = dias;
      }
    });

    const capitalRecuperado = totalCapitalPaid;
    const interesCobrado = totalInteresPaid;
    const totalPagadoReal = totalAmountPaid;
    const ultimoPagoFecha = lastPaymentDate;
    let proximoVencimiento = op.proximoVencimiento;

    // Determine upcoming expiration date among unpaid/partial cuotas
    const cuotaPendienteSig = opCuotas.find(c => c.estado === 'PENDIENTE' || c.estado === 'VENCIDA' || c.estado === 'PAGO_PARCIAL');
    if (cuotaPendienteSig) {
      proximoVencimiento = cuotaPendienteSig.fechaVencimiento;
    }

    const totalPendienteCalculado = Math.max(0, Math.round((op.totalFinanciado - totalPagadoReal) * 100) / 100);
    const capitalPendienteCalculado = Math.max(0, Math.round((op.capitalEntregado - capitalRecuperado) * 100) / 100);
    const cuotasPendientesCount = Math.max(0, opCuotas.length - cuotasPagadasCount);

    let nuevoEstadoOp = op.estado;
    let fechaFin = op.fechaFinalizacion || '';
    let motivoCierre = op.motivoCierre || '';

    if (totalPendienteCalculado <= 0.01 || (opCuotas.length > 0 && cuotasPagadasCount === opCuotas.length)) {
      if (nuevoEstadoOp !== 'FINALIZADA') {
        nuevoEstadoOp = 'FINALIZADA';
        fechaFin = ultimoPagoFecha || todayStr;
        motivoCierre = 'Crédito cancelado en su totalidad por historial de pagos';
        operacionesFinalizadasCorregidas++;
        logs.push(`Operación ${op.id} (${op.nombreCliente}): Marcada como FINALIZADA (Pagado $${totalPagadoReal.toLocaleString()})`);
      }
    } else if (maxDiasMoraOp > 0) {
      if (nuevoEstadoOp !== 'CONGELADA' && nuevoEstadoOp !== 'REFINANCIADA') {
        nuevoEstadoOp = 'VENCIDA';
      }
    } else {
      if (nuevoEstadoOp !== 'CONGELADA' && nuevoEstadoOp !== 'REFINANCIADA') {
        nuevoEstadoOp = 'ACTIVA';
      }
    }

    return {
      ...op,
      estado: nuevoEstadoOp,
      cuotasPagadas: cuotasPagadasCount,
      cuotasPendientes: cuotasPendientesCount,
      capitalRecuperado: Math.round(capitalRecuperado * 100) / 100,
      interesCobrado: Math.round(interesCobrado * 100) / 100,
      capitalPendiente: capitalPendienteCalculado,
      totalPendiente: totalPendienteCalculado,
      proximoVencimiento,
      ultimoPago: ultimoPagoFecha,
      diasMora: maxDiasMoraOp,
      nivelMora: maxDiasMoraOp > 30 ? 'Mora Severa' : maxDiasMoraOp > 0 ? 'Mora Leve' : 'Al Día',
      fechaFinalizacion: fechaFin,
      motivoCierre
    };
  });

  // Process and update Clientes based on repaired operations
  const newClientes: Cliente[] = clientes.map(cliente => {
    const clientOps = newOperaciones.filter(o => o.idCliente === cliente.id);

    if (clientOps.length === 0) return cliente;

    const tieneOpsActivasOVencidas = clientOps.some(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA');
    const tieneOpsEnMora = clientOps.some(o => (o.estado === 'ACTIVA' || o.estado === 'VENCIDA') && o.diasMora > 0);
    const maxMoraCliente = Math.max(...clientOps.filter(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA').map(o => o.diasMora), 0);
    const deudaTotalPendiente = clientOps
      .filter(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA')
      .reduce((s, o) => s + o.totalPendiente, 0);

    let nuevoEstadoCliente = cliente.estado;

    if (tieneOpsEnMora) {
      nuevoEstadoCliente = 'EN_MORA';
    } else if (tieneOpsActivasOVencidas) {
      nuevoEstadoCliente = 'ACTIVO';
    } else if (clientOps.length > 0 && clientOps.every(o => o.estado === 'FINALIZADA')) {
      if (cliente.estado !== 'INACTIVO' && cliente.estado !== 'EVASIVO') {
        nuevoEstadoCliente = 'FINALIZADO';
      }
    }

    if (
      cliente.estado !== nuevoEstadoCliente ||
      cliente.diasMora !== maxMoraCliente
    ) {
      clientesActualizados++;
      logs.push(`Cliente ${cliente.nombre} ${cliente.apellido} (${cliente.id}): Estado ajustado a ${nuevoEstadoCliente} (Mora: ${maxMoraCliente} días)`);
    }

    return {
      ...cliente,
      estado: nuevoEstadoCliente,
      diasMora: maxMoraCliente,
      montoDeudaInactivo: deudaTotalPendiente > 0 ? deudaTotalPendiente : cliente.montoDeudaInactivo
    };
  });

  return {
    repairedClientes: newClientes,
    repairedOperaciones: newOperaciones,
    repairedCuotas: newCuotas,
    repairedPagos: Array.from(repairedPagosMap.values()),
    logs,
    summary: {
      totalClientes: clientes.length,
      totalOperaciones: operaciones.length,
      totalCuotas: cuotas.length,
      totalPagosProcesados: pagos.length,
      operacionesFinalizadasCorregidas,
      cuotasAjustadas,
      clientesActualizados
    }
  };
}

/**
 * Permite la actualización masiva de cuentas bancarias (Banco, Alias, CBU) de clientes vía lista CSV o JSON.
 */
export function applyBatchBankUpdates(
  clientes: Cliente[],
  bankDataLines: string
): { clientesActualizados: Cliente[]; actualizadosCount: number; errores: string[] } {
  const errores: string[] = [];
  let actualizadosCount = 0;

  // Split lines
  const lines = bankDataLines.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  // Map of client lookup by DNI or ID
  const clientesCopy = clientes.map(c => ({ ...c }));

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    // Separators can be comma, tab, or semicolon
    const parts = trimmed.split(/[,;\t]/).map(p => p.trim().replace(/^"|"$/g, ''));

    if (parts.length < 2) return;

    // Expected formats:
    // Format 1: DNI or ID, BANCO, ALIAS/CBU
    // Format 2: ID/DNI, ALIAS/CBU
    const identifier = parts[0];
    let banco = '';
    let aliasCbu = '';

    if (parts.length >= 3) {
      banco = parts[1];
      aliasCbu = parts[2];
    } else {
      aliasCbu = parts[1];
      banco = 'Cuenta Bancaria';
    }

    const clienteIdx = clientesCopy.findIndex(c => 
      c.id.toLowerCase() === identifier.toLowerCase() || 
      c.dni.replace(/\D/g, '') === identifier.replace(/\D/g, '')
    );

    if (clienteIdx >= 0) {
      clientesCopy[clienteIdx].banco = banco || clientesCopy[clienteIdx].banco || 'Banco';
      clientesCopy[clienteIdx].aliasCbu = aliasCbu;
      actualizadosCount++;
    } else {
      errores.push(`Línea ${idx + 1}: No se encontró cliente con ID o DNI "${identifier}".`);
    }
  });

  return {
    clientesActualizados: clientesCopy,
    actualizadosCount,
    errores
  };
}
