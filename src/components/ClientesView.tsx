/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Cliente, Operacion, UsuarioRol, Cuota, Pago, TransaccionTesoreria } from '../types';
import { 
  Users, Plus, Search, Edit2, Check, UserPlus, Phone, Shield, ShieldCheck, FileText, MapPin, 
  Briefcase, Eye, X, Download, Calendar, ArrowLeft, AlertTriangle, Info, 
  Printer, ArrowRight, RefreshCw, ChevronRight, PauseCircle, Lock, Upload,
  DollarSign, CheckCircle2, Send, Clock, CreditCard, Trash2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { parseClientesCSV } from '../utils/importHelper';
import { normalizeDateToISO, parseDateToTimestamp, sortCuotasByPaymentPriority, generarPlanCuotas } from '../utils/cuotasGenerator';
import AsignacionClientesView from './AsignacionClientesView';

interface ClientesViewProps {
  clientes: Cliente[];
  operaciones?: Operacion[];
  cuotas?: Cuota[];
  pagos?: Pago[];
  usuarios?: UsuarioRol[];
  activeUser?: UsuarioRol | null;
  onAddCliente: (cliente: Cliente) => void;
  onUpdateCliente: (cliente: Cliente) => void;
  onAddPago?: (pago: Pago, updatedCuotas: Cuota[], updatedOperacion: Operacion, tesoreriaTrx: TransaccionTesoreria) => void;
  onUpdateOperacion?: (operacion: Operacion, cuotasActualizadas?: Cuota[]) => void;
  onDeleteOperacion?: (idOperacion: string) => void;
  canManage?: boolean;
  isAdmin?: boolean;
  verTelefonoCliente?: boolean;
  verDniCliente?: boolean;
  verDireccionCliente?: boolean;
  verIngresosCliente?: boolean;
  onNavigateTo?: (tab: string) => void;
}

export default function ClientesView({ 
  clientes, 
  operaciones = [],
  cuotas = [],
  pagos = [],
  usuarios = [],
  activeUser = null,
  onAddCliente, 
  onUpdateCliente,
  onAddPago,
  onUpdateOperacion,
  onDeleteOperacion,
  canManage = true,
  isAdmin = false,
  verTelefonoCliente = true,
  verDniCliente = true,
  verDireccionCliente = true,
  verIngresosCliente = true,
  onNavigateTo
}: ClientesViewProps) {
  const [mainTab, setMainTab] = useState<'directorio' | 'asignacion_cartera'>('directorio');

  // Operator Portfolio Assignment States
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('USR-2');
  const [assignedSearch, setAssignedSearch] = useState<string>('');
  const [availableSearch, setAvailableSearch] = useState<string>('');
  const [selectedAssignedIds, setSelectedAssignedIds] = useState<string[]>([]);
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<string[]>([]);
  const [availableFilterMode, setAvailableFilterMode] = useState<'SIN_ASIGNAR' | 'TODOS'>('SIN_ASIGNAR');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [viewingCliente, setViewingCliente] = useState<Cliente | null>(null);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [includeTotalInPDF, setIncludeTotalInPDF] = useState<boolean>(false);

  // Ingresar Pago Modal States & Handlers
  const [pagoModalCliente, setPagoModalCliente] = useState<Cliente | null>(null);
  const [pagoModalOperaciones, setPagoModalOperaciones] = useState<Operacion[]>([]);
  const [selectedOpId, setSelectedOpId] = useState<string>('');
  const [pagoMonto, setPagoMonto] = useState<string>('');
  const [pagoMedio, setPagoMedio] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO'>('EFECTIVO');
  const [pagoFecha, setPagoFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [pagoHora, setPagoHora] = useState<string>(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
  const [pagoCobrador, setPagoCobrador] = useState<string>('');
  const [pagoObservaciones, setPagoObservaciones] = useState<string>('');
  const [pagoComprobanteRef, setPagoComprobanteRef] = useState<string>('');
  const [pagoSelectedCuotaId, setPagoSelectedCuotaId] = useState<string>('');

  // Generated Recibo Modal State
  const [generatedRecibo, setGeneratedRecibo] = useState<{
    pagoId: string;
    clienteNombre: string;
    clienteDni: string;
    clienteTel: string;
    monto: number;
    fecha: string;
    hora: string;
    medioPago: string;
    cobrador: string;
    operacionId: string;
    cuotasAfectadas: string;
    ref: string;
    observaciones: string;
  } | null>(null);

  // Editing & Deleting Loan Modal States
  const [editingLoan, setEditingLoan] = useState<Operacion | null>(null);
  const [editMontoPrestamo, setEditMontoPrestamo] = useState<string>('');
  const [editMontoTotal, setEditMontoTotal] = useState<string>('');
  const [editValorCuota, setEditValorCuota] = useState<string>('');
  const [editCantidadCuotas, setEditCantidadCuotas] = useState<string>('');
  const [editFrecuencia, setEditFrecuencia] = useState<'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL'>('DIARIO');
  const [editEstado, setEditEstado] = useState<'ACTIVA' | 'FINALIZADA' | 'VENCIDA' | 'CONGELADA'>('ACTIVA');

  const handleStartEditLoan = (loan: Operacion) => {
    setEditingLoan(loan);
    setEditMontoPrestamo(String(loan.capitalEntregado || (loan as any).montoPrestamo || 0));
    setEditMontoTotal(String(loan.totalFinanciado || (loan as any).montoTotalDevolver || 0));
    setEditValorCuota(String(loan.valorCuota || 0));
    setEditCantidadCuotas(String(loan.cantidadCuotas || (loan as any).cuotasTotales || 0));
    setEditFrecuencia((loan.frecuencia as any) || 'DIARIO');
    setEditEstado((loan.estado as any) || 'ACTIVA');
  };

  const handleSaveEditedLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoan) return;

    const capitalEntregado = parseFloat(editMontoPrestamo) || 0;
    const totalFinanciado = parseFloat(editMontoTotal) || 0;
    const valorCuota = parseFloat(editValorCuota) || 0;
    const cantidadCuotas = parseInt(editCantidadCuotas, 10) || 1;

    const updatedLoan: Operacion = {
      ...editingLoan,
      capitalEntregado,
      montoPrestamo: capitalEntregado,
      totalFinanciado,
      montoTotalDevolver: totalFinanciado,
      valorCuota,
      cantidadCuotas,
      cuotasTotales: cantidadCuotas,
      cuotasPendientes: Math.max(0, cantidadCuotas - (editingLoan.cuotasPagadas || 0)),
      frecuencia: editFrecuencia as any,
      estado: editEstado as any,
      totalPendiente: Math.max(0, totalFinanciado - (editingLoan.capitalRecuperado || 0)),
    };

    // Update remaining cuotas
    const opCuotas = (cuotas || []).filter(c => c.idOperacion === editingLoan.id);
    const updatedCuotasList = opCuotas.map(c => {
      if (c.estado !== 'PAGADA') {
        return {
          ...c,
          valorTotalCuota: valorCuota,
          saldoPendiente: c.estado === 'PAGO_PARCIAL' ? Math.max(0, valorCuota - c.importePagado) : valorCuota
        };
      }
      return c;
    });

    if (onUpdateOperacion) {
      onUpdateOperacion(updatedLoan, updatedCuotasList);
    }
    setEditingLoan(null);
  };

  const handleDeleteLoan = (loan: Operacion) => {
    if (confirm(`⚠️ ¿Está seguro de ELIMINAR el crédito #${loan.id}? Se borrará la operación y sus cuotas asociadas.`)) {
      if (onDeleteOperacion) {
        onDeleteOperacion(loan.id);
      }
    }
  };

  const handleOpenPagoModal = (cliente: Cliente) => {
    const clientOps = (operaciones || []).filter(o => o.idCliente === cliente.id);
    const activeOrAllOps = clientOps.filter(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA');
    const targetOps = activeOrAllOps.length > 0 ? activeOrAllOps : clientOps;
    const initialOp = targetOps[0];

    setPagoModalCliente(cliente);
    setPagoModalOperaciones(targetOps);
    setSelectedOpId(initialOp ? initialOp.id : '');

    const opCuotas = (cuotas || []).filter(c => c.idOperacion === (initialOp?.id || '') && c.estado !== 'PAGADA');
    const firstUnpaid = opCuotas.sort((a, b) => a.numeroCuota - b.numeroCuota)[0];
    setPagoMonto(firstUnpaid ? String(firstUnpaid.saldoPendiente) : (initialOp ? String(initialOp.valorCuota) : '0'));
    setPagoSelectedCuotaId(firstUnpaid ? firstUnpaid.id : '');

    setPagoMedio('EFECTIVO');
    setPagoFecha(new Date().toISOString().split('T')[0]);
    setPagoHora(new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }));
    setPagoCobrador(activeUser?.nombre || 'Agente / Cobrador Central');
    setPagoObservaciones('');
    setPagoComprobanteRef('');
  };

  const handleOpChangeInModal = (opId: string) => {
    setSelectedOpId(opId);
    const opCuotas = (cuotas || []).filter(c => c.idOperacion === opId && c.estado !== 'PAGADA');
    const firstUnpaid = opCuotas.sort((a, b) => a.numeroCuota - b.numeroCuota)[0];
    const targetOp = pagoModalOperaciones.find(o => o.id === opId);
    setPagoMonto(firstUnpaid ? String(firstUnpaid.saldoPendiente) : (targetOp ? String(targetOp.valorCuota) : '0'));
    setPagoSelectedCuotaId(firstUnpaid ? firstUnpaid.id : '');
  };

  const handleExecutePagoInClientesView = () => {
    if (!pagoModalCliente) return;
    const monto = parseFloat(pagoMonto);
    if (isNaN(monto) || monto <= 0) {
      alert('Por favor ingrese un monto válido cobrado.');
      return;
    }

    const targetOp = pagoModalOperaciones.find(o => o.id === selectedOpId) || {
      id: `OP-${pagoModalCliente.id}`,
      idCliente: pagoModalCliente.id,
      montoPrestamo: 10000,
      montoTotalDevolver: 10000,
      cuotasTotales: 10,
      cuotasPagadas: 0,
      cuotasPendientes: 10,
      valorCuota: 1000,
      frecuencia: 'DIARIO',
      fechaInicio: pagoFecha,
      estado: 'ACTIVA',
      diasMora: 0,
      capitalRecuperado: 0,
      totalPendiente: 10000,
      metodoPagoPref: 'EFECTIVO'
    } as unknown as Operacion;

    const targetOpIdStr = String(targetOp.id).trim();
    let opCuotas = (cuotas || []).filter(c => String(c.idOperacion).trim() === targetOpIdStr);
    if (opCuotas.length === 0 && targetOp) {
      opCuotas = generarPlanCuotas(targetOp, []);
    }

    const cuotasToProcess = sortCuotasByPaymentPriority(
      opCuotas,
      pagoFecha,
      undefined,
      pagoSelectedCuotaId
    );

    let remPago = monto;
    const affectedCuotaNums: number[] = [];
    const cuotaUpdatesMap = new Map<string, Cuota>();

    cuotasToProcess.forEach(c => {
      if (c.estado === 'PAGADA' || remPago <= 0) {
        if (!cuotaUpdatesMap.has(c.id)) cuotaUpdatesMap.set(c.id, c);
        return;
      }

      const cCopy = { ...c };
      affectedCuotaNums.push(cCopy.numeroCuota);

      if (remPago >= cCopy.saldoPendiente) {
        const paidThis = cCopy.saldoPendiente;
        remPago = parseFloat((remPago - paidThis).toFixed(2));
        cCopy.importePagado = cCopy.valorTotalCuota;
        cCopy.saldoPendiente = 0;
        cCopy.estado = 'PAGADA';
        cCopy.fechaPago = normalizeDateToISO(pagoFecha);
        cCopy.cobrador = pagoCobrador || activeUser?.nombre || 'Cobrador Central';
      } else {
        const paidThis = remPago;
        remPago = 0;
        cCopy.importePagado = parseFloat((cCopy.importePagado + paidThis).toFixed(2));
        cCopy.saldoPendiente = parseFloat((cCopy.saldoPendiente - paidThis).toFixed(2));
        cCopy.estado = 'PAGO_PARCIAL';
        cCopy.fechaPago = normalizeDateToISO(pagoFecha);
        cCopy.cobrador = pagoCobrador || activeUser?.nombre || 'Cobrador Central';
      }
      cuotaUpdatesMap.set(cCopy.id, cCopy);
    });

    const updatedCuotas = opCuotas.map(c => cuotaUpdatesMap.get(c.id) || c);
    const pagadasNow = updatedCuotas.filter(c => c.estado === 'PAGADA').length;

    const affectedText = affectedCuotaNums.length > 0
      ? `Cuotas N° ${affectedCuotaNums.sort((a, b) => a - b).join(', ')}`
      : `Cuota ${targetOp.cuotasPagadas + 1}`;

    const newPago: Pago = {
      id: `PAG-${Date.now().toString().slice(-6)}`,
      idOperacion: targetOp.id,
      idCliente: pagoModalCliente.id,
      nombreCliente: `${pagoModalCliente.nombre} ${pagoModalCliente.apellido}`,
      fechaPago: normalizeDateToISO(pagoFecha),
      horaPago: pagoHora,
      importe: monto,
      cobrador: pagoCobrador || activeUser?.nombre || 'Agente CrediCash',
      metodoPago: pagoMedio,
      modalidad: 'PAGO_REGULAR',
      cuotasAfectadas: affectedText,
      observaciones: `${pagoObservaciones || 'Cobro registrado en Ficha de Cliente'}${pagoComprobanteRef ? ` (Comprobante/Ref: ${pagoComprobanteRef})` : ''}`
    };

    const updatedOperacion: Operacion = {
      ...targetOp,
      capitalRecuperado: targetOp.capitalRecuperado + monto,
      totalPendiente: Math.max(0, targetOp.totalPendiente - monto),
      cuotasPagadas: pagadasNow,
      cuotasPendientes: Math.max(0, (targetOp.cantidadCuotas || targetOp.cuotasTotales || 10) - pagadasNow),
      ultimoPago: pagoFecha
    };

    const tesoreriaTrx: TransaccionTesoreria = {
      id: `TRX-${Date.now().toString().slice(-6)}`,
      fecha: pagoFecha,
      tipo: 'INGRESO',
      concepto: `Ingreso de Cobro - Cliente ${pagoModalCliente.nombre} ${pagoModalCliente.apellido} (${affectedText})`,
      monto: monto,
      referenciaId: newPago.id
    };

    if (onAddPago) {
      onAddPago(newPago, updatedCuotas, updatedOperacion, tesoreriaTrx);
    }

    if (pagoModalCliente.estado === 'EN_MORA' || pagoModalCliente.estado === 'SOLICITANTE') {
      onUpdateCliente({ ...pagoModalCliente, estado: 'ACTIVO' });
    }

    setGeneratedRecibo({
      pagoId: newPago.id,
      clienteNombre: `${pagoModalCliente.nombre} ${pagoModalCliente.apellido}`,
      clienteDni: pagoModalCliente.dni,
      clienteTel: pagoModalCliente.telefono || '',
      monto: monto,
      fecha: pagoFecha,
      hora: pagoHora,
      medioPago: pagoMedio === 'EFECTIVO' ? 'Efectivo en Mano' : pagoMedio === 'TRANSFERENCIA' ? 'Transferencia Bancaria' : 'Billetera Virtual / Mercado Pago',
      cobrador: newPago.cobrador,
      operacionId: targetOp.id,
      cuotasAfectadas: affectedText,
      ref: pagoComprobanteRef,
      observaciones: newPago.observaciones
    });

    setPagoModalCliente(null);
  };

  const handleDownloadReciboPDF = () => {
    if (!generatedRecibo) return;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a5' });

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 148, 25, 'F');

    doc.setTextColor(16, 185, 129);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('CrediCash - Comprobante de Pago', 10, 12);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`Recibo: ${generatedRecibo.pagoId}`, 10, 19);
    doc.text(`Fecha: ${generatedRecibo.fecha} ${generatedRecibo.hora} hs`, 85, 19);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.text('DATOS DEL CLIENTE', 10, 35);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${generatedRecibo.clienteNombre}`, 10, 42);
    doc.text(`DNI: ${generatedRecibo.clienteDni}`, 10, 48);
    doc.text(`Teléfono: ${generatedRecibo.clienteTel || 'N/I'}`, 10, 54);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('DETALLE DEL COBRO', 10, 66);

    doc.setFillColor(241, 245, 249);
    doc.rect(10, 70, 128, 42, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`MONTO ABONADO: $${generatedRecibo.monto.toLocaleString('es-AR')}`, 15, 78);
    doc.setFont('helvetica', 'normal');
    doc.text(`Operación Ref: ${generatedRecibo.operacionId}`, 15, 85);
    doc.text(`Imputación: ${generatedRecibo.cuotasAfectadas}`, 15, 92);
    doc.text(`Medio de Pago: ${generatedRecibo.medioPago}`, 15, 99);
    if (generatedRecibo.ref) {
      doc.text(`N° Comprobante / Ref: ${generatedRecibo.ref}`, 15, 105);
    }

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text(`Cobrado por: ${generatedRecibo.cobrador}`, 10, 122);
    doc.text('Gracias por su pago. CrediCash Sistema de Gestión Financiera.', 10, 127);

    doc.save(`Recibo-${generatedRecibo.pagoId}-${generatedRecibo.clienteNombre.replace(/\s+/g, '_')}.pdf`);
  };

  const handleSendReciboWhatsApp = () => {
    if (!generatedRecibo) return;
    const cleanPhone = generatedRecibo.clienteTel.replace(/\D/g, '');
    const mensaje = `Hola ${generatedRecibo.clienteNombre}, le confirmamos la recepción de su pago en *CrediCash* 📄%0A%0A` +
      `*Recibo N°:* ${generatedRecibo.pagoId}%0A` +
      `*Monto Abonado:* $${generatedRecibo.monto.toLocaleString('es-AR')}%0A` +
      `*Imputación:* ${generatedRecibo.cuotasAfectadas}%0A` +
      `*Fecha:* ${generatedRecibo.fecha} ${generatedRecibo.hora} hs%0A` +
      `*Medio de Pago:* ${generatedRecibo.medioPago}%0A` +
      `*Cobrador:* ${generatedRecibo.cobrador}%0A%0A` +
      `¡Muchas gracias por su cumplimiento!`;

    if (cleanPhone) {
      window.open(`https://wa.me/549${cleanPhone}?text=${mensaje}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${mensaje}`, '_blank');
    }
  };

  // Batch CSV/Excel Client Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importedPreview, setImportedPreview] = useState<Cliente[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCSVFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const result = parseClientesCSV(content, clientes);
      if (result.success && result.clientes.length > 0) {
        setImportedPreview(result.clientes);
        setImportErrors(result.errors || []);
        setIsImportModalOpen(true);
      } else {
        alert(result.errors.join('\n') || 'No se pudieron procesar los registros del archivo CSV.');
      }
    };
    reader.readAsText(file, 'UTF-8');
    // Reset file input so user can pick same file again if needed
    if (e.target) e.target.value = '';
  };

  const handleConfirmImport = () => {
    if (importedPreview.length === 0) return;

    let count = 0;
    importedPreview.forEach(cli => {
      onAddCliente(cli);
      count++;
    });

    alert(`✅ ¡Se ingresaron ${count} clientes a CrediCash con éxito! Todo verificado.`);
    setIsImportModalOpen(false);
    setImportedPreview([]);
  };

  const getClientCreditsSummary = (clientId: string) => {
    if (!operaciones || operaciones.length === 0) return 'Sin créditos';
    const clientOps = operaciones.filter(o => o.idCliente === clientId);
    if (clientOps.length === 0) return 'Sin créditos';
    
    const counts: Record<string, number> = {};
    clientOps.forEach(o => {
      const freqLabel = o.frecuencia === 'DIARIA' ? 'Diario' : 
                        o.frecuencia === 'SEMANAL' ? 'Semanal' : 
                        o.frecuencia === 'QUINCENAL' ? 'Quincenal' : 'Mensual';
      counts[freqLabel] = (counts[freqLabel] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([freq, count]) => `${count} ${freq}`)
      .join(', ');
  };

  // Form states
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [trabajo, setTrabajo] = useState('');
  const [ingresos, setIngresos] = useState(0);
  const [captador, setCaptador] = useState('');
  const [analista, setAnalista] = useState('');
  const [operadorAsignadoId, setOperadorAsignadoId] = useState('');
  const [operadorAsignadoNombre, setOperadorAsignadoNombre] = useState('');
  const [cobradorAsignadoId, setCobradorAsignadoId] = useState('');
  const [cobradorAsignadoNombre, setCobradorAsignadoNombre] = useState('');
  const [montoDeudaInactivo, setMontoDeudaInactivo] = useState<number>(15000);
  const [montoPagoInicialRefinanciacion, setMontoPagoInicialRefinanciacion] = useState<number>(3000);
  const [estado, setEstado] = useState<Cliente['estado']>('SOLICITANTE');

  // Extended form states
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState('MASCULINO');
  const [whatsapp, setWhatsapp] = useState('');
  const [telefonoAlternativo, setTelefonoAlternativo] = useState('');
  const [personaReferencia, setPersonaReferencia] = useState('');
  const [telefonoReferencia, setTelefonoReferencia] = useState('');
  const [calle, setCalle] = useState('');
  const [numero, setNumero] = useState('');
  const [barrio, setBarrio] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [provincia, setProvincia] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [lugarTrabajo, setLugarTrabajo] = useState('');
  const [antiguedad, setAntiguedad] = useState('');
  const [aliasCbu, setAliasCbu] = useState('');
  const [banco, setBanco] = useState('');
  const [origen, setOrigen] = useState('FACEBOOK');
  const [observaciones, setObservaciones] = useState('');
  const [docDniFrente, setDocDniFrente] = useState('');
  const [docDniDorso, setDocDniDorso] = useState('');
  const [docComprobante, setDocComprobante] = useState('');
  const [docReciboSueldo, setDocReciboSueldo] = useState('');
  const [docOtros, setDocOtros] = useState('');

  // Subtab navigation for ClientesView: 'buscador' (default) vs 'asignacion' (Superadmin rotation)
  const [clientSubTab, setClientSubTab] = useState<'buscador' | 'asignacion'>('buscador');

  // Rotation & portfolio assignment states
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [targetOperatorId, setTargetOperatorId] = useState<string>('');
  const [rotationFilterOperator, setRotationFilterOperator] = useState<string>('TODOS');
  const [rotationFilterEstado, setRotationFilterEstado] = useState<string>('TODOS');
  const [rotationSearchTerm, setRotationSearchTerm] = useState<string>('');

  const handleBatchAssignOperator = () => {
    if (selectedClientIds.length === 0) {
      alert('Por favor seleccione al menos un cliente de la lista.');
      return;
    }
    const opUser = usuarios.find(u => u.id === targetOperatorId);
    const targetName = opUser ? opUser.nombre : (targetOperatorId ? 'Operador Asignado' : '');

    selectedClientIds.forEach(id => {
      const c = clientes.find(cl => cl.id === id);
      if (c) {
        onUpdateCliente({
          ...c,
          operadorAsignadoId: targetOperatorId,
          operadorAsignadoNombre: targetName
        });
      }
    });

    alert(`Se han asignado ${selectedClientIds.length} cliente(s) a: ${targetName || 'Sin operador (Cualquiera)'}.`);
    setSelectedClientIds([]);
  };

  const handleAssignSingleClient = (client: Cliente, newOpId: string) => {
    const opUser = usuarios.find(u => u.id === newOpId);
    const targetName = opUser ? opUser.nombre : (newOpId ? 'Operador Asignado' : '');

    onUpdateCliente({
      ...client,
      operadorAsignadoId: newOpId,
      operadorAsignadoNombre: targetName
    });
  };

  const handleOpenAdd = () => {
    // Generate automatic ID based on max ID
    const nextNum = clientes.reduce((max, c) => {
      const match = c.id.match(/CLI-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0) + 1;
    const generatedId = `CLI-${String(nextNum).padStart(3, '0')}`;

    setEditingCliente(null);
    setNombre('');
    setApellido('');
    setDni('');
    setTelefono('');
    setDireccion('');
    setTrabajo('');
    setIngresos(0);
    setCaptador('');
    setAnalista('');
    setOperadorAsignadoId('');
    setOperadorAsignadoNombre('');
    setCobradorAsignadoId('');
    setCobradorAsignadoNombre('');
    setMontoDeudaInactivo(15000);
    setMontoPagoInicialRefinanciacion(3000);
    setEstado('SOLICITANTE');

    // Reset extended fields
    setFechaNacimiento('');
    setSexo('MASCULINO');
    setWhatsapp('');
    setTelefonoAlternativo('');
    setPersonaReferencia('');
    setTelefonoReferencia('');
    setCalle('');
    setNumero('');
    setBarrio('');
    setCiudad('');
    setProvincia('');
    setCodigoPostal('');
    setLugarTrabajo('');
    setAntiguedad('');
    setAliasCbu('');
    setBanco('');
    setOrigen('FACEBOOK');
    setObservaciones('');
    setDocDniFrente('');
    setDocDniDorso('');
    setDocComprobante('');
    setDocReciboSueldo('');
    setDocOtros('');

    setIsAdding(true);
  };

  const handleOpenEdit = (c: Cliente) => {
    setEditingCliente(c);
    setNombre(c.nombre);
    setApellido(c.apellido);
    setDni(c.dni);
    setTelefono(c.telefono);
    setDireccion(c.direccion);
    setTrabajo(c.trabajo || '');
    setIngresos(c.ingresos || 0);
    setCaptador(c.captador);
    setAnalista(c.analista);
    setOperadorAsignadoId(c.operadorAsignadoId || '');
    setOperadorAsignadoNombre(c.operadorAsignadoNombre || '');
    setCobradorAsignadoId(c.cobradorAsignadoId || '');
    setCobradorAsignadoNombre(c.cobradorAsignadoNombre || '');
    setMontoDeudaInactivo(c.montoDeudaInactivo || 15000);
    setMontoPagoInicialRefinanciacion(c.montoPagoInicialRefinanciacion || 3000);
    setEstado(c.estado);

    // Load extended fields
    setFechaNacimiento(c.fechaNacimiento || '');
    setSexo(c.sexo || 'MASCULINO');
    setWhatsapp(c.whatsapp || '');
    setTelefonoAlternativo(c.telefonoAlternativo || '');
    setPersonaReferencia(c.personaReferencia || '');
    setTelefonoReferencia(c.telefonoReferencia || '');
    setCalle(c.calle || '');
    setNumero(c.numero || '');
    setBarrio(c.barrio || '');
    setCiudad(c.ciudad || '');
    setProvincia(c.provincia || '');
    setCodigoPostal(c.codigoPostal || '');
    setLugarTrabajo(c.lugarTrabajo || '');
    setAntiguedad(c.antiguedad || '');
    setAliasCbu(c.aliasCbu || '');
    setBanco(c.banco || '');
    setOrigen(c.origen || 'FACEBOOK');
    setObservaciones(c.observaciones || '');
    setDocDniFrente(c.documentosSimulados?.dniFrente || '');
    setDocDniDorso(c.documentosSimulados?.dniDorso || '');
    setDocComprobante(c.documentosSimulados?.comprobanteDomicilio || '');
    setDocReciboSueldo(c.documentosSimulados?.reciboSueldo || '');
    setDocOtros(c.documentosSimulados?.otros || '');

    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !apellido || !dni) {
      alert('Por favor complete Nombre, Apellido y DNI.');
      return;
    }

    // Determine fallback full address string
    let fullDireccion = direccion;
    if (calle && numero) {
      fullDireccion = `${calle} ${numero}${barrio ? `, Barrio ${barrio}` : ''}${ciudad ? `, ${ciudad}` : ''}${provincia ? `, ${provincia}` : ''}`;
    }

    if (editingCliente) {
      const updated: Cliente = {
        ...editingCliente,
        nombre,
        apellido,
        dni,
        telefono,
        direccion: fullDireccion,
        trabajo,
        ingresos,
        captador,
        analista,
        operadorAsignadoId,
        operadorAsignadoNombre,
        cobradorAsignadoId,
        cobradorAsignadoNombre,
        montoDeudaInactivo: estado === 'INACTIVO' ? montoDeudaInactivo : undefined,
        montoPagoInicialRefinanciacion: estado === 'INACTIVO' ? montoPagoInicialRefinanciacion : undefined,
        esClienteInactivoRefinanciacion: estado === 'INACTIVO',
        estado,
        fechaNacimiento,
        sexo,
        whatsapp,
        telefonoAlternativo,
        personaReferencia,
        telefonoReferencia,
        calle,
        numero,
        barrio,
        ciudad,
        provincia,
        codigoPostal,
        lugarTrabajo,
        antiguedad,
        aliasCbu,
        banco,
        origen,
        documentosSimulados: {
          dniFrente: docDniFrente || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
          dniDorso: docDniDorso || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
          comprobanteDomicilio: docComprobante || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
          reciboSueldo: docReciboSueldo || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
          otros: docOtros || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
        },
        observaciones
      };
      onUpdateCliente(updated);
    } else {
      const nextNum = clientes.reduce((max, c) => {
        const match = c.id.match(/CLI-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 0) + 1;
      const generatedId = `CLI-${String(nextNum).padStart(3, '0')}`;

      const nuevo: Cliente = {
        id: generatedId,
        nombre,
        apellido,
        dni,
        telefono,
        direccion: fullDireccion,
        trabajo,
        ingresos,
        captador,
        analista,
        operadorAsignadoId,
        operadorAsignadoNombre,
        cobradorAsignadoId,
        cobradorAsignadoNombre,
        montoDeudaInactivo: estado === 'INACTIVO' ? montoDeudaInactivo : undefined,
        montoPagoInicialRefinanciacion: estado === 'INACTIVO' ? montoPagoInicialRefinanciacion : undefined,
        esClienteInactivoRefinanciacion: estado === 'INACTIVO',
        estado,
        fechaRegistro: new Date().toISOString().split('T')[0],
        fechaNacimiento,
        sexo,
        whatsapp,
        telefonoAlternativo,
        personaReferencia,
        telefonoReferencia,
        calle,
        numero,
        barrio,
        ciudad,
        provincia,
        codigoPostal,
        lugarTrabajo,
        antiguedad,
        aliasCbu,
        banco,
        origen,
        documentosSimulados: {
          dniFrente: docDniFrente || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
          dniDorso: docDniDorso || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
          comprobanteDomicilio: docComprobante || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
          reciboSueldo: docReciboSueldo || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
          otros: docOtros || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
        },
        observaciones
      };
      onAddCliente(nuevo);
    }
    setIsAdding(false);
    setEditingCliente(null);
  };

  const filteredClientes = clientes.filter((c) => {
    const fullName = `${c.nombre} ${c.apellido}`.toLowerCase();
    const reverseFullName = `${c.apellido} ${c.nombre}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase().trim();

    const matchesSearch =
      c.nombre.toLowerCase().includes(searchLower) ||
      c.apellido.toLowerCase().includes(searchLower) ||
      c.dni.includes(searchLower) ||
      c.id.toLowerCase().includes(searchLower) ||
      fullName.includes(searchLower) ||
      reverseFullName.includes(searchLower);

    const matchesEstado = filterEstado === 'TODOS' || c.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  const handleExportPDF = (client: Cliente, includeTotalSaldo: boolean = false) => {
    if (!isAdmin) return;
    const clientLoans = operaciones.filter(o => o.idCliente === client.id);
    const sortedLoans = [...clientLoans].sort((a, b) => b.fechaOtorgamiento.localeCompare(a.fechaOtorgamiento));
    const activeLoan = sortedLoans.find(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA');
    const presentLoan = activeLoan || sortedLoans[0];
    
    const doc = new jsPDF();
    
    // Header band (Deep Blue or Emerald)
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, 210, 38, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("CREDI-CASH", 15, 16);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Sistema Integral de Créditos y Cobranzas", 15, 23);
    doc.setFontSize(8.5);
    doc.text(`Reporte emitido el: ${new Date().toLocaleDateString('es-AR')} - ${new Date().toLocaleTimeString('es-AR')}`, 15, 30);
    
    // Decorative bar
    doc.setFillColor(16, 185, 129); // Emerald-500
    doc.rect(0, 38, 210, 3, 'F');
    
    // Client Info Card
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("1. EXPEDIENTE PERSONAL DEL CLIENTE", 15, 52);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 54, 195, 54);
    
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    
    // Left column client info
    doc.text(`Nombre Completo: ${client.nombre} ${client.apellido}`, 15, 62);
    doc.text(`DNI / Documento: ${client.dni}`, 15, 68);
    doc.text(`Telefono Celular: ${client.telefono || 'N/A'}`, 15, 74);
    doc.text(`WhatsApp: ${client.whatsapp || 'N/A'}`, 15, 80);
    doc.text(`Domicilio Declarado: ${client.direccion || 'N/A'}`, 15, 86);
    
    // Right column client info
    doc.text(`ID Cliente: ${client.id}`, 115, 62);
    doc.text(`Estado Crediticio: ${client.estado}`, 115, 68);
    doc.text(`Alta en Sistema: ${client.fechaRegistro}`, 115, 74);
    doc.text(`Trabajo / Actividad: ${client.trabajo || 'N/A'}`, 115, 80);
    doc.text(`Operador / Cobrador: ${client.operadorAsignadoNombre || client.captador || 'Asignado'}`, 115, 86);
    
    let currentY = 98;
    
    // Present Loan Section
    if (presentLoan) {
      doc.setFillColor(248, 250, 252); // Slate-50 background
      doc.rect(15, currentY, 180, 56, 'F');
      
      // Border around slate box
      doc.setDrawColor(203, 213, 225);
      doc.rect(15, currentY, 180, 56, 'S');
      
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`2. PLAN DE CREDITO VIGENTE`, 20, currentY + 8);
      
      // Draw status tag
      const isFin = presentLoan.estado === 'FINALIZADA';
      doc.setFillColor(isFin ? 16 : 245, isFin ? 185 : 158, isFin ? 129 : 11); // Green vs Amber
      doc.rect(150, currentY + 3, 38, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(`ESTADO: ${presentLoan.estado}`, 153, currentY + 7.2);
      
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      // Left side details
      doc.text(`ID Operacion: ${presentLoan.id}`, 20, currentY + 18);
      doc.text(`Fecha Otorgamiento: ${presentLoan.fechaOtorgamiento}`, 20, currentY + 24);
      doc.text(`Credito Otorgado: $${presentLoan.capitalEntregado.toLocaleString('es-AR')}`, 20, currentY + 30);
      doc.text(`Valor de Cuota: $${presentLoan.valorCuota.toLocaleString('es-AR')} (${presentLoan.frecuencia})`, 20, currentY + 36);
      doc.text(`Plan de Financiacion: ${presentLoan.cantidadCuotas} cuotas`, 20, currentY + 42);
      doc.text(`Cuotas Pendientes: ${presentLoan.cuotasPendientes} cuotas restantes`, 20, currentY + 48);
      
      // Right side details
      doc.text(`Cuotas Pagadas: ${presentLoan.cuotasPagadas} de ${presentLoan.cantidadCuotas}`, 115, currentY + 18);
      doc.text(`Proximo Vencimiento: ${presentLoan.proximoVencimiento || 'N/A'}`, 115, currentY + 24);
      
      // Include total pending ONLY if administrator checked the option
      if (includeTotalSaldo) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(185, 28, 28); // Red
        doc.text(`Saldo Total Pendiente: $${presentLoan.totalPendiente.toLocaleString('es-AR')}`, 115, currentY + 30);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 41, 59);
      } else {
        doc.text(`Cuotas al Dia: ${presentLoan.diasMora === 0 ? 'Si (Al dia)' : 'Atrasado'}`, 115, currentY + 30);
      }
      
      doc.text(`Dias de Mora: ${presentLoan.diasMora} dias (${presentLoan.nivelMora || 'Sin Mora'})`, 115, currentY + 36);
      doc.text(`Cobrador Asignado: ${presentLoan.cobrador || 'No asignado'}`, 115, currentY + 42);
      
      currentY += 66;
    } else {
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "italic");
      doc.text("Este cliente no registra creditos en el sistema.", 15, currentY);
      currentY += 15;
    }
    
    // All credit history
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("3. HISTORIAL COMPLETO DE CREDITOS Y SIMULTANEOS", 15, currentY);
    doc.setDrawColor(226, 232, 240);
    doc.line(15, currentY + 2, 195, currentY + 2);
    
    currentY += 8;
    
    // Draw table headers
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(15, currentY, 180, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    
    doc.text("ID Credito", 18, currentY + 5.5);
    doc.text("Fecha", 45, currentY + 5.5);
    doc.text("Capital", 75, currentY + 5.5);
    doc.text("Total Finan.", 105, currentY + 5.5);
    doc.text("Cuotas", 145, currentY + 5.5);
    doc.text("Estado", 172, currentY + 5.5);
    
    currentY += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    
    if (sortedLoans.length === 0) {
      doc.text("Sin historial registrado.", 20, currentY + 6);
      currentY += 12;
    } else {
      sortedLoans.forEach((loan) => {
        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
          
          // Reprint header for next page
          doc.setFillColor(241, 245, 249);
          doc.rect(15, currentY, 180, 8, 'F');
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          doc.text("ID Credito", 18, currentY + 5.5);
          doc.text("Fecha", 45, currentY + 5.5);
          doc.text("Capital", 75, currentY + 5.5);
          doc.text("Total Finan.", 105, currentY + 5.5);
          doc.text("Cuotas", 145, currentY + 5.5);
          doc.text("Estado", 172, currentY + 5.5);
          currentY += 8;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(30, 41, 59);
        }
        
        doc.text(loan.id, 18, currentY + 5.5);
        doc.text(loan.fechaOtorgamiento, 45, currentY + 5.5);
        doc.text(`$${loan.capitalEntregado.toLocaleString('es-AR')}`, 75, currentY + 5.5);
        doc.text(`$${loan.totalFinanciado.toLocaleString('es-AR')}`, 105, currentY + 5.5);
        doc.text(`${loan.cuotasPagadas} / ${loan.cantidadCuotas} (${loan.frecuencia.toLowerCase()})`, 145, currentY + 5.5);
        doc.text(loan.estado, 172, currentY + 5.5);
        
        currentY += 8;
      });
    }
    
    // Draw footer note
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 275, 195, 275);
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Documento oficial para uso interno y envio a clientes. CREDI-CASH, Todos los derechos reservados.", 15, 281);
    
    doc.save(`Creditos_CrediCash_${client.dni}_${client.apellido}.pdf`);
  };

  const activeOperators = (usuarios && usuarios.length > 0)
    ? usuarios.filter(u => u.rolId === 'COBRADOR' || u.rolId === 'OPERADOR' || u.rolId === 'ATC' || u.rolId === 'ADMIN')
    : [
        { id: 'USR-2', nombre: 'Rodrigo Gómez', email: 'rodrigo.cobros@gmail.com', rolId: 'COBRADOR' },
        { id: 'USR-3', nombre: 'Carlos López', email: 'carlos.operador@gmail.com', rolId: 'OPERADOR' }
      ];

  const currentOperator = activeOperators.find(u => u.id === selectedOperatorId) || activeOperators[0];

  const assignedClientsList = clientes.filter(c => {
    const isAssigned = c.operadorAsignadoId === currentOperator?.id || c.operadorAsignadoNombre === currentOperator?.nombre;
    const matchSearch = !assignedSearch || 
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(assignedSearch.toLowerCase()) || 
      c.dni.includes(assignedSearch) ||
      c.id.toLowerCase().includes(assignedSearch.toLowerCase());
    return isAssigned && matchSearch;
  });

  const availableClientsList = clientes.filter(c => {
    const isMatchingMode = availableFilterMode === 'SIN_ASIGNAR' 
      ? (!c.operadorAsignadoId && !c.operadorAsignadoNombre) 
      : (c.operadorAsignadoId !== currentOperator?.id);
    const matchSearch = !availableSearch || 
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(availableSearch.toLowerCase()) || 
      c.dni.includes(availableSearch) ||
      c.id.toLowerCase().includes(availableSearch.toLowerCase());
    return isMatchingMode && matchSearch;
  });

  const handleAssignSelectedToOperator = () => {
    if (selectedAvailableIds.length === 0 || !currentOperator) return;
    selectedAvailableIds.forEach(cliId => {
      const cli = clientes.find(c => c.id === cliId);
      if (cli) {
        onUpdateCliente({
          ...cli,
          operadorAsignadoId: currentOperator.id,
          operadorAsignadoNombre: currentOperator.nombre
        });
      }
    });
    alert(`✅ ¡Se asignaron ${selectedAvailableIds.length} clientes a ${currentOperator.nombre}!`);
    setSelectedAvailableIds([]);
  };

  const handleUnassignSelectedFromOperator = () => {
    if (selectedAssignedIds.length === 0) return;
    selectedAssignedIds.forEach(cliId => {
      const cli = clientes.find(c => c.id === cliId);
      if (cli) {
        onUpdateCliente({
          ...cli,
          operadorAsignadoId: '',
          operadorAsignadoNombre: ''
        });
      }
    });
    alert(`✅ ¡Se desasignaron ${selectedAssignedIds.length} clientes del operador!`);
    setSelectedAssignedIds([]);
  };

  const handleEquitableDistribution = () => {
    const unassigned = clientes.filter(c => !c.operadorAsignadoId);
    if (unassigned.length === 0) {
      alert('Todos los clientes ya tienen un operador asignado.');
      return;
    }
    if (activeOperators.length === 0) return;

    unassigned.forEach((cli, idx) => {
      const op = activeOperators[idx % activeOperators.length];
      onUpdateCliente({
        ...cli,
        operadorAsignadoId: op.id,
        operadorAsignadoNombre: op.nombre
      });
    });

    alert(`🚀 ¡Se distribuyeron ${unassigned.length} clientes equitativamente entre los ${activeOperators.length} operadores activos!`);
  };

  return (
    <div id="clientes-section" className="space-y-6">
      
      {/* Top Main View Selector - Admin Only for Portfolio Assignment */}
      {isAdmin && (
        <div className="flex items-center gap-2 bg-emerald-950/90 p-1.5 rounded-2xl border border-emerald-800/80 w-fit">
          <button
            onClick={() => setMainTab('directorio')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              mainTab === 'directorio'
                ? 'bg-emerald-600 text-white shadow-xs border border-emerald-500'
                : 'text-emerald-200/80 hover:text-white hover:bg-emerald-800/50'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-300" />
            <span>1. Directorio y Expediente de Clientes</span>
          </button>

          <button
            onClick={() => setMainTab('asignacion_cartera')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              mainTab === 'asignacion_cartera'
                ? 'bg-emerald-600 text-white shadow-xs border border-emerald-500'
                : 'text-emerald-200/80 hover:text-white hover:bg-emerald-800/50'
            }`}
          >
            <UserPlus className="w-4 h-4 text-emerald-300" />
            <span>2. Asignación de Cartera por Operador ({clientes.filter(c => c.operadorAsignadoId).length}/{clientes.length})</span>
          </button>
        </div>
      )}

      {/* VIEW TAB 2: SECTOR DE ASIGNACIÓN DE CARTERA POR OPERADOR (ADMIN ONLY) */}
      {mainTab === 'asignacion_cartera' && isAdmin && (
        <div className="space-y-6 animate-fade-in">
          <AsignacionClientesView
            clientes={clientes}
            usuarios={usuarios || []}
            operaciones={operaciones || []}
            activeUser={activeUser}
            onUpdateCliente={onUpdateCliente}
            onNavigateTo={onNavigateTo}
          />
        </div>
      )}

      {mainTab === 'directorio' && (
      <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-md">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
            <span className="flex items-center gap-2 font-extrabold">
              <Users className="w-5 h-5 text-emerald-400" />
              Búsqueda de Cliente
            </span>
            <span className="text-xs font-semibold text-emerald-300/70"> (Últimos Créditos Activos)</span>
          </h2>
          <p className="text-xs text-emerald-200/80 mt-1">
            Consulte de forma ágil el expediente del cliente, su último crédito (activo o inactivo) y el historial completo de créditos simultáneos.
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCSVFileSelect}
              accept=".csv,.txt"
              className="hidden"
            />
            <button
              id="btn-importar-clientes"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-emerald-600 text-emerald-300 hover:bg-slate-800 rounded-lg font-bold transition-all text-xs shadow-md cursor-pointer"
              title="Importar archivo CSV o Excel con lista de clientes"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              IMPORTAR CLIENTES (CSV/Excel)
            </button>
            <button
              id="btn-nuevo-cliente"
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white hover:bg-emerald-500 rounded-lg font-bold transition-all text-xs shadow-md cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              NUEVO CLIENTE
            </button>
          </div>
        )}
      </div>

      {isAdding ? (
        <form onSubmit={handleSubmit} className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-xl space-y-6 animate-fadeIn">
          <div className="border-b border-emerald-800/80 pb-3 flex justify-between items-center">
            <h3 className="text-sm font-extrabold uppercase text-emerald-300 tracking-widest">
              {editingCliente ? `Editar Cliente: ${editingCliente.id}` : 'Registrar Nuevo Cliente'}
            </h3>
            <span className="text-xs font-mono px-2.5 py-1 bg-slate-900 rounded-md border border-emerald-700/80 text-emerald-300 font-bold">
              {editingCliente ? editingCliente.id : 'ID: AUTOMÁTICO'}
            </span>
          </div>

          <div className="space-y-8">
            {/* Sección 1: Datos de Identidad */}
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                1. Datos Personales e Identidad
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Apellido *</label>
                  <input
                    type="text"
                    required
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Apellido del cliente"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">DNI / Documento *</label>
                  <input
                    type="text"
                    required
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Número de DNI"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Sexo</label>
                  <select
                    value={sexo}
                    onChange={(e) => setSexo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  >
                    <option value="MASCULINO">MASCULINO</option>
                    <option value="FEMENINO">FEMENINO</option>
                    <option value="OTRO">OTRO / NO ESPECIFICA</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sección 2: Contacto y Enlaces */}
            <div className="border-t border-emerald-800/60 pt-6">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400" />
                2. Canales de Contacto y Referencias
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Teléfono Celular</label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Ej: +54 9 11 1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">WhatsApp Directo</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Ej: 5491112345678"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Teléfono Alternativo</label>
                  <input
                    type="text"
                    value={telefonoAlternativo}
                    onChange={(e) => setTelefonoAlternativo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Teléfono fijo o familiar"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Persona de Referencia</label>
                  <input
                    type="text"
                    value={personaReferencia}
                    onChange={(e) => setPersonaReferencia(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Nombre del familiar o amigo"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Teléfono de Referencia</label>
                  <input
                    type="text"
                    value={telefonoReferencia}
                    onChange={(e) => setTelefonoReferencia(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Contacto de la referencia"
                  />
                </div>
              </div>
            </div>

            {/* Sección 3: Domicilio Declarado */}
            <div className="border-t border-emerald-800/60 pt-6">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400" />
                3. Domicilio Declarado
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Calle / Avenida</label>
                  <input
                    type="text"
                    value={calle}
                    onChange={(e) => setCalle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Nombre de la calle"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Número</label>
                  <input
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Ej: 1420"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Barrio</label>
                  <input
                    type="text"
                    value={barrio}
                    onChange={(e) => setBarrio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Nombre de barrio"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Ciudad / Localidad</label>
                  <input
                    type="text"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Ej: San Miguel"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Provincia / Estado</label>
                  <input
                    type="text"
                    value={provincia}
                    onChange={(e) => setProvincia(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Ej: Buenos Aires"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Código Postal</label>
                  <input
                    type="text"
                    value={codigoPostal}
                    onChange={(e) => setCodigoPostal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Ej: C1425"
                  />
                </div>
              </div>
            </div>

            {/* Sección 4: Situación Laboral */}
            <div className="border-t border-emerald-800/60 pt-6">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                4. Situación Laboral y Solvencia
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Actividad Laboral</label>
                  <input
                    type="text"
                    value={trabajo}
                    onChange={(e) => setTrabajo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Profesión o puesto"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Empresa / Lugar de Trabajo</label>
                  <input
                    type="text"
                    value={lugarTrabajo}
                    onChange={(e) => setLugarTrabajo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Nombre del empleador"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Antigüedad (Años/Meses)</label>
                  <input
                    type="text"
                    value={antiguedad}
                    onChange={(e) => setAntiguedad(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Ej: 3 años y 6 meses"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Ingresos Mensuales Netos</label>
                  <input
                    type="number"
                    value={ingresos}
                    onChange={(e) => setIngresos(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Ej: 350000"
                  />
                </div>
              </div>
            </div>

            {/* Sección 5: Datos de Cobro / Bancos */}
            <div className="border-t border-emerald-800/60 pt-6">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                5. Cuenta Bancaria / Transferencias
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">CBU / CVU / Alias de Cuenta</label>
                  <input
                    type="text"
                    value={aliasCbu}
                    onChange={(e) => setAliasCbu(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm font-mono text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Ej: 0170098740000001234567 o alias.pago"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Banco o Billetera Virtual</label>
                  <input
                    type="text"
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Ej: Banco Nación, Mercado Pago"
                  />
                </div>
              </div>
            </div>

            {/* Sección 6: Configuración Comercial y Asignación de Operador */}
            <div className="border-t border-emerald-800/60 pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  6. Clasificación Comercial y Operador de Cobranza
                </h4>
                <div className="text-[10px] bg-slate-900 text-emerald-200 px-2.5 py-1 rounded-md border border-emerald-700/80 flex items-center gap-1 font-medium">
                  <Info className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>El <strong>Analista</strong> aprueba los papeles; el <strong>Operador</strong> realiza el contacto diario.</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">
                    Captador (Promotor / Vendedor)
                  </label>
                  <input
                    type="text"
                    value={captador}
                    onChange={(e) => setCaptador(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Ej: Marcos Vendedor (Mesa Entrada)"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">
                    Analista Riesgo (Revisor de Papeles)
                  </label>
                  <input
                    type="text"
                    value={analista}
                    onChange={(e) => setAnalista(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 placeholder-emerald-300/40"
                    placeholder="Ej: Lic. Gómez (Mesa Alta)"
                  />
                </div>
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-emerald-700">
                  <label className="block text-[11px] font-black text-emerald-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Operador Asignado (Contacto Diario)</span>
                    <span className="text-[9px] bg-emerald-900 text-emerald-200 px-1.5 py-0.5 rounded font-extrabold border border-emerald-700">Exclusivo</span>
                  </label>
                  <select
                    value={operadorAsignadoId}
                    onChange={(e) => {
                      const selectedOpId = e.target.value;
                      setOperadorAsignadoId(selectedOpId);
                      const opUser = usuarios.find(u => u.id === selectedOpId);
                      setOperadorAsignadoNombre(opUser ? opUser.nombre : (selectedOpId ? 'Operador Asignado' : 'Sin asignar'));
                    }}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-emerald-600 rounded-lg text-sm font-bold text-white focus:outline-hidden focus:border-emerald-400"
                  >
                    <option value="">-- Sin operador asignado (Todos) --</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} ({u.rolId}) - {u.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Cobrador en Calle Asignado</label>
                  <select
                    value={cobradorAsignadoId}
                    onChange={(e) => {
                      const selectedCobId = e.target.value;
                      setCobradorAsignadoId(selectedCobId);
                      const cobUser = usuarios.find(u => u.id === selectedCobId);
                      setCobradorAsignadoNombre(cobUser ? cobUser.nombre : (selectedCobId ? 'Cobrador Asignado' : 'Sin asignar'));
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm font-bold text-white focus:outline-hidden focus:border-emerald-400"
                  >
                    <option value="">-- Sin cobrador en calle (Cualquiera) --</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} ({u.rolId}) - {u.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Estado Crediticio General</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as Cliente['estado'])}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm font-bold text-white focus:outline-hidden focus:border-emerald-400"
                  >
                    <option value="ACTIVO">🟢 ACTIVO (Cliente Vigente)</option>
                    <option value="FINALIZADO">🏁 FINALIZADO (Crédito Cancelado / Pagado)</option>
                    <option value="EVASIVO">⚠️ EVASIVO (Evasivo / Riesgo / Requerido)</option>
                    <option value="INACTIVO">🔴 INACTIVO (Deuda Pendiente / Refinanciar)</option>
                    <option value="EN_MORA">⚡ EN MORA</option>
                    <option value="SOLICITANTE">📋 SOLICITANTE (En Evaluación)</option>
                    <option value="CONGELADO">⏸️ CONGELADO (Pausado)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Origen de Captación</label>
                  <select
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400"
                  >
                    <option value="FACEBOOK">Facebook / Redes</option>
                    <option value="WHATSAPP">WhatsApp Directo</option>
                    <option value="RECOMENDADO">Recomendado por Cliente</option>
                    <option value="VOLANTE">Volante / Publicidad Física</option>
                    <option value="OTRO">Otro Canal</option>
                  </select>
                </div>
              </div>

              {/* Special Box for INACTIVO Refinancing Setup */}
              {estado === 'INACTIVO' && (
                <div className="bg-amber-950/40 border-2 border-amber-500/70 p-4 rounded-2xl space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Ficha de Cliente Inactivo & Refinanciación de Crédito
                    </span>
                    <span className="text-[10px] bg-amber-900 text-amber-200 font-bold px-2 py-0.5 rounded border border-amber-700">
                      Irá a Hoja de Ruta del Cobrador
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium">
                    Al guardar este cliente como <b>INACTIVO</b>, aparecerá automáticamente en la Hoja de Ruta Diaria del cobrador asignado. El cobrador podrá solicitar el pago inicial configurado para activar la refinanciación del crédito.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-[11px] font-extrabold text-amber-200 uppercase tracking-wider mb-1">
                        Monto Deuda Pendiente Actual ($)
                      </label>
                      <input
                        type="number"
                        value={montoDeudaInactivo}
                        onChange={(e) => setMontoDeudaInactivo(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-900 border border-amber-600 rounded-lg text-sm font-black text-amber-300 focus:outline-hidden focus:border-amber-400"
                        placeholder="Ej: 25000"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-extrabold text-amber-200 uppercase tracking-wider mb-1">
                        Pago Inicial Requerido para Refinanciar ($)
                      </label>
                      <input
                        type="number"
                        value={montoPagoInicialRefinanciacion}
                        onChange={(e) => setMontoPagoInicialRefinanciacion(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-900 border border-amber-600 rounded-lg text-sm font-black text-emerald-400 focus:outline-hidden focus:border-emerald-400"
                        placeholder="Ej: 5000"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sección 7: Legajo Digital */}
            <div className="border-t border-emerald-800/60 pt-6">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                7. Legajo Digital (Enlaces de documentos simulados)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">DNI Frente (Enlace de Imagen o PDF)</label>
                  <input
                    type="text"
                    value={docDniFrente}
                    onChange={(e) => setDocDniFrente(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 placeholder-emerald-300/40"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">DNI Dorso (Enlace de Imagen o PDF)</label>
                  <input
                    type="text"
                    value={docDniDorso}
                    onChange={(e) => setDocDniDorso(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 placeholder-emerald-300/40"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Comprobante de Domicilio (Luz, Agua, etc)</label>
                  <input
                    type="text"
                    value={docComprobante}
                    onChange={(e) => setDocComprobante(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 placeholder-emerald-300/40"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Recibo de Sueldo / Comprobante de Ingresos</label>
                  <input
                    type="text"
                    value={docReciboSueldo}
                    onChange={(e) => setDocReciboSueldo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 placeholder-emerald-300/40"
                    placeholder="https://..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-emerald-200/80 uppercase tracking-wider mb-1.5">Otros Documentos (Garantías, Contratos, etc)</label>
                  <input
                    type="text"
                    value={docOtros}
                    onChange={(e) => setDocOtros(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 placeholder-emerald-300/40"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {/* Sección 8: Observaciones */}
            <div className="border-t border-emerald-800/60 pt-6">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4">
                8. Observaciones Adicionales
              </h4>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden focus:border-emerald-400 placeholder-emerald-300/40"
                placeholder="Escriba comentarios sobre el comportamiento del cliente, avales, etc..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-emerald-800/60">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-emerald-700/80 text-emerald-200 rounded-lg hover:bg-emerald-900/60 text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-sm font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Guardar Cliente
            </button>
          </div>
        </form>
      ) : null}

      {/* Sub-tab Navigation for Superadmin / Administrator */}
      {isAdmin && !isAdding && !selectedClient && (
        <div className="flex items-center gap-2 bg-emerald-950/90 p-1.5 rounded-xl border border-emerald-800/80 w-fit">
          <button
            onClick={() => setClientSubTab('buscador')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              clientSubTab === 'buscador'
                ? 'bg-emerald-900 text-emerald-100 shadow-xs border border-emerald-700'
                : 'text-emerald-300/70 hover:text-white hover:bg-emerald-900/40'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>1. Búsqueda de Expedientes</span>
          </button>

          <button
            onClick={() => setClientSubTab('asignacion')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              clientSubTab === 'asignacion'
                ? 'bg-emerald-900 text-emerald-100 shadow-xs border border-emerald-700'
                : 'text-emerald-300/70 hover:text-white hover:bg-emerald-900/40'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>2. Asignación y Rotación de Cartera (Superadmin)</span>
          </button>
        </div>
      )}

      {/* RENDER VIEW 1: SEARCH / BUSCADOR */}
      {!selectedClient && clientSubTab === 'buscador' ? (
        <div className="flex flex-col items-center justify-center min-h-[480px] bg-emerald-950/90 p-8 rounded-2xl border border-emerald-800/80 shadow-md space-y-6">
          <div className="w-full max-w-xl text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-900 text-emerald-300 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-emerald-700">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Búsqueda Unificada de Legajos</h3>
              <p className="text-[11px] text-emerald-200/80 max-w-md mx-auto leading-relaxed">
                Ingrese el DNI o nombre del cliente para auditar su legajo digital, consultar su último crédito activo/presente, analizar historial de mora o exportar reportes en PDF.
              </p>
            </div>
            
            <div className="relative pt-2">
              <Search className="absolute left-4 top-5.5 h-4.5 w-4.5 text-emerald-400" />
              <input
                type="text"
                placeholder="Ingrese DNI o Nombre para buscar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900 text-white border border-emerald-700 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50 transition-all text-center placeholder-emerald-300/60 font-bold"
                autoFocus
              />
            </div>

            {/* Display Search Results dynamically as they type */}
            {searchTerm.trim() !== '' && (
              <div className="border border-emerald-800 rounded-xl overflow-hidden bg-emerald-950/95 shadow-xl divide-y divide-emerald-800/60 text-left mt-4 max-h-[300px] overflow-y-auto">
                {filteredClientes.length === 0 ? (
                  <div className="p-5 text-center text-xs text-emerald-300/70 font-medium flex flex-col items-center gap-1">
                    <Info className="w-4 h-4 text-emerald-400" />
                    No se encontraron clientes registrados con ese nombre o DNI.
                  </div>
                ) : (
                  filteredClientes.map((c) => {
                    const clientOps = operaciones.filter(o => o.idCliente === c.id);
                    const activeOp = clientOps.find(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA');
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(c);
                        }}
                        className="w-full p-3.5 hover:bg-emerald-900/80 flex items-center justify-between text-xs text-emerald-100 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-emerald-900 text-emerald-200 rounded-lg flex items-center justify-center font-extrabold text-xs font-mono border border-emerald-700">
                            {c.nombre[0]}{c.apellido[0]}
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="font-bold text-white text-sm group-hover:text-emerald-300 transition-colors flex items-center gap-2">
                              {c.nombre} {c.apellido}
                              {(!c.documentosSimulados?.dniFrente || !c.documentosSimulados?.dniDorso || !c.documentosSimulados?.comprobanteDomicilio || c.documentosSimulados?.dniFrente.includes('unsplash.com') || c.documentosSimulados?.dniDorso.includes('unsplash.com') || c.documentosSimulados?.comprobanteDomicilio.includes('unsplash.com')) && (
                                <span className="inline-flex px-1 rounded text-[8px] font-bold uppercase bg-amber-950 text-amber-300 border border-amber-800">
                                  Legajo Pte.
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-emerald-300/70 mt-0.5">
                              DNI: {c.dni} • ID: {c.id} • {clientOps.length} crédito(s)
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                c.estado === 'ACTIVO' 
                                  ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' 
                                  : c.estado === 'EN_MORA'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-slate-900 text-slate-300 border border-slate-700'
                              }`}>
                                {c.estado}
                              </span>
                              {activeOp && (
                                <div className="text-[9px] text-emerald-300 font-extrabold mt-1">
                                  {activeOp.id} - ${activeOp.valorCuota.toLocaleString('es-AR')}/C
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPagoModal(c);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] rounded-lg flex items-center gap-1 shadow-xs cursor-pointer border border-emerald-400/80 transition-colors"
                              title="Ingresar Pago / Cobrar Cuota"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-emerald-200" />
                              <span>Ingresar Pago</span>
                            </button>
                          </div>
                          <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:text-emerald-200 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* RENDER VIEW 2: PORTFOLIO ASSIGNMENT & ROTATION (ASIGNACION) */}
      {!selectedClient && clientSubTab === 'asignacion' && isAdmin ? (
        <div className="space-y-6 animate-fadeIn">
          {/* Summary KPI Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-emerald-950/90 p-4 rounded-xl border border-emerald-800/80 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider block">Total Clientes en Sistema</span>
              <span className="text-xl font-black text-white">{clientes.length}</span>
              <span className="text-[10px] text-emerald-200/60 block mt-0.5">Cartera global administrada</span>
            </div>
            <div className="bg-emerald-950/90 p-4 rounded-xl border border-emerald-700 shadow-xs">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">Clientes Asignados</span>
              <span className="text-xl font-black text-emerald-300">
                {clientes.filter(c => c.operadorAsignadoId || c.operadorAsignadoNombre).length}
              </span>
              <span className="text-[10px] text-emerald-200/70 block mt-0.5">Asignados a un operador/cobrador</span>
            </div>
            <div className="bg-slate-900/90 p-4 rounded-xl border border-amber-800/80 shadow-xs">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">Clientes Sin Asignar</span>
              <span className="text-xl font-black text-amber-300">
                {clientes.filter(c => !c.operadorAsignadoId && !c.operadorAsignadoNombre).length}
              </span>
              <span className="text-[10px] text-amber-200/70 block mt-0.5">Disponibles para rotación</span>
            </div>
            <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80 shadow-xs">
              <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">Operadores Disponibles</span>
              <span className="text-xl font-black text-white">{usuarios.length}</span>
              <span className="text-[10px] text-emerald-200/60 block mt-0.5">Agentes de gestión diaria</span>
            </div>
          </div>

          {/* Role Restriction Banner */}
          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl border border-emerald-800/80 flex items-start gap-3 shadow-sm">
            <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <strong className="text-white font-bold block uppercase tracking-wider text-[11px]">Reglas de Acceso a Cartera por Rol:</strong>
              <p className="text-emerald-200/80 leading-relaxed">
                • Los <strong>Operadores / Cobradores</strong> solo visualizan los clientes <strong>Activos</strong> y de <strong>Renovación</strong> asignados específicamente a su legajo.
                <br />
                • Los clientes con estado <strong>INACTIVO</strong> o <strong>CONGELADO</strong> quedan strictly ocultos para los operadores y solo son accesibles por el Superadministrador.
              </p>
            </div>
          </div>

          {/* Bulk Assignment Toolbar & Filters */}
          <div className="bg-emerald-950/90 p-5 rounded-xl border border-emerald-800/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-emerald-800/60 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Asignación Masiva y Rotación de Cartera
                </h3>
                <p className="text-xs text-emerald-200/70">
                  Seleccione uno o varios clientes para rotarlos en lote a un operador específico.
                </p>
              </div>

              {/* Batch Action Controls */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={targetOperatorId}
                  onChange={(e) => setTargetOperatorId(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-emerald-400"
                >
                  <option value="">-- Sin operador (Desasignar / Todos) --</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} ({u.rolId})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleBatchAssignOperator}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Asignar {selectedClientIds.length > 0 ? `(${selectedClientIds.length})` : ''} Seleccionados</span>
                </button>
              </div>
            </div>

            {/* Table Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Buscar Cliente o DNI</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-emerald-400" />
                  <input
                    type="text"
                    value={rotationSearchTerm}
                    onChange={(e) => setRotationSearchTerm(e.target.value)}
                    placeholder="Filtrar por nombre o DNI..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-emerald-700/80 rounded-lg text-xs text-white placeholder-emerald-300/40 focus:outline-hidden focus:border-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Filtrar por Operador Actual</label>
                <select
                  value={rotationFilterOperator}
                  onChange={(e) => setRotationFilterOperator(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-emerald-700/80 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-emerald-400"
                >
                  <option value="TODOS">Todos los Operadores</option>
                  <option value="SIN_ASIGNAR">⚠️ Solo Sin Asignar</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Filtrar por Estado</label>
                <select
                  value={rotationFilterEstado}
                  onChange={(e) => setRotationFilterEstado(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-emerald-700/80 rounded-lg text-xs font-bold text-white focus:outline-hidden focus:border-emerald-400"
                >
                  <option value="TODOS">Todos los Estados</option>
                  <option value="ACTIVO">Solo Activos</option>
                  <option value="EN_MORA">Solo En Mora</option>
                  <option value="INACTIVO">Solo Inactivos (Superadmin)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Clients Rotation Table */}
          <div className="bg-emerald-950/90 rounded-xl border border-emerald-800/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-emerald-200 font-black uppercase text-[10px] tracking-wider border-b border-emerald-800/80">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          clientes.length > 0 && selectedClientIds.length === clientes.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClientIds(clientes.map(c => c.id));
                          } else {
                            setSelectedClientIds([]);
                          }
                        }}
                        className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">ID / Cliente</th>
                    <th className="p-3">DNI / Teléfono</th>
                    <th className="p-3">Estado Crediticio</th>
                    <th className="p-3">Analista / Captador</th>
                    <th className="p-3">Operador Asignado Actual</th>
                    <th className="p-3 text-right">Acción Rápida</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/60 font-medium text-emerald-100">
                  {(() => {
                    const filtered = clientes.filter(c => {
                      const matchSearch = rotationSearchTerm === '' || 
                        `${c.nombre} ${c.apellido} ${c.dni} ${c.id}`.toLowerCase().includes(rotationSearchTerm.toLowerCase());
                      
                      const matchOp = rotationFilterOperator === 'TODOS'
                        ? true
                        : rotationFilterOperator === 'SIN_ASIGNAR'
                        ? !c.operadorAsignadoId && !c.operadorAsignadoNombre
                        : c.operadorAsignadoId === rotationFilterOperator || c.operadorAsignadoNombre === usuarios.find(u => u.id === rotationFilterOperator)?.nombre;

                      const matchEstado = rotationFilterEstado === 'TODOS' || c.estado === rotationFilterEstado;

                      return matchSearch && matchOp && matchEstado;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-emerald-300/60 font-bold text-xs">
                            No se encontraron clientes que coincidan con los criterios de rotación.
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map(c => {
                      const isSelected = selectedClientIds.includes(c.id);
                      const isInactive = c.estado === 'INACTIVO' || c.estado === 'CONGELADO';

                      return (
                        <tr key={c.id} className={`hover:bg-emerald-900/40 transition-colors ${isSelected ? 'bg-emerald-900/60' : ''}`}>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedClientIds(prev => [...prev, c.id]);
                                } else {
                                  setSelectedClientIds(prev => prev.filter(id => id !== c.id));
                                }
                              }}
                              className="w-4 h-4 text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-white">{c.nombre} {c.apellido}</div>
                            <div className="text-[10px] text-emerald-300/70 font-mono">{c.id}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-mono text-emerald-200">{c.dni}</div>
                            <div className="text-[10px] text-emerald-300/70">{c.telefono || 'Sin tel'}</div>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              c.estado === 'ACTIVO' 
                                ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700' 
                                : c.estado === 'EN_MORA'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : 'bg-slate-900 text-slate-300 border border-slate-700'
                            }`}>
                              {c.estado}
                            </span>
                            {isInactive && (
                              <span className="block text-[8px] font-extrabold text-rose-400 mt-0.5">
                                🔒 Oculto p/ Operadores
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-[11px]">
                            <div><strong className="text-emerald-300/80">Analista:</strong> {c.analista || 'N/I'}</div>
                            <div><strong className="text-emerald-300/80">Captador:</strong> {c.captador || 'N/I'}</div>
                          </td>
                          <td className="p-3">
                            {c.operadorAsignadoNombre || c.operadorAsignadoId ? (
                              <span className="px-2 py-1 bg-emerald-900 text-emerald-200 rounded-md font-bold text-[11px] border border-emerald-700 inline-block">
                                👤 {c.operadorAsignadoNombre || c.operadorAsignadoId}
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-slate-900 text-slate-400 rounded-md font-bold text-[10px] border border-slate-700 inline-block">
                                ⚠️ Sin operador
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <select
                              value={c.operadorAsignadoId || ''}
                              onChange={(e) => handleAssignSingleClient(c, e.target.value)}
                              className="px-2 py-1 bg-slate-900 border border-emerald-700 rounded text-xs font-bold text-white focus:outline-hidden focus:border-emerald-400 cursor-pointer"
                            >
                              <option value="">-- Sin Operador --</option>
                              {usuarios.map(u => (
                                <option key={u.id} value={u.id}>
                                  Reasignar a: {u.nombre}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
      {/* Selected Client Details Screen */}
      {selectedClient && (
        <div className="space-y-6 animate-fadeIn">
          {/* Action Header bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-950/90 p-4 rounded-xl border border-emerald-800/80 shadow-xs">
            <button
              onClick={() => {
                setSelectedClient(null);
                setSearchTerm('');
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-200 rounded-lg font-bold text-xs transition-colors cursor-pointer border border-emerald-800/60"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a buscar
            </button>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleOpenPagoModal(selectedClient)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black text-xs transition-colors cursor-pointer shadow-md border border-emerald-400/80"
              >
                <DollarSign className="w-4 h-4 text-emerald-100" />
                <span>Ingresar Pago / Cobrar</span>
              </button>

              {canManage && (
                <button
                  onClick={() => handleOpenEdit(selectedClient)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer border border-emerald-700/80 shadow-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar expediente
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => {
                    const newEstado = selectedClient.estado === 'CONGELADO' ? 'ACTIVO' : 'CONGELADO';
                    const updated = { ...selectedClient, estado: newEstado as Cliente['estado'] };
                    onUpdateCliente(updated);
                    setSelectedClient(updated);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-bold text-xs transition-colors cursor-pointer border ${
                    selectedClient.estado === 'CONGELADO'
                      ? 'bg-emerald-900 text-emerald-200 border-emerald-700 hover:bg-emerald-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800 hover:bg-amber-900'
                  }`}
                  title="Congelar para pausar cobranza temporalmente"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  {selectedClient.estado === 'CONGELADO' ? 'Descongelar Ficha' : 'Congelar Crédito'}
                </button>
              )}

              {isAdmin && (
                <div className="flex items-center gap-2 bg-slate-900 p-1.5 px-3 rounded-lg border border-emerald-700/80 text-xs">
                  <label className="flex items-center gap-1.5 font-medium text-emerald-200/90 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeTotalInPDF}
                      onChange={(e) => setIncludeTotalInPDF(e.target.checked)}
                      className="w-3.5 h-3.5 text-emerald-500 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Incluir Total de Deuda en PDF</span>
                  </label>
                  <button
                    onClick={() => handleExportPDF(selectedClient, includeTotalInPDF)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-bold transition-colors cursor-pointer shadow-xs ml-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Exportar PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COLUMN 1: Client Personal Profile / Ficha */}
            <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-sm space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-emerald-800/60">
                <div className="w-10 h-10 bg-emerald-900 text-emerald-200 rounded-xl flex items-center justify-center font-black text-sm border border-emerald-700">
                  {selectedClient.id}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">
                    {selectedClient.nombre} {selectedClient.apellido}
                  </h3>
                  <span className={`inline-block px-2 py-0.5 mt-1.5 rounded-full text-[9px] font-bold ${
                    selectedClient.estado === 'ACTIVO' 
                      ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' 
                      : selectedClient.estado === 'EN_MORA'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800'
                      : 'bg-slate-900 text-slate-300 border border-slate-700'
                  }`}>
                    {selectedClient.estado}
                  </span>
                </div>
              </div>

              {/* General Information list */}
              <div className="space-y-3.5 text-xs text-emerald-200/80">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-emerald-300/70 block text-[10px] uppercase font-bold tracking-wider">DNI</span>
                    <strong className="text-white font-mono text-[13px]">{selectedClient.dni}</strong>
                  </div>
                  <div>
                    <span className="text-emerald-300/70 block text-[10px] uppercase font-bold tracking-wider">Alta Registro</span>
                    <strong className="text-white">{selectedClient.fechaRegistro}</strong>
                  </div>
                </div>

                <div>
                  <span className="text-emerald-300/70 block text-[10px] uppercase font-bold tracking-wider">Teléfono Celular</span>
                  <strong className="text-white text-[13px]">{selectedClient.telefono || 'No registrado'}</strong>
                </div>

                {selectedClient.whatsapp && (
                  <div>
                    <span className="text-emerald-300/70 block text-[10px] uppercase font-bold tracking-wider">WhatsApp Directo</span>
                    <a
                      href={`https://wa.me/${selectedClient.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 font-bold hover:underline flex items-center gap-1 mt-0.5 text-xs"
                    >
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      {selectedClient.whatsapp} (Enviar mensaje)
                    </a>
                  </div>
                )}

                {verDireccionCliente && (
                  <div>
                    <span className="text-emerald-300/70 block text-[10px] uppercase font-bold tracking-wider">Dirección Formateada</span>
                    <strong className="text-white block mt-0.5 leading-relaxed">{selectedClient.direccion || 'No especificada'}</strong>
                  </div>
                )}

                <div className={`grid ${verIngresosCliente ? 'grid-cols-2' : 'grid-cols-1'} gap-3 pt-1 border-t border-emerald-800/60`}>
                  <div>
                    <span className="text-emerald-300/70 block text-[10px] uppercase font-bold tracking-wider">Actividad</span>
                    <strong className="text-white truncate block">{selectedClient.trabajo || 'No especificado'}</strong>
                  </div>
                  {verIngresosCliente && (
                    <div>
                      <span className="text-emerald-300/70 block text-[10px] uppercase font-bold tracking-wider">Ingresos Netos</span>
                      <strong className="text-white block text-[13px]">${selectedClient.ingresos?.toLocaleString('es-AR') || '0'}</strong>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-emerald-800/60">
                  <span className="text-emerald-300/70 block text-[10px] uppercase font-bold tracking-wider mb-2">Legajo Digital Cargado</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-emerald-800/60">
                      {selectedClient.documentosSimulados?.dniFrente && !selectedClient.documentosSimulados?.dniFrente.includes('unsplash.com') ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">✔ DNI Frente</span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1">❌ Frente (Falta)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-emerald-800/60">
                      {selectedClient.documentosSimulados?.dniDorso && !selectedClient.documentosSimulados?.dniDorso.includes('unsplash.com') ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">✔ DNI Dorso</span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1">❌ Dorso (Falta)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 border border-emerald-800/60 col-span-2">
                      {selectedClient.documentosSimulados?.comprobanteDomicilio && !selectedClient.documentosSimulados?.comprobanteDomicilio.includes('unsplash.com') ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">✔ Comprobante de Domicilio</span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1">❌ Comp. Domicilio (Falta)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2 & 3: Credit Present / History */}
            <div className="lg:col-span-2 space-y-6">
              {/* Present Loan Block */}
              {(() => {
                const clientLoans = operaciones.filter(o => o.idCliente === selectedClient.id);
                const sortedLoans = [...clientLoans].sort((a, b) => b.fechaOtorgamiento.localeCompare(a.fechaOtorgamiento));
                const activeLoan = sortedLoans.find(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA');
                const presentLoan = activeLoan || sortedLoans[0];

                if (!presentLoan) {
                  return (
                    <div className="bg-emerald-950/90 p-8 rounded-2xl border border-emerald-800/80 shadow-sm text-center space-y-3 flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-900 text-emerald-400 rounded-full flex items-center justify-center border border-emerald-800">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-white">Sin Créditos Activos</h3>
                      <p className="text-xs text-emerald-300/70 max-w-sm leading-relaxed">
                        Este cliente no tiene operaciones de crédito en el sistema en este momento. Puede registrar un crédito desde la Consola de Otorgamiento.
                      </p>
                    </div>
                  );
                }

                const progressPct = Math.round((presentLoan.cuotasPagadas / presentLoan.cantidadCuotas) * 100) || 0;

                return (
                  <div className={`p-6 rounded-2xl border bg-emerald-950/90 shadow-sm space-y-5 relative overflow-hidden ${
                    presentLoan.estado === 'ACTIVA' 
                      ? 'border-emerald-700' 
                      : presentLoan.estado === 'VENCIDA'
                      ? 'border-rose-800'
                      : 'border-emerald-800/80'
                  }`}>
                    {/* Decorative state accent */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                      presentLoan.estado === 'ACTIVA' 
                        ? 'bg-emerald-500' 
                        : presentLoan.estado === 'VENCIDA'
                        ? 'bg-rose-500'
                        : 'bg-slate-600'
                    }`} />

                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div>
                        <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block">
                          ÚLTIMO CRÉDITO ACTIVO / PRESENTADO
                        </span>
                        <h4 className="text-lg font-black text-white mt-1">
                          Ref: {presentLoan.id} <span className="text-xs font-mono font-medium text-emerald-300/70">({presentLoan.tipoOperacion})</span>
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg ${
                          presentLoan.estado === 'ACTIVA'
                            ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                            : presentLoan.estado === 'VENCIDA'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-slate-900 text-slate-300 border border-slate-700'
                        }`}>
                          {presentLoan.estado}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenPagoModal(selectedClient)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg shadow-md transition-colors flex items-center gap-1 cursor-pointer border border-emerald-400/80"
                        >
                          <DollarSign className="w-3.5 h-3.5 text-emerald-100" />
                          <span>Ingresar Pago</span>
                        </button>
                      </div>
                    </div>

                    {/* Summary metrics grid */}
                    <div className={`grid grid-cols-2 ${verIngresosCliente ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4 text-xs text-emerald-200/80 bg-slate-900/80 p-4 rounded-xl border border-emerald-800/60`}>
                      <div>
                        <span className="text-emerald-300/70 block text-[9px] uppercase font-bold tracking-wider">Entregado</span>
                        <strong className="text-white text-sm font-bold">${presentLoan.capitalEntregado.toLocaleString('es-AR')}</strong>
                      </div>
                      {verIngresosCliente && (
                        <div>
                          <span className="text-emerald-300/70 block text-[9px] uppercase font-bold tracking-wider">Total Financiado</span>
                          <strong className="text-white text-sm font-bold">${presentLoan.totalFinanciado.toLocaleString('es-AR')}</strong>
                        </div>
                      )}
                      <div>
                        <span className="text-emerald-300/70 block text-[9px] uppercase font-bold tracking-wider">Valor Cuota</span>
                        <strong className="text-white text-sm font-bold">${presentLoan.valorCuota.toLocaleString('es-AR')}</strong>
                      </div>
                      <div>
                        <span className="text-emerald-300/70 block text-[9px] uppercase font-bold tracking-wider">Frecuencia</span>
                        <strong className="text-white text-xs font-bold uppercase">{presentLoan.frecuencia}</strong>
                      </div>
                    </div>

                    {/* Progress Bar of installments */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-emerald-300/80">
                        <span className="font-medium">Amortización de Cuotas</span>
                        <span className="font-bold text-white">{presentLoan.cuotasPagadas} de {presentLoan.cantidadCuotas} pagadas ({progressPct}%)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-emerald-800/60 p-0.5">
                        <div 
                          className="h-full rounded-full transition-all duration-500 bg-emerald-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Status & Mora Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-emerald-200/80">
                      {!verIngresosCliente ? (
                        <div className="col-span-1 sm:col-span-2 bg-slate-900/80 p-3.5 rounded-xl border border-emerald-800/60 text-emerald-200 leading-relaxed font-bold">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block mb-1">Información de Cuotas (Consulta)</span>
                          {presentLoan.cuotasPagadas} cuotas abonadas y {presentLoan.cuotasPendientes} cuotas pendientes de ${presentLoan.valorCuota.toLocaleString('es-AR')} de valor.
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1.5">
                            <div className="flex justify-between border-b border-emerald-800/60 pb-1">
                              <span className="text-emerald-300/70">Capital Recuperado:</span>
                              <strong className="text-emerald-400 font-bold">${presentLoan.capitalRecuperado.toLocaleString('es-AR')}</strong>
                            </div>
                            <div className="flex justify-between border-b border-emerald-800/60 pb-1">
                              <span className="text-emerald-300/70">Total Pendiente:</span>
                              <strong className="text-rose-400 font-bold">${presentLoan.totalPendiente.toLocaleString('es-AR')}</strong>
                            </div>
                            <div className="flex justify-between border-b border-emerald-800/60 pb-1">
                              <span className="text-emerald-300/70">Próximo Vencimiento:</span>
                              <strong className="text-white">{presentLoan.proximoVencimiento || 'N/A'}</strong>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between border-b border-emerald-800/60 pb-1">
                              <span className="text-emerald-300/70">Días de Mora:</span>
                              <strong className={`font-bold ${presentLoan.diasMora > 0 ? 'text-rose-400' : 'text-emerald-200'}`}>
                                {presentLoan.diasMora} días
                              </strong>
                            </div>
                            <div className="flex justify-between border-b border-emerald-800/60 pb-1">
                              <span className="text-emerald-300/70">Riesgo / Nivel Mora:</span>
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                presentLoan.diasMora > 0 ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-900 text-emerald-300 border border-emerald-800'
                              }`}>
                                {presentLoan.nivelMora || 'Sin Mora'}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-emerald-800/60 pb-1">
                              <span className="text-emerald-300/70">Cobrador Asignado:</span>
                              <strong className="text-white">{presentLoan.cobrador || 'No asignado'}</strong>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Complete History Timeline and Simultaneous Credits */}
              <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-emerald-300/80 uppercase tracking-widest flex items-center gap-2">
                  Historial Integral de Créditos del Cliente
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-emerald-800/80 font-bold text-emerald-300 uppercase tracking-wider">
                        <th className="py-2.5 px-4">Ref Crédito</th>
                        <th className="py-2.5 px-4">Otorgamiento</th>
                        <th className="py-2.5 px-4">Valor del Crédito</th>
                        {verIngresosCliente && <th className="py-2.5 px-4">Total Finan.</th>}
                        <th className="py-2.5 px-4">Frecuencia</th>
                        <th className="py-2.5 px-4 text-center">Estado de Mora</th>
                        <th className="py-2.5 px-4 text-center">Cuotas</th>
                        <th className="py-2.5 px-4 text-center">Estado</th>
                        <th className="py-2.5 px-4 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-900/60 text-emerald-100">
                      {(() => {
                        const clientLoans = operaciones.filter(o => o.idCliente === selectedClient.id);
                        const sortedLoans = [...clientLoans].sort((a, b) => b.fechaOtorgamiento.localeCompare(a.fechaOtorgamiento));

                        if (sortedLoans.length === 0) {
                          return (
                            <tr>
                              <td colSpan={verIngresosCliente ? 9 : 8} className="py-6 text-center text-emerald-300/60 font-medium">
                                No registra operaciones de crédito históricas.
                              </td>
                            </tr>
                          );
                        }

                        return sortedLoans.map((loan) => (
                          <tr key={loan.id} className="hover:bg-emerald-900/40 transition-colors">
                            <td className="py-3 px-4 font-bold font-mono text-white">{loan.id}</td>
                            <td className="py-3 px-4 text-emerald-200/80">{loan.fechaOtorgamiento}</td>
                            <td className="py-3 px-4 font-semibold text-white">${(Number(loan.capitalEntregado) || Number((loan as any).montoPrestamo) || 0).toLocaleString('es-AR')}</td>
                            {verIngresosCliente && <td className="py-3 px-4 font-semibold text-white">${(Number(loan.totalFinanciado) || Number((loan as any).montoTotalDevolver) || 0).toLocaleString('es-AR')}</td>}
                            <td className="py-3 px-4 text-emerald-200/70 uppercase tracking-wide text-[10px]">{loan.frecuencia}</td>
                            <td className="py-3 px-4 text-center font-bold">
                              {loan.estado === 'FINALIZADA' ? (
                                <span className="text-[10px] text-emerald-300/60 uppercase">Liquidado</span>
                              ) : loan.diasMora > 0 || loan.estado === 'VENCIDA' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] bg-rose-950 text-rose-300 border border-rose-800">
                                  ● En Mora
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] bg-emerald-900 text-emerald-300 border border-emerald-700">
                                  ● Al Día
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-white">
                              {loan.cuotasPagadas} / {loan.cantidadCuotas}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                loan.estado === 'ACTIVA' 
                                  ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' 
                                  : loan.estado === 'FINALIZADA'
                                  ? 'bg-slate-900 text-emerald-200 border border-emerald-800'
                                  : 'bg-slate-900 text-slate-300 border border-slate-700'
                              }`}>
                                {loan.estado}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditLoan(loan)}
                                  title="Editar Crédito"
                                  className="p-1.5 bg-slate-900 hover:bg-emerald-900 text-emerald-300 rounded-lg border border-emerald-800 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLoan(loan)}
                                  title="Eliminar Crédito"
                                  className="p-1.5 bg-slate-900 hover:bg-rose-950 text-rose-400 hover:text-rose-300 rounded-lg border border-emerald-800 hover:border-rose-800 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPEDIENTE COMPLETO MODAL (CONSULTAR EXPEDIENTE) */}
      {viewingCliente && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-emerald-950 rounded-2xl border border-emerald-800/80 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
            {/* Modal Header */}
            <div className="p-6 border-b border-emerald-800/80 bg-slate-900 flex justify-between items-center sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  EXPEDIENTE DE CLIENTE
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {viewingCliente.nombre} {viewingCliente.apellido}
                </h3>
              </div>
              <button
                onClick={() => setViewingCliente(null)}
                className="p-1.5 hover:bg-emerald-900 rounded-full text-emerald-300/70 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-8 text-xs text-emerald-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Datos Personales */}
                <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80 space-y-2.5">
                  <h4 className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] border-b border-emerald-800/60 pb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    Identidad y Datos Personales
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2">
                    <div>
                      <span className="text-emerald-300/70 block">ID Cliente</span>
                      <strong className="font-mono font-bold text-white">{viewingCliente.id}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-300/70 block">DNI / Documento</span>
                      <strong className="text-white">{viewingCliente.dni}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-300/70 block">Nombre Completo</span>
                      <strong className="text-white">{viewingCliente.nombre} {viewingCliente.apellido}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-300/70 block">Sexo</span>
                      <strong className="text-white">{viewingCliente.sexo || 'MASCULINO'}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-300/70 block">Fecha de Nacimiento</span>
                      <strong className="text-white">{viewingCliente.fechaNacimiento || 'No registrada'}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-300/70 block">Fecha Alta en Sistema</span>
                      <strong className="text-white">{viewingCliente.fechaRegistro}</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Canales de Contacto */}
                <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80 space-y-2.5">
                  <h4 className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] border-b border-emerald-800/60 pb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    Canales de Contacto
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2">
                    <div>
                      <span className="text-emerald-300/70 block">Teléfono Celular</span>
                      <strong className="text-white">{viewingCliente.telefono || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-300/70 block">WhatsApp Directo</span>
                      {viewingCliente.whatsapp ? (
                        <a
                          href={`https://wa.me/${viewingCliente.whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 font-bold hover:underline flex items-center gap-1"
                        >
                          {viewingCliente.whatsapp}
                        </a>
                      ) : (
                        <strong className="text-white">No especificado</strong>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span className="text-emerald-300/70 block">Teléfono Alternativo</span>
                      <strong className="text-white">{viewingCliente.telefonoAlternativo || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-300/70 block">Persona de Referencia</span>
                      <strong className="text-white">{viewingCliente.personaReferencia || 'No registrada'}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-300/70 block">Teléfono Referencia</span>
                      <strong className="text-white">{viewingCliente.telefonoReferencia || 'No registrado'}</strong>
                    </div>
                  </div>
                </div>

                {/* 3. Domicilio Declarado */}
                {verDireccionCliente ? (
                  <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80 space-y-2.5">
                    <h4 className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] border-b border-emerald-800/60 pb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      Domicilio Declarado
                    </h4>
                    <div className="grid grid-cols-2 gap-y-2">
                      <div className="col-span-2">
                        <span className="text-emerald-300/70 block">Dirección Formateada</span>
                        <strong className="text-white">{viewingCliente.direccion}</strong>
                      </div>
                      <div>
                        <span className="text-emerald-300/70 block">Calle</span>
                        <strong className="text-white">{viewingCliente.calle || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-emerald-300/70 block">Número</span>
                        <strong className="text-white">{viewingCliente.numero || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-emerald-300/70 block">Barrio</span>
                        <strong className="text-white">{viewingCliente.barrio || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-emerald-300/70 block">Ciudad / Localidad</span>
                        <strong className="text-white">{viewingCliente.ciudad || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-emerald-300/70 block">Provincia</span>
                        <strong className="text-white">{viewingCliente.provincia || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-emerald-300/70 block">Código Postal</span>
                        <strong className="text-white">{viewingCliente.codigoPostal || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80 space-y-2.5">
                    <h4 className="font-bold text-emerald-300/60 uppercase tracking-wider text-[11px] border-b border-emerald-800/60 pb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400/50" />
                      Domicilio Declarado
                    </h4>
                    <span className="text-emerald-300/60 italic font-medium">Información restringida por nivel de acceso.</span>
                  </div>
                )}

                {/* 4. Situación Laboral y Bancaria */}
                <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80 space-y-2.5">
                  <h4 className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] border-b border-emerald-800/60 pb-1.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                    Situación Laboral y Cuenta Bancaria
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2">
                    {verIngresosCliente ? (
                      <>
                        <div>
                          <span className="text-emerald-300/70 block">Actividad Laboral</span>
                          <strong className="text-white">{viewingCliente.trabajo || 'Sin especificar'}</strong>
                        </div>
                        <div>
                          <span className="text-emerald-300/70 block">Lugar de Trabajo</span>
                          <strong className="text-white">{viewingCliente.lugarTrabajo || 'No registrado'}</strong>
                        </div>
                        <div>
                          <span className="text-emerald-300/70 block">Antigüedad Laboral</span>
                          <strong className="text-white">{viewingCliente.antiguedad || 'No declarada'}</strong>
                        </div>
                        <div>
                          <span className="text-emerald-300/70 block">Ingreso Mensual Neto</span>
                          <strong className="text-emerald-400 font-bold">
                            {viewingCliente.ingresos ? `$${viewingCliente.ingresos.toLocaleString('es-ES')}` : 'No especificado'}
                          </strong>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <span className="text-emerald-300/70 block">Información Laboral / Ingresos</span>
                        <strong className="text-emerald-300/60 italic font-medium">Restringido por nivel de acceso</strong>
                        <div className="mt-3 bg-emerald-900/60 p-2.5 rounded-lg border border-emerald-700">
                          <span className="text-emerald-300 font-bold block uppercase tracking-wider text-[10px] mb-1">
                            Créditos del Cliente:
                          </span>
                          <strong className="text-white font-extrabold text-xs">
                            {getClientCreditsSummary(viewingCliente.id)}
                          </strong>
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-emerald-300/70 block">CBU / CVU / Alias</span>
                      <strong className="font-mono text-white break-all">{viewingCliente.aliasCbu || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-300/70 block">Banco o Billetera</span>
                      <strong className="text-white">{viewingCliente.banco || 'N/A'}</strong>
                    </div>
                  </div>
                </div>

                {/* 5. Clasificación Comercial */}
                <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80 space-y-2.5">
                  <h4 className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] border-b border-emerald-800/60 pb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    Clasificación Comercial
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2">
                    <div>
                      <span className="text-emerald-300/70 block">Captador</span>
                      <strong className="text-white">{viewingCliente.captador || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-300/70 block">Analista Asignado</span>
                      <strong className="text-white">{viewingCliente.analista || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-300/70 block">Origen Captación</span>
                      <strong className="text-white">{viewingCliente.origen || 'FACEBOOK'}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-300/70 block">Estado Crediticio</span>
                      <span
                        className={`inline-block px-2 py-0.5 mt-0.5 text-[10px] font-bold rounded-full ${
                          viewingCliente.estado === 'ACTIVO'
                            ? 'bg-emerald-900 text-emerald-300 border border-emerald-700'
                            : viewingCliente.estado === 'EN_MORA'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : viewingCliente.estado === 'SOLICITANTE'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-900 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {viewingCliente.estado}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. Observaciones */}
                <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80 space-y-2.5">
                  <h4 className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] border-b border-emerald-800/60 pb-1.5 flex items-center gap-1.5">
                    Observaciones Generales
                  </h4>
                  <p className="text-emerald-100 bg-emerald-950 p-2.5 rounded border border-emerald-800/80 min-h-[70px] whitespace-pre-wrap">
                    {viewingCliente.observaciones || 'Sin comentarios adicionales.'}
                  </p>
                </div>
              </div>

              {/* 7. Legajo de Documentos Digitales (Fila Completa) */}
              <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80 space-y-4">
                <h4 className="font-bold text-emerald-300 uppercase tracking-wider text-[11px] border-b border-emerald-800/60 pb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  Legajo de Documentos Digitales (Expediente Visual)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                  {[
                    { label: 'DNI Frente', key: 'dniFrente', val: viewingCliente.documentosSimulados?.dniFrente },
                    { label: 'DNI Dorso', key: 'dniDorso', val: viewingCliente.documentosSimulados?.dniDorso },
                    { label: 'Comprobante Domicilio', key: 'comprobanteDomicilio', val: viewingCliente.documentosSimulados?.comprobanteDomicilio },
                    { label: 'Recibo Sueldo', key: 'reciboSueldo', val: viewingCliente.documentosSimulados?.reciboSueldo },
                    { label: 'Otros Documentos', key: 'otros', val: viewingCliente.documentosSimulados?.otros }
                  ].map((doc, idx) => (
                    <div key={idx} className="bg-emerald-950 p-3 rounded-lg border border-emerald-800/80 flex flex-col items-center text-center justify-between">
                      <span className="text-[10px] font-bold text-emerald-300/80 mb-2">{doc.label}</span>
                      <div className="w-full aspect-[4/3] bg-slate-900 rounded border border-emerald-800/80 overflow-hidden relative group">
                        {doc.val ? (
                          <>
                            <img
                              src={doc.val}
                              alt={doc.label}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                              <a
                                href={doc.val}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer border border-emerald-700"
                                title="Ver pantalla completa"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={doc.val}
                                download={`${viewingCliente.id}-${doc.key}`}
                                className="p-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer border border-emerald-700"
                                title="Descargar"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-emerald-300/40">
                            <FileText className="w-6 h-6 mb-1" />
                            <span className="text-[9px]">Sin cargar</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-emerald-800/80 flex justify-between items-center gap-3 bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  const targetClient = viewingCliente;
                  setViewingCliente(null);
                  handleOpenPagoModal(targetClient);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black transition-all text-xs cursor-pointer shadow-md flex items-center gap-1.5 border border-emerald-400/80"
              >
                <DollarSign className="w-4 h-4 text-emerald-100" />
                <span>INGRESAR PAGO (COBRAR)</span>
              </button>

              <button
                onClick={() => setViewingCliente(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold transition-all text-xs cursor-pointer border border-slate-700"
              >
                CERRAR EXPEDIENTE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE VERIFICACIÓN Y CORROBORACIÓN PREVIA A LA IMPORTACIÓN MASIVA DE CLIENTES */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-emerald-950 border-2 border-emerald-500/80 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-emerald-800 bg-slate-900 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  Corroboración Previa de Clientes a Ingresar
                </h3>
                <p className="text-xs text-emerald-300/80 mt-0.5">
                  Revise los datos extraídos del archivo antes de ejecutarlos en su empresa. Se han procesado <span className="font-extrabold text-white">{importedPreview.length}</span> registros.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportedPreview([]);
                }}
                className="text-emerald-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              
              <div className="bg-emerald-900/40 border border-emerald-700/80 p-3.5 rounded-xl text-xs text-emerald-200 flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold text-white block">Protección de Datos Garantizada</span>
                  <p className="text-[11px] text-emerald-300/90 mt-0.5">
                    Este proceso agregará los clientes de forma limpia a CrediCash. <b>Ningún cliente o crédito existente será alterado ni borrado.</b>
                  </p>
                </div>
              </div>

              {importErrors.length > 0 && (
                <div className="bg-amber-950/80 border border-amber-700 p-3 rounded-xl text-xs text-amber-200 space-y-1">
                  <span className="font-bold block text-amber-300">Observaciones detectadas:</span>
                  <ul className="list-disc list-inside text-[11px] text-amber-200/90">
                    {importErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Table Preview */}
              <div className="border border-emerald-800 rounded-xl overflow-hidden bg-slate-900/80 max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-emerald-900/80 text-emerald-300 font-extrabold uppercase sticky top-0 border-b border-emerald-800">
                    <tr>
                      <th className="py-2.5 px-3">ID Asignado</th>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">DNI</th>
                      <th className="py-2.5 px-3">Teléfono</th>
                      <th className="py-2.5 px-3">Dirección</th>
                      <th className="py-2.5 px-3">Ocupación</th>
                      <th className="py-2.5 px-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-800/60 text-emerald-100 font-medium">
                    {importedPreview.map((cli, idx) => (
                      <tr key={idx} className="hover:bg-emerald-900/40">
                        <td className="py-2 px-3 font-mono font-extrabold text-emerald-300">{cli.id}</td>
                        <td className="py-2 px-3 font-bold text-white">{cli.nombre} {cli.apellido}</td>
                        <td className="py-2 px-3 font-mono">{cli.dni}</td>
                        <td className="py-2 px-3">{cli.telefono || 'N/A'}</td>
                        <td className="py-2 px-3 truncate max-w-[150px]">{cli.direccion || 'N/A'}</td>
                        <td className="py-2 px-3 truncate max-w-[120px]">{cli.trabajo || 'Independiente'}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-700">
                            {cli.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-emerald-800 bg-slate-900 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportedPreview([]);
                }}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg font-bold text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-extrabold text-xs shadow-lg transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>CONFIRMAR E INGRESAR {importedPreview.length} CLIENTES</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL INGRESAR PAGO (COBRAR CUOTA) DESDE CLIENTES VIEW */}
      {pagoModalCliente && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col my-8">
            {/* Header */}
            <div className="p-4 bg-emerald-950 border-b border-emerald-800 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black shadow-md">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Ingresar Pago / Cobrar Cuota</h3>
                  <p className="text-xs text-emerald-300 font-bold">{pagoModalCliente.nombre} {pagoModalCliente.apellido} (DNI: {pagoModalCliente.dni})</p>
                </div>
              </div>
              <button
                onClick={() => setPagoModalCliente(null)}
                className="p-1.5 hover:bg-emerald-900 rounded-full text-emerald-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs text-white">
              {/* Operation Selector */}
              <div>
                <label className="text-[11px] font-bold text-emerald-300 block mb-1">Operación / Crédito Afectado</label>
                {pagoModalOperaciones.length === 0 ? (
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-amber-800/80 text-amber-300 text-xs">
                    ⚠️ Sin operaciones registradas. Se creará un registro directo de cobro.
                  </div>
                ) : (
                  <select
                    value={selectedOpId}
                    onChange={(e) => handleOpChangeInModal(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-700/80 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-hidden focus:border-emerald-400"
                  >
                    {pagoModalOperaciones.map(op => (
                      <option key={op.id} value={op.id}>
                        {op.id} - ${op.valorCuota.toLocaleString('es-AR')}/cuota ({op.cuotasPagadas}/{op.cantidadCuotas || op.cuotasTotales} pagadas)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Pending Cuotas Breakdown */}
              {(() => {
                const targetOp = pagoModalOperaciones.find(o => String(o.id).trim() === String(selectedOpId).trim());
                const targetOpIdStr = targetOp ? String(targetOp.id).trim() : '';
                let opCuotas = (cuotas || []).filter(c => String(c.idOperacion).trim() === targetOpIdStr && c.estado !== 'PAGADA');
                if (opCuotas.length === 0 && targetOp) {
                  opCuotas = generarPlanCuotas(targetOp, []).filter(c => c.estado !== 'PAGADA');
                }
                if (opCuotas.length === 0) return null;

                return (
                  <div>
                    <label className="text-[11px] font-bold text-emerald-300 block mb-1">Cuotas Pendientes de Imputación</label>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 bg-slate-950 p-2 rounded-xl border border-emerald-900">
                      {opCuotas.sort((a,b)=>a.numeroCuota-b.numeroCuota).map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setPagoSelectedCuotaId(c.id);
                            setPagoMonto(String(c.saldoPendiente));
                          }}
                          className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                            pagoSelectedCuotaId === c.id
                              ? 'bg-emerald-900/80 border-emerald-400 shadow-xs'
                              : 'bg-slate-900 border-slate-800 hover:border-emerald-700'
                          }`}
                        >
                          <div>
                            <span className="font-bold text-white">Cuota #{c.numeroCuota}</span>
                            <span className="text-[10px] text-emerald-300/70 ml-2">Vence: {c.fechaVencimiento}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-emerald-300">${c.saldoPendiente.toLocaleString('es-AR')}</span>
                            {c.estado === 'PAGO_PARCIAL' && (
                              <span className="block text-[8px] text-amber-400 font-bold uppercase">Pago Parcial</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Monto A Ingresar */}
              <div>
                <label className="text-[11px] font-bold text-emerald-300 block mb-1">Monto a Cobrar / Abonar ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-emerald-400 font-bold text-base">$</span>
                  <input
                    type="number"
                    value={pagoMonto}
                    onChange={(e) => setPagoMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-950 border border-emerald-500 rounded-xl text-lg font-black text-yellow-300 focus:outline-hidden focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-emerald-300 block mb-1">Fecha de Cobro</label>
                  <input
                    type="date"
                    value={pagoFecha}
                    onChange={(e) => setPagoFecha(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-hidden focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-emerald-300 block mb-1">Hora de Cobro</label>
                  <input
                    type="time"
                    value={pagoHora}
                    onChange={(e) => setPagoHora(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-hidden focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Medio de Pago */}
              <div>
                <label className="text-[11px] font-bold text-emerald-300 block mb-1">Medio de Pago</label>
                <select
                  value={pagoMedio}
                  onChange={(e) => setPagoMedio(e.target.value as any)}
                  className="w-full bg-slate-950 border border-emerald-800 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-hidden focus:border-emerald-400 cursor-pointer"
                >
                  <option value="EFECTIVO">💵 Efectivo en Mano</option>
                  <option value="TRANSFERENCIA">🏦 Transferencia Bancaria</option>
                  <option value="DEPOSITO">💳 Billetera Virtual / Mercado Pago</option>
                </select>
              </div>

              {/* Cobrador / Agente */}
              <div>
                <label className="text-[11px] font-bold text-emerald-300 block mb-1">Nombre del Cobrador / Operador</label>
                <input
                  type="text"
                  value={pagoCobrador}
                  onChange={(e) => setPagoCobrador(e.target.value)}
                  placeholder="Nombre de quien recibe el dinero..."
                  className="w-full bg-slate-950 border border-emerald-800 rounded-xl px-3 py-2 text-white font-bold focus:outline-hidden focus:border-emerald-400"
                />
              </div>

              {/* Comprobante / Ref */}
              <div>
                <label className="text-[11px] font-bold text-emerald-300 block mb-1">N° Comprobante / Referencia de Transferencia (Opcional)</label>
                <input
                  type="text"
                  value={pagoComprobanteRef}
                  onChange={(e) => setPagoComprobanteRef(e.target.value)}
                  placeholder="Ej. TRX-98234 / MP-102938"
                  className="w-full bg-slate-950 border border-emerald-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-hidden focus:border-emerald-400"
                />
              </div>

              {/* Observaciones */}
              <div>
                <label className="text-[11px] font-bold text-emerald-300 block mb-1">Observaciones / Notas</label>
                <textarea
                  value={pagoObservaciones}
                  onChange={(e) => setPagoObservaciones(e.target.value)}
                  placeholder="Detalles sobre la cobranza..."
                  rows={2}
                  className="w-full bg-slate-950 border border-emerald-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-hidden focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-emerald-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPagoModalCliente(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecutePagoInClientesView}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs cursor-pointer transition-colors shadow-lg flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>Confirmar e Ingresar Pago ($)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE RECIBO GENERADO */}
      {generatedRecibo && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col text-white">
            <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-b border-emerald-800 text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-white">¡Pago Ingresado Con Éxito!</h3>
              <p className="text-xs text-emerald-300 font-bold">Comprobante N° {generatedRecibo.pagoId}</p>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-800 space-y-2">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-emerald-300/80 font-medium">Cliente:</span>
                  <span className="font-bold text-white text-sm">{generatedRecibo.clienteNombre}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-emerald-300/80 font-medium">Monto Abonado:</span>
                  <span className="font-black text-yellow-300 text-base">${generatedRecibo.monto.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-emerald-300/80 font-medium">Imputación:</span>
                  <span className="font-bold text-emerald-300">{generatedRecibo.cuotasAfectadas}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-emerald-300/80 font-medium">Fecha y Hora:</span>
                  <span className="font-bold text-white">{generatedRecibo.fecha} {generatedRecibo.hora} hs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-emerald-300/80 font-medium">Medio de Pago:</span>
                  <span className="font-bold text-white">{generatedRecibo.medioPago}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSendReciboWhatsApp}
                  className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadReciboPDF}
                  className="p-3 bg-slate-800 hover:bg-slate-700 text-emerald-200 border border-emerald-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar PDF</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-emerald-800 text-center">
              <button
                type="button"
                onClick={() => setGeneratedRecibo(null)}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-black rounded-xl text-xs cursor-pointer transition-colors shadow-md"
              >
                Aceptar y Finalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CREDIT MODAL */}
      {editingLoan && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-emerald-950 rounded-2xl border border-emerald-800/80 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-scaleIn">
            <div className="flex justify-between items-center border-b border-emerald-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Editar Crédito #{editingLoan.id}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingLoan(null)}
                className="text-emerald-300/70 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedLoan} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-emerald-300 mb-1">Monto Capital ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editMontoPrestamo}
                    onChange={(e) => setEditMontoPrestamo(e.target.value)}
                    className="w-full bg-slate-900 border border-emerald-800 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-300 mb-1">Total Financiado ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editMontoTotal}
                    onChange={(e) => setEditMontoTotal(e.target.value)}
                    className="w-full bg-slate-900 border border-emerald-800 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-emerald-300 mb-1">Valor de Cuota ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editValorCuota}
                    onChange={(e) => setEditValorCuota(e.target.value)}
                    className="w-full bg-slate-900 border border-emerald-800 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-emerald-300 mb-1">Cantidad de Cuotas / Plan</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editCantidadCuotas}
                    onChange={(e) => setEditCantidadCuotas(e.target.value)}
                    className="w-full bg-slate-900 border border-emerald-800 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-emerald-300 mb-1">Frecuencia</label>
                  <select
                    value={editFrecuencia}
                    onChange={(e) => setEditFrecuencia(e.target.value as any)}
                    className="w-full bg-slate-900 border border-emerald-800 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="DIARIO">DIARIO</option>
                    <option value="SEMANAL">SEMANAL</option>
                    <option value="QUINCENAL">QUINCENAL</option>
                    <option value="MENSUAL">MENSUAL</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-emerald-300 mb-1">Estado del Crédito</label>
                  <select
                    value={editEstado}
                    onChange={(e) => setEditEstado(e.target.value as any)}
                    className="w-full bg-slate-900 border border-emerald-800 rounded-xl p-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ACTIVA">ACTIVA</option>
                    <option value="FINALIZADA">FINALIZADA</option>
                    <option value="VENCIDA">VENCIDA</option>
                    <option value="CONGELADA">CONGELADA</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-emerald-800/80">
                <button
                  type="button"
                  onClick={() => setEditingLoan(null)}
                  className="px-4 py-2.5 bg-slate-900 text-slate-300 rounded-xl font-bold cursor-pointer hover:bg-slate-800 border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black cursor-pointer shadow-md transition-all"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
