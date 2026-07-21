/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Operacion, Cuota, Pago, TransaccionTesoreria, Cliente, UsuarioRol, Configuracion } from '../types';
import { calcularDiasAtrasoSinDomingos } from '../utils/cuotasGenerator';
import { 
  DollarSign, Search, Calendar, Check, AlertCircle, FileText, 
  ChevronRight, ArrowRight, User, Phone, Send, X, ClipboardList,
  AlertTriangle, CheckCircle2, RefreshCw, Smartphone, TrendingUp, HelpCircle,
  Handshake, PhoneCall, MapPin, MessageCircle
} from 'lucide-react';

interface PagosViewProps {
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
  clientes: Cliente[];
  activeUser: UsuarioRol | null;
  configuracion?: Configuracion;
  onAddPago: (pago: Pago, updatedCuotas: Cuota[], updatedOperacion: Operacion, tesoreriaTrx: TransaccionTesoreria) => void;
  canAddPago?: boolean;
  mode?: 'WHATSAPP' | 'TELEFONO' | 'CALLE';
}

export default function PagosView({
  operaciones,
  cuotas,
  pagos,
  clientes,
  activeUser,
  configuracion,
  onAddPago,
  canAddPago = true,
  mode = 'WHATSAPP',
}: PagosViewProps) {
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
  const [prepaymentMode, setPrepaymentMode] = useState<'FINAL_ATRAS' | 'CONSECUTIVO_INMEDIATO'>('FINAL_ATRAS');

  // Double confirmation modal state for payment registrations
  const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState<boolean>(false);

  // Form states inside actions
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [importeCobrado, setImporteCobrado] = useState<string>('');
  const [medioPago, setMedioPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO'>('EFECTIVO');
  const [observacionesInput, setObservacionesInput] = useState('');
  const [promesaFecha, setPromesaFecha] = useState('');

  // Find the details of a client by ID
  const getClienteDetails = (idCliente: string): Cliente | undefined => {
    return clientes.find(c => c.id === idCliente);
  };

  // Helper: Get today's date string (YYYY-MM-DD)
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // Helper: Get collection stage instance based on configuration
  const getInstanciaCobro = (op: Operacion): 'WHATSAPP' | 'TELEFONO' | 'CALLE' => {
    if (!configuracion) return 'WHATSAPP';
    const diasMora = op.diasMora;
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
    
    // Current installment: the first pending one that is NOT overdue (due date >= today), if any
    const currentCuota = sortedPending.find(c => c.fechaVencimiento >= today);
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
    if (!op.proximoVencimiento) return false;
    
    const today = new Date(getTodayStr() + 'T00:00:00');
    const dueDate = new Date(op.proximoVencimiento + 'T00:00:00');
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= 3;
  };

  // Filter and sort the operations specifically according to the operator specification
  const filteredAndPrioritizedOps = React.useMemo(() => {
    // 1. Clean list: active operations
    let list = operaciones.filter(op => op.estado === 'ACTIVA');

    // 2. Filter by collection stage/mode
    list = list.filter(op => getInstanciaCobro(op) === mode);

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
  }, [operaciones, cuotas, clientes, activeUser, searchTerm, filterOnlyAssigned, mode, configuracion]);

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

    // Proportional allocation logic to update cuotas based on prepayment option or standard payment
    let remPago = valorCobrado;
    const updatedCuotas: Cuota[] = [];
    
    const allOpCuotas = cuotas
      .filter(c => c.idOperacion === selectedOp.id);

    // Sort cuotas to allocate payment based on prepayment configuration
    let cuotasToProcess = [...allOpCuotas];
    if (activeAction === 'pago_adelantado' && prepaymentMode === 'FINAL_ATRAS') {
      // Option A: pay unpaid installments starting from the highest number (end backward)
      cuotasToProcess.sort((a, b) => {
        const aPaid = a.estado === 'PAGADA' ? 1 : 0;
        const bPaid = b.estado === 'PAGADA' ? 1 : 0;
        if (aPaid !== bPaid) return aPaid - bPaid; // Unpaid first
        return b.numeroCuota - a.numeroCuota; // Descending order
      });
    } else {
      // Option B or regular: pay unpaid installments in chronological order (ascending)
      cuotasToProcess.sort((a, b) => a.numeroCuota - b.numeroCuota);
    }

    let totalCapitalPaid = 0;
    let totalInteresPaid = 0;
    const processedCuotasMap = new Map<string, Cuota>();

    cuotasToProcess.forEach(cuo => {
      if (cuo.estado === 'PAGADA' || remPago <= 0) {
        processedCuotasMap.set(cuo.id, cuo);
        return;
      }

      const cuoCopy = { ...cuo };
      const currentSaldo = cuoCopy.saldoPendiente;

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
        cuoCopy.fechaPago = fechaPago;
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
        cuoCopy.fechaPago = fechaPago;
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
    updatedOp.ultimoPago = fechaPago;

    // Find next pending cuota expiration
    const nextPendingCuo = opCuotasModified
      .filter(c => c.estado !== 'PAGADA')
      .sort((a, b) => a.numeroCuota - b.numeroCuota)[0];
    
    if (nextPendingCuo) {
      updatedOp.proximoVencimiento = nextPendingCuo.fechaVencimiento;
      
      // Recalculate days of arrears dynamically
      const dueTime = new Date(nextPendingCuo.fechaVencimiento).getTime();
      const payTime = new Date(fechaPago).getTime();
      const diffDays = Math.ceil((payTime - dueTime) / (1000 * 60 * 60 * 24));
      updatedOp.diasMora = diffDays > 0 ? diffDays : 0;
    } else {
      updatedOp.proximoVencimiento = 'PAGADO TOTAL';
      updatedOp.estado = 'FINALIZADA';
      updatedOp.fechaFinalizacion = fechaPago;
      updatedOp.motivoCierre = 'Crédito amortizado en su totalidad por cobranza regular';
      updatedOp.diasMora = 0;
    }

    // Arrears classification system based on 3-cuotas and 7-cuotas rules
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
    const paymentMsg = `[Pago de $${valorCobrado} vía ${medioPago} el ${fechaPago} por ${loggedInUserName}] ${observacionesInput}`;
    updatedOp.observaciones = updatedOp.observaciones 
      ? `${updatedOp.observaciones}\n${paymentMsg}` 
      : paymentMsg;

    // Create a new Pago record
    const nuevoPago: Pago = {
      id: `PAG-${Date.now().toString().slice(-6)}`,
      idOperacion: selectedOp.id,
      idCliente: selectedOp.idCliente,
      nombreCliente: selectedOp.nombreCliente,
      fechaPago,
      importe: valorCobrado,
      cobrador: loggedInUserName,
      metodoPago: medioPago,
      observaciones: observacionesInput,
    };

    // Create Treasury record
    const trxTesoreria: TransaccionTesoreria = {
      id: `TRX-${Date.now().toString()}`,
      fecha: fechaPago,
      tipo: 'INGRESO',
      concepto: `Cobranza de Crédito Nro ${selectedOp.id} - Cliente: ${selectedOp.nombreCliente} (${medioPago})`,
      monto: valorCobrado,
      referenciaId: nuevoPago.id,
    };

    // Fire update to main system state
    onAddPago(nuevoPago, updatedCuotas, updatedOp, trxTesoreria);
    
    alert(`¡Pago de $${valorCobrado.toLocaleString('es-ES')} registrado con éxito!\nEl plan de cuotas, saldos e indicadores generales se actualizaron de forma automática.`);
    
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
  const handleExportPDF = (op: Operacion) => {
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
            <td class="info-label font-bold">Monto Total Liquidado</td>
            <td class="info-val font-bold">$${op.totalFinanciado.toLocaleString('es-ES')}</td>
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
              <th>Saldo Pendiente</th>
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
                  <td>$${c.saldoPendiente.toLocaleString('es-ES')}</td>
                  <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="totals-section">
          Saldo Pendiente de Pago: <strong style="color: #b91c1c;">$${op.totalPendiente.toLocaleString('es-ES')} ARS</strong>
        </div>

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
      
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            {mode === 'WHATSAPP' && <MessageCircle className="w-5.5 h-5.5 text-emerald-600" />}
            {mode === 'TELEFONO' && <PhoneCall className="w-5.5 h-5.5 text-amber-600" />}
            {mode === 'CALLE' && <MapPin className="w-5.5 h-5.5 text-rose-600" />}
            {mode === 'WHATSAPP' && 'Agenda de Cobranzas'}
            {mode === 'TELEFONO' && 'Consola del Operador - Cobranza Telefónica'}
            {mode === 'CALLE' && 'Consola de Campo - Cobrador en Calle'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'WHATSAPP' && 'Optimizado para operadores de WhatsApp. Registre pagos, compromisos y gestiones de forma ágil y segura.'}
            {mode === 'TELEFONO' && 'Gestión de mora media. Realice llamadas, efectúe alertas críticas y registre promesas de pago.'}
            {mode === 'CALLE' && 'Gestión de mora crítica y visitas presenciales. Acceda a hojas de ruta, domicilios de cobro e indicaciones de mapa.'}
          </p>
        </div>
        
        {/* Sub-tabs buttons */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-stretch sm:self-auto">
          <button
            onClick={() => { setActiveSubTab('gestion'); setSelectedOp(null); }}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'gestion'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            📋 Clientes por Gestionar
          </button>
          <button
            onClick={() => { setActiveSubTab('buscador'); setSelectedOp(null); }}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeSubTab === 'buscador'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🔍 Buscador Historial
          </button>
        </div>
      </div>

      {/* Primary view workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Main interactive list (Left / Center) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">
                {activeSubTab === 'gestion' ? (mode === 'WHATSAPP' ? 'Prioridad de Contacto y Cobranza' : 'Prioridad de Llamadas y Visitas') : 'Búsqueda Universal'}
              </span>
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                {activeSubTab === 'gestion' ? (
                  <>🎯 Orden de Cobranza y Clientes del Día ({filteredAndPrioritizedOps.length} Clientes)</>
                ) : (
                  <>🔎 Buscar expediente por DNI o Nombre</>
                )}
              </h3>
            </div>

            {/* Filter toggle for assigned only */}
            {activeSubTab === 'gestion' && activeUser?.rolId !== 'ADMIN' && (
              <label className="inline-flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={filterOnlyAssigned}
                  onChange={(e) => setFilterOnlyAssigned(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                />
                <span className="text-[11px] font-bold text-slate-600">Ver solo mis asignados</span>
              </label>
            )}
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                activeSubTab === 'gestion' 
                  ? "Filtrar por nombre, DNI o número de crédito..." 
                  : "Ingrese Nombre o DNI completo del cliente..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-600 focus:bg-white focus:ring-1 focus:ring-emerald-600 transition-all font-medium"
            />
          </div>

          {/* Acciones de Gestión Autorizadas - Moved to the left below search bar */}
          {selectedOp && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 shadow-xs">
              <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-2 flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Acciones de Gestión Autorizadas para: <strong className="text-slate-800 font-extrabold">{selectedOp.nombreCliente}</strong></span>
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
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border-emerald-100'
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
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                      : 'bg-blue-50 hover:bg-blue-100/80 text-blue-800 border-blue-100'
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
                    setPrepaymentMode('FINAL_ATRAS');
                  }}
                  className={`p-2 rounded-lg text-[10px] font-extrabold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border text-center ${
                    activeAction === 'pago_adelantado'
                      ? 'bg-teal-600 text-white border-teal-700 shadow-xs'
                      : 'bg-teal-50 hover:bg-teal-100/80 text-teal-800 border-teal-100'
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
                      ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                      : 'bg-rose-50 hover:bg-rose-100/80 text-rose-800 border-rose-100'
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
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-indigo-50 hover:bg-indigo-100/80 text-indigo-800 border-indigo-100'
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
                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                      : 'bg-amber-50 hover:bg-amber-100/80 text-amber-800 border-amber-100'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 shrink-0 animate-pulse" />
                  Registrar Visita de Cobrador de Calle
                </button>
              </div>

              {/* Form area that loads on button click */}
              {activeAction && (
                <div className="bg-white p-3.5 rounded-lg border border-slate-200/80 space-y-3 shadow-xs">
                  <div className="flex justify-between items-center border-b border-slate-200/80 pb-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1">
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
                      className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                          <div className="bg-teal-50/50 p-3 rounded-lg border border-teal-200/60 space-y-2">
                            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">Modalidad de Pago por Adelantado:</span>
                            <div className="flex flex-col gap-2">
                              <label className="inline-flex items-start gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="prepaymentMode"
                                  checked={prepaymentMode === 'FINAL_ATRAS'}
                                  onChange={() => setPrepaymentMode('FINAL_ATRAS')}
                                  className="mt-0.5 rounded-full text-teal-600 focus:ring-teal-500 h-3.5 w-3.5 cursor-pointer"
                                />
                                <span className="text-[11px] font-medium text-slate-700 leading-tight">
                                  <strong>Opción A: Descontar desde el final hacia atrás</strong>
                                  <span className="block text-[9px] text-slate-400 font-normal mt-0.5">Se abonan las últimas cuotas del crédito (ej. de la cuota 20 hacia atrás), reduciendo el plazo final del crédito.</span>
                                </span>
                              </label>

                              <label className="inline-flex items-start gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="prepaymentMode"
                                  checked={prepaymentMode === 'CONSECUTIVO_INMEDIATO'}
                                  onChange={() => setPrepaymentMode('CONSECUTIVO_INMEDIATO')}
                                  className="mt-0.5 rounded-full text-teal-600 focus:ring-teal-500 h-3.5 w-3.5 cursor-pointer"
                                />
                                <span className="text-[11px] font-medium text-slate-700 leading-tight">
                                  <strong>Opción B: Adelantar cuotas consecutivas inmediatas</strong>
                                  <span className="block text-[9px] text-slate-400 font-normal mt-0.5">Se abonan las próximas cuotas a vencer consecutivamente. El cliente no tendrá vencimientos pendientes ni mora hasta que pasen los días correspondientes a estas cuotas.</span>
                                </span>
                              </label>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Monto Cobrado ($)</label>
                            <input
                              type="number"
                              required
                              value={importeCobrado}
                              onChange={(e) => setImporteCobrado(e.target.value)}
                              placeholder="Ej: 15000"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Medio de Pago</label>
                            <select
                              value={medioPago}
                              onChange={(e) => setMedioPago(e.target.value as any)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                            >
                              <option value="EFECTIVO">EFECTIVO</option>
                              <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                              <option value="DEPOSITO">DEPÓSITO</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Fecha de Cobro</label>
                          <input
                            type="date"
                            required
                            value={fechaPago}
                            onChange={(e) => setFechaPago(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                          />
                        </div>
                      </div>
                    )}

                    {activeAction === 'promesa' && (
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Fecha Programada de Pago</label>
                        <input
                          type="date"
                          required
                          value={promesaFecha}
                          onChange={(e) => setPromesaFecha(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                        />
                      </div>
                    )}

                    {/* Standard general observations input */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                        {activeAction === 'pago' || activeAction === 'pago_parcial' ? 'Comentarios / Observaciones' : 'Detalle o Justificación'}
                      </label>
                      <textarea
                        rows={2}
                        value={observacionesInput}
                        onChange={(e) => setObservacionesInput(e.target.value)}
                        placeholder="Ej: El cliente abonó en efectivo. Sin observaciones."
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!canAddPago}
                      className="w-full py-2 bg-emerald-600 hover:bg-[#155A2A] text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
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
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No hay gestiones requeridas</h4>
                <p className="text-xs text-slate-400 max-w-[280px] mx-auto">
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

                // Priority Badge label
                let priorityLabel = 'Al Día / Normal';
                let priorityColor = 'bg-slate-100 text-slate-700 border-slate-200 text-[10px]';
                
                if (isVencido) {
                  priorityLabel = `🚨 ALERTA ATRASO: ${dynamicDiasMora} DÍAS`;
                  priorityColor = 'bg-red-600 text-white border-red-700 font-extrabold px-3 py-1.5 rounded-xl text-xs uppercase tracking-wider animate-pulse shadow-sm';
                } else if (isHoy) {
                  priorityLabel = '📅 VENCE HOY';
                  priorityColor = 'bg-amber-150 text-amber-900 border-amber-300 font-bold px-2 py-0.5 rounded-full text-[10px]';
                } else if (isPromesa) {
                  priorityLabel = '🤝 PROMESA PENDIENTE';
                  priorityColor = 'bg-indigo-100 text-indigo-900 border-indigo-200 font-bold px-2 py-0.5 rounded-full text-[10px]';
                }

                return (
                  <div
                    key={op.id}
                    onClick={() => setSelectedOp(op)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative ${
                      selectedOp?.id === op.id
                        ? 'border-emerald-500 bg-emerald-50/20 shadow-md ring-1 ring-emerald-500/20'
                        : isVencido
                          ? 'border-rose-300 bg-rose-50/5 hover:bg-rose-50/15 shadow-xs'
                          : 'border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50/40'
                    }`}
                  >
                    
                    {/* Index or highlight line */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${isVencido ? 'bg-red-600' : 'bg-emerald-600/10'}`}></div>
                    
                    <div className="space-y-1.5 pl-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400">Cred: {op.id}</span>
                        <span className={isVencido ? priorityColor : `text-[9px] font-bold border px-2 py-0.5 rounded-full ${priorityColor}`}>
                          {priorityLabel}
                        </span>
                        
                        {/* Arrears warnings based on dynamic operational logic config */}
                        {(() => {
                          let llamar = 2;
                          let cobrador = 6;
                          if (op.frecuencia === 'DIARIA') {
                            llamar = configuracion?.moraDiarioLlamarDias ?? 2;
                            cobrador = configuracion?.moraDiarioCobradorDias ?? 6;
                          } else if (op.frecuencia === 'SEMANAL') {
                            llamar = configuracion?.moraSemanalLlamarDias ?? 4;
                            cobrador = configuracion?.moraSemanalCobradorDias ?? 7;
                          } else if (op.frecuencia === 'QUINCENAL') {
                            llamar = configuracion?.moraQuincenalLlamarDias ?? 5;
                            cobrador = configuracion?.moraQuincenalCobradorDias ?? 8;
                          } else if (op.frecuencia === 'MENSUAL') {
                            llamar = configuracion?.moraMensualLlamarDias ?? 2;
                            cobrador = configuracion?.moraMensualCobradorDias ?? 2;
                          }

                          if (dynamicDiasMora >= cobrador) {
                            return (
                              <span className="text-[9px] font-extrabold bg-red-600 text-white px-2 py-0.5 rounded-md">
                                C. DE CALLE ({cobrador}+ DÍAS)
                              </span>
                            );
                          } else if (dynamicDiasMora >= llamar) {
                            return (
                              <span className="text-[9px] font-extrabold bg-amber-500 text-white px-2 py-0.5 rounded-md">
                                TELÉFONO ({llamar}-{cobrador - 1} DÍAS)
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      <div className="font-extrabold text-slate-800 text-sm flex items-center gap-1">
                        {op.nombreCliente}
                        <span className="text-xs font-normal text-slate-400">({op.frecuencia})</span>
                      </div>

                      <div className="text-[11px] text-slate-500 font-medium space-x-3">
                        <span>Cuotas: <strong className="font-bold text-slate-700">{op.cuotasPagadas}/{op.cantidadCuotas}</strong></span>
                        <span>·</span>
                        <span>DNI: <strong className="font-mono text-slate-600">{cli?.dni || 'N/A'}</strong></span>
                        {activeUser?.rolId === 'ADMIN' && op.cobrador && (
                          <>
                            <span>·</span>
                            <span>Asignado: <strong className="text-slate-600">{op.cobrador}</strong></span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0 pl-2 sm:pl-0 space-y-1">
                      {(() => {
                        const exigInfo = getExigiblePendiente(op);
                        return (
                          <>
                            <div className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider flex items-center sm:justify-end gap-1">
                              <span>Monto para Estar al Día</span>
                              {exigInfo.esAlertaPagoMinimo && (
                                <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse" title={`Supera el límite de pago mínimo (${configuracion?.pagoMinimoCuotas || 2} cuotas)`}>
                                  ⚠️ PAGO MÍN.
                                </span>
                              )}
                            </div>
                            <div className="text-sm font-black text-rose-600">
                              ${exigInfo.total.toLocaleString('es-ES')}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold">
                              {exigInfo.det}
                            </div>
                            <div className="text-[9px] text-slate-400 font-medium">
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
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleExportPDF(selectedOp)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] px-2.5 py-1 rounded transition-colors flex items-center gap-1 uppercase tracking-wider cursor-pointer"
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
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 border-dashed text-center space-y-3.5 py-12">
              <ClipboardList className="w-11 h-11 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-slate-700">Ficha del Cliente de Cobro</h4>
                <p className="text-xs text-slate-400 max-w-[220px] mx-auto leading-relaxed">
                  Seleccione un cliente del listado de la izquierda para ver su resumen general y realizar cobranzas.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* SECONDARY PAYMENT CONFIRMATION MODAL */}
      {showPaymentConfirmModal && selectedOp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-950">Confirmación de Seguridad</h3>
                <p className="text-xs text-slate-500">Por favor, verifique los datos antes de registrar el pago.</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/60 space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                <span className="text-slate-500 font-medium">Cliente:</span>
                <span className="font-extrabold text-slate-800">{selectedOp.nombreCliente}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                <span className="text-slate-500 font-medium">Crédito ID:</span>
                <span className="font-mono font-bold text-slate-700">{selectedOp.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                <span className="text-slate-500 font-medium">Monto a Registrar:</span>
                <span className="text-sm font-black text-emerald-600">${parseFloat(importeCobrado || '0').toLocaleString('es-ES')} ARS</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/50 pb-1.5">
                <span className="text-slate-500 font-medium">Medio de Pago:</span>
                <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md uppercase">{medioPago}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Fecha de Cobro:</span>
                <span className="font-mono font-bold text-slate-700">{fechaPago}</span>
              </div>
            </div>

            {observacionesInput && (
              <div className="text-xs space-y-1">
                <span className="text-slate-500 font-medium block">Comentarios adjuntos:</span>
                <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-medium italic text-slate-600">
                  "{observacionesInput}"
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentConfirmModal(false)}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer text-center"
              >
                Volver y Corregir
              </button>
              <button
                type="button"
                onClick={executePaymentRegistration}
                className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer text-center flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" />
                Registrar Pago Seguro
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
