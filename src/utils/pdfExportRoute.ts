import jsPDF from 'jspdf';
import { Cliente, Operacion, Cuota } from '../types';

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
  doc.text('CUOTAS / MORA', 120, y + 5);
  doc.text('TOTAL ABONAR / MÍNIMO', 152, y + 5);
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
      doc.text('CUOTAS / MORA', 120, y + 5);
      doc.text('TOTAL ABONAR / MÍNIMO', 152, y + 5);
      doc.text('FIRMA / COBRO ($)', 178, y + 5);
      y += 9;
    }

    const cOps = operaciones.filter(o => o.idCliente === cli.id && (o.estado === 'ACTIVA' || o.estado === 'VENCIDA'));
    const cCuotas = cuotas.filter(cu => cOps.some(o => o.id === cu.idOperacion) && cu.estado !== 'PAGADA');
    const totalDeudaCuotas = cCuotas.reduce((sum, cu) => sum + cu.saldoPendiente, 0);

    const cuotasMora = cCuotas.filter(cu => cu.fechaVencimiento < fechaStr);
    const maxDiasMora = cOps.reduce((max, o) => Math.max(max, o.diasMora || 0), 0);

    let montoAPagar = totalDeudaCuotas;
    let montoMinimo = Math.round(totalDeudaCuotas * 0.5);

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
    doc.text(`${cCuotas.length} cuotas pend.`, 120, y + 5);
    doc.setFontSize(7);
    doc.setTextColor(cuotasMora.length > 0 ? 225 : 100, cuotasMora.length > 0 ? 29 : 116, cuotasMora.length > 0 ? 72 : 139);
    doc.text(cuotasMora.length > 0 ? `Mora: ${maxDiasMora} días` : `Al día (${cli.estado})`, 120, y + 10);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // emerald-600
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
