import jsPDF from 'jspdf';
import { Cliente, Operacion, Cuota } from '../types';
import { generarPlanCuotas } from './cuotasGenerator';

export function exportDailyRoutePDF(
  cobradorNombre: string,
  fechaStr: string,
  assignedClients: Cliente[],
  operaciones: Operacion[],
  cuotas: Cuota[],
  potencialCobroTotal: number,
  potencialGananciaTotal: number,
  tiempoEstimadoFormatted: string
) {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(245, 158, 11); // amber-500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('CREDICASH - HOJA DE RUTA Y GESTIÓN EN CALLE', 10, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`Cobrador: ${cobradorNombre.toUpperCase()} | Fecha: ${fechaStr}`, 10, 20);
  doc.text(`Tiempo Estimado Recorrido: ${tiempoEstimadoFormatted}`, 130, 20);

  // Subheader Summary
  doc.setFillColor(241, 245, 249);
  doc.rect(10, 32, 190, 14, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, 32, 190, 14, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.text(`Total Clientes a Visitar: ${assignedClients.length}`, 14, 40);
  doc.text(`Cobro Esperado Total: $${potencialCobroTotal.toLocaleString('es-AR')}`, 75, 40);
  doc.text(`Ganancia Estimada: $${potencialGananciaTotal.toLocaleString('es-AR')}`, 145, 40);

  let y = 50;

  // Table Headers
  doc.setFillColor(30, 41, 59);
  doc.rect(10, y, 190, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('N°', 12, y + 5);
  doc.text('CLIENTE / DNI / TEL', 20, y + 5);
  doc.text('DIRECCIÓN DOMICILIO', 75, y + 5);
  doc.text('CUOTAS EN MORA', 120, y + 5);
  doc.text('TOTAL DEUDA / MÍNIMO', 152, y + 5);
  doc.text('FIRMA / COBRO ($)', 178, y + 5);

  y += 9;

  assignedClients.forEach((cli, idx) => {
    if (y > 265) {
      doc.addPage();
      y = 15;
      // Header repeated
      doc.setFillColor(30, 41, 59);
      doc.rect(10, y, 190, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('N°', 12, y + 5);
      doc.text('CLIENTE / DNI / TEL', 20, y + 5);
      doc.text('DIRECCIÓN DOMICILIO', 75, y + 5);
      doc.text('CUOTAS EN MORA', 120, y + 5);
      doc.text('TOTAL DEUDA / MÍNIMO', 152, y + 5);
      doc.text('FIRMA / COBRO ($)', 178, y + 5);
      y += 9;
    }

    const cOps = operaciones.filter(o => o.idCliente === cli.id && o.estado !== 'FINALIZADA' && o.estado !== 'REFINANCIADA');
    let cCuotas = cuotas.filter(cu => cOps.some(o => o.id === cu.idOperacion) && cu.estado !== 'PAGADA');
    
    if (cCuotas.length === 0 && cOps.length > 0) {
      cCuotas = cOps.flatMap(o => generarPlanCuotas(o, []).filter(cu => cu.estado !== 'PAGADA'));
    }

    const cuotasMora = cCuotas.filter(cu => cu.fechaVencimiento < fechaStr);
    const cuotasHoy = cCuotas.filter(cu => cu.fechaVencimiento === fechaStr);
    
    // Only count overdue / due today cuotas for collector total
    let cuotasExigibles = [...cuotasMora, ...cuotasHoy];
    if (cuotasExigibles.length === 0 && cCuotas.length > 0) {
      cuotasExigibles = [cCuotas[0]];
    }

    const totalDeudaExigible = cuotasExigibles.reduce((sum, cu) => sum + (cu.saldoPendiente > 0 ? cu.saldoPendiente : cu.valorTotalCuota || 0), 0);
    const maxDiasMora = cOps.reduce((max, o) => Math.max(max, o.diasMora || 0), 0);

    let montoAPagar = totalDeudaExigible;
    let montoMinimo = cuotasExigibles.length > 1 ? Math.round(totalDeudaExigible * 0.5) : totalDeudaExigible;

    if (cli.estado === 'INACTIVO' || (cli.montoDeudaInactivo && cli.montoDeudaInactivo > 0)) {
      montoAPagar = cli.montoPagoInicialRefinanciacion || Math.round((cli.montoDeudaInactivo || 150000) * 0.3);
      montoMinimo = cli.montoMinimoInactivoConfigurado || Math.round((cli.montoDeudaInactivo || 150000) * 0.2);
    }

    const bgHex = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
    doc.setFillColor(bgHex);
    doc.rect(10, y, 190, 16, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(10, y, 190, 16, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(String(idx + 1), 12, y + 6);

    doc.text(`${cli.nombre} ${cli.apellido}`.slice(0, 26), 20, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`DNI: ${cli.dni || 'N/A'} | Tel: ${cli.telefono || cli.whatsapp || 'N/A'}`, 20, y + 10);

    const dirStr = (cli.direccion || `${cli.calle || ''} ${cli.numero || ''}`).slice(0, 28);
    doc.setFontSize(8);
    doc.text(dirStr, 75, y + 5);
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Barrio: ${cli.barrio || cli.ciudad || 'Centro'}`, 75, y + 10);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${cuotasExigibles.length} cuota(s) en mora/día`, 120, y + 5);
    doc.setFontSize(7);
    doc.setTextColor(cuotasMora.length > 0 ? 225 : 100, cuotasMora.length > 0 ? 29 : 116, cuotasMora.length > 0 ? 72 : 139);
    doc.text(cuotasMora.length > 0 ? `Mora: ${maxDiasMora} días` : `Cuota del Día`, 120, y + 10);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(225, 29, 72); // rose-600 for mora debt
    doc.text(`Total: $${montoAPagar.toLocaleString('es-AR')}`, 152, y + 5);
    doc.setFontSize(7);
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(`Mín. Exig: $${montoMinimo.toLocaleString('es-AR')}`, 152, y + 10);

    // Box for collector signature / cash collected
    doc.setDrawColor(148, 163, 184);
    doc.rect(178, y + 2, 20, 12, 'S');

    y += 18;
  });

  // Footer / Office Signoff
  if (y > 245) {
    doc.addPage();
    y = 20;
  }

  y += 5;
  doc.setDrawColor(203, 213, 225);
  doc.line(10, y, 200, y);
  y += 10;

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('RENDICIÓN DE PLANILLA EN OFICINA AL FINALIZAR EL DÍA:', 10, y);

  y += 15;
  doc.line(20, y, 70, y);
  doc.line(130, y, 180, y);

  doc.setFontSize(7);
  doc.text('Firma y Aclaración Cobrador', 25, y + 4);
  doc.text('Firma y Sello Recepción Tesorería', 132, y + 4);

  doc.save(`HOJA_DE_RUTA_${cobradorNombre.replace(/\s+/g, '_')}_${fechaStr.replace(/\//g, '-')}.pdf`);
}

/**
 * COMPROBANTE TIPO GESTIÓN DIARIA (ESTADO DE CUENTA COMPLETO PARA EL CLIENTE)
 * Incluye: Nombre, Apellido, DNI, Crédito, Cuotas, Fechas, Importes, Pagos
 */
export function exportComprobanteGestionDiariaPDF(
  cliente: Cliente,
  operaciones: Operacion[],
  cuotas: Cuota[],
  pagos: Pago[]
) {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(16, 185, 129); // emerald-500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('CREDICASH - COMPROBANTE ESTADO DE CUENTA', 10, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`Fecha de Emisión: ${todayStr}`, 10, 20);
  doc.text(`Cliente: ${cliente.nombre.toUpperCase()} ${cliente.apellido ? cliente.apellido.toUpperCase() : ''}`, 110, 20);

  // Client Details Box
  doc.setFillColor(241, 245, 249);
  doc.rect(10, 32, 190, 18, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, 32, 190, 18, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`DNI: ${cliente.dni}`, 14, 38);
  doc.text(`Teléfono: ${cliente.telefono || 'N/A'}`, 75, 38);
  doc.text(`Estado: ${cliente.estado}`, 145, 38);

  doc.setFont('helvetica', 'normal');
  doc.text(`Domicilio: ${cliente.direccion || cliente.calle || 'N/A'}`, 14, 45);
  doc.text(`Cobrador: ${cliente.cobradorAsignadoNombre || 'Administración Central'}`, 110, 45);

  let y = 56;

  // Active Loans & Cuotas Breakdown
  const clientOps = operaciones.filter(o => o.idCliente === cliente.id);

  clientOps.forEach((op) => {
    if (y > 250) {
      doc.addPage();
      y = 15;
    }

    doc.setFillColor(30, 41, 59);
    doc.rect(10, y, 190, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`CRÉDITO N° ${op.id} | Frecuencia: ${op.frecuencia} | Otorgado: ${op.fechaOtorgamiento} | Estado: ${op.estado}`, 12, y + 5);

    y += 9;

    let opCuotas = cuotas.filter(c => c.idOperacion === op.id);
    if (opCuotas.length === 0) {
      opCuotas = generarPlanCuotas(op, []);
    }

    // Cuotas Table Header
    doc.setFillColor(226, 232, 240);
    doc.rect(10, y, 190, 6, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.5);
    doc.text('Cuota N°', 12, y + 4.5);
    doc.text('Vencimiento', 35, y + 4.5);
    doc.text('Importe', 70, y + 4.5);
    doc.text('Abonado', 105, y + 4.5);
    doc.text('Saldo Pendiente', 140, y + 4.5);
    doc.text('Estado', 175, y + 4.5);

    y += 7;

    opCuotas.forEach((cuo) => {
      if (y > 270) {
        doc.addPage();
        y = 15;
      }

      const isPagada = cuo.estado === 'PAGADA';
      const saldo = cuo.saldoPendiente !== undefined ? cuo.saldoPendiente : (isPagada ? 0 : (cuo.valorTotalCuota || 0));
      const abonado = cuo.importePagado || (isPagada ? (cuo.valorTotalCuota || 0) : 0);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Cuota ${cuo.numeroCuota}`, 12, y + 4);
      doc.text(`${cuo.fechaVencimiento}`, 35, y + 4);
      doc.text(`$${(cuo.valorTotalCuota || 0).toLocaleString('es-AR')}`, 70, y + 4);
      doc.text(`$${abonado.toLocaleString('es-AR')}`, 105, y + 4);
      doc.text(`$${saldo.toLocaleString('es-AR')}`, 140, y + 4);

      if (isPagada) {
        doc.setTextColor(16, 185, 129);
        doc.text('PAGADA', 175, y + 4);
      } else if (cuo.fechaVencimiento < todayStr) {
        doc.setTextColor(225, 29, 72);
        doc.text('EN MORA', 175, y + 4);
      } else {
        doc.setTextColor(217, 119, 6);
        doc.text('PENDIENTE', 175, y + 4);
      }

      doc.setDrawColor(241, 245, 249);
      doc.line(10, y + 5.5, 200, y + 5.5);
      y += 6;
    });

    y += 4;
  });

  // Historial de Pagos Section
  const clientPagos = pagos.filter(p => p.idCliente === cliente.id);
  if (clientPagos.length > 0) {
    if (y > 230) {
      doc.addPage();
      y = 15;
    }

    doc.setFillColor(30, 41, 59);
    doc.rect(10, y, 190, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`HISTORIAL DE PAGOS REGISTRADOS (${clientPagos.length})`, 12, y + 5);

    y += 9;

    doc.setFillColor(226, 232, 240);
    doc.rect(10, y, 190, 6, 'F');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.5);
    doc.text('ID Pago', 12, y + 4.5);
    doc.text('Fecha', 45, y + 4.5);
    doc.text('Importe', 80, y + 4.5);
    doc.text('Medio / Canal', 115, y + 4.5);
    doc.text('Cobrador', 160, y + 4.5);

    y += 7;

    clientPagos.forEach((pago) => {
      if (y > 270) {
        doc.addPage();
        y = 15;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`#${pago.id}`, 12, y + 4);
      doc.text(`${pago.fechaPago}`, 45, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.text(`$${pago.importe.toLocaleString('es-AR')}`, 80, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(`${pago.metodoPago}`, 115, y + 4);
      doc.text(`${pago.cobrador || 'Oficina'}`, 160, y + 4);

      doc.setDrawColor(241, 245, 249);
      doc.line(10, y + 5.5, 200, y + 5.5);
      y += 6;
    });
  }

  // Footer / Signatures
  if (y > 250) {
    doc.addPage();
    y = 20;
  }

  y += 10;
  doc.setDrawColor(203, 213, 225);
  doc.line(20, y, 80, y);
  doc.line(130, y, 190, y);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Firma y Aclaración Cliente', 28, y + 4);
  doc.text('Firma y Sello CREDICASH', 138, y + 4);

  doc.save(`ESTADO_CUENTA_${cliente.nombre.replace(/\s+/g, '_')}_${todayStr}.pdf`);
}

/**
 * COMPROBANTE TIPO GESTIÓN DOMICILIARIA (EXCLUSIVO PARA COBRADOR DE CAMPO)
 * Incluye: Nombre, Dirección, Monto Total Exigible, Mínimo Exigible, Recorrido
 * NO INCLUYE: Teléfono, valor individual de cuotas, detalle del crédito ni historial.
 */
export function exportComprobanteGestionDomiciliariaPDF(
  cliente: Cliente,
  operaciones: Operacion[],
  cuotas: Cuota[]
) {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(225, 29, 72); // rose-500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CREDICASH - FICHA DE GESTIÓN DOMICILIARIA (CAMPO)', 10, 12);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`Fecha de Gestión: ${todayStr}`, 10, 20);
  doc.text(`Cobrador Asignado: ${(cliente.cobradorAsignadoNombre || 'Gestión Domiciliaria').toUpperCase()}`, 110, 20);

  // Client Address & Route Info (STRICTLY NO PHONE, NO INTERNAL DETAILS)
  doc.setFillColor(248, 250, 252);
  doc.rect(10, 32, 190, 32, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, 32, 190, 32, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`CLIENTE: ${cliente.nombre.toUpperCase()} ${cliente.apellido ? cliente.apellido.toUpperCase() : ''}`, 14, 40);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DIRECCIÓN DOMICILIO:', 14, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cliente.direccion || `${cliente.calle || ''} ${cliente.numero || ''}` || 'No registrado'}`, 55, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('BARRIO / ZONA:', 14, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(`${cliente.barrio || cliente.ciudad || 'Centro'}`, 55, 56);

  // Financial Exigible Totals
  const cOps = operaciones.filter(o => o.idCliente === cliente.id && o.estado !== 'FINALIZADA' && o.estado !== 'REFINANCIADA');
  let cCuotas = cuotas.filter(cu => cOps.some(o => o.id === cu.idOperacion) && cu.estado !== 'PAGADA');
  
  if (cCuotas.length === 0 && cOps.length > 0) {
    cCuotas = cOps.flatMap(o => generarPlanCuotas(o, []).filter(cu => cu.estado !== 'PAGADA'));
  }

  const cuotasMora = cCuotas.filter(cu => cu.fechaVencimiento < todayStr);
  const cuotasHoy = cCuotas.filter(cu => cu.fechaVencimiento === todayStr);
  let cuotasExigibles = [...cuotasMora, ...cuotasHoy];
  if (cuotasExigibles.length === 0 && cCuotas.length > 0) {
    cuotasExigibles = [cCuotas[0]];
  }

  const totalDeudaExigible = cuotasExigibles.reduce((sum, cu) => sum + (cu.saldoPendiente > 0 ? cu.saldoPendiente : cu.valorTotalCuota || 0), 0);
  let montoAPagar = totalDeudaExigible;
  let montoMinimo = cuotasExigibles.length > 1 ? Math.round(totalDeudaExigible * 0.5) : totalDeudaExigible;

  if (cliente.estado === 'INACTIVO' || (cliente.montoDeudaInactivo && cliente.montoDeudaInactivo > 0)) {
    montoAPagar = cliente.montoPagoInicialRefinanciacion || Math.round((cliente.montoDeudaInactivo || 150000) * 0.3);
    montoMinimo = cliente.montoMinimoInactivoConfigurado || Math.round((cliente.montoDeudaInactivo || 150000) * 0.2);
  }

  // Summary Card Exigible
  doc.setFillColor(254, 242, 242); // rose-50
  doc.rect(10, 70, 190, 22, 'F');
  doc.setDrawColor(244, 63, 94); // rose-500
  doc.rect(10, 70, 190, 22, 'S');

  doc.setTextColor(225, 29, 72);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`MONTO TOTAL EXIGIBLE PARA HOY: $${montoAPagar.toLocaleString('es-AR')}`, 14, 80);

  doc.setTextColor(217, 119, 6);
  doc.text(`MÍNIMO EXIGIBLE PARA LA GESTIÓN: $${montoMinimo.toLocaleString('es-AR')}`, 14, 88);

  // Field Route Audit Box
  doc.setFillColor(30, 41, 59);
  doc.rect(10, 98, 190, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PLANILLA DE PLANIFICACIÓN Y RESULTADO DE GESTIÓN EN CAMPO', 12, 103.5);

  let y = 110;

  doc.setDrawColor(203, 213, 225);
  doc.rect(10, y, 190, 80, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('FECHA Y HORA DE VISITA:', 14, y + 10);
  doc.line(60, y + 10, 190, y + 10);

  doc.text('RESPUESTA DEL CLIENTE / OBSERVACIONES:', 14, y + 25);
  doc.line(14, y + 35, 190, y + 35);
  doc.line(14, y + 45, 190, y + 45);

  doc.text('MONTO COBRADO EN CAMPO ($):', 14, y + 60);
  doc.rect(70, y + 54, 50, 10, 'S');

  doc.text('MEDIO:', 130, y + 60);
  doc.text('[ ] Efectivo   [ ] Transferencia', 145, y + 60);

  // Signatures
  y += 95;
  doc.line(20, y, 80, y);
  doc.line(130, y, 190, y);

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Firma Cliente / Comprobante Recibo', 25, y + 4);
  doc.text('Firma Cobrador de Campo', 142, y + 4);

  doc.save(`FICHA_DOMICILIARIA_${cliente.nombre.replace(/\s+/g, '_')}_${todayStr}.pdf`);
}

