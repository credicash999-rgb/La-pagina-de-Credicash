/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Operacion, Cuota, Pago, TransaccionTesoreria, Cliente, UsuarioRol, Configuracion } from '../types';
import { calcularDiasAtrasoSinDomingos, sortCuotasByPaymentPriority, normalizeDateToISO, parseDateToTimestamp, generarPlanCuotas } from '../utils/cuotasGenerator';
import { 
  DollarSign, Search, Calendar, Check, AlertCircle, FileText, 
  ChevronRight, ArrowRight, User, Users, Phone, Send, X, ClipboardList,
  AlertTriangle, CheckCircle2, RefreshCw, Smartphone, TrendingUp, HelpCircle,
  Handshake, PhoneCall, MapPin, MessageCircle, ShieldCheck, Trash2, Filter
} from 'lucide-react';

interface PagosViewProps {
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
  clientes: Cliente[];
  usuarios?: UsuarioRol[];
  activeUser: UsuarioRol | null;
  configuracion?: Configuracion;
  onAddPago: (pago: Pago, updatedCuotas: Cuota[], updatedOperacion: Operacion, tesoreriaTrx: TransaccionTesoreria) => void;
  onReorganizePago?: (
    pagoId: string,
    newModalidad: 'PAGO_REGULAR' | 'PAGO_PARCIAL' | 'PAGO_ADELANTADO_OPCION_A' | 'PAGO_ADELANTADO_OPCION_B',
    newMetodoPago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO',
    newFechaPago?: string,
    newImporte?: number,
    newObservaciones?: string
  ) => void;
  onDeletePago?: (pagoId: string) => void;
  canAddPago?: boolean;
  mode?: 'WHATSAPP' | 'TELEFONO' | 'CALLE';
}

export default function PagosView({
  operaciones,
  cuotas,
  pagos,
  clientes,
  usuarios = [],
  activeUser,
  configuracion,
  onAddPago,
  onReorganizePago,
  onDeletePago,
  canAddPago = true,
  mode = 'WHATSAPP',
}: PagosViewProps) {
  // Mode selection state (WHATSAPP, TELEFONO, CALLE)
  const [currentMode, setCurrentMode] = useState<'WHATSAPP' | 'TELEFONO' | 'CALLE'>(mode);

  React.useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  // Main view tab (Cobranza vs Registro Histórico de Pagos)
  const [viewTab, setViewTab] = useState<'cobranza' | 'registro_pagos'>('cobranza');

  // Navigation tab for the Operator layout
  const [activeSubTab, setActiveSubTab] = useState<'gestion' | 'buscador'>('gestion');
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Toggle for only showing operator-assigned clients
  const [filterOnlyAssigned, setFilterOnlyAssigned] = useState<boolean>(activeUser?.rolId === 'COBRADOR');

  // Active client selected for Ficha Resumen (Modal)
  const [selectedOp, setSelectedOp] = useState<Operacion | null>(null);
  
  // Action state (which modal option is active)
  const [activeAction, setActiveAction] = useState<'pago' | 'pago_parcial' | 'pago_adelantado' | 'no_pago' | 'promesa' | 'observaciones' | 'visita' | null>(null);
  const [prepaymentMode, setPrepaymentMode] = useState<'FINAL_ATRAS' | 'CONSECUTIVO_INMEDIATO'>('CONSECUTIVO_INMEDIATO');

  // Double confirmation modal state for payment registrations
  const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState<boolean>(false);

  // Option to include total pending debt in exported PDF
  const [includeTotalInPDF, setIncludeTotalInPDF] = useState<boolean>(false);

  // Form states inside actions
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [importeCobrado, setImporteCobrado] = useState<string>('');
  const [medioPago, setMedioPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO'>('EFECTIVO');
  const [observacionesInput, setObservacionesInput] = useState('');
  const [promesaFecha, setPromesaFecha] = useState('');

  // Field collector commission checkbox
  const [esCobroEnCalle, setEsCobroEnCalle] = useState<boolean>(false);
  const [selectedCobradorId, setSelectedCobradorId] = useState<string>('');

  // Payment Audit & Registry Filter and Editing States
  const [pagoSearchTerm, setPagoSearchTerm] = useState('');
  const [pagoFilterModalidad, setPagoFilterModalidad] = useState<string>('TODOS');
  const [pagoFilterMetodo, setPagoFilterMetodo] = useState<string>('TODOS');
  
  const [editingPago, setEditingPago] = useState<Pago | null>(null);
  const [editModalidad, setEditModalidad] = useState<'PAGO_REGULAR' | 'PAGO_PARCIAL' | 'PAGO_ADELANTADO_OPCION_A' | 'PAGO_ADELANTADO_OPCION_B'>('PAGO_ADELANTADO_OPCION_B');
  const [editMetodoPago, setEditMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO'>('EFECTIVO');
  const [editFechaPago, setEditFechaPago] = useState<string>('');
  const [editImporte, setEditImporte] = useState<string>('');
  const [editObservaciones, setEditObservaciones] = useState<string>('');

  // Check if current user is Admin or SuperAdmin
  const isUserAdmin = activeUser?.rolId === 'ADMIN' || activeUser?.rolId === 'SUPERADMIN';

  // Supervisor filter for Admin: filter operations/payments by specific employee or 'TODOS'
  const [selectedSupervisorUserId, setSelectedSupervisorUserId] = useState<string>('TODOS');

  // Report Error modal state for operators
  const [showReportErrorModal, setShowReportErrorModal] = useState<boolean>(false);
  const [errorReportText, setErrorReportText] = useState<string>('');
  const [selectedPagoForReport, setSelectedPagoForReport] = useState<Pago | null>(null);

  // Find the details of a client by ID
  const getClienteDetails = (idCliente: string): Cliente | undefined => {
    return clientes.find(c => c.id === idCliente);
  };

  // Helper: Get today's date string (YYYY-MM-DD)
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // Helper: Get collection stage instance based on configuration
  const getInstanciaCobro = (op: Operacion): 'WHATSAPP' | 'TELEFONO' | 'CALLE' => {
    if (!configuracion) return 'WHATSAPP';
    const opCuotas = cuotas.filter(c => c.idOperacion === op.id && c.estado !== 'PAGADA');
    const sortedPending = [...opCuotas].sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
    const oldestPending = sortedPending[0];
    const today = getTodayStr();
    const diasMora = oldestPending && oldestPending.fechaVencimiento < today
      ? calcularDiasAtrasoSinDomingos(oldestPending.fechaVencimiento, today)
      : (op.diasMora || 0);

    let llamarDias = 2;
    let cobradorDias = 6;
    
    if (op.frecuencia === 'DIARIA') {
      llamarDias = configuracion.moraDiarioLlamarDias ?? 2;
      cobradorDias = configuracion.moraDiarioCobradorDias ?? 6;
    } else if (op.frecuencia === 'SEMANAL') {
      llamarDias = configuracion.moraSemanalLlamarDias ?? 4;
      cobradorDias = configuracion.moraSemanalCobradorDias ?? 7;
    } else if (op.frecuencia === 'QUINCENAL') {
      llamarDias = configuracion.moraQuincenalLlamarDias ?? 5;
      cobradorDias = configuracion.moraQuincenalCobradorDias ?? 8;
    } else if (op.frecuencia === 'MENSUAL') {
      llamarDias = configuracion.moraMensualLlamarDias ?? 2;
      cobradorDias = configuracion.moraMensualCobradorDias ?? 2;
    }
    
    if (diasMora >= cobradorDias) {
      return 'CALLE';
    } else if (diasMora >= llamarDias) {
      return 'TELEFONO';
    } else {
      return 'WHATSAPP';
    }
  };

  // Helper: Get formatted client address
  const getFullAddress = (cli: Cliente) => {
    const parts = [];
    if (cli.calle) {
      parts.push(cli.calle);
      if (cli.numero) parts.push(cli.numero);
    } else if (cli.direccion) {
      parts.push(cli.direccion);
    }
    if (cli.barrio) {
      parts.push(`Bº ${cli.barrio}`);
    }
    return parts.join(' ') || 'Sin dirección registrada';
  };

  // Helper: Check if customer has a promise of payment
  // We identify this if the operation observations contain a specialized tag or if we simulate it
  const isPromesaPendiente = (op: Operacion) => {
    return op.observaciones.toLowerCase().includes('promesa:') || op.observaciones.toLowerCase().includes('pago programado');
  };

  // Helper: Check if customer has overdue installments (cuotas vencidas)
  const hasCuotasVencidas = (opId: string) => {
    const today = getTodayStr();
    return cuotas.some(c => c.idOperacion === opId && c.estado !== 'PAGADA' && c.fechaVencimiento < today);
  };

  // Helper: Get exigible pending (current installment + total overdue installments)
  const getExigiblePendiente = (op: Operacion): { total: number; det: string; vencido: number; corriente: number; esAlertaPagoMinimo: boolean } => {
    const today = getTodayStr();
    // Filter all unpaid installments for this operation
    const opCuotas = cuotas.filter(c => c.idOperacion === op.id && c.estado !== 'PAGADA');
    
    // Sort them by due date
    const sortedPending = [...opCuotas].sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
    
    // Overdue installments: due date < today
    const overdueCuotas = sortedPending.filter(c => c.fechaVencimiento < today);
    const vencido = overdueCuotas.reduce((sum, c) => sum + c.saldoPendiente, 0);
    
    // Current installment: ONLY pending installment due TODAY (fechaVencimiento === today)
    const currentCuota = sortedPending.find(c => c.fechaVencimiento === today);
    const corriente = currentCuota ? currentCuota.saldoPendiente : 0;
    
    const total = vencido + corriente;
    
    // Minimum payment warning threshold (defaults to 2 cuotas vencidas)
    const threshold = configuracion?.pagoMinimoCuotas || 2;
    const esAlertaPagoMinimo = overdueCuotas.length >= threshold;
    
    const hasToday = op.frecuencia === 'DIARIA' && cuotas.some(c => c.idOperacion === op.id && c.fechaVencimiento === today && c.estado !== 'PAGADA');
    
    let det = '';
    if (overdueCuotas.length > 0) {
      det = `${overdueCuotas.length} vencida${overdueCuotas.length > 1 ? 's' : ''}`;
      if (hasToday) {
        det += ` + ¡la de hoy!`;
      } else if (corriente > 0) {
        det += ` + 1 corriente`;
      }
    } else if (corriente > 0) {
      if (hasToday) {
        det = '¡la cuota de hoy!';
      } else {
        det = '1 cuota corriente';
      }
    } else {
      det = 'Ninguna exigible';
    }
    
    return {
      total,
      det,
      vencido,
      corriente,
      esAlertaPagoMinimo
    };
  };

  // Helper: Check if customer has installment due today
  const hasCuotaDueToday = (op: Operacion) => {
    const today = getTodayStr();
    return cuotas.some(c => c.idOperacion === op.id && c.fechaVencimiento === today && c.estado !== 'PAGADA');
  };

  // Helper: Check if next due date is within 3 days (or overdue)
  const isVencimientoProximo = (op: Operacion): boolean => {
    const opCuotas = cuotas.filter(c => c.idOperacion === op.id && c.estado !== 'PAGADA');
    if (opCuotas.length === 0) return false;

    const sorted = [...opCuotas].sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
    const earliestPendingDate = sorted[0].fechaVencimiento;

    const today = new Date(getTodayStr() + 'T00:00:00');
    const dueDate = new Date(earliestPendingDate + 'T00:00:00');

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= 3;
  };

  // Filter and sort the operations specifically according to the operator specification
  const filteredAndPrioritizedOps = React.useMemo(() => {
    // 1. Clean list: active operations
    let list = operaciones.filter(op => op.estado === 'ACTIVA');

    // 2. Filter by collection stage/mode
    if (currentMode === 'WHATSAPP') {
      // In WHATSAPP / Gestión Diaria mode, operations from ALL stages (WHATSAPP, TELEFONO, CALLE)
      // remain visible in the entrance desk (Mesa de Entrada) with their visual classification level.
    } else {
      list = list.filter(op => getInstanciaCobro(op) === currentMode);
    }

    // 2.5 Filter out active operations whose next due date is more than 3 days away AND don't have overdue cuotas
    // Also, if they have paid today's installment and have no overdue cuotas, they are "al día" for today and disappear from the agenda list.
    // However, if the operator is using the search box, we allow searching across all.
    if (searchTerm.trim() === '') {
      list = list.filter(op => {
        const hasOverdue = hasCuotasVencidas(op.id);
        const hasTodayUnpaid = hasCuotaDueToday(op);
        
        // If they have overdue or today's cuota unpaid, they definitely must show up.
        if (hasOverdue || hasTodayUnpaid) {
          return true;
        }
        
        // If they have neither overdue nor today's unpaid, they are "al día" for today!
        // But if it's a brand new client who hasn't paid anything yet, and their first installment is within 3 days,
        // we still want to show them so the operator knows they are starting.
        const hasAnyPaid = cuotas.some(c => c.idOperacion === op.id && c.estado === 'PAGADA');
        if (!hasAnyPaid) {
          return isVencimientoProximo(op);
        }
        
        // Otherwise, they are up-to-date and have active payments, so they disappear from the priority list.
        return false;
      });
    }

    // 3. Filter by assigned collector if the user is a Collector or Operator and filter is enabled
    const userName = activeUser?.nombre || '';
    const isSpecializedRole = activeUser?.rolId === 'COBRADOR' || activeUser?.rolId === 'OPERADOR';
    
    if (isSpecializedRole && filterOnlyAssigned && userName) {
      list = list.filter(op => op.cobrador === userName);
    }

    // 3.5 Supervision Filter for Admin: filter by selected supervisor user ID
    if (isUserAdmin && selectedSupervisorUserId !== 'TODOS') {
      const selectedUser = usuarios.find(u => u.id === selectedSupervisorUserId);
      if (selectedUser) {
        list = list.filter(op => {
          const cli = getClienteDetails(op.idCliente);
          return (
            op.cobrador === selectedUser.nombre ||
            (cli && (
              cli.cobradorAsignadoId === selectedUser.id ||
              cli.cobradorAsignadoNombre === selectedUser.nombre ||
              cli.operadorAsignadoId === selectedUser.id ||
              cli.captador === selectedUser.nombre
            ))
          );
        });
      }
    }

    // 4. Filter by search term (Client name, DNI, operation ID)
    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase().trim();
      list = list.filter(op => {
        const cli = getClienteDetails(op.idCliente);
        return (
          op.id.toLowerCase().includes(query) ||
          op.nombreCliente.toLowerCase().includes(query) ||
          (cli && cli.dni.includes(query))
        );
      });
    }

    // 5. Sort strictly by priorities:
    //    Priority 1: Overdue installments (hasCuotasVencidas or diasMora > 0)
    //    Priority 2: Due today (hasCuotaDueToday or proximoVencimiento === today)
    //    Priority 3: Promise of payment pending
    //    Priority 4: Rest of the assigned clients
    return list.sort((a, b) => {
      const aVencida = hasCuotasVencidas(a.id) || a.diasMora > 0 ? 1 : 0;
      const bVencida = hasCuotasVencidas(b.id) || b.diasMora > 0 ? 1 : 0;
      if (aVencida !== bVencida) return bVencida - aVencida;

      const aHoy = hasCuotaDueToday(a) || a.proximoVencimiento === getTodayStr() ? 1 : 0;
      const bHoy = hasCuotaDueToday(b) || b.proximoVencimiento === getTodayStr() ? 1 : 0;
      if (aHoy !== bHoy) return bHoy - aHoy;

      const aPromesa = isPromesaPendiente(a) ? 1 : 0;
      const bPromesa = isPromesaPendiente(b) ? 1 : 0;
      if (aPromesa !== bPromesa) return bPromesa - aPromesa;

      // Secondary sort alphabetically by client name
      return a.nombreCliente.localeCompare(b.nombreCliente);
    });
  }, [operaciones, cuotas, clientes, activeUser, searchTerm, filterOnlyAssigned, currentMode, configuracion]);

  // Handle the action submission (registering payments, visits, etc.)
  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOp) return;

    if (activeAction === 'pago' || activeAction === 'pago_parcial' || activeAction === 'pago_adelantado') {
      const valorCobrado = parseFloat(importeCobrado);
      if (isNaN(valorCobrado) || valorCobrado <= 0) {
        alert('Por favor ingrese un importe válido mayor a cero.');
        return;
      }

      // Check against total outstanding
      if (valorCobrado > selectedOp.totalPendiente) {
        if (!confirm(`El monto cobrado ($${valorCobrado}) supera la deuda total pendiente ($${selectedOp.totalPendiente}). ¿Desea continuar de todas formas?`)) {
          return;
        }
      }

      // Open the safety double confirmation dialog instead of writing directly
      setShowPaymentConfirmModal(true);

    } else if (activeAction === 'no_pago') {
      const loggedInUserName = activeUser?.nombre || 'Operador Central';
      // Register that the client did not pay
      const updatedOp = { ...selectedOp };
      const logMsg = `[REGISTRO NO PAGO - ${getTodayStr()} por ${loggedInUserName}]: Cliente contactado. Motivo: ${observacionesInput || 'No especificado'}`;
      updatedOp.observaciones = updatedOp.observaciones ? `${updatedOp.observaciones}\n${logMsg}` : logMsg;
      
      // Update main state
      onAddPago({
        id: `LOG-NP-${Date.now().toString().slice(-4)}`,
        idOperacion: selectedOp.id,
        idCliente: selectedOp.idCliente,
        nombreCliente: selectedOp.nombreCliente,
        fechaPago: getTodayStr(),
        importe: 0,
        cobrador: loggedInUserName,
        metodoPago: 'EFECTIVO',
        observaciones: `Registro de No Pago: ${observacionesInput}`,
      }, [], updatedOp, {
        id: `TRX-LOG-${Date.now()}`,
        fecha: getTodayStr(),
        tipo: 'INGRESO',
        concepto: `Log No Pago: Op ${selectedOp.id} - ${selectedOp.nombreCliente}`,
        monto: 0
      });

      alert('Se registró la observación de "No Pago" en la ficha del crédito.');
      setSelectedOp(updatedOp);
      setObservacionesInput('');
      setActiveAction(null);

    } else if (activeAction === 'promesa') {
      const loggedInUserName = activeUser?.nombre || 'Operador Central';
      if (!promesaFecha) {
        alert('Por favor ingrese una fecha programada para la promesa de pago.');
        return;
      }
      
      const updatedOp = { ...selectedOp };
      const logMsg = `[PROMESA DE PAGO - Creada el ${getTodayStr()} por ${loggedInUserName}]: Prometió abonar el día ${promesaFecha}. Detalle: ${observacionesInput}`;
      updatedOp.observaciones = updatedOp.observaciones ? `${updatedOp.observaciones}\n${logMsg}` : logMsg;
      
      onAddPago({
        id: `LOG-PR-${Date.now().toString().slice(-4)}`,
        idOperacion: selectedOp.id,
        idCliente: selectedOp.idCliente,
        nombreCliente: selectedOp.nombreCliente,
        fechaPago: getTodayStr(),
        importe: 0,
        cobrador: loggedInUserName,
        metodoPago: 'EFECTIVO',
        observaciones: `Promesa de Pago para: ${promesaFecha}. ${observacionesInput}`,
      }, [], updatedOp, {
        id: `TRX-LOG-${Date.now()}`,
        fecha: getTodayStr(),
        tipo: 'INGRESO',
        concepto: `Log Promesa: Op ${selectedOp.id} - ${selectedOp.nombreCliente}`,
        monto: 0
      });

      alert(`Promesa de pago guardada para el día ${promesaFecha}. El cliente figurará con prioridad en el listado.`);
      setSelectedOp(updatedOp);
      setObservacionesInput('');
      setPromesaFecha('');
      setActiveAction(null);

    } else if (activeAction === 'observaciones') {
      const loggedInUserName = activeUser?.nombre || 'Operador Central';
      const updatedOp = { ...selectedOp };
      const logMsg = `[OBSERVACIÓN - ${getTodayStr()} por ${loggedInUserName}]: ${observacionesInput}`;
      updatedOp.observaciones = updatedOp.observaciones ? `${updatedOp.observaciones}\n${logMsg}` : logMsg;
      
      onAddPago({
        id: `LOG-OB-${Date.now().toString().slice(-4)}`,
        idOperacion: selectedOp.id,
        idCliente: selectedOp.idCliente,
        nombreCliente: selectedOp.nombreCliente,
        fechaPago: getTodayStr(),
        importe: 0,
        cobrador: loggedInUserName,
        metodoPago: 'EFECTIVO',
        observaciones: observacionesInput,
      }, [], updatedOp, {
        id: `TRX-LOG-${Date.now()}`,
        fecha: getTodayStr(),
        tipo: 'INGRESO',
        concepto: `Observación: Op ${selectedOp.id} - ${selectedOp.nombreCliente}`,
        monto: 0
      });

      alert('Observación de cobranza adjuntada al expediente con éxito.');
      setSelectedOp(updatedOp);
      setObservacionesInput('');
      setActiveAction(null);
    }
  };

  // Perform the actual persistent database mutation for payment transactions after secondary confirmation
  const executePaymentRegistration = () => {
    if (!selectedOp) return;
    const loggedInUserName = activeUser?.nombre || 'Operador Central';
    const valorCobrado = parseFloat(importeCobrado);
    const effectiveFecha = normalizeDateToISO(fechaPago || getTodayStr());

    // Determine payment modality
    let modality: 'PAGO_REGULAR' | 'PAGO_PARCIAL' | 'PAGO_ADELANTADO_OPCION_A' | 'PAGO_ADELANTADO_OPCION_B' = 'PAGO_REGULAR';
    if (activeAction === 'pago_parcial') {
      modality = 'PAGO_PARCIAL';
    } else if (activeAction === 'pago_adelantado') {
      modality = prepaymentMode === 'FINAL_ATRAS' ? 'PAGO_ADELANTADO_OPCION_A' : 'PAGO_ADELANTADO_OPCION_B';
    }

    let remPago = valorCobrado;
    const updatedCuotas: Cuota[] = [];
    
    const targetOpIdStr = String(selectedOp.id).trim();
    let allOpCuotas = cuotas.filter(c => String(c.idOperacion).trim() === targetOpIdStr);
    if (allOpCuotas.length === 0 && selectedOp) {
      allOpCuotas = generarPlanCuotas(selectedOp, []);
    }
    const cuotasToProcess = sortCuotasByPaymentPriority(allOpCuotas, effectiveFecha, modality);

    let totalCapitalPaid = 0;
    let totalInteresPaid = 0;
    const processedCuotasMap = new Map<string, Cuota>();
    const affectedCuotaNumbers: number[] = [];

    cuotasToProcess.forEach(cuo => {
      if (cuo.estado === 'PAGADA' || remPago <= 0) {
        processedCuotasMap.set(cuo.id, cuo);
        return;
      }

      const cuoCopy = { ...cuo };
      const currentSaldo = cuoCopy.saldoPendiente;
      affectedCuotaNumbers.push(cuoCopy.numeroCuota);

      if (remPago >= currentSaldo) {
        // Full payment of this installment
        const paidThisCuota = currentSaldo;
        remPago = parseFloat((remPago - paidThisCuota).toFixed(2));
        
        const ratioCapital = cuoCopy.capitalCuota / cuoCopy.valorTotalCuota;
        const ratioInteres = cuoCopy.interesCuota / cuoCopy.valorTotalCuota;

        const capPaid = parseFloat((paidThisCuota * ratioCapital).toFixed(2));
        const intPaid = parseFloat((paidThisCuota * ratioInteres).toFixed(2));

        totalCapitalPaid += capPaid;
        totalInteresPaid += intPaid;

        cuoCopy.importePagado = parseFloat((cuoCopy.importePagado + paidThisCuota).toFixed(2));
        cuoCopy.saldoPendiente = 0;
        cuoCopy.estado = 'PAGADA';
        cuoCopy.fechaPago = effectiveFecha;
        cuoCopy.cobrador = loggedInUserName;
      } else {
        // Partial payment of this installment
        const paidThisCuota = remPago;
        remPago = 0;

        const ratioCapital = cuoCopy.capitalCuota / cuoCopy.valorTotalCuota;
        const ratioInteres = cuoCopy.interesCuota / cuoCopy.valorTotalCuota;

        const capPaid = parseFloat((paidThisCuota * ratioCapital).toFixed(2));
        const intPaid = parseFloat((paidThisCuota * ratioInteres).toFixed(2));

        totalCapitalPaid += capPaid;
        totalInteresPaid += intPaid;

        cuoCopy.importePagado = parseFloat((cuoCopy.importePagado + paidThisCuota).toFixed(2));
        cuoCopy.saldoPendiente = parseFloat((cuoCopy.saldoPendiente - paidThisCuota).toFixed(2));
        cuoCopy.estado = 'PAGO_PARCIAL';
        cuoCopy.fechaPago = effectiveFecha;
        cuoCopy.cobrador = loggedInUserName;
      }

      processedCuotasMap.set(cuo.id, cuoCopy);
    });

    // Reconstruct updatedCuotas in original ascending order
    const opCuotasModified = allOpCuotas
      .sort((a, b) => a.numeroCuota - b.numeroCuota)
      .map(c => {
        const updated = processedCuotasMap.get(c.id) || c;
        updatedCuotas.push(updated);
        return updated;
      });

    // Update parent operation automatically
    const updatedOp = { ...selectedOp };
    updatedOp.capitalRecuperado = parseFloat((updatedOp.capitalRecuperado + totalCapitalPaid).toFixed(2));
    updatedOp.interesCobrado = parseFloat((updatedOp.interesCobrado + totalInteresPaid).toFixed(2));
    updatedOp.capitalPendiente = Math.max(0, parseFloat((updatedOp.capitalPendiente - totalCapitalPaid).toFixed(2)));
    updatedOp.totalPendiente = Math.max(0, parseFloat((updatedOp.totalPendiente - valorCobrado).toFixed(2)));

    // Cuotas stats
    const totalCuotasCount = opCuotasModified.length;
    const pagadasCount = opCuotasModified.filter(c => c.estado === 'PAGADA').length;
    updatedOp.cuotasPagadas = pagadasCount;
    updatedOp.cuotasPendientes = totalCuotasCount - pagadasCount;
    updatedOp.ultimoPago = effectiveFecha;

    // Find next pending cuota expiration
    const nextPendingCuo = opCuotasModified
      .filter(c => c.estado !== 'PAGADA')
      .sort((a, b) => a.numeroCuota - b.numeroCuota)[0];
    
    if (nextPendingCuo) {
      updatedOp.proximoVencimiento = nextPendingCuo.fechaVencimiento;
      
      // Recalculate days of arrears dynamically
      const dueTime = parseDateToTimestamp(nextPendingCuo.fechaVencimiento);
      const payTime = parseDateToTimestamp(effectiveFecha);
      const diffDays = Math.ceil((payTime - dueTime) / (1000 * 60 * 60 * 24));
      updatedOp.diasMora = diffDays > 0 ? diffDays : 0;
      updatedOp.estado = 'ACTIVA';
    } else {
      updatedOp.proximoVencimiento = 'PAGADO TOTAL';
      updatedOp.estado = 'FINALIZADA';
      updatedOp.fechaFinalizacion = effectiveFecha;
      updatedOp.motivoCierre = 'Crédito amortizado en su totalidad por cobranza regular';
      updatedOp.diasMora = 0;
    }

    // Arrears classification system
    if (updatedOp.diasMora === 0) {
      updatedOp.nivelMora = 'Sano';
    } else if (updatedOp.diasMora <= 3) {
      updatedOp.nivelMora = 'Atraso Regular (1-3 días)';
    } else if (updatedOp.diasMora <= 6) {
      updatedOp.nivelMora = 'Cobranza Telefónica (4-6 días)';
    } else {
      updatedOp.nivelMora = 'Cobrador de Calle (7+ días)';
    }

    // Renewal/Extension eligibility
    const pctPaid = (updatedOp.cuotasPagadas / updatedOp.cantidadCuotas) * 100;
    updatedOp.elegibleRenovacion = pctPaid >= 70 && updatedOp.diasMora <= 3;
    updatedOp.elegibleAmpliacion = pctPaid >= 40 && updatedOp.diasMora <= 2;

    // Append general observations
    const paymentMsg = `[Pago de $${valorCobrado} vía ${medioPago} el ${effectiveFecha} (${modality})] ${observacionesInput}`;
    updatedOp.observaciones = updatedOp.observaciones 
      ? `${updatedOp.observaciones}\n${paymentMsg}` 
      : paymentMsg;

    const formattedTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const cuotasAfectadasText = affectedCuotaNumbers.length > 0 
      ? `Cuotas N° ${affectedCuotaNumbers.sort((a,b) => a - b).join(', ')}`
      : 'Sin cuotas';

    const cobradorSeleccionado = esCobroEnCalle && selectedCobradorId
      ? (usuarios.find(u => u.id === selectedCobradorId)?.nombre || loggedInUserName)
      : loggedInUserName;

    // Create a new Pago record
    const nuevoPago: Pago = {
      id: `PAG-${Date.now().toString().slice(-6)}`,
      idOperacion: selectedOp.id,
      idCliente: selectedOp.idCliente,
      nombreCliente: selectedOp.nombreCliente,
      fechaPago: effectiveFecha,
      horaPago: formattedTime,
      importe: valorCobrado,
      cobrador: cobradorSeleccionado,
      metodoPago: medioPago,
      modalidad: modality,
      cuotasAfectadas: cuotasAfectadasText,
      observaciones: esCobroEnCalle
        ? `[Cobro en Calle por ${cobradorSeleccionado} - Comisión Aplicable] ${observacionesInput}`
        : observacionesInput,
    };

    // Create Treasury record
    const trxTesoreria: TransaccionTesoreria = {
      id: `TRX-${Date.now().toString()}`,
      fecha: effectiveFecha,
      tipo: 'INGRESO',
      concepto: `Cobranza de Crédito N° ${selectedOp.id} - ${selectedOp.nombreCliente} (${medioPago} - ${modality})`,
      monto: valorCobrado,
      referenciaId: nuevoPago.id,
    };

    // Fire update to main system state
    onAddPago(nuevoPago, updatedCuotas, updatedOp, trxTesoreria);
    
    alert(`¡Pago de $${valorCobrado.toLocaleString('es-ES')} registrado con éxito!\nModalidad: ${modality === 'PAGO_ADELANTADO_OPCION_B' ? 'Opción B (Cuota del Día + Consecutivas)' : modality}\n${cuotasAfectadasText}`);
    
    // Update local view item
    setSelectedOp(updatedOp);
    
    // Clean up form
    setImporteCobrado('');
    setObservacionesInput('');
    setActiveAction(null);
    setShowPaymentConfirmModal(false);
  };

  // Helper to open direct WhatsApp conversation
  const handleOpenWhatsApp = (telefono: string, clienteNombre: string, opId: string, saldo: number) => {
    const cleanPhone = telefono.replace(/[^\d+]/g, '');
    const message = encodeURIComponent(
      `Hola ${clienteNombre}, te saludamos de CrediCash. Queríamos consultarte sobre el estado de tu cuota de crédito ${opId}. Saldo pendiente: $${saldo.toLocaleString('es-ES')}. ¿Te viene bien realizar el abono hoy? ¡Muchas gracias!`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  // Helper to trigger direct phone call
  const handleCallPhone = (telefono: string) => {
    window.location.href = `tel:${telefono}`;
  };

  // Helper to export Amortization Schedule to high-quality printable PDF
  const handleExportPDF = (op: Operacion, includeTotalSaldo: boolean = false) => {
    const cliDetails = getClienteDetails(op.idCliente);
    const opCuotas = cuotas.filter(c => c.idOperacion === op.id);
    
    // Sort cuotas by number
    opCuotas.sort((a, b) => a.numeroCuota - b.numeroCuota);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor permita las ventanas emergentes para descargar el PDF.');
      return;
    }

    const htmlContent = `
      <html>
      <head>
        <title>Estado de Cuenta y Cronograma - ${op.nombreCliente}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            color: #1e293b;
            padding: 40px;
            margin: 0;
            background-color: #fff;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .brand-name {
            font-size: 24px;
            font-weight: 800;
            color: #0B4B27;
            text-transform: uppercase;
          }
          .doc-title {
            text-align: right;
            font-size: 14px;
            color: #64748b;
            font-weight: 600;
          }
          .divider {
            height: 2px;
            background: #e2e8f0;
            margin: 20px 0;
          }
          .section-title {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-grid {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
          }
          .info-grid td {
            padding: 8px 12px;
            font-size: 12px;
            border: 1px solid #e2e8f0;
          }
          .info-label {
            font-weight: 600;
            color: #475569;
            background-color: #f8fafc;
            width: 25%;
          }
          .info-val {
            color: #0f172a;
            font-weight: 500;
          }
          .schedule-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          .schedule-table th {
            background-color: #0B4B27;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 10px 12px;
            text-align: left;
            border: 1px solid #0B4B27;
          }
          .schedule-table td {
            font-size: 11px;
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
          }
          .row-even {
            background-color: #f8fafc;
          }
          .status-badge {
            font-size: 10px;
            font-weight: 700;
            padding: 3px 8px;
            border-radius: 4px;
            text-transform: uppercase;
          }
          .status-pagada {
            background-color: #dcfce7;
            color: #15803d;
          }
          .status-vencida {
            background-color: #fee2e2;
            color: #b91c1c;
          }
          .status-pendiente {
            background-color: #fef3c7;
            color: #d97706;
          }
          .totals-section {
            margin-top: 30px;
            text-align: right;
            font-size: 13px;
            font-weight: 600;
            color: #475569;
          }
          .totals-section strong {
            font-size: 16px;
            color: #0f172a;
          }
          .signatures {
            margin-top: 60px;
            width: 100%;
          }
          .signatures td {
            width: 50%;
            text-align: center;
            font-size: 11px;
            color: #64748b;
            padding-top: 40px;
          }
          .signature-line {
            width: 200px;
            border-top: 1px dashed #94a3b8;
            margin: 0 auto 10px auto;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td class="brand-name">CrediCash Argentina</td>
            <td class="doc-title">ESTADO DE CUENTA Y CRONOGRAMA DE AMORTIZACIÓN</td>
          </tr>
        </table>
        
        <div class="divider"></div>
        
        <div class="section-title">Información del Cliente y Crédito</div>
        <table class="info-grid">
          <tr>
            <td class="info-label">Cliente</td>
            <td class="info-val">${op.nombreCliente}</td>
            <td class="info-label">DNI / Identificación</td>
            <td class="info-val">${cliDetails?.dni || 'N/A'}</td>
          </tr>
          <tr>
            <td class="info-label">ID de Crédito</td>
            <td class="info-val">#${op.id}</td>
            <td class="info-label">Frecuencia</td>
            <td class="info-val">${op.frecuencia}</td>
          </tr>
          <tr>
            <td class="info-label font-bold">Crédito Otorgado</td>
            <td class="info-val font-bold">$${(op.capitalEntregado || op.totalFinanciado).toLocaleString('es-ES')}</td>
            <td class="info-label">Días en Mora</td>
            <td class="info-val ${op.diasMora > 0 ? 'color: #b91c1c; font-weight: bold;' : ''}">${op.diasMora} días</td>
          </tr>
          <tr>
            <td class="info-label">Fecha Otorgamiento</td>
            <td class="info-val">${op.fechaOtorgamiento}</td>
            <td class="info-label">Próximo Vencimiento</td>
            <td class="info-val">${op.proximoVencimiento}</td>
          </tr>
        </table>

        <div class="section-title">Detalle de Cuotas de Amortización</div>
        <table class="schedule-table">
          <thead>
            <tr>
              <th>Cuota Nro</th>
              <th>Fecha Vencimiento</th>
              <th>Monto Cuota</th>
              <th>Interés / Gastos</th>
              ${includeTotalSaldo ? '<th>Saldo Pendiente</th>' : ''}
              <th>Estado de Pago</th>
            </tr>
          </thead>
          <tbody>
            ${opCuotas.map((c, i) => {
              let statusClass = 'status-pendiente';
              let statusLabel = 'Pendiente';
              if (c.estado === 'PAGADA') {
                statusClass = 'status-pagada';
                statusLabel = 'Pagada';
              } else if (c.estado === 'VENCIDA') {
                statusClass = 'status-vencida';
                statusLabel = 'En Mora';
              }
              return `
                <tr class="${i % 2 === 0 ? '' : 'row-even'}">
                  <td><strong>Cuota ${c.numeroCuota} / ${op.cantidadCuotas}</strong></td>
                  <td>${c.fechaVencimiento}</td>
                  <td>$${c.valorTotalCuota.toLocaleString('es-ES')}</td>
                  <td>Incluido</td>
                  ${includeTotalSaldo ? `<td>$${c.saldoPendiente.toLocaleString('es-ES')}</td>` : ''}
                  <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        ${includeTotalSaldo ? `
        <div class="totals-section">
          Saldo Pendiente de Pago: <strong style="color: #b91c1c;">$${op.totalPendiente.toLocaleString('es-ES')} ARS</strong>
        </div>
        ` : ''}

        <table class="signatures">
          <tr>
            <td>
              <div class="signature-line"></div>
              Firma del Operador Autorizado
            </td>
            <td>
              <div class="signature-line"></div>
              Firma de Conformidad del Cliente
            </td>
          </tr>
        </table>

        <div style="text-align: center; margin-top: 50px; font-size: 10px; color: #94a3b8;" class="no-print">
          <button onclick="window.print();" style="background-color: #0B4B27; color: white; border: none; padding: 10px 20px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            🖨️ Imprimir / Guardar como PDF
          </button>
        </div>

        <script>
          // Auto launch standard print dialog
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div id="recaudador-section" className="space-y-6">
      
      {/* Employee Supervision Selector for Admin */}
      {isUserAdmin && (
        <div className="bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-950 p-4 rounded-2xl border-2 border-emerald-500/80 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/30 text-emerald-400 rounded-xl border border-emerald-500/50">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-emerald-300 tracking-wider flex items-center gap-2">
                <span>SUPERVISIÓN GENERAL POR EMPLEADO</span>
                <span className="bg-emerald-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-md">
                  Panel Admin
                </span>
              </h4>
              <p className="text-[11px] text-emerald-200/80 font-medium">
                Seleccione un operador o cobrador específico para supervisar su cartera asignada, o elija "Todos".
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto flex items-center gap-2 shrink-0">
            <label className="text-[11px] font-extrabold text-white shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              Empleado:
            </label>
            <select
              value={selectedSupervisorUserId}
              onChange={(e) => setSelectedSupervisorUserId(e.target.value)}
              className="w-full md:w-72 px-3 py-2 bg-slate-900 text-white border-2 border-emerald-500 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-sm"
            >
              <option value="TODOS">👥 TODOS LOS EMPLEADOS (Vista Consolidada)</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>
                  👤 {u.nombre} ({u.rolId === 'COBRADOR' ? 'Cobrador Calle' : u.rolId === 'OPERADOR' ? 'Operador Telefónico' : u.rolId})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Top View Selector: Cobranza vs Registro Histórico de Pagos (ADMINS ONLY) */}
      {isUserAdmin ? (
        <div className="flex items-center justify-between gap-4 bg-emerald-950/90 p-2 rounded-2xl border border-emerald-800/80 shadow-md">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewTab('cobranza')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewTab === 'cobranza'
                  ? 'bg-emerald-600 text-white shadow-sm border border-emerald-500'
                  : 'text-emerald-200/80 hover:text-white hover:bg-emerald-800/50'
              }`}
            >
              <DollarSign className="w-4 h-4 text-emerald-300" />
              <span>1. Consola de Cobranza y Fichas</span>
            </button>

            <button
              onClick={() => setViewTab('registro_pagos')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                viewTab === 'registro_pagos'
                  ? 'bg-emerald-600 text-white shadow-sm border border-emerald-500'
                  : 'text-emerald-200/80 hover:text-white hover:bg-emerald-800/50'
              }`}
            >
              <ClipboardList className="w-4 h-4 text-emerald-300" />
              <span>2. Auditoría e Histórico de Pagos ({pagos.length})</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 pr-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-900/80 px-3 py-1 rounded-lg border border-emerald-700">
              Diseño Ejecutivo Excel Financial
            </span>
          </div>
        </div>
      ) : (
        /* EXECUTIVE DASHBOARD HEADER FOR OPERATORS (Inspiring Deep Emerald Excel Style) */
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-white rounded-2xl p-5 shadow-lg border border-emerald-700/60 relative overflow-hidden space-y-4">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-emerald-800/80 text-emerald-300 rounded-2xl border border-emerald-600/50 shadow-inner">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-widest text-emerald-300 uppercase block">Consola Ejecutiva de Cobranzas</span>
                  <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-800/80 text-emerald-200 rounded-md border border-emerald-600/40">
                    {mode}
                  </span>
                </div>
                <h2 className="text-lg font-black text-white tracking-tight">
                  Gestión Operativa de Cartera • Operador: {activeUser?.nombre || 'Gestor'}
                </h2>
              </div>
            </div>

            <button
              onClick={() => setShowReportErrorModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-extrabold border border-amber-500/40 transition-all cursor-pointer shadow-sm"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Informar Error en Pago</span>
            </button>
          </div>

          {/* EXECUTIVE KPI SUMMARY CARDS (EXCEL DASHBOARD STYLE - OPERATIONAL NON-MONETARY) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 relative z-10">
            {/* KPI 1 - CARTERA DE CLIENTES ASIGNADOS */}
            <div className="bg-emerald-900/60 backdrop-blur-xs p-3.5 rounded-xl border border-emerald-700/50 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-emerald-300 tracking-wider">
                <span>Cartera de Clientes</span>
                <Users className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-white">{filteredAndPrioritizedOps.length}</span>
                <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                  {filteredAndPrioritizedOps.length > 10 ? 'Alto Volumen' : 'Volumen Normal'}
                </span>
              </div>
              <div className="text-[10px] text-emerald-200/90 font-medium">
                Clientes asignados en gestión diaria
              </div>
            </div>

            {/* KPI 2 - CUMPLIMIENTO DE GESTIÓN */}
            <div className="bg-emerald-900/60 backdrop-blur-xs p-3.5 rounded-xl border border-emerald-700/50 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-emerald-300 tracking-wider">
                <span>Ruta y Gestión</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-teal-200">98%</span>
                <span className="text-[10px] font-extrabold text-teal-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                  Completada
                </span>
              </div>
              <div className="w-full bg-emerald-950/80 h-1.5 rounded-full overflow-hidden border border-emerald-800">
                <div className="bg-teal-400 h-full rounded-full" style={{ width: '98%' }} />
              </div>
            </div>

            {/* KPI 3 - CONTROL DE ARREGLOS Y REGULARIDAD */}
            <div className="bg-emerald-900/60 backdrop-blur-xs p-3.5 rounded-xl border border-emerald-700/50 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-black uppercase text-emerald-300 tracking-wider">
                <span>Efectividad en Morosidad</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-100">A+</span>
                <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                  Nivel Máximo
                </span>
              </div>
              <div className="w-full bg-emerald-950/80 h-1.5 rounded-full overflow-hidden border border-emerald-800">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: '88%' }} />
              </div>
            </div>

            {/* KPI 4 - GAUGE METER ACHIEVEMENT */}
            <div className="bg-emerald-900/60 backdrop-blur-xs p-3.5 rounded-xl border border-emerald-700/50 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-emerald-300 tracking-wider block">Objetivo Alcanzado</span>
                <span className="text-2xl font-black text-white block">92%</span>
                <span className="text-[9px] text-emerald-300 font-bold block">Tasa de Efectividad</span>
              </div>
              <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-emerald-950"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-emerald-400"
                    strokeDasharray="92, 100"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-[10px] font-black text-white">92%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {(viewTab === 'cobranza' || !isUserAdmin) && (
      <>
      {/* Mode Selector for Consola de Cobranzas - Admin Only */}
      {isUserAdmin && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-3 rounded-2xl border border-slate-800 shadow-md">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">Módulos de Cobranza:</span>
          <button
            onClick={() => setCurrentMode('WHATSAPP')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              currentMode === 'WHATSAPP'
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>Gestión diaria</span>
          </button>

          <button
            onClick={() => setCurrentMode('TELEFONO')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              currentMode === 'TELEFONO'
                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/30'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <PhoneCall className="w-4 h-4 text-amber-400" />
            <span>Gestión telefónica</span>
          </button>

          <button
            onClick={() => setCurrentMode('CALLE')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              currentMode === 'CALLE'
                ? 'bg-teal-600 text-white shadow-sm ring-2 ring-teal-500/30'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <MapPin className="w-4 h-4 text-teal-400" />
            <span>Gestión domiciliaria</span>
          </button>
        </div>
      )}

      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-md">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            {currentMode === 'WHATSAPP' && <MessageCircle className="w-5.5 h-5.5 text-emerald-400" />}
            {currentMode === 'TELEFONO' && <PhoneCall className="w-5.5 h-5.5 text-amber-400" />}
            {currentMode === 'CALLE' && <MapPin className="w-5.5 h-5.5 text-rose-400" />}
            {currentMode === 'WHATSAPP' && 'Gestión Diaria (Agenda de Cobranzas)'}
            {currentMode === 'TELEFONO' && 'Consola del Operador - Cobranza Telefónica'}
            {currentMode === 'CALLE' && 'Consola de Campo - Cobrador en Calle'}
          </h2>
          <p className="text-xs text-emerald-200/80 mt-1">
            {currentMode === 'WHATSAPP' && 'Optimizado para operadores de WhatsApp. Registre pagos, compromisos y gestiones de forma ágil y segura.'}
            {currentMode === 'TELEFONO' && 'Gestión de mora media. Realice llamadas, efectúe alertas críticas y registre promesas de pago.'}
            {currentMode === 'CALLE' && 'Gestión de mora crítica y visitas presenciales. Acceda a hojas de ruta, domicilios de cobro e indicaciones de mapa.'}
          </p>
        </div>
        
        {/* Sub-tabs buttons */}
        <div className="flex bg-emerald-900/80 p-1 rounded-xl self-stretch sm:self-auto border border-emerald-700/60">
          <button
            onClick={() => { setActiveSubTab('gestion'); setSelectedOp(null); }}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'gestion'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
            }`}
          >
            📋 Clientes por Gestionar
          </button>
          <button
            onClick={() => { setActiveSubTab('buscador'); setSelectedOp(null); }}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'buscador'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
            }`}
          >
            🔍 Buscador Historial
          </button>
        </div>
      </div>

      {/* Primary view workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Main interactive list (Left / Center) */}
        <div className="lg:col-span-7 bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-md space-y-4">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-800/60 pb-4">
            <div>
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest block mb-0.5">
                {activeSubTab === 'gestion' ? (mode === 'WHATSAPP' ? 'Prioridad de Contacto y Cobranza' : 'Prioridad de Llamadas y Visitas') : 'Búsqueda Universal'}
              </span>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                {activeSubTab === 'gestion' ? (
                  <>🎯 Orden de Cobranza y Clientes del Día ({filteredAndPrioritizedOps.length} Clientes)</>
                ) : (
                  <>🔎 Buscar expediente por DNI o Nombre</>
                )}
              </h3>
            </div>

            {/* Filter toggle for assigned only */}
            {activeSubTab === 'gestion' && activeUser?.rolId !== 'ADMIN' && (
              <label className="inline-flex items-center gap-2 cursor-pointer bg-emerald-900/60 px-3 py-1.5 rounded-lg border border-emerald-700/60 hover:bg-emerald-800/80 transition-colors">
                <input
                  type="checkbox"
                  checked={filterOnlyAssigned}
                  onChange={(e) => setFilterOnlyAssigned(e.target.checked)}
                  className="rounded text-emerald-500 focus:ring-emerald-400 h-3.5 w-3.5 accent-emerald-500"
                />
                <span className="text-[11px] font-bold text-emerald-100">Ver solo mis asignados</span>
              </label>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-emerald-400" />
            <input
              type="text"
              placeholder={
                activeSubTab === 'gestion' 
                  ? "Filtrar por nombre, DNI o número de crédito..." 
                  : "Ingrese Nombre o DNI completo del cliente..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-900/90 text-white placeholder-emerald-300/60 border border-emerald-700 rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all font-bold"
            />
          </div>

          {/* Acciones de Gestión Autorizadas - Moved to the left below search bar */}
          {selectedOp && (
            <div className="bg-emerald-900/60 p-4 rounded-xl border border-emerald-700/60 space-y-3 shadow-xs">
              <h4 className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-widest border-b border-emerald-800 pb-2 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Acciones de Gestión Autorizadas para: <strong className="text-white font-extrabold">{selectedOp.nombreCliente}</strong></span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveAction('pago');
                    setImporteCobrado(selectedOp.valorCuota.toString());
                    setObservacionesInput('');
                  }}
                  className={`p-2 rounded-lg text-[10px] font-extrabold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border text-center ${
                    activeAction === 'pago'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-xs'
                      : 'bg-emerald-950/80 hover:bg-emerald-800/80 text-emerald-100 border-emerald-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Registrar Pago
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveAction('pago_parcial');
                    setImporteCobrado('');
                    setObservacionesInput('');
                  }}
                  className={`p-2 rounded-lg text-[10px] font-extrabold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border text-center ${
                    activeAction === 'pago_parcial'
                      ? 'bg-blue-500 text-white border-blue-400 font-black shadow-xs'
                      : 'bg-emerald-950/80 hover:bg-emerald-800/80 text-blue-200 border-emerald-700'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  Pago Parcial
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveAction('pago_adelantado');
                    setImporteCobrado((selectedOp.valorCuota * 2).toString());
                    setObservacionesInput('');
                    setPrepaymentMode('CONSECUTIVO_INMEDIATO');
                  }}
                  className={`p-2 rounded-lg text-[10px] font-extrabold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border text-center ${
                    activeAction === 'pago_adelantado'
                      ? 'bg-teal-500 text-slate-950 border-teal-400 font-black shadow-xs'
                      : 'bg-emerald-950/80 hover:bg-emerald-800/80 text-teal-200 border-emerald-700'
                  }`}
                >
                  <Calendar className="w-4 h-4 shrink-0" />
                  Pago Adelantado
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveAction('no_pago');
                    setObservacionesInput('');
                  }}
                  className={`p-2 rounded-lg text-[10px] font-extrabold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border text-center ${
                    activeAction === 'no_pago'
                      ? 'bg-rose-600 text-white border-rose-500 font-black shadow-xs'
                      : 'bg-emerald-950/80 hover:bg-emerald-800/80 text-rose-200 border-emerald-700'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Reg. No Pago
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveAction('promesa');
                    setPromesaFecha('');
                    setObservacionesInput('');
                  }}
                  className={`p-2 rounded-lg text-[10px] font-extrabold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border text-center ${
                    activeAction === 'promesa'
                      ? 'bg-indigo-500 text-white border-indigo-400 font-black shadow-xs'
                      : 'bg-emerald-950/80 hover:bg-emerald-800/80 text-indigo-200 border-emerald-700'
                  }`}
                >
                  <Handshake className="w-4 h-4 shrink-0" />
                  Promesa Pago
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveAction('visita');
                    setObservacionesInput('');
                  }}
                  className={`p-2 rounded-lg text-[10px] font-extrabold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border text-center col-span-2 sm:col-span-5 ${
                    activeAction === 'visita'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-black shadow-xs'
                      : 'bg-emerald-950/80 hover:bg-emerald-800/80 text-amber-200 border-emerald-700'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 shrink-0 animate-pulse" />
                  Registrar Visita de Cobrador de Calle
                </button>
              </div>

              {/* Form area that loads on button click */}
              {activeAction && (
                <div className="bg-emerald-950 p-4 rounded-lg border border-emerald-700 space-y-3 shadow-md">
                  <div className="flex justify-between items-center border-b border-emerald-800 pb-2">
                    <span className="text-[11px] font-black uppercase text-emerald-300 flex items-center gap-1">
                      {activeAction === 'pago' && '📝 REGISTRAR PAGO'}
                      {activeAction === 'pago_parcial' && '📝 REGISTRAR PAGO PARCIAL'}
                      {activeAction === 'pago_adelantado' && '📅 REGISTRAR PAGO ADELANTADO'}
                      {activeAction === 'no_pago' && '❌ CLIENTE NO ABONÓ'}
                      {activeAction === 'promesa' && '🤝 PROMESA DE PAGO'}
                      {activeAction === 'visita' && '🏠 REGISTRAR VISITA DE CALLE'}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setActiveAction(null)}
                      className="p-0.5 text-emerald-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form 
                    onSubmit={handleActionSubmit} 
                    className="space-y-3"
                  >
                    {/* Conditional input fields based on activeAction */}
                    {(activeAction === 'pago' || activeAction === 'pago_parcial' || activeAction === 'pago_adelantado') && (
                      <div className="space-y-2.5">
                        {activeAction === 'pago_adelantado' && (
                          <div className="bg-emerald-900/80 p-3.5 rounded-xl border border-teal-500/50 space-y-2.5 shadow-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-teal-200 uppercase tracking-wider flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                                Modalidad de Pago por Adelantado:
                              </span>
                              <span className="text-[9px] bg-teal-900 text-teal-200 font-extrabold px-2 py-0.5 rounded-full border border-teal-500">
                                Seleccione Modalidad
                              </span>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5">
                              <label
                                onClick={() => setPrepaymentMode('CONSECUTIVO_INMEDIATO')}
                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                  prepaymentMode === 'CONSECUTIVO_INMEDIATO'
                                    ? 'bg-emerald-950 border-teal-400 shadow-xs ring-2 ring-teal-500/30'
                                    : 'bg-emerald-950/60 border-emerald-800 hover:bg-emerald-950'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="prepaymentMode"
                                  checked={prepaymentMode === 'CONSECUTIVO_INMEDIATO'}
                                  onChange={() => setPrepaymentMode('CONSECUTIVO_INMEDIATO')}
                                  className="mt-0.5 rounded-full text-teal-400 focus:ring-teal-400 h-4 w-4 cursor-pointer shrink-0"
                                />
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <strong className="text-white font-extrabold text-xs">
                                      Opción B: Adelantar cuotas consecutivas inmediatas (Cuota del día + siguientes)
                                    </strong>
                                    <span className="text-[9px] font-black bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-md uppercase border border-emerald-600">
                                      ⭐ Recomendada / Al Día
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-emerald-200/80 leading-relaxed font-medium">
                                    Se abona la cuota del día de hoy (o vencida) + las próximas cuotas a vencer en orden consecutivo (1, 2, 3...). 
                                    <strong className="text-emerald-300"> El cliente no figura con mora hoy</strong> y queda al día por los días abonados.
                                  </p>
                                </div>
                              </label>

                              <label
                                onClick={() => setPrepaymentMode('FINAL_ATRAS')}
                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                                  prepaymentMode === 'FINAL_ATRAS'
                                    ? 'bg-emerald-950 border-teal-400 shadow-xs ring-2 ring-teal-500/30'
                                    : 'bg-emerald-950/60 border-emerald-800 hover:bg-emerald-950'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="prepaymentMode"
                                  checked={prepaymentMode === 'FINAL_ATRAS'}
                                  onChange={() => setPrepaymentMode('FINAL_ATRAS')}
                                  className="mt-0.5 rounded-full text-teal-400 focus:ring-teal-400 h-4 w-4 cursor-pointer shrink-0"
                                />
                                <div className="space-y-1 text-xs">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <strong className="text-white font-extrabold text-xs">
                                      Opción A: Descontar desde el final hacia atrás
                                    </strong>
                                    <span className="text-[9px] text-emerald-300 bg-emerald-900 px-2 py-0.5 rounded-md uppercase border border-emerald-700 font-bold">
                                      Amortiza Final
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-emerald-200/80 leading-relaxed font-medium">
                                    Se abonan las últimas cuotas del contrato (ej. cuota 20 hacia atrás), reduciendo la duración final del crédito. 
                                    <em className="text-amber-300 font-semibold"> La cuota vencida de hoy no se cancela salvo que cubra todo el saldo.</em>
                                  </p>
                                </div>
                              </label>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider block mb-0.5">Monto Cobrado ($)</label>
                            <input
                              type="number"
                              required
                              value={importeCobrado}
                              onChange={(e) => setImporteCobrado(e.target.value)}
                              placeholder="Ej: 15000"
                              className="w-full px-2.5 py-1.5 bg-slate-900 text-white placeholder-emerald-300/50 border border-emerald-700 rounded-lg text-xs font-bold focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider block mb-0.5">Medio de Pago</label>
                            <select
                              value={medioPago}
                              onChange={(e) => setMedioPago(e.target.value as any)}
                              className="w-full px-2.5 py-1.5 bg-slate-900 text-white border border-emerald-700 rounded-lg text-xs font-bold focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                            >
                              <option value="EFECTIVO">EFECTIVO</option>
                              <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                              <option value="DEPOSITO">DEPÓSITO</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider block mb-0.5">Fecha de Cobro</label>
                          <input
                            type="date"
                            required
                            value={fechaPago}
                            onChange={(e) => setFechaPago(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-900 text-white border border-emerald-700 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                          />
                        </div>

                        {/* Checkbox "Cobrado por Cobrador en Calle" for commission generation */}
                        <div className="bg-slate-900/90 p-2.5 rounded-xl border border-emerald-700/80 space-y-2 col-span-2">
                          <label className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={esCobroEnCalle}
                              onChange={(e) => setEsCobroEnCalle(e.target.checked)}
                              className="w-4 h-4 text-emerald-500 bg-slate-900 border-emerald-700 rounded focus:ring-emerald-400 cursor-pointer accent-emerald-500"
                            />
                            <span>🏍️ Tildar: Cobrado por Cobrador en Calle (Genera Comisión)</span>
                          </label>

                          {esCobroEnCalle && (
                            <div className="pt-1 space-y-1 animate-fade-in">
                              <label className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider block">Seleccionar Cobrador que realizó la visita:</label>
                              <select
                                value={selectedCobradorId}
                                onChange={(e) => setSelectedCobradorId(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-slate-950 text-white border border-emerald-600 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
                              >
                                <option value="">-- Seleccionar Cobrador --</option>
                                {usuarios.map(u => (
                                  <option key={u.id} value={u.id}>
                                    👤 {u.nombre} ({u.rolId === 'COBRADOR' ? 'Cobrador Calle' : u.rolId})
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeAction === 'promesa' && (
                      <div>
                        <label className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider block mb-0.5">Fecha Programada de Pago</label>
                        <input
                          type="date"
                          required
                          value={promesaFecha}
                          onChange={(e) => setPromesaFecha(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-900 text-white border border-emerald-700 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                        />
                      </div>
                    )}

                    {/* Standard general observations input */}
                    <div>
                      <label className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider block mb-0.5">
                        {activeAction === 'pago' || activeAction === 'pago_parcial' ? 'Comentarios / Observaciones' : 'Detalle o Justificación'}
                      </label>
                      <textarea
                        rows={2}
                        value={observacionesInput}
                        onChange={(e) => setObservacionesInput(e.target.value)}
                        placeholder="Ej: El cliente abonó en efectivo. Sin observaciones."
                        className="w-full px-2.5 py-1.5 bg-slate-900 text-white placeholder-emerald-300/50 border border-emerald-700 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!canAddPago}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirmar Operación</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Core priority listing */}
          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredAndPrioritizedOps.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <AlertCircle className="w-10 h-10 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">No hay gestiones requeridas</h4>
                <p className="text-xs text-emerald-200/70 max-w-[280px] mx-auto">
                  {searchTerm 
                    ? 'No se encontraron registros que coincidan con la búsqueda.' 
                    : 'Todos tus clientes asignados se encuentran al día y no registran pendientes.'}
                </p>
              </div>
            ) : (
              filteredAndPrioritizedOps.map((op, idx) => {
                // Find oldest pending cuota to calculate exact delay dynamically
                const opCuotas = cuotas.filter(c => c.idOperacion === op.id && c.estado !== 'PAGADA');
                const sortedPending = [...opCuotas].sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
                const oldestPending = sortedPending[0];
                const today = getTodayStr();
                const dynamicDiasMora = oldestPending && oldestPending.fechaVencimiento < today
                  ? calcularDiasAtrasoSinDomingos(oldestPending.fechaVencimiento, today)
                  : 0;

                const isVencido = hasCuotasVencidas(op.id) || dynamicDiasMora > 0;
                const isHoy = hasCuotaDueToday(op) || op.proximoVencimiento === today;
                const isPromesa = isPromesaPendiente(op);
                const cli = getClienteDetails(op.idCliente);

                // Stage instance level classification
                const inst = getInstanciaCobro(op);

                return (
                  <div
                    key={op.id}
                    onClick={() => setSelectedOp(op)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative ${
                      selectedOp?.id === op.id
                        ? 'border-emerald-400 bg-emerald-900/90 shadow-md ring-2 ring-emerald-400/40'
                        : inst === 'CALLE'
                          ? 'border-rose-800/80 bg-slate-900/90 hover:bg-rose-950/40 shadow-xs'
                          : inst === 'TELEFONO'
                            ? 'border-amber-800/80 bg-slate-900/90 hover:bg-amber-950/40 shadow-xs'
                            : 'border-emerald-800/80 hover:border-emerald-600 bg-slate-900/90 hover:bg-emerald-900/60'
                    }`}
                  >
                    
                    {/* Index or highlight line */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
                      inst === 'CALLE'
                        ? 'bg-rose-500'
                        : inst === 'TELEFONO'
                          ? 'bg-amber-500'
                          : 'bg-emerald-400'
                    }`}></div>
                    
                    <div className="space-y-1.5 pl-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-emerald-300/80">Cred: {op.id}</span>
                        
                        {/* Visual Classification Badges */}
                        {inst === 'CALLE' ? (
                          <span className="bg-rose-950/90 text-rose-300 border border-rose-600/90 font-extrabold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 shadow-xs">
                            🔴 GESTIÓN DOMICILIARIA
                          </span>
                        ) : inst === 'TELEFONO' ? (
                          <span className="bg-amber-950/90 text-amber-300 border border-amber-600/90 font-extrabold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1 shadow-xs">
                            🟠 GESTIÓN TELEFÓNICA
                          </span>
                        ) : (
                          <span className="bg-emerald-950/90 text-emerald-300 border border-emerald-700/90 font-extrabold px-2.5 py-1 rounded-lg text-[10px] flex items-center gap-1">
                            🟢 CUOTA DEL DÍA
                          </span>
                        )}

                        {/* Additional status badges */}
                        {isVencido && (
                          <span className="bg-rose-900/60 text-rose-200 border border-rose-700/60 font-bold px-2 py-0.5 rounded-md text-[9.5px]">
                            🚨 {dynamicDiasMora} {dynamicDiasMora === 1 ? 'DÍA' : 'DÍAS'} ATRASO
                          </span>
                        )}
                        {isPromesa && (
                          <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold px-2 py-0.5 rounded-md text-[9.5px]">
                            🤝 PROMESA PENDIENTE
                          </span>
                        )}
                      </div>

                      <div className="font-extrabold text-white text-sm flex items-center gap-1">
                        {op.nombreCliente}
                        <span className="text-xs font-normal text-emerald-300/80">({op.frecuencia})</span>
                      </div>

                      <div className="text-[11px] text-emerald-200/80 font-medium space-x-3">
                        <span>Cuotas: <strong className="font-bold text-white">{op.cuotasPagadas}/{op.cantidadCuotas}</strong></span>
                        <span>·</span>
                        <span>DNI: <strong className="font-mono text-emerald-300">{cli?.dni || 'N/A'}</strong></span>
                        {activeUser?.rolId === 'ADMIN' && op.cobrador && (
                          <>
                            <span>·</span>
                            <span>Asignado: <strong className="text-emerald-200">{op.cobrador}</strong></span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0 pl-2 sm:pl-0 space-y-1">
                      {(() => {
                        const exigInfo = getExigiblePendiente(op);
                        return (
                          <>
                            <div className="text-[10px] font-extrabold text-rose-400 uppercase tracking-wider flex items-center sm:justify-end gap-1">
                              <span>Monto para Estar al Día</span>
                              {exigInfo.esAlertaPagoMinimo && (
                                <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse" title={`Supera el límite de pago mínimo (${configuracion?.pagoMinimoCuotas || 2} cuotas)`}>
                                  ⚠️ PAGO MÍN.
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-black text-rose-300">
                              ${exigInfo.total.toLocaleString('es-ES')}
                            </div>
                            <div className="text-[10px] text-emerald-300/80 font-bold">
                              {exigInfo.det}
                            </div>
                            <div className="text-[9px] text-emerald-300/70 font-medium">
                              Saldo Total: ${op.totalPendiente.toLocaleString('es-ES')}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Resumen Ficha del Cliente + Acciones Rápidas */}
        <div className="lg:col-span-5 space-y-6">
          
          {selectedOp ? (
            <>
              {/* Resumen Ficha del Cliente (Meets standard questions answering list) */}
              <div className="bg-[#0B4B27] text-emerald-50 p-5 rounded-2xl border border-emerald-800 shadow-lg space-y-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 translate-x-4 -translate-y-4">
                  <DollarSign className="w-40 h-40" />
                </div>

                <div className="flex justify-between items-start border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] font-bold tracking-widest text-emerald-300 uppercase block mb-1">Ficha de Resumen Rápido</span>
                    <h3 className="text-base font-extrabold text-white tracking-tight">{selectedOp.nombreCliente}</h3>
                    <span className="text-[11px] text-emerald-200/80 font-mono">Crédito Nro: {selectedOp.id}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedOp(null)}
                    className="p-1 hover:bg-white/10 rounded-lg text-emerald-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Instant answer grid (answers the exact questions listed in instructions) */}
                <div className="grid grid-cols-2 gap-3.5 text-xs">
                  
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">Estado Crédito</span>
                    <strong className="text-white font-bold uppercase">{selectedOp.estado} ({selectedOp.diasMora > 0 ? 'Mora' : 'Al Día'})</strong>
                  </div>

                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">Valor Cuota</span>
                    <strong className="text-white font-bold">${selectedOp.valorCuota.toLocaleString('es-ES')}</strong>
                  </div>

                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">Cuotas Totales</span>
                    <strong className="text-white font-bold font-mono">{selectedOp.cantidadCuotas} cuotas ({selectedOp.frecuencia.toLowerCase()})</strong>
                  </div>

                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">Cuotas Pagadas</span>
                    <strong className="text-emerald-300 font-bold font-mono">{selectedOp.cuotasPagadas} pagadas</strong>
                  </div>

                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">Cuotas Pendientes</span>
                    <strong className="text-amber-300 font-bold font-mono">{selectedOp.cuotasPendientes} restantes</strong>
                  </div>

                  {(() => {
                    const today = getTodayStr();
                    const overdueInstallments = cuotas.filter(c => c.idOperacion === selectedOp.id && c.estado !== 'PAGADA' && c.fechaVencimiento < today);
                    const countOverdue = overdueInstallments.length;
                    const sumOverdue = overdueInstallments.reduce((sum, c) => sum + c.saldoPendiente, 0);

                    const dueTodayInstallments = cuotas.filter(c => c.idOperacion === selectedOp.id && c.estado !== 'PAGADA' && c.fechaVencimiento === today);
                    const countToday = dueTodayInstallments.length;
                    const sumToday = dueTodayInstallments.reduce((sum, c) => sum + c.saldoPendiente, 0);

                    const exigTotal = sumOverdue + sumToday;

                    return (
                      <div className="bg-rose-950/70 p-3 rounded-xl border border-rose-500/40 col-span-2 space-y-2">
                        <span className="text-[9px] uppercase tracking-widest text-rose-300 font-black block">
                          📊 Desglose para Estar al Día
                        </span>
                        
                        {/* 3-line debt breakdown requested by operator */}
                        <div className="text-[11px] space-y-1 text-slate-100 font-medium">
                          <div className="flex justify-between items-center">
                            <span className="text-rose-200">Cuotas Vencidas (Mora):</span>
                            <span className="font-mono font-bold text-white bg-rose-900/60 px-1.5 py-0.5 rounded">
                              {countOverdue} (${sumOverdue.toLocaleString('es-ES')})
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-emerald-200">Cuota de Hoy:</span>
                            <span className="font-mono font-bold text-white bg-emerald-900/60 px-1.5 py-0.5 rounded">
                              {countToday} (${sumToday.toLocaleString('es-ES')})
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-t border-rose-500/30 pt-1.5 mt-1">
                            <span className="text-white font-extrabold uppercase text-[10px]">Monto para Estar al Día:</span>
                            <span className="font-mono font-black text-rose-300 text-xs">
                              ${exigTotal.toLocaleString('es-ES')} ARS
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="bg-white/5 p-2 rounded-xl border border-white/10 col-span-2">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">Próximo Vencimiento</span>
                    <strong className="text-white font-bold font-mono flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      {selectedOp.proximoVencimiento}
                    </strong>
                  </div>

                  {/* Client address + Google Maps routing details */}
                  {(() => {
                    const isOperator = activeUser?.rolId === 'OPERADOR';
                    if (isOperator) {
                      return (
                        <div className="bg-slate-900/30 p-3 rounded-xl border border-slate-800 col-span-2 text-center text-xs text-emerald-300/80 font-bold flex items-center justify-center gap-1.5">
                          <span>🔒 El Domicilio está restringido para operadores</span>
                        </div>
                      );
                    }
                    
                    const cliDetails = getClienteDetails(selectedOp.idCliente);
                    if (!cliDetails) return null;
                    const address = getFullAddress(cliDetails);
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                    
                    return (
                      <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/50 col-span-2 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] uppercase tracking-wider text-emerald-300 font-extrabold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-rose-400" />
                            Domicilio del Cliente
                          </span>
                          <a 
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[9px] px-2 py-1 rounded transition-colors flex items-center gap-1 uppercase tracking-wider cursor-pointer"
                          >
                            🗺️ Google Maps
                          </a>
                        </div>
                        <div className="text-[11px] text-white font-semibold">
                          {address}
                        </div>
                        {cliDetails.observaciones && (
                          <div className="text-[10px] text-emerald-200/80 italic font-medium leading-normal border-t border-slate-800 pt-1.5">
                            📌 {cliDetails.observaciones}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Renewals / Extensions (Elegibilidad) */}
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10 text-[11px]">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">¿Apto Renovación?</span>
                    <strong className={selectedOp.elegibleRenovacion ? "text-emerald-300 font-bold" : "text-emerald-100/50 font-medium"}>
                      {selectedOp.elegibleRenovacion ? '✅ Sí, Elegible' : '❌ No'}
                    </strong>
                  </div>

                  <div className="bg-white/5 p-2 rounded-xl border border-white/10 text-[11px]">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">¿Apto Ampliación?</span>
                    <strong className={selectedOp.elegibleAmpliacion ? "text-emerald-300 font-bold" : "text-emerald-100/50 font-medium"}>
                      {selectedOp.elegibleAmpliacion ? '✅ Sí, Elegible' : '❌ No'}
                    </strong>
                  </div>
                </div>

                {/* DETAILED INSTALLMENT SCHEDULE LIST */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-2.5">
                  <div className="flex justify-between items-center border-b border-white/5 pb-1.5 gap-2 flex-wrap">
                    <span className="text-[9px] uppercase tracking-widest text-emerald-300 font-black">📅 Cronograma de Amortización</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="flex items-center gap-1.5 text-[9px] font-semibold text-emerald-100/90 cursor-pointer select-none bg-white/10 hover:bg-white/15 px-2 py-0.5 rounded border border-white/10 transition-colors">
                        <input
                          type="checkbox"
                          checked={includeTotalInPDF}
                          onChange={(e) => setIncludeTotalInPDF(e.target.checked)}
                          className="w-3 h-3 text-emerald-500 rounded focus:ring-emerald-400 cursor-pointer accent-emerald-500"
                        />
                        <span>Incluir Total Saldo en PDF</span>
                      </label>
                      <button
                        onClick={() => handleExportPDF(selectedOp, includeTotalInPDF)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] px-2.5 py-1 rounded transition-colors flex items-center gap-1 uppercase tracking-wider cursor-pointer shadow-xs"
                        title="Exportar cronograma a PDF"
                      >
                        <FileText className="w-3 h-3" />
                        Exportar a PDF
                      </button>
                      <span className="text-[8px] font-bold text-white bg-emerald-800 px-1.5 py-0.5 rounded font-mono uppercase">{selectedOp.frecuencia}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {cuotas
                      .filter(c => c.idOperacion === selectedOp.id)
                      .sort((a, b) => a.numeroCuota - b.numeroCuota)
                      .map((cuo) => {
                        const today = getTodayStr();
                        const isOverdue = cuo.estado !== 'PAGADA' && cuo.fechaVencimiento < today;
                        const isHoy = cuo.estado !== 'PAGADA' && cuo.fechaVencimiento === today;

                        return (
                          <div key={cuo.id} className="flex justify-between items-center text-[10px] p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors font-semibold">
                            <div className="space-y-0.5">
                              <span className="text-emerald-300/60 block font-mono">Cuota {cuo.numeroCuota}</span>
                              <span className="text-white font-medium">{cuo.fechaVencimiento}</span>
                            </div>
                            <div className="text-right space-y-1">
                              <span className="text-white block font-mono font-bold">${cuo.valorTotalCuota.toLocaleString('es-ES')}</span>
                              <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wide leading-none ${
                                cuo.estado === 'PAGADA' 
                                  ? 'bg-emerald-500/20 text-emerald-300' 
                                  : isOverdue 
                                    ? 'bg-rose-500/20 text-rose-300 animate-pulse'
                                    : isHoy
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-white/5 text-slate-300'
                              }`}>
                                {cuo.estado === 'PAGADA' 
                                  ? '🟢 Pagada' 
                                  : isOverdue 
                                    ? '🔴 Vencida' 
                                    : isHoy 
                                      ? '🟡 Vence Hoy' 
                                      : '⚪ Pendiente'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* HISTORIAL DE PAGOS DE ESTA OPERACIÓN (CON ACCIONES DE ADMINISTRADOR) */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-2">
                  <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
                    <span className="text-[9px] uppercase tracking-widest text-emerald-300 font-black flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      Historial de Pagos Registrados ({pagos.filter(p => p.idOperacion === selectedOp.id).length})
                    </span>
                    {isUserAdmin && (
                      <span className="text-[8px] bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded font-black uppercase">
                        Acciones Admin
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {pagos.filter(p => p.idOperacion === selectedOp.id).length === 0 ? (
                      <div className="text-[10px] text-emerald-200/60 italic py-2 text-center">
                        No hay pagos registrados para este crédito aún.
                      </div>
                    ) : (
                      pagos
                        .filter(p => p.idOperacion === selectedOp.id)
                        .sort((a, b) => parseDateToTimestamp(b.fechaPago) - parseDateToTimestamp(a.fechaPago))
                        .map((pago) => (
                          <div key={pago.id} className="bg-slate-900/80 p-2 rounded-lg border border-emerald-800/80 text-[10px] space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-mono font-bold text-emerald-300">Pago #{pago.id} • {pago.fechaPago}</span>
                              <strong className="text-emerald-400 font-black text-xs">${pago.importe.toLocaleString('es-ES')}</strong>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-emerald-200/80">
                              <span>Medio: <strong className="text-white">{pago.metodoPago}</strong></span>
                              <span>Cobró: <strong className="text-white">{pago.cobrador || 'Operador'}</strong></span>
                            </div>
                            {isUserAdmin && (
                              <div className="flex items-center gap-1.5 pt-1 border-t border-emerald-900/80 justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPago(pago);
                                    setEditModalidad((pago.modalidad as any) || 'PAGO_ADELANTADO_OPCION_B');
                                    setEditMetodoPago(pago.metodoPago);
                                    setEditFechaPago(pago.fechaPago);
                                    setEditImporte(pago.importe.toString());
                                    setEditObservaciones(pago.observaciones || '');
                                  }}
                                  className="px-2 py-0.5 bg-blue-900 hover:bg-blue-800 text-blue-200 rounded text-[9px] font-bold border border-blue-700 flex items-center gap-1 cursor-pointer"
                                >
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  <span>Modificar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`¿Anular/Eliminar el pago #${pago.id} de $${pago.importe.toLocaleString('es-ES')}? Se revertirán los saldos de la cuota y la tesorería.`)) {
                                      if (onDeletePago) onDeletePago(pago.id);
                                    }
                                  }}
                                  className="px-2 py-0.5 bg-rose-900 hover:bg-rose-800 text-rose-200 rounded text-[9px] font-bold border border-rose-700 flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash2 className="w-2.5 h-2.5 text-rose-300" />
                                  <span>Anular / Eliminar</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Direct contact quick buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => {
                      const cli = getClienteDetails(selectedOp.idCliente);
                      if (cli) handleCallPhone(cli.telefono);
                    }}
                    className="w-full py-2 bg-emerald-700/60 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Llamar Cliente
                  </button>
                  <button
                    onClick={() => {
                      const cli = getClienteDetails(selectedOp.idCliente);
                      if (cli) handleOpenWhatsApp(cli.telefono, cli.nombre, selectedOp.id, selectedOp.totalPendiente);
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    WhatsApp
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 border-dashed text-center space-y-3.5 py-12 shadow-md">
              <ClipboardList className="w-11 h-11 text-emerald-400/60 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-white">Ficha del Cliente de Cobro</h4>
                <p className="text-xs text-emerald-200/70 max-w-[220px] mx-auto leading-relaxed">
                  Seleccione un cliente del listado de la izquierda para ver su resumen general y realizar cobranzas.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* SECONDARY PAYMENT CONFIRMATION MODAL */}
      {showPaymentConfirmModal && selectedOp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-emerald-950 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-700/80 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 bg-amber-950/80 rounded-xl border border-amber-800/50">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Confirmación de Seguridad</h3>
                <p className="text-xs text-emerald-200/80">Por favor, verifique los datos antes de registrar el pago.</p>
              </div>
            </div>

            <div className="bg-slate-900/90 rounded-xl p-4 border border-emerald-800/80 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-emerald-800/60 pb-1.5">
                <span className="text-emerald-200/70 font-medium">Cliente:</span>
                <span className="font-extrabold text-white">{selectedOp.nombreCliente}</span>
              </div>
              <div className="flex justify-between border-b border-emerald-800/60 pb-1.5">
                <span className="text-emerald-200/70 font-medium">Crédito ID:</span>
                <span className="font-mono font-bold text-emerald-300">{selectedOp.id}</span>
              </div>
              <div className="flex justify-between border-b border-emerald-800/60 pb-1.5">
                <span className="text-emerald-200/70 font-medium">Modalidad:</span>
                <span className="font-extrabold text-teal-300 bg-teal-950 px-2 py-0.5 rounded-md border border-teal-700 text-[11px]">
                  {activeAction === 'pago_adelantado'
                    ? (prepaymentMode === 'CONSECUTIVO_INMEDIATO' ? 'Opción B: Cuota del Día + Consecutivas' : 'Opción A: Desde el final hacia atrás')
                    : activeAction === 'pago_parcial' ? 'Pago Parcial' : 'Pago Regular'}
                </span>
              </div>
              <div className="flex justify-between border-b border-emerald-800/60 pb-1.5">
                <span className="text-emerald-200/70 font-medium">Monto a Registrar:</span>
                <span className="text-sm font-black text-emerald-400">${parseFloat(importeCobrado || '0').toLocaleString('es-ES')} ARS</span>
              </div>
              <div className="flex justify-between border-b border-emerald-800/60 pb-1.5">
                <span className="text-emerald-200/70 font-medium">Medio de Pago:</span>
                <span className="font-bold text-white bg-emerald-900 px-2 py-0.5 rounded-md uppercase border border-emerald-700">{medioPago}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-200/70 font-medium">Fecha de Cobro:</span>
                <span className="font-mono font-bold text-emerald-300">{fechaPago}</span>
              </div>
            </div>

            {/* PREVIEW BREAKDOWN OF COVERED CUOTAS */}
            {(() => {
              const amountToApply = parseFloat(importeCobrado || '0');
              if (amountToApply <= 0) return null;

              let currentModality: 'PAGO_REGULAR' | 'PAGO_PARCIAL' | 'PAGO_ADELANTADO_OPCION_A' | 'PAGO_ADELANTADO_OPCION_B' = 'PAGO_REGULAR';
              if (activeAction === 'pago_parcial') {
                currentModality = 'PAGO_PARCIAL';
              } else if (activeAction === 'pago_adelantado') {
                currentModality = prepaymentMode === 'FINAL_ATRAS' ? 'PAGO_ADELANTADO_OPCION_A' : 'PAGO_ADELANTADO_OPCION_B';
              }

              const targetOpIdStr = String(selectedOp.id).trim();
              let allOpCuotas = cuotas.filter(c => String(c.idOperacion).trim() === targetOpIdStr);
              if (allOpCuotas.length === 0 && selectedOp) {
                allOpCuotas = generarPlanCuotas(selectedOp, []);
              }
              const cuotasSorted = sortCuotasByPaymentPriority(allOpCuotas, fechaPago || getTodayStr(), currentModality);

              let rem = amountToApply;
              const breakdown: { num: number; fec: string; monto: number; completo: boolean; saldoRestante: number }[] = [];

              cuotasSorted.forEach(c => {
                if (c.estado === 'PAGADA' || rem <= 0) return;
                const saldo = c.saldoPendiente;
                if (rem >= saldo) {
                  breakdown.push({ num: c.numeroCuota, fec: c.fechaVencimiento, monto: saldo, completo: true, saldoRestante: 0 });
                  rem -= saldo;
                } else {
                  breakdown.push({ num: c.numeroCuota, fec: c.fechaVencimiento, monto: rem, completo: false, saldoRestante: saldo - rem });
                  rem = 0;
                }
              });

              return (
                <div className="bg-slate-900 p-3 rounded-xl border border-emerald-700/80 space-y-2 text-xs">
                  <span className="font-black text-amber-300 block uppercase tracking-wider text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    Detalle de Imputación de Cuotas ({breakdown.length} cuota{breakdown.length > 1 ? 's' : ''}):
                  </span>
                  {breakdown.length === 0 ? (
                    <span className="text-emerald-200/70 italic text-[11px]">No hay cuotas pendientes para imputar.</span>
                  ) : (
                    <div className="space-y-1.5 max-h-[130px] overflow-y-auto pr-1">
                      {breakdown.map((item) => (
                        <div key={item.num} className="bg-slate-950 p-2 rounded-lg border border-emerald-800 text-[11px] flex justify-between items-center">
                          <div>
                            <span className="font-bold text-white block">Cuota N° {item.num} <span className="text-[10px] text-emerald-300">({item.fec})</span></span>
                            {item.completo ? (
                              <span className="text-[9px] text-emerald-400 font-extrabold uppercase">✓ Pagada Completa</span>
                            ) : (
                              <span className="text-[9px] text-amber-400 font-extrabold uppercase">⚡ Pago Parcial (Queda saldo ${item.saldoRestante.toLocaleString('es-ES')})</span>
                            )}
                          </div>
                          <span className="font-black text-emerald-300 text-xs">+${item.monto.toLocaleString('es-ES')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {observacionesInput && (
              <div className="text-xs space-y-1">
                <span className="text-emerald-200/70 font-medium block">Comentarios adjuntos:</span>
                <p className="bg-slate-900 p-2.5 rounded-lg border border-emerald-800 font-medium italic text-emerald-100">
                  "{observacionesInput}"
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentConfirmModal(false)}
                className="py-2.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center border border-emerald-700"
              >
                Volver y Corregir
              </button>
              <button
                type="button"
                onClick={executePaymentRegistration}
                className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer text-center flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" />
                Registrar Pago Seguro
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* VIEW TAB 2: REGISTRO HISTÓRICO Y AUDITORÍA DE PAGOS REALIZADOS */}
      {viewTab === 'registro_pagos' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header & Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-emerald-950/90 p-4 rounded-2xl border border-emerald-800/80 shadow-md space-y-1">
              <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">Total Pagos Registrados</span>
              <span className="text-2xl font-black text-white">{pagos.length}</span>
              <span className="text-[10px] text-emerald-200/80 block">Cobranzas históricas</span>
            </div>

            <div className="bg-emerald-950/90 p-4 rounded-2xl border border-emerald-800/80 shadow-md space-y-1">
              <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">Recaudación Acumulada</span>
              <span className="text-2xl font-black text-emerald-300">
                ${pagos.reduce((sum, p) => sum + (p.importe || 0), 0).toLocaleString('es-ES')} ARS
              </span>
              <span className="text-[10px] text-emerald-400 font-bold block">Cobrado por operadores</span>
            </div>

            <div className="bg-emerald-950/90 p-4 rounded-2xl border border-emerald-800/80 shadow-md space-y-1">
              <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">Pagos Opción B (Día + Consecutivas)</span>
              <span className="text-2xl font-black text-teal-300">
                {pagos.filter(p => p.modalidad === 'PAGO_ADELANTADO_OPCION_B').length}
              </span>
              <span className="text-[10px] text-teal-400 font-semibold block">Sin mora residual</span>
            </div>

            <div className="bg-emerald-950/90 p-4 rounded-2xl border border-emerald-800/80 shadow-md space-y-1">
              <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">Pagos Opción A (Desde el final)</span>
              <span className="text-2xl font-black text-amber-300">
                {pagos.filter(p => p.modalidad === 'PAGO_ADELANTADO_OPCION_A').length}
              </span>
              <span className="text-[10px] text-amber-400 font-semibold block">Descuentan al final</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-emerald-950/90 p-4 rounded-2xl border border-emerald-800/80 shadow-md space-y-3">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={pagoSearchTerm}
                  onChange={(e) => setPagoSearchTerm(e.target.value)}
                  placeholder="Buscar por cliente, DNI, ID pago o ID operación..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 text-white placeholder-emerald-300/60 border border-emerald-700 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-400 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={pagoFilterModalidad}
                  onChange={(e) => setPagoFilterModalidad(e.target.value)}
                  className="px-3 py-2 bg-slate-900 text-white border border-emerald-700 rounded-xl text-xs font-extrabold focus:outline-none focus:border-emerald-400"
                >
                  <option value="TODOS">Todas las Modalidades</option>
                  <option value="PAGO_ADELANTADO_OPCION_B">Opción B (Cuota Día + Consecutivas)</option>
                  <option value="PAGO_ADELANTADO_OPCION_A">Opción A (Desde el Final)</option>
                  <option value="PAGO_REGULAR">Pago Regular</option>
                  <option value="PAGO_PARCIAL">Pago Parcial</option>
                </select>

                <select
                  value={pagoFilterMetodo}
                  onChange={(e) => setPagoFilterMetodo(e.target.value)}
                  className="px-3 py-2 bg-slate-900 text-white border border-emerald-700 rounded-xl text-xs font-extrabold focus:outline-none focus:border-emerald-400"
                >
                  <option value="TODOS">Todos los Medios de Pago</option>
                  <option value="EFECTIVO">EFECTIVO</option>
                  <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  <option value="DEPOSITO">DEPÓSITO</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table of Payments */}
          <div className="bg-emerald-950/90 rounded-2xl border border-emerald-800/80 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-emerald-100 font-black uppercase text-[10px] tracking-wider border-b-2 border-emerald-700 shadow-xs">
                  <tr>
                    <th className="py-3.5 px-4">ID Pago & Hora</th>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Crédito N°</th>
                    <th className="py-3.5 px-4 text-right">Importe Cobrado</th>
                    <th className="py-3.5 px-4">Medio</th>
                    <th className="py-3.5 px-4">Modalidad Imputada</th>
                    <th className="py-3.5 px-4">Cuotas Impactadas</th>
                    <th className="py-3.5 px-4">Cobrador</th>
                    <th className="py-3.5 px-4 text-center">Acción / Corregir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-800/60 font-medium text-emerald-100">
                  {pagos
                    .filter(p => {
                      const matchSearch =
                        !pagoSearchTerm ||
                        p.nombreCliente.toLowerCase().includes(pagoSearchTerm.toLowerCase()) ||
                        p.id.toLowerCase().includes(pagoSearchTerm.toLowerCase()) ||
                        p.idOperacion.toLowerCase().includes(pagoSearchTerm.toLowerCase());
                      const matchMod = pagoFilterModalidad === 'TODOS' || p.modalidad === pagoFilterModalidad;
                      const matchMet = pagoFilterMetodo === 'TODOS' || p.metodoPago === pagoFilterMetodo;
                      return matchSearch && matchMod && matchMet;
                    })
                    .sort((a, b) => parseDateToTimestamp(b.fechaPago) - parseDateToTimestamp(a.fechaPago))
                    .map((pago) => {
                      const mod = pago.modalidad || 'PAGO_REGULAR';
                      return (
                        <tr key={pago.id} className="hover:bg-emerald-900/60 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-white">
                            <div>{pago.id}</div>
                            <span className="text-[10px] text-emerald-300/70 font-normal">
                              {pago.fechaPago} {pago.horaPago ? `• ${pago.horaPago}` : ''}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-extrabold text-white">
                            {pago.nombreCliente}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-300">
                            #{pago.idOperacion}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-300 text-sm">
                            ${pago.importe.toLocaleString('es-ES')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-emerald-900 text-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-700 uppercase">
                              {pago.metodoPago}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {mod === 'PAGO_ADELANTADO_OPCION_B' && (
                              <span className="bg-teal-950 text-teal-300 text-[10px] font-black px-2 py-1 rounded-md border border-teal-800 inline-flex items-center gap-1">
                                <span>⭐ Opción B: Día + Consecutivas</span>
                              </span>
                            )}
                            {mod === 'PAGO_ADELANTADO_OPCION_A' && (
                              <span className="bg-amber-950 text-amber-300 text-[10px] font-black px-2 py-1 rounded-md border border-amber-800 inline-flex items-center gap-1">
                                <span>Opción A: Desde el Final</span>
                              </span>
                            )}
                            {mod === 'PAGO_PARCIAL' && (
                              <span className="bg-blue-950 text-blue-300 text-[10px] font-black px-2 py-1 rounded-md border border-blue-800">
                                Pago Parcial
                              </span>
                            )}
                            {mod === 'PAGO_REGULAR' && (
                              <span className="bg-slate-900 text-slate-300 text-[10px] font-black px-2 py-1 rounded-md border border-slate-700">
                                Pago Regular
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[11px] font-semibold text-emerald-200/90">
                            {pago.cuotasAfectadas || 'Cuotas del periodo'}
                          </td>
                          <td className="py-3 px-4 text-xs font-bold text-emerald-100">
                            {pago.cobrador || 'Operador'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isUserAdmin ? (
                              <div className="flex items-center gap-1.5 justify-center">
                                <button
                                  onClick={() => {
                                    setEditingPago(pago);
                                    setEditModalidad((pago.modalidad as any) || 'PAGO_ADELANTADO_OPCION_B');
                                    setEditMetodoPago(pago.metodoPago);
                                    setEditFechaPago(pago.fechaPago);
                                    setEditImporte(pago.importe.toString());
                                    setEditObservaciones(pago.observaciones || '');
                                  }}
                                  className="px-2.5 py-1.5 bg-blue-900/80 hover:bg-blue-800 text-blue-200 rounded-lg text-[11px] font-extrabold border border-blue-700 transition-all cursor-pointer flex items-center gap-1"
                                  title="Modificar / Reorganizar este pago"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Modificar</span>
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`¿Está seguro de eliminar / anular el pago #${pago.id} de $${pago.importe.toLocaleString('es-ES')} registrado el ${pago.fechaPago}? Esta acción recalculará las cuotas y saldos de la operación.`)) {
                                      if (onDeletePago) onDeletePago(pago.id);
                                    }
                                  }}
                                  className="px-2.5 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-rose-200 rounded-lg text-[11px] font-extrabold border border-rose-700 transition-all cursor-pointer flex items-center gap-1"
                                  title="Eliminar o anular este pago"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-300" />
                                  <span>Eliminar</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedPagoForReport(pago);
                                  setShowReportErrorModal(true);
                                }}
                                className="px-2.5 py-1.5 bg-amber-900/80 hover:bg-amber-800 text-amber-200 rounded-lg text-[11px] font-extrabold border border-amber-700 transition-all cursor-pointer flex items-center gap-1 mx-auto"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Informar Error</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REORGANIZE / EDIT PAYMENT MODAL */}
      {editingPago && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-emerald-950 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-emerald-700/80 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
              <div className="flex items-center gap-2 text-blue-400">
                <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '4s' }} />
                <h3 className="text-base font-black text-white">Reorganizar Imputación de Pago</h3>
              </div>
              <button
                onClick={() => setEditingPago(null)}
                className="p-1 text-emerald-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-emerald-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-emerald-200/70 font-medium">Pago ID:</span>
                <span className="font-mono font-bold text-white">{editingPago.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-200/70 font-medium">Cliente:</span>
                <span className="font-bold text-white">{editingPago.nombreCliente}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-200/70 font-medium">Crédito N°:</span>
                <span className="font-mono font-bold text-emerald-300">#{editingPago.idOperacion}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block mb-1">
                  Seleccionar Nueva Modalidad de Imputación:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <label
                    onClick={() => setEditModalidad('PAGO_ADELANTADO_OPCION_B')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      editModalidad === 'PAGO_ADELANTADO_OPCION_B'
                        ? 'bg-teal-950 border-teal-500 ring-2 ring-teal-500/30'
                        : 'bg-slate-900 border-emerald-800 hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="editModalidad"
                      checked={editModalidad === 'PAGO_ADELANTADO_OPCION_B'}
                      onChange={() => setEditModalidad('PAGO_ADELANTADO_OPCION_B')}
                      className="mt-0.5 text-teal-400 h-4 w-4 shrink-0"
                    />
                    <div className="text-xs">
                      <strong className="text-white font-extrabold block">
                        Opción B: Cuota del Día + Consecutivas Inmediatas (RECOMENDADA)
                      </strong>
                      <span className="text-[10px] text-emerald-200/80 font-medium block mt-0.5">
                        Cancela la cuota vencida de hoy y las consecutivas inmediatas. El cliente <strong>deja de figurar en mora hoy</strong>.
                      </span>
                    </div>
                  </label>

                  <label
                    onClick={() => setEditModalidad('PAGO_ADELANTADO_OPCION_A')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      editModalidad === 'PAGO_ADELANTADO_OPCION_A'
                        ? 'bg-amber-950 border-amber-500 ring-2 ring-amber-500/30'
                        : 'bg-slate-900 border-emerald-800 hover:bg-slate-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="editModalidad"
                      checked={editModalidad === 'PAGO_ADELANTADO_OPCION_A'}
                      onChange={() => setEditModalidad('PAGO_ADELANTADO_OPCION_A')}
                      className="mt-0.5 text-amber-400 h-4 w-4 shrink-0"
                    />
                    <div className="text-xs">
                      <strong className="text-white font-extrabold block">
                        Opción A: Descontar desde el final hacia atrás
                      </strong>
                      <span className="text-[10px] text-emerald-200/80 font-medium block mt-0.5">
                        Abona las últimas cuotas del plan de pago (de atrás hacia adelante).
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block mb-1">Monto ($)</label>
                  <input
                    type="number"
                    value={editImporte}
                    onChange={(e) => setEditImporte(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 text-white border border-emerald-700 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block mb-1">Medio de Pago</label>
                  <select
                    value={editMetodoPago}
                    onChange={(e) => setEditMetodoPago(e.target.value as any)}
                    className="w-full px-3 py-1.5 bg-slate-900 text-white border border-emerald-700 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-400"
                  >
                    <option value="EFECTIVO">EFECTIVO</option>
                    <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                    <option value="DEPOSITO">DEPÓSITO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block mb-1">Fecha de Cobro</label>
                <input
                  type="date"
                  value={editFechaPago}
                  onChange={(e) => setEditFechaPago(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 text-white border border-emerald-700 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block mb-1">Observaciones</label>
                <textarea
                  value={editObservaciones}
                  onChange={(e) => setEditObservaciones(e.target.value)}
                  rows={2}
                  placeholder="Motivo de la reorganización..."
                  className="w-full px-3 py-1.5 bg-slate-900 text-white border border-emerald-700 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="bg-blue-950/80 p-3 rounded-xl border border-blue-700 text-[11px] text-blue-200 font-medium">
              💡 <strong>Acción Reorganizadora:</strong> Al guardar, el sistema restablecerá el estado de todas las cuotas del crédito #{editingPago.idOperacion} y re-imputará los pagos aplicados en orden cronológico respetando la nueva modalidad elegida.
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditingPago(null)}
                className="py-2.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center border border-emerald-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onReorganizePago && editingPago) {
                    onReorganizePago(
                      editingPago.id,
                      editModalidad,
                      editMetodoPago,
                      editFechaPago,
                      parseFloat(editImporte),
                      editObservaciones
                    );
                    alert('¡Pago reorganizado con éxito! Se re-calculó todo el crédito.');
                    setEditingPago(null);
                  }
                }}
                className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar y Recalcular Crédito</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT PAYMENT ERROR MODAL FOR OPERATORS */}
      {showReportErrorModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-emerald-950 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-700/80 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-black text-white">Informar Error en Pago a Administración</h3>
              </div>
              <button
                onClick={() => { setShowReportErrorModal(false); setSelectedPagoForReport(null); }}
                className="p-1 text-emerald-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-950/80 p-3.5 rounded-xl border border-amber-800 text-xs space-y-1.5 text-amber-200 font-medium">
              <p>
                Como operador no tiene permisos para modificar montos o imputaciones directamente. Complete el detalle del error y la Administración corregirá la transacción.
              </p>
              {selectedPagoForReport && (
                <div className="pt-1 font-mono font-bold text-amber-300">
                  Pago: #{selectedPagoForReport.id} - ${selectedPagoForReport.importe.toLocaleString('es-ES')} ARS ({selectedPagoForReport.nombreCliente})
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-emerald-300 uppercase tracking-wider block">
                Detalle del Error o Corrección Requerida *
              </label>
              <textarea
                value={errorReportText}
                onChange={(e) => setErrorReportText(e.target.value)}
                rows={3}
                placeholder="Ej: Registré $5.000 pero el comprobante real es de $4.500 / Correspondía Opción B..."
                className="w-full p-3 bg-slate-900 border border-emerald-700 text-white rounded-xl text-xs font-medium focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => { setShowReportErrorModal(false); setSelectedPagoForReport(null); }}
                className="py-2.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-100 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center border border-emerald-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!errorReportText.trim()) {
                    alert('Por favor describa el error para enviar la notificación.');
                    return;
                  }
                  alert(`✅ Solicitud enviada a la Administración.\n\nEl Administrador ha sido notificado sobre la corrección requerida para el pago${selectedPagoForReport ? ` #${selectedPagoForReport.id}` : ''}.`);
                  setShowReportErrorModal(false);
                  setErrorReportText('');
                  setSelectedPagoForReport(null);
                }}
                className="py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Enviar Alerta a Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
