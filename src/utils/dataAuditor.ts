import { Cliente, Operacion, Cuota, Pago } from '../types';

export interface AuditResult {
  repairedClientes: Cliente[];
  repairedOperaciones: Operacion[];
  repairedCuotas: Cuota[];
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

  // 1. Index payments by operation ID and client ID
  const pagosPorOperacion = new Map<string, Pago[]>();
  pagos.forEach(pago => {
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

    // Sum total paid on this operation from payments history
    const totalPagadoReal = opPagos.reduce((sum, p) => sum + (Number(p.importe) || 0), 0);

    let saldoDisponibleParaCuotas = totalPagadoReal;
    let cuotasPagadasCount = 0;
    let capitalRecuperado = 0;
    let interesCobrado = 0;
    let maxDiasMoraOp = 0;
    let proximoVencimiento = op.proximoVencimiento;
    let ultimoPagoFecha = op.ultimoPago;

    if (opPagos.length > 0) {
      // Find latest payment date
      const sortedPagos = [...opPagos].sort((a, b) => a.fechaPago.localeCompare(b.fechaPago));
      ultimoPagoFecha = sortedPagos[sortedPagos.length - 1].fechaPago;
    }

    // Allocate payment money chronologically across cuotas
    opCuotas.forEach(cuota => {
      const valorCuota = cuota.valorTotalCuota || (cuota.capitalCuota + cuota.interesCuota);
      let nuevoEstadoCuota = cuota.estado;
      let nuevoImportePagado = 0;
      let nuevoSaldoPendiente = valorCuota;
      let fechaPagoCuota = cuota.fechaPago || '';

      if (saldoDisponibleParaCuotas >= valorCuota) {
        // Fully paid
        saldoDisponibleParaCuotas -= valorCuota;
        nuevoEstadoCuota = 'PAGADA';
        nuevoImportePagado = valorCuota;
        nuevoSaldoPendiente = 0;
        cuotasPagadasCount++;
        capitalRecuperado += cuota.capitalCuota;
        interesCobrado += cuota.interesCuota;
        if (!fechaPagoCuota) fechaPagoCuota = ultimoPagoFecha || todayStr;
      } else if (saldoDisponibleParaCuotas > 0) {
        // Partially paid
        nuevoImportePagado = saldoDisponibleParaCuotas;
        nuevoSaldoPendiente = valorCuota - saldoDisponibleParaCuotas;
        nuevoEstadoCuota = 'PAGO_PARCIAL';
        const proporcion = valorCuota > 0 ? (saldoDisponibleParaCuotas / valorCuota) : 0;
        capitalRecuperado += cuota.capitalCuota * proporcion;
        interesCobrado += cuota.interesCuota * proporcion;
        saldoDisponibleParaCuotas = 0;
      } else {
        // Unpaid
        nuevoImportePagado = 0;
        nuevoSaldoPendiente = valorCuota;
        if (cuota.fechaVencimiento < todayStr) {
          nuevoEstadoCuota = 'VENCIDA';
          // Calculate overdue days
          const diffMs = new Date(todayStr).getTime() - new Date(cuota.fechaVencimiento).getTime();
          const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          if (dias > maxDiasMoraOp) maxDiasMoraOp = dias;
        } else {
          nuevoEstadoCuota = 'PENDIENTE';
        }
      }

      if (
        cuota.estado !== nuevoEstadoCuota ||
        cuota.importePagado !== nuevoImportePagado ||
        cuota.saldoPendiente !== nuevoSaldoPendiente
      ) {
        cuotasAjustadas++;
        cuota.estado = nuevoEstadoCuota;
        cuota.importePagado = Math.round(nuevoImportePagado * 100) / 100;
        cuota.saldoPendiente = Math.round(nuevoSaldoPendiente * 100) / 100;
        cuota.fechaPago = fechaPagoCuota;
      }
    });

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
