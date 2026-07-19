import { Cliente, Operacion, Cuota, Pago, TransaccionTesoreria } from '../types';
import JSZip from 'jszip';

/**
 * Adds BOM to ensure MS Excel opens the CSV correctly in UTF-8 with Spanish letters (ñ, á, é, etc.)
 */
const downloadCSVFile = (csvContent: string, fileName: string) => {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Escapes text values for CSV
 */
const escapeCSV = (val: any): string => {
  if (val === null || val === undefined) return '';
  let str = String(val);
  // Replace double quotes with two double quotes
  str = str.replace(/"/g, '""');
  // Wrap in double quotes if it contains separator, quotes or new lines
  if (str.includes(',') || str.includes(';') || str.includes('\n') || str.includes('\r')) {
    return `"${str}"`;
  }
  return str;
};

export const exportClientesToCSV = (clientes: Cliente[]) => {
  const headers = ['ID Cliente', 'Nombre', 'Apellido', 'DNI', 'Teléfono', 'Dirección', 'Trabajo/Ocupación', 'Ingresos Estimados', 'Captador', 'Analista', 'Estado', 'Fecha Registro'];
  
  const rows = clientes.map(c => [
    c.id,
    c.nombre,
    c.apellido,
    c.dni,
    c.telefono,
    c.direccion,
    c.trabajo,
    c.ingresos,
    c.captador,
    c.analista,
    c.estado,
    c.fechaRegistro
  ]);

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  downloadCSVFile(csvContent, `credicash_clientes_${new Date().toISOString().slice(0,10)}.csv`);
};

export const exportOperacionesToCSV = (ops: Operacion[]) => {
  const headers = [
    'ID Operación', 'Fecha Otorgamiento', 'ID Cliente', 'Cliente', 'Estado', 'Tipo', 'Descripción', 
    'Capital Entregado', 'Total Financiado', 'Frecuencia Pago', 'Cuotas Totales', 'Valor de Cuota', 
    'Primer Vto', 'Último Vto', 'Cobrador Asignado', 'Capital Recuperado', 'Interés Cobrado', 
    'Total Pendiente', 'Cuotas Pagadas', 'Cuotas Pendientes', 'Días Mora'
  ];

  const rows = ops.map(o => [
    o.id,
    o.fechaOtorgamiento,
    o.idCliente,
    o.nombreCliente,
    o.estado,
    o.tipoOperacion,
    o.descripcion,
    o.capitalEntregado,
    o.totalFinanciado,
    o.frecuencia,
    o.cantidadCuotas,
    o.valorCuota,
    o.primerVencimiento,
    o.ultimoVencimiento,
    o.cobrador,
    o.capitalRecuperado,
    o.interesCobrado,
    o.totalPendiente,
    o.cuotasPagadas,
    o.cuotasPendientes,
    o.diasMora
  ]);

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  downloadCSVFile(csvContent, `credicash_prestamos_${new Date().toISOString().slice(0,10)}.csv`);
};

export const exportCuotasToCSV = (cuotas: Cuota[]) => {
  const headers = [
    'ID Cuota', 'ID Operación', 'ID Cliente', 'Nombre Cliente', 'Nro Crédito', 'Nro Cuota', 
    'Frecuencia', 'Vencimiento', 'Capital Cuota', 'Interés Cuota', 'Valor Total Cuota', 
    'Estado', 'Fecha Pago', 'Importe Pagado', 'Saldo Pendiente', 'Cobrador'
  ];

  const rows = cuotas.map(c => [
    c.id,
    c.idOperacion,
    c.idCliente,
    c.nombreCliente,
    c.numeroCredito,
    c.numeroCuota,
    c.frecuencia,
    c.fechaVencimiento,
    c.capitalCuota,
    c.interesCuota,
    c.valorTotalCuota,
    c.estado,
    c.fechaPago,
    c.importePagado,
    c.saldoPendiente,
    c.cobrador
  ]);

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  downloadCSVFile(csvContent, `credicash_plan_cuotas_${new Date().toISOString().slice(0,10)}.csv`);
};

export const exportPagosToCSV = (pagos: Pago[]) => {
  const headers = ['ID Pago', 'ID Operación', 'ID Cliente', 'Nombre Cliente', 'Fecha Pago', 'Importe Pagado', 'Cobrador Recaudador', 'Método Pago', 'Observaciones'];
  
  const rows = pagos.map(p => [
    p.id,
    p.idOperacion,
    p.idCliente,
    p.nombreCliente,
    p.fechaPago,
    p.importe,
    p.cobrador,
    p.metodoPago,
    p.observaciones
  ]);

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  downloadCSVFile(csvContent, `credicash_historial_pagos_${new Date().toISOString().slice(0,10)}.csv`);
};

export const exportTesoreriaToCSV = (trxs: TransaccionTesoreria[]) => {
  const headers = ['ID Transacción', 'Fecha', 'Tipo Movimiento', 'Concepto / Descripción', 'Monto Transacción', 'Referencia Asociada'];
  
  const rows = trxs.map(t => [
    t.id,
    t.fecha,
    t.tipo,
    t.concepto,
    t.monto,
    t.referenciaId || ''
  ]);

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  downloadCSVFile(csvContent, `credicash_movimientos_caja_${new Date().toISOString().slice(0,10)}.csv`);
};

export const downloadFullBackupJSON = (data: {
  clientes: Cliente[];
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
  transacciones: TransaccionTesoreria[];
  configuracion: any;
  usuarios?: any[];
  roles?: any[];
}) => {
  const backup = {
    version: '1.2.0',
    fechaExportacion: new Date().toISOString(),
    creadoPor: 'Credi-Cash Master System',
    data: data
  };

  const str = JSON.stringify(backup, null, 2);
  const blob = new Blob([str], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `respaldo_completo_credicash_${new Date().toISOString().slice(0,10)}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportAllToZIP = async (data: {
  clientes: Cliente[];
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
  transacciones: TransaccionTesoreria[];
}) => {
  const zip = new JSZip();

  // 1. Clientes CSV
  const clientHeaders = ['ID Cliente', 'Nombre', 'Apellido', 'DNI', 'Teléfono', 'Dirección', 'Trabajo/Ocupación', 'Ingresos Estimados', 'Captador', 'Analista', 'Estado', 'Fecha Registro'];
  const clientRows = data.clientes.map(c => [
    c.id, c.nombre, c.apellido, c.dni, c.telefono, c.direccion, c.trabajo, c.ingresos, c.captador, c.analista, c.estado, c.fechaRegistro
  ]);
  const clientCSV = [clientHeaders.map(escapeCSV).join(','), ...clientRows.map(r => r.map(escapeCSV).join(','))].join('\n');
  zip.file('clientes_excel.csv', '\uFEFF' + clientCSV);

  // 2. Préstamos CSV
  const opHeaders = [
    'ID Operación', 'Fecha Otorgamiento', 'ID Cliente', 'Cliente', 'Estado', 'Tipo', 'Descripción', 
    'Capital Entregado', 'Total Financiado', 'Frecuencia Pago', 'Cuotas Totales', 'Valor de Cuota', 
    'Primer Vto', 'Último Vto', 'Cobrador Asignado', 'Capital Recuperado', 'Interés Cobrado', 
    'Total Pendiente', 'Cuotas Pagadas', 'Cuotas Pendientes', 'Días Mora'
  ];
  const opRows = data.operaciones.map(o => [
    o.id, o.fechaOtorgamiento, o.idCliente, o.nombreCliente, o.estado, o.tipoOperacion, o.descripcion,
    o.capitalEntregado, o.totalFinanciado, o.frecuencia, o.cantidadCuotas, o.valorCuota,
    o.primerVencimiento, o.ultimoVencimiento, o.cobrador, o.capitalRecuperado, o.interesCobrado,
    o.totalPendiente, o.cuotasPagadas, o.cuotasPendientes, o.diasMora
  ]);
  const opCSV = [opHeaders.map(escapeCSV).join(','), ...opRows.map(r => r.map(escapeCSV).join(','))].join('\n');
  zip.file('prestamos_excel.csv', '\uFEFF' + opCSV);

  // 3. Cuotas CSV
  const cuoHeaders = [
    'ID Cuota', 'ID Operación', 'ID Cliente', 'Nombre Cliente', 'Nro Crédito', 'Nro Cuota', 
    'Frecuencia', 'Vencimiento', 'Capital Cuota', 'Interés Cuota', 'Valor Total Cuota', 
    'Estado', 'Fecha Pago', 'Importe Pagado', 'Saldo Pendiente', 'Cobrador'
  ];
  const cuoRows = data.cuotas.map(c => [
    c.id, c.idOperacion, c.idCliente, c.nombreCliente, c.numeroCredito, c.numeroCuota, c.frecuencia,
    c.fechaVencimiento, c.capitalCuota, c.interesCuota, c.valorTotalCuota, c.estado, c.fechaPago,
    c.importePagado, c.saldoPendiente, c.cobrador
  ]);
  const cuoCSV = [cuoHeaders.map(escapeCSV).join(','), ...cuoRows.map(r => r.map(escapeCSV).join(','))].join('\n');
  zip.file('plan_cuotas_excel.csv', '\uFEFF' + cuoCSV);

  // 4. Pagos CSV
  const pagHeaders = ['ID Pago', 'ID Operación', 'ID Cliente', 'Nombre Cliente', 'Fecha Pago', 'Importe Pagado', 'Cobrador Recaudador', 'Método Pago', 'Observaciones'];
  const pagRows = data.pagos.map(p => [
    p.id, p.idOperacion, p.idCliente, p.nombreCliente, p.fechaPago, p.importe, p.cobrador, p.metodoPago, p.observaciones
  ]);
  const pagCSV = [pagHeaders.map(escapeCSV).join(','), ...pagRows.map(r => r.map(escapeCSV).join(','))].join('\n');
  zip.file('historial_pagos_excel.csv', '\uFEFF' + pagCSV);

  // 5. Tesorería CSV
  const tesHeaders = ['ID Transacción', 'Fecha', 'Tipo Movimiento', 'Concepto / Descripción', 'Monto Transacción', 'Referencia Asociada'];
  const tesRows = data.transacciones.map(t => [
    t.id, t.fecha, t.tipo, t.concepto, t.monto, t.referenciaId || ''
  ]);
  const tesCSV = [tesHeaders.map(escapeCSV).join(','), ...tesRows.map(r => r.map(escapeCSV).join(','))].join('\n');
  zip.file('movimientos_caja_excel.csv', '\uFEFF' + tesCSV);

  // Generate the zip file
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `respaldo_completo_excel_${new Date().toISOString().slice(0,10)}.zip`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
