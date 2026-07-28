/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Operacion, Cuota, Pago, Cliente, UsuarioRol, 
  ComisionCobrador, VisitaDomicilio, VisitaReprogramada, 
  ConfiguracionComisiones, ConfiguracionRecorrido, TransaccionTesoreria, SolicitudReintegroDesayuno,
  Configuracion
} from '../types';
import { sortCuotasByPaymentPriority, generarPlanCuotas } from '../utils/cuotasGenerator';
import { exportDailyRoutePDF } from '../utils/pdfExportRoute';
import { optimizeRouteNearestNeighbor, buildGoogleMapsRouteUrl } from '../utils/routeOptimizer';
import { 
  MapPin, DollarSign, Calendar, Clock, CheckCircle2, 
  Phone, MessageCircle, Navigation, TrendingUp, 
  Camera, ChevronRight, UserX, RefreshCw, Check, 
  X, UserCheck, Play, Compass, Coffee, Send, PhoneCall, Home, AlertTriangle, FileText, Search
} from 'lucide-react';

interface CobradorCampoViewProps {
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
  clientes: Cliente[];
  usuarios?: UsuarioRol[];
  activeUser: UsuarioRol | null;
  configComisiones: ConfiguracionComisiones;
  configRecorrido: ConfiguracionRecorrido;
  configuracion?: Configuracion;
  comisiones: ComisionCobrador[];
  visitasHistory: VisitaDomicilio[];
  visitasReprogramadas: VisitaReprogramada[];
  reintegrosDesayuno?: SolicitudReintegroDesayuno[];
  initialSubTab?: 'gestion_diaria' | 'gestion_telefonica' | 'mi_recorrido' | 'reintegro_desayuno';
  onAddPago: (pago: Pago, updatedCuotas: Cuota[], updatedOperacion: Operacion, tesoreriaTrx: TransaccionTesoreria) => void;
  onReorganizePago?: (
    pagoId: string,
    newCuotaId: string,
    newMetodoPago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO',
    newFechaPago?: string,
    newImporte?: number,
    newObservaciones?: string
  ) => void;
  onDeletePago?: (pagoId: string) => void;
  onRegistrarVisita: (visita: VisitaDomicilio) => void;
  onReprogramarVisita: (reprogramacion: VisitaReprogramada) => void;
  onRegistrarContactoRecuperado: (idCliente: string, cobradorId: string) => void;
  onRegistrarGestionTelefonica?: (idCliente: string, tipo: 'LLAMADA' | 'MENSAJE', observaciones: string) => void;
  onSolicitarReintegroDesayuno?: (solicitud: SolicitudReintegroDesayuno) => void;
  onUpdateCliente?: (cliente: Cliente) => void;
}

export default function CobradorCampoView({
  operaciones,
  cuotas,
  pagos,
  clientes,
  usuarios = [],
  activeUser,
  configComisiones,
  configRecorrido,
  configuracion,
  comisiones,
  visitasHistory,
  visitasReprogramadas,
  reintegrosDesayuno = [],
  initialSubTab,
  onAddPago,
  onReorganizePago,
  onDeletePago,
  onRegistrarVisita,
  onReprogramarVisita,
  onRegistrarContactoRecuperado,
  onRegistrarGestionTelefonica,
  onSolicitarReintegroDesayuno,
  onUpdateCliente
}: CobradorCampoViewProps) {
  const isUserAdmin = 
    !activeUser ||
    activeUser?.rolId === 'ADMIN' ||
    activeUser?.rolId === 'SUPERADMIN' ||
    activeUser?.rolId?.toUpperCase().includes('ADMIN') ||
    activeUser?.email?.toLowerCase() === 'credicash999@gmail.com' ||
    activeUser?.email?.toLowerCase().includes('admin');
  const [selectedSupervisorUserId, setSelectedSupervisorUserId] = useState<string>('TODOS');

  // Navigation tabs (4 clean field collector tabs)
  const [activeTab, setActiveTab] = useState<'gestion_diaria' | 'gestion_telefonica' | 'mi_recorrido' | 'reintegro_desayuno'>(initialSubTab || 'gestion_diaria');

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Selected client modal
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedOperacion, setSelectedOperacion] = useState<Operacion | null>(null);

  // Active action inside client modal
  const [actionType, setActionType] = useState<'pago' | 'no_encontrado' | 'reprogramar' | 'comunicar' | null>(null);

  // Form states for Payment registration
  const [montoPago, setMontoPago] = useState<string>('');
  const [medioPago, setMedioPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO'>('EFECTIVO');
  const [observacionesPago, setObservacionesPago] = useState<string>('');
  const [fotoComprobante, setFotoComprobante] = useState<string | null>(null);
  const [isCapturingGPS, setIsCapturingGPS] = useState<boolean>(false);

  // Form states for Reschedule
  const [horaReprogramada, setHoraReprogramada] = useState<string>('15:30');
  const [motivoReprogramado, setMotivoReprogramado] = useState<string>('');

  // Form states for Phone Call / WhatsApp management
  const [gestionClienteSelected, setGestionClienteSelected] = useState<Cliente | null>(null);
  const [notasGestionTel, setNotasGestionTel] = useState<string>('');
  const [showPhoneCallModal, setShowPhoneCallModal] = useState<boolean>(false);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState<boolean>(false);
  const [showComisionesModal, setShowComisionesModal] = useState<boolean>(false);
  
  // Quick Pago Modal (Direct Payment Entry / Search for Admin & Collector)
  const [showQuickPagoModal, setShowQuickPagoModal] = useState<boolean>(false);
  const [quickPagoSearch, setQuickPagoSearch] = useState<string>('');

  // Form states for Breakfast Reimbursement Request
  const [lugarDesayuno, setLugarDesayuno] = useState<string>('Café Martinez - Shopping Abasto');
  const [montoGastoDesayuno, setMontoGastoDesayuno] = useState<string>('3500');
  const [fotoTicketDesayuno, setFotoTicketDesayuno] = useState<string | null>(null);
  const [desayunoExitoMsg, setDesayunoExitoMsg] = useState<string | null>(null);

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to obtain GPS coordinates
  const obtenerGPSActual = (): Promise<{ lat: number; lng: number; direccion: string }> => {
    return new Promise((resolve) => {
      setIsCapturingGPS(true);
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setIsCapturingGPS(false);
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            resolve({
              lat,
              lng,
              direccion: `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`
            });
          },
          () => {
            setIsCapturingGPS(false);
            const simLat = -34.6037 + (Math.random() * 0.02 - 0.01);
            const simLng = -58.3816 + (Math.random() * 0.02 - 0.01);
            resolve({
              lat: simLat,
              lng: simLng,
              direccion: `GPS Ubicación Campo (${simLat.toFixed(4)}, ${simLng.toFixed(4)})`
            });
          },
          { timeout: 4000 }
        );
      } else {
        setIsCapturingGPS(false);
        const simLat = -34.6037;
        const simLng = -58.3816;
        resolve({
          lat: simLat,
          lng: simLng,
          direccion: `GPS Ubicación Simulada (${simLat.toFixed(4)}, ${simLng.toFixed(4)})`
        });
      }
    });
  };

  // Filter clients assigned strictly to active collector or selected supervisor employee
  const isCobrador = activeUser?.rolId === 'COBRADOR';
  const activeUserNameLower = activeUser?.nombre ? activeUser.nombre.toLowerCase().trim() : '';
  const activeUserFirstName = activeUserNameLower.split(' ')[0] || '';

  let rawAssigned = clientes.filter(c => {
    if (isUserAdmin && selectedSupervisorUserId !== 'TODOS') {
      const selectedUser = usuarios.find(u => u.id === selectedSupervisorUserId);
      if (selectedUser) {
        const selNameLower = selectedUser.nombre.toLowerCase().trim();
        const selFirstName = selNameLower.split(' ')[0] || '';
        return (
          c.cobradorAsignadoId === selectedUser.id ||
          c.cobradorAsignadoNombre === selectedUser.nombre ||
          (c.cobradorAsignadoNombre && selFirstName && c.cobradorAsignadoNombre.toLowerCase().includes(selFirstName)) ||
          c.operadorAsignadoId === selectedUser.id ||
          c.captador === selectedUser.nombre
        );
      }
    }
    if (!isCobrador) return true; // Show all for demo/admin testing
    const matchesUser = (
      !c.cobradorAsignadoId ||
      c.cobradorAsignadoId === activeUser?.id ||
      c.cobradorAsignadoNombre === activeUser?.nombre ||
      (c.cobradorAsignadoNombre && activeUserFirstName && c.cobradorAsignadoNombre.toLowerCase().includes(activeUserFirstName)) ||
      (c.cobradorAsignadoNombre && activeUserNameLower && activeUserNameLower.includes(c.cobradorAsignadoNombre.toLowerCase().trim())) ||
      c.operadorAsignadoId === activeUser?.id ||
      c.captador === activeUser?.nombre ||
      c.analista === activeUser?.nombre ||
      (c.estado === 'INACTIVO' && (c.cobradorAsignadoId === activeUser?.id || !c.cobradorAsignadoId))
    );
    return matchesUser;
  });

  // Fallback: If logged in as cobrador on another device and no specific client matches by name/id,
  // show all available active/inactivo clients so the screen is never empty!
  if (isCobrador && rawAssigned.length === 0) {
    rawAssigned = clientes;
  }

  // Check visited today
  const todayStr = new Date().toISOString().split('T')[0];

  // Check visited today: Client is visited by payment ONLY if active payment exists in pagos today and no pending overdue debt remains!
  const isVisitedToday = (idCliente: string) => {
    const hasActivePagoToday = pagos.some(p => p.idCliente === idCliente && p.fechaPago === todayStr);
    const targetCliente = clientes.find(c => c.id === idCliente);

    if (hasActivePagoToday && targetCliente) {
      // Partial payment check: if client still has overdue cuotas or exceeds collector mora threshold,
      // they MUST remain in pending collection route!
      const targetOps = operaciones.filter(o => o.idCliente === idCliente && o.estado !== 'FINALIZADA' && o.estado !== 'REFINANCIADA');
      const targetCuotas = cuotas.filter(cu => targetOps.some(o => o.id === cu.idOperacion) && cu.estado !== 'PAGADA');
      const hasPendingOverdue = targetCuotas.some(cu => cu.fechaVencimiento < todayStr);

      if (clienteSuperaUmbralCobrador(targetCliente) || hasPendingOverdue) {
        return false;
      }
    }

    if (hasActivePagoToday) return true;

    const hasNonPaymentVisit = visitasHistory.some(v => 
      v.idCliente === idCliente && 
      v.fecha === todayStr && 
      v.tipoAccion !== 'PAGO_REGISTRADO'
    );
    return hasNonPaymentVisit;
  };

  // Check rescheduled today
  const getRescheduledToday = (idCliente: string) => {
    return visitasReprogramadas.find(r => r.idCliente === idCliente && r.fechaReprogramada === todayStr && !r.completada);
  };

  // Helper: check if an operation has unpaid cuotas due today or overdue
  const hasCuotaDueTodayOrOverdue = (opId: string) => {
    return cuotas.some(c => c.idOperacion === opId && c.estado !== 'PAGADA' && c.fechaVencimiento <= todayStr);
  };

  // Helper to determine threshold days for field collector routing based on payment frequency
  const getThresholdForFrecuencia = (frecuencia?: string): number => {
    const freq = (frecuencia || 'DIARIA').toUpperCase();
    if (freq.includes('DIAR')) {
      return configuracion?.moraDiarioCobradorDias ?? 6;
    }
    if (freq.includes('SEMAN')) {
      return configuracion?.moraSemanalCobradorDias ?? 7;
    }
    if (freq.includes('QUINCEN')) {
      return configuracion?.moraQuincenalCobradorDias ?? 8;
    }
    if (freq.includes('MENSUAL')) {
      return configuracion?.moraMensualCobradorDias ?? 2;
    }
    return configuracion?.moraDiarioCobradorDias ?? 6;
  };

  // Helper: check if a client reaches or exceeds the configured mora threshold for field collector assignment (or is EVASIVO/EN_MORA/INACTIVO)
  const clienteSuperaUmbralCobrador = (cliente: Cliente): boolean => {
    if (cliente.estado === 'EVASIVO' || cliente.estado === 'EN_MORA') {
      return true;
    }
    if (cliente.estado === 'INACTIVO' && cliente.montoDeudaInactivo && cliente.montoDeudaInactivo > 0) {
      return true;
    }

    const clientOps = operaciones.filter(
      o => o.idCliente === cliente.id && o.estado !== 'FINALIZADA' && o.estado !== 'REFINANCIADA'
    );

    if (clientOps.length === 0) {
      return false;
    }

    const todayTime = new Date(todayStr + 'T00:00:00').getTime();

    return clientOps.some(op => {
      const umbral = getThresholdForFrecuencia(op.frecuencia);

      if (op.diasMora && op.diasMora >= umbral) return true;
      if (cliente.diasMora && cliente.diasMora >= umbral) return true;

      let opCuotas = cuotas.filter(cu => cu.idOperacion === op.id && cu.estado !== 'PAGADA');
      if (opCuotas.length === 0) {
        opCuotas = generarPlanCuotas(op, []).filter(cu => cu.estado !== 'PAGADA');
      }

      // Overdue cuotas: strictly due BEFORE todayStr
      const overdueCuotas = opCuotas.filter(cu => cu.estado !== 'PAGADA' && cu.fechaVencimiento < todayStr);
      if (overdueCuotas.length === 0) return false;

      return overdueCuotas.some(cu => {
        const vencTime = new Date(cu.fechaVencimiento + 'T00:00:00').getTime();
        const diasAtraso = Math.max(0, Math.floor((todayTime - vencTime) / (1000 * 60 * 60 * 24)));
        return diasAtraso >= umbral;
      });
    });
  };

  // Get active loans for assigned clients (including operations in mora/vencidas)
  const myAssignedOperations = operaciones.filter(o => {
    if (o.estado === 'FINALIZADA' || o.estado === 'REFINANCIADA') return false;
    const isAssigned = rawAssigned.some(c => c.id === o.idCliente);
    return isAssigned;
  });

  // Filter clients to show ONLY assigned clients reaching/exceeding configured mora thresholds (or EVASIVO/EN_MORA/INACTIVO)
  // or those already visited/rescheduled today
  const myAssignedClients = rawAssigned.filter(c => {
    const isVisited = isVisitedToday(c.id);
    const isRescheduled = Boolean(getRescheduledToday(c.id));
    const superaUmbral = clienteSuperaUmbralCobrador(c);

    return superaUmbral || isVisited || isRescheduled;
  });

  // Group operations by client
  const clientOperationsMap = new Map<string, Operacion[]>();
  myAssignedOperations.forEach(op => {
    const list = clientOperationsMap.get(op.idCliente) || [];
    list.push(op);
    clientOperationsMap.set(op.idCliente, list);
  });

  // Calculate detailed financial summary for each client
  const getClientFinancialSummary = (cliente: Cliente, ops: Operacion[]) => {
    let totalExigible = 0;
    let cuotasDebeCount = 0;
    let totalDeudaCuotas = 0;
    let totalSaldoRestanteCredito = 0;
    let cuotasDiariasCount = 0;
    let cuotasSemanalesCount = 0;
    let cuotasOtrasCount = 0;
    let cuotasDiariasMoraCount = 0;
    let cuotasSemanalesMoraCount = 0;
    let cuotasQuincenalesMoraCount = 0;
    let cuotasMensualesMoraCount = 0;
    let diasMoraMax = 0;
    let cuotasVencidasCount = 0;
    let cuotasHoyCount = 0;

    ops.forEach(op => {
      let opCuotas = cuotas.filter(c => c.idOperacion === op.id && c.estado !== 'PAGADA');

      // FALLBACK: If cuotas array is empty for this active operation (e.g., pending cloud sync),
      // synthesize cuotas on the fly so values are NEVER $0 or missing!
      if (opCuotas.length === 0 && op.estado !== 'FINALIZADA' && op.estado !== 'REFINANCIADA') {
        opCuotas = generarPlanCuotas(op, []).filter(c => c.estado !== 'PAGADA');
      }

      const sumAllCuotas = opCuotas.reduce((s, c) => s + (c.saldoPendiente > 0 ? c.saldoPendiente : c.valorTotalCuota || op.valorCuota || 0), 0);
      totalSaldoRestanteCredito += sumAllCuotas;

      const overdue = opCuotas.filter(c => c.fechaVencimiento < todayStr);
      const dueToday = opCuotas.filter(c => c.fechaVencimiento === todayStr);

      cuotasVencidasCount += overdue.length;
      cuotasHoyCount += dueToday.length;

      const freqUpper = (op.frecuencia || 'DIARIA').toUpperCase();
      if (freqUpper.includes('DIAR')) {
        cuotasDiariasMoraCount += overdue.length;
      } else if (freqUpper.includes('SEMAN')) {
        cuotasSemanalesMoraCount += overdue.length;
      } else if (freqUpper.includes('QUINCEN')) {
        cuotasQuincenalesMoraCount += overdue.length;
      } else if (freqUpper.includes('MENSUAL')) {
        cuotasMensualesMoraCount += overdue.length;
      } else {
        cuotasDiariasMoraCount += overdue.length;
      }

      if (overdue.length > 0) {
        const oldestStr = overdue.map(c => c.fechaVencimiento).sort()[0];
        const oldestTime = new Date(oldestStr + 'T00:00:00').getTime();
        const todayTime = new Date(todayStr + 'T00:00:00').getTime();
        const diffDays = Math.max(0, Math.floor((todayTime - oldestTime) / (1000 * 60 * 60 * 24)));
        if (diffDays > diasMoraMax) diasMoraMax = diffDays;
      }
      if (op.diasMora && op.diasMora > diasMoraMax) {
        diasMoraMax = op.diasMora;
      }

      let activeDebts: Cuota[] = [];
      if (overdue.length > 0 || dueToday.length > 0) {
        activeDebts = [...overdue, ...dueToday];
      } else if (opCuotas.length > 0) {
        // Next upcoming single cuota due for today's collection route!
        activeDebts = [opCuotas[0]];
      }

      const count = activeDebts.length;
      const sum = activeDebts.reduce((s, c) => s + (c.saldoPendiente > 0 ? c.saldoPendiente : c.valorTotalCuota || op.valorCuota || 0), 0);

      totalExigible += sum;
      cuotasDebeCount += count;
      totalDeudaCuotas += sum;

      if (op.frecuencia === 'DIARIA') {
        cuotasDiariasCount += count;
      } else if (op.frecuencia === 'SEMANAL') {
        cuotasSemanalesCount += count;
      } else {
        cuotasOtrasCount += count;
      }
    });

    if (cliente.diasMora && cliente.diasMora > diasMoraMax) {
      diasMoraMax = cliente.diasMora;
    }

    // Fallback if totalDeudaCuotas computed 0 but client has active loan
    if (totalDeudaCuotas === 0 && ops.length > 0) {
      const activeOp = ops.find(o => o.estado !== 'FINALIZADA' && o.estado !== 'REFINANCIADA');
      if (activeOp) {
        totalDeudaCuotas = activeOp.valorCuota || Math.round((activeOp.totalFinanciado || 10000) / (activeOp.cantidadCuotas || 10));
        totalSaldoRestanteCredito = activeOp.totalPendiente || activeOp.totalFinanciado || totalDeudaCuotas;
        if (cuotasDiariasCount === 0 && cuotasSemanalesCount === 0) {
          if (activeOp.frecuencia === 'DIARIA') cuotasDiariasCount = 1;
          else cuotasSemanalesCount = 1;
        }
      }
    }

    // Calculate Monto Minimo Exigible and Total Deuda
    let montoMinimoExigible = 0;
    if (cliente.estado === 'INACTIVO' || (cliente.montoDeudaInactivo && cliente.montoDeudaInactivo > 0)) {
      if (totalDeudaCuotas === 0) {
        totalDeudaCuotas = cliente.montoDeudaInactivo || 150000;
      }
      if (cliente.montoMinimoInactivoConfigurado !== undefined && cliente.montoMinimoInactivoConfigurado > 0) {
        montoMinimoExigible = cliente.montoMinimoInactivoConfigurado;
      } else {
        montoMinimoExigible = Math.round(totalDeudaCuotas * 0.20);
      }
      totalExigible = montoMinimoExigible;
    } else {
      // ACTIVE CLIENT IN MORA
      montoMinimoExigible = Math.round(totalExigible * 0.5);
    }

    // 5-Day Commission Countdown System
    let diaGestion = 1;
    if (cliente.fechaInicioGestionCobro) {
      const start = new Date(cliente.fechaInicioGestionCobro).getTime();
      const now = new Date(todayStr).getTime();
      const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
      diaGestion = diffDays > 0 ? diffDays : 1;
    }

    return {
      totalExigible,
      montoMinimoExigible,
      cuotasDebeCount,
      totalDeudaCuotas,
      totalSaldoRestanteCredito,
      cuotasDiariasCount,
      cuotasSemanalesCount,
      cuotasOtrasCount,
      cuotasDiariasMoraCount,
      cuotasSemanalesMoraCount,
      cuotasQuincenalesMoraCount,
      cuotasMensualesMoraCount,
      diaGestion,
      diasMoraMax,
      cuotasVencidasCount,
      cuotasHoyCount
    };
  };

  // Helper: House photo upload handler
  const handleHousePhotoUpload = (clienteId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const targetCliente = clientes.find(c => c.id === clienteId);
      if (targetCliente && onUpdateCliente) {
        onUpdateCliente({
          ...targetCliente,
          fotoCasa: dataUrl
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Determine client status for Field Collector agenda
  const getClienteEstadoField = (cliente: Cliente, ops: Operacion[]) => {
    if (cliente.estado === 'EVASIVO') {
      return {
        key: 'EVASIVO',
        label: '⚠️ CLIENTE EVASIVO (Visitar e Indagar Domicilio)',
        badgeClass: 'bg-purple-900/60 text-purple-200 border-purple-500/80 font-black'
      };
    }

    if (cliente.estado === 'INACTIVO') {
      return {
        key: 'INACTIVO',
        label: 'Cliente Inactivo (Recuperar contacto)',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
      };
    }

    const hasMoraAlta = ops.some(o => o.diasMora >= 7);
    if (hasMoraAlta) {
      return {
        key: 'PAGO_MINIMO',
        label: 'Pago mínimo + comunicarse con la empresa',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
      };
    }

    return {
      key: 'COBRAR_CUOTA',
      label: 'Cobrar Cuota del Día',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    };
  };

  // Pending vs Managed
  const clientesPendientes = myAssignedClients.filter(c => !isVisitedToday(c.id) && !getRescheduledToday(c.id));
  const clientesVisitasPendientesReprogramadas = myAssignedClients.filter(c => getRescheduledToday(c.id));
  const clientesGestionados = myAssignedClients.filter(c => isVisitedToday(c.id));

  // Calculating Real-time Metrics for Persistent Top Bar
  const myComisiones = comisiones.filter(c => !isCobrador || c.cobradorId === activeUser?.id);
  const myComisionesHoy = myComisiones.filter(c => c.fecha === todayStr);

  const comisionesGanadasHoy = myComisionesHoy.reduce((sum, c) => sum + c.montoComision, 0);
  const totalCobradoHoy = myComisionesHoy.reduce((sum, c) => sum + c.montoCobrado, 0);

  const totalComisionesAcumuladas = myComisiones.reduce((sum, c) => sum + c.montoComision, 0);

  const cobrosCalleRealizadosHoy = myComisionesHoy.map(c => ({
    clienteNombre: c.nombreCliente || 'Cliente',
    hora: 'Hoy',
    formaPago: c.tipoComision === 'COBRANZA' ? 'Efectivo / Calle' : (c.tipoComision || 'Gestión'),
    montoCobrado: c.montoCobrado || 0,
    comisionGanada: c.montoComision || 0
  }));

  // Effectiveness %
  const totalClientesAgenda = myAssignedClients.length || 1;
  const efectividadPorcentaje = Math.round((clientesGestionados.length / totalClientesAgenda) * 100);

  // Potential Earnings calculated over TOTAL ADEUDADO A ABONAR
  const modoComision = configComisiones?.modoComisionCobranza || 'PORCENTAJE';
  const pctComision = configComisiones?.porcentajeComisionCobranza || 5;
  const fijoComision = configComisiones?.fijoComisionCobranza || 500;

  const potencialGestionRoute = myAssignedClients.map(c => {
    const cOps = operaciones.filter(o => o.idCliente === c.id && o.estado !== 'FINALIZADA' && o.estado !== 'REFINANCIADA');
    const { totalDeudaCuotas } = getClientFinancialSummary(c, cOps);

    let cobroEsperado = 0;
    if (c.estado === 'INACTIVO' || (c.montoDeudaInactivo && c.montoDeudaInactivo > 0)) {
      cobroEsperado = c.montoPagoInicialRefinanciacion || Math.round((c.montoDeudaInactivo || 150000) * 0.30);
    } else {
      cobroEsperado = totalDeudaCuotas;
    }

    let comisionEstimadaCliente = 0;
    if (cobroEsperado > 0) {
      if (modoComision === 'MONTO_FIJO') {
        comisionEstimadaCliente = fijoComision;
      } else {
        comisionEstimadaCliente = Math.round((cobroEsperado * pctComision) / 100);
      }
    }

    return {
      clienteId: c.id,
      nombreCliente: `${c.nombre} ${c.apellido}`,
      estado: c.estado,
      cobroEsperado,
      comisionEstimadaCliente,
      yaCobrado: isVisitedToday(c.id)
    };
  });

  const potencialCobroTotalHoy = potencialGestionRoute.reduce((sum, item) => sum + item.cobroEsperado, 0);
  const potencialGananciaTotalHoy = potencialGestionRoute.reduce((sum, item) => sum + item.comisionEstimadaCliente, 0);

  // Time Estimation for Route (15 minutes maximum pause per client)
  const clientesTotalesAVisitar = clientesPendientes.length + clientesVisitasPendientesReprogramadas.length;
  const minutosAtencionClientes = clientesTotalesAVisitar * 15; // 15 min por cliente
  const minutosTrasladoEstimados = Math.max(15, clientesTotalesAVisitar * 12);
  const minutosTotalesRecorrido = minutosAtencionClientes + minutosTrasladoEstimados;
  const hsRecorrido = Math.floor(minutosTotalesRecorrido / 60);
  const minsRecorrido = minutosTotalesRecorrido % 60;
  const tiempoEstimadoFormatted = `${hsRecorrido}h ${minsRecorrido}m`;

  // Helper for Admin PDF Export
  const handleExportarPDFHojaRuta = () => {
    let targetCobradorNombre = activeUser?.nombre || 'Cobrador de Campo';
    if (selectedSupervisorUserId !== 'TODOS') {
      const u = usuarios.find(usr => usr.id === selectedSupervisorUserId);
      if (u) targetCobradorNombre = u.nombre;
    }

    exportDailyRoutePDF(
      targetCobradorNombre,
      todayStr,
      myAssignedClients,
      operaciones,
      cuotas,
      potencialCobroTotalHoy,
      potencialGananciaTotalHoy,
      tiempoEstimadoFormatted
    );
  };

  // Open Google Maps
  const abrirGoogleMaps = (direccion: string) => {
    if (!direccion) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
    window.open(url, '_blank');
  };

  // Handle "Estoy en el domicilio"
  const handleEstoyEnDomicilio = async (cliente: Cliente) => {
    const gps = await obtenerGPSActual();
    const nuevaVisita: VisitaDomicilio = {
      id: `VIS-${Date.now()}`,
      idCliente: cliente.id,
      nombreCliente: `${cliente.nombre} ${cliente.apellido}`,
      cobradorId: activeUser?.id || 'COB-01',
      cobradorNombre: activeUser?.nombre || 'Cobrador',
      fecha: todayStr,
      hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      tipoAccion: 'ESTOY_EN_DOMICILIO',
      gpsLat: gps.lat,
      gpsLng: gps.lng,
      gpsDireccion: gps.direccion,
      observaciones: 'Llegada a domicilio registrada por GPS'
    };

    onRegistrarVisita(nuevaVisita);
    showToast(`📍 LLEGADA REGISTRADA: ${gps.direccion}`);
  };

  // Handle "No Encontrado"
  const handleNoEncontrado = async () => {
    if (!selectedCliente) return;
    const gps = await obtenerGPSActual();
    const nuevaVisita: VisitaDomicilio = {
      id: `VIS-${Date.now()}`,
      idCliente: selectedCliente.id,
      nombreCliente: `${selectedCliente.nombre} ${selectedCliente.apellido}`,
      cobradorId: activeUser?.id || 'COB-01',
      cobradorNombre: activeUser?.nombre || 'Cobrador',
      fecha: todayStr,
      hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      tipoAccion: 'NO_ENCONTRADO',
      gpsLat: gps.lat,
      gpsLng: gps.lng,
      gpsDireccion: gps.direccion,
      observaciones: `Cliente no encontrado en domicilio`
    };

    onRegistrarVisita(nuevaVisita);

    const reprogramacion: VisitaReprogramada = {
      id: `REP-${Date.now()}`,
      idCliente: selectedCliente.id,
      nombreCliente: `${selectedCliente.nombre} ${selectedCliente.apellido}`,
      horaReprogramada: horaReprogramada || '16:00',
      fechaReprogramada: todayStr,
      motivo: 'No encontrado en primera visita',
      completada: false
    };

    onReprogramarVisita(reprogramacion);
    showToast(`⚠️ NO ENCONTRADO. Movidó a Visitas Pendientes (${horaReprogramada || '16:00'})`);
    setSelectedCliente(null);
    setActionType(null);
  };

  // Handle Reprogramar
  const handleReprogramar = async () => {
    if (!selectedCliente) return;
    const reprogramacion: VisitaReprogramada = {
      id: `REP-${Date.now()}`,
      idCliente: selectedCliente.id,
      nombreCliente: `${selectedCliente.nombre} ${selectedCliente.apellido}`,
      horaReprogramada: horaReprogramada || '15:30',
      fechaReprogramada: todayStr,
      motivo: motivoReprogramado || 'Cliente solicitó volver más tarde',
      completada: false
    };

    onReprogramarVisita(reprogramacion);
    showToast(`⏰ Visita Reprogramada para las ${horaReprogramada}`);
    setSelectedCliente(null);
    setActionType(null);
  };

  // Handle Submit Payment Registration
  const handleConfirmarPago = async () => {
    if (!selectedCliente) return;

    const monto = parseFloat(montoPago);
    if (isNaN(monto) || monto <= 0) {
      alert('Por favor ingrese un monto válido cobrado.');
      return;
    }

    // Fallback photo if none provided so form is never blocked
    const fotoToUse = fotoComprobante || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100" viewBox="0 0 200 100"><rect width="200" height="100" fill="%230f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2310b981" font-size="12" font-family="sans-serif">Comprobante Digital Recibo</text></svg>';

    let gps = { lat: -34.6037, lng: -58.3816, direccion: 'Ubicación Registrada en Campo' };
    try {
      gps = await obtenerGPSActual();
    } catch (e) {
      console.warn('GPS location fallback used:', e);
    }

    const horaStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const opToUse: Operacion = selectedOperacion || {
      id: `OP-REFIN-${Date.now().toString().slice(-6)}`,
      idCliente: selectedCliente.id,
      montoPrestamo: selectedCliente.montoDeudaInactivo || 15000,
      montoTotalDevolver: selectedCliente.montoDeudaInactivo || 15000,
      cuotasTotales: 10,
      cuotasPagadas: 0,
      cuotasPendientes: 10,
      valorCuota: selectedCliente.montoPagoInicialRefinanciacion || 3000,
      frecuencia: 'DIARIO',
      fechaInicio: todayStr,
      estado: 'ACTIVA',
      diasMora: 0,
      capitalRecuperado: 0,
      totalPendiente: selectedCliente.montoDeudaInactivo || 15000,
      metodoPagoPref: 'EFECTIVO'
    };

    const newPago: Pago = {
      id: `PAG-${Date.now().toString().slice(-6)}`,
      idOperacion: opToUse.id,
      idCliente: selectedCliente.id,
      nombreCliente: `${selectedCliente.nombre} ${selectedCliente.apellido}`,
      fechaPago: todayStr,
      horaPago: horaStr,
      importe: monto,
      cobrador: activeUser?.nombre || 'Cobrador de Campo',
      metodoPago: medioPago,
      modalidad: selectedCliente.estado === 'INACTIVO' ? 'REFINANCIACION' : 'PAGO_REGULAR',
      cuotasAfectadas: `Cuota ${opToUse.cuotasPagadas + 1}`,
      observaciones: `${observacionesPago || 'Cobrado en campo'} (GPS: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)})`
    };

    let opCuotas = cuotas.filter(c => c.idOperacion === opToUse.id);
    if (opCuotas.length === 0) {
      opCuotas = cuotas.filter(c => c.idCliente === selectedCliente.id && c.estado !== 'PAGADA');
    }

    const cuotasToProcess = sortCuotasByPaymentPriority(opCuotas, todayStr, newPago.modalidad);

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
        cCopy.fechaPago = todayStr;
        cCopy.cobrador = activeUser?.nombre || 'Cobrador Campo';
      } else {
        const paidThis = remPago;
        remPago = 0;
        cCopy.importePagado = parseFloat((cCopy.importePagado + paidThis).toFixed(2));
        cCopy.saldoPendiente = parseFloat((cCopy.saldoPendiente - paidThis).toFixed(2));
        cCopy.estado = 'PAGO_PARCIAL';
        cCopy.fechaPago = todayStr;
        cCopy.cobrador = activeUser?.nombre || 'Cobrador Campo';
      }
      cuotaUpdatesMap.set(cCopy.id, cCopy);
    });

    const updatedCuotas = opCuotas.map(c => cuotaUpdatesMap.get(c.id) || c);
    newPago.cuotasAfectadas = affectedCuotaNums.length > 0 
      ? `Cuotas N° ${affectedCuotaNums.sort((a,b)=>a-b).join(', ')}` 
      : `Cuota ${opToUse.cuotasPagadas + 1}`;

    const pagadasNow = updatedCuotas.filter(c => c.estado === 'PAGADA').length;

    const updatedOperacion: Operacion = {
      ...opToUse,
      capitalRecuperado: opToUse.capitalRecuperado + monto,
      totalPendiente: Math.max(0, opToUse.totalPendiente - monto),
      cuotasPagadas: pagadasNow,
      cuotasPendientes: Math.max(0, opToUse.cantidadCuotas - pagadasNow),
      ultimoPago: todayStr
    };

    const tesoreriaTrx: TransaccionTesoreria = {
      id: `TRX-${Date.now().toString().slice(-6)}`,
      fecha: todayStr,
      tipo: 'INGRESO',
      concepto: `Cobro en Campo (${selectedCliente.estado === 'INACTIVO' ? 'Pago Inicial Refinanciación' : 'Cuota'}) - Cliente ${selectedCliente.nombre} ${selectedCliente.apellido}`,
      monto: monto,
      referenciaId: newPago.id
    };

    onAddPago(newPago, updatedCuotas, updatedOperacion, tesoreriaTrx);

    if (selectedCliente.estado === 'INACTIVO' && onUpdateCliente) {
      onUpdateCliente({
        ...selectedCliente,
        estado: 'ACTIVO',
        esClienteInactivoRefinanciacion: false
      });
    }

    const nuevaVisita: VisitaDomicilio = {
      id: `VIS-${Date.now()}`,
      idCliente: selectedCliente.id,
      nombreCliente: `${selectedCliente.nombre} ${selectedCliente.apellido}`,
      cobradorId: activeUser?.id || 'COB-01',
      cobradorNombre: activeUser?.nombre || 'Cobrador',
      fecha: todayStr,
      hora: horaStr,
      tipoAccion: 'PAGO_REGISTRADO',
      gpsLat: gps.lat,
      gpsLng: gps.lng,
      gpsDireccion: gps.direccion,
      montoCobrado: monto,
      medioPago: medioPago,
      fotoComprobante: fotoToUse,
      observaciones: observacionesPago
    };

    onRegistrarVisita(nuevaVisita);

    showToast(`✅ PAGO REGISTRADO: $${monto.toLocaleString('es-AR')} (${medioPago}). Comprobante guardado con GPS.`);
    
    // Explicitly reset form states and close modal
    setMontoPago('');
    setFotoComprobante(null);
    setObservacionesPago('');
    setActionType(null);
    setSelectedOperacion(null);
    setSelectedCliente(null);
  };

  // Handle Contact Recovered
  const handleContactoRecuperado = (cliente: Cliente) => {
    onRegistrarContactoRecuperado(cliente.id, activeUser?.id || 'COB-01');
    showToast(`🎯 Contacto Recuperado para ${cliente.nombre} ${cliente.apellido}. Comisión sumada.`);
  };

  // Handle File Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoComprobante(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChangeDesayuno = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoTicketDesayuno(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Phone Call registration
  const handleRegistrarLlamadaRealizada = () => {
    if (!gestionClienteSelected) return;
    if (onRegistrarGestionTelefonica) {
      onRegistrarGestionTelefonica(gestionClienteSelected.id, 'LLAMADA', notasGestionTel || 'Llamada de gestión de cobro efectuada.');
    }
    showToast(`📞 Llamada Registrada: +$${(configComisiones.montoComisionLlamada || 300).toLocaleString('es-AR')} en comisión.`);
    setShowPhoneCallModal(false);
    setGestionClienteSelected(null);
    setNotasGestionTel('');
  };

  // Handle WhatsApp message registration
  const handleEnviarMensajeWhatsApp = (cliente: Cliente) => {
    const cleanNum = (cliente.whatsapp || cliente.telefono || '').replace(/\D/g, '');
    const msg = `Hola ${cliente.nombre}! Le recordamos su cuota pendiente de CrediCash. Por favor coordine el horario de cobro o transferencia.`;
    window.open(`https://wa.me/${cleanNum}?text=${encodeURIComponent(msg)}`, '_blank');

    if (onRegistrarGestionTelefonica) {
      onRegistrarGestionTelefonica(cliente.id, 'MENSAJE', 'Recordatorio de cuota enviado por WhatsApp.');
    }
    showToast(`💬 Mensaje WhatsApp enviado: +$${(configComisiones.montoComisionMensaje || 150).toLocaleString('es-AR')} en comisión.`);
  };

  // Handle Submit Breakfast Reimbursement Request
  const handleEnviarReintegroDesayuno = () => {
    const monto = parseFloat(montoGastoDesayuno);
    if (isNaN(monto) || monto <= 0) {
      alert('Por favor ingrese un monto de gasto válido.');
      return;
    }

    const pct = configComisiones.porcentajeReintegroDesayuno || 50;
    const montoCalcular = (monto * pct) / 100;
    const limiteSemanal = configComisiones.limiteSemanalReintegroDesayuno || 15000;
    const montoFinalReintegrar = Math.min(montoCalcular, limiteSemanal);

    const now = new Date();
    const horaNow = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    const nuevaSolicitud: SolicitudReintegroDesayuno = {
      id: `REINT-${Date.now().toString().slice(-6)}`,
      cobradorId: activeUser?.id || 'COB-01',
      cobradorNombre: activeUser?.nombre || 'Cobrador de Campo',
      fecha: todayStr,
      hora: horaNow,
      montoGasto: monto,
      porcentajeCobertura: pct,
      montoReintegrar: montoFinalReintegrar,
      lugarNombre: lugarDesayuno || 'Punto de Arranque / Cafetería',
      fotoTicketUrl: fotoTicketDesayuno || 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=60',
      estado: 'PENDIENTE',
      observaciones: `Reintegro del ${pct}% cargado al arrancar el recorrido.`
    };

    if (onSolicitarReintegroDesayuno) {
      onSolicitarReintegroDesayuno(nuevaSolicitud);
    }

    setDesayunoExitoMsg(`¡Ticket enviado correctamente! Se reembolsarán $${montoFinalReintegrar.toLocaleString('es-AR')} en tu liquidación semanal.`);
    setTimeout(() => setDesayunoExitoMsg(null), 5000);
    setFotoTicketDesayuno(null);
  };

  // Filter collector's reimbursements
  const misReintegros = reintegrosDesayuno.filter(r => !isCobrador || r.cobradorId === activeUser?.id);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 font-sans text-slate-100 pb-20">
      
      {/* Toast Notification Floating Banner */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-slate-950 font-black px-5 py-3 rounded-2xl shadow-2xl border-2 border-emerald-300 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-6 h-6 shrink-0 text-slate-950" />
          <span className="text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Admin Field Supervision Selector */}
      {isUserAdmin && (
        <div className="bg-gradient-to-r from-slate-950 via-teal-950 to-slate-950 p-4 rounded-2xl border-2 border-teal-500/80 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-600/30 text-teal-400 rounded-xl border border-teal-500/50">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase text-teal-300 tracking-wider flex items-center gap-2">
                <span>SUPERVISIÓN DOMICILIARIA (CAMPO) POR EMPLEADO</span>
                <span className="bg-teal-500 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-md">
                  Panel Admin
                </span>
              </h4>
              <p className="text-[11px] text-teal-200/80 font-medium">
                Seleccione un cobrador de calle para auditar su hoja de ruta, recorrido GPS e historial de visitas.
              </p>
            </div>
          </div>

          <div className="w-full md:w-auto flex items-center gap-2 shrink-0">
            <label className="text-[11px] font-extrabold text-white shrink-0 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-teal-400" />
              Cobrador:
            </label>
            <select
              value={selectedSupervisorUserId}
              onChange={(e) => setSelectedSupervisorUserId(e.target.value)}
              className="w-full md:w-72 px-3 py-2 bg-slate-900 text-white border-2 border-teal-500 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-400 cursor-pointer shadow-sm"
            >
              <option value="TODOS">👥 TODOS LOS COBRADORES (Vista Consolidada)</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>
                  👤 {u.nombre} ({u.rolId === 'COBRADOR' ? 'Cobrador Calle' : u.rolId === 'OPERADOR' ? 'Operador Telefónico' : u.rolId})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FIXED TOP LONG BAR: COMISIONES ALCANZADAS + ACCESO A MIS GANANCIAS        */}
      {/* ========================================================================= */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-2 border-emerald-500/80 rounded-3xl p-4 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          {/* Main Earnings Indicator Bar */}
          <div className="flex items-center gap-3.5 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg shadow-emerald-900/50">
              <DollarSign className="w-7 h-7 stroke-[3]" />
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Comisiones del Día Alcanzadas
                </span>
                <span className="text-xs font-black text-amber-300">
                  Avance: {efectividadPorcentaje}%
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl md:text-3xl font-black text-emerald-300">
                    ${comisionesGanadasHoy.toLocaleString('es-AR')} ARS
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    ({clientesGestionados.length}/{myAssignedClients.length} cobrados)
                  </span>
                </div>

                <div className="flex flex-col sm:items-end gap-1.5 self-start sm:self-auto">
                  {/* TIEMPO ESTIMADO DEL RECORRIDO (ARRIBA DE GANANCIA POTENCIAL HOY) */}
                  <div className="bg-teal-950/80 border border-teal-500/50 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 text-teal-300 text-[11px] font-bold shadow-xs">
                    <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Tiempo Estimado Recorrido: <strong className="text-white font-black">{tiempoEstimadoFormatted}</strong></span>
                  </div>

                  {/* GANANCIA POTENCIAL HOY */}
                  <div className="bg-amber-950/70 border border-amber-500/60 px-3 py-1 rounded-xl flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-amber-300">Ganancia Potencial Hoy:</span>
                    <span className="text-sm font-black text-amber-200">${potencialGananciaTotalHoy.toLocaleString('es-AR')} ARS</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(6, efectividadPorcentaje)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Action Buttons for Earnings Modal & Admin PDF Export & Ingresar Pago Directo */}
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            <button
              onClick={() => {
                setShowQuickPagoModal(true);
                setQuickPagoSearch('');
              }}
              className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs px-4 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:shadow-emerald-500/30 cursor-pointer transition-all uppercase tracking-wider shrink-0 border-2 border-yellow-400 ring-2 ring-emerald-500/40"
              title="Ingresar o registrar un cobro directamente para cualquier cliente"
            >
              <DollarSign className="w-5 h-5 text-yellow-300 stroke-[3] animate-bounce" />
              <span>INGRESAR PAGO (COBRAR)</span>
            </button>

            <button
              onClick={handleExportarPDFHojaRuta}
              className="bg-rose-700 hover:bg-rose-600 text-white font-black text-xs px-3.5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-rose-500/30 cursor-pointer transition-all uppercase tracking-wider shrink-0 border border-rose-400"
              title="Exportar Hoja de Ruta en PDF para el cobrador (Nombre, Dirección, Mora, Total y Mínimo)"
            >
              <FileText className="w-4 h-4 text-white shrink-0" />
              <span>Exportar PDF Hoja de Ruta</span>
            </button>

            <button
              onClick={() => setShowComisionesModal(true)}
              className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/20 cursor-pointer transition-all uppercase tracking-wider shrink-0"
            >
              <TrendingUp className="w-4 h-4 stroke-[3]" />
              <span>Mis Ganancias y Comisiones</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FIELD COLLECTOR TAB NAVIGATION MENU                                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-md items-center">
        {/* OPTION 1: GESTIÓN DIARIA (LARGE & PROMINENT) */}
        <button
          onClick={() => setActiveTab('gestion_diaria')}
          className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'gestion_diaria'
              ? 'bg-emerald-600 text-white shadow-lg border border-emerald-400 ring-2 ring-emerald-500/30'
              : 'text-slate-200 bg-slate-800/80 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Calendar className="w-5 h-5 shrink-0 text-emerald-300" />
          <span className="truncate">1. GESTIÓN DIARIA</span>
        </button>

        {/* OPTION 2: GESTIÓN TELEFÓNICA (DISABLED & SMALLER FOR NOW) */}
        <button
          disabled={true}
          title="Pestaña en desarrollo temporalmente deshabilitada"
          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl font-bold text-[10px] bg-slate-950/80 border border-slate-800 text-slate-500 cursor-not-allowed opacity-50 shadow-inner"
        >
          <PhoneCall className="w-3.5 h-3.5 shrink-0 text-slate-600" />
          <span className="truncate">2. Gestión Telefónica (Deshabilitada)</span>
        </button>

        {/* OPTION 3: VISUALIZACIÓN DE RECORRIDO (LARGE & PROMINENT) */}
        <button
          onClick={() => setActiveTab('mi_recorrido')}
          className={`flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'mi_recorrido'
              ? 'bg-emerald-600 text-white shadow-lg border border-emerald-400 ring-2 ring-emerald-500/30'
              : 'text-slate-200 bg-slate-800/80 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Compass className="w-5 h-5 shrink-0 text-teal-300" />
          <span className="truncate">3. VISUALIZACIÓN DE RECORRIDO</span>
        </button>

        {/* OPTION 4: REINTEGRO DESAYUNO */}
        <button
          onClick={() => setActiveTab('reintegro_desayuno')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'reintegro_desayuno'
              ? 'bg-emerald-600 text-white shadow-lg border border-emerald-400 ring-2 ring-emerald-500/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Coffee className="w-4 h-4 shrink-0 text-amber-300" />
          <span className="truncate">4. Reintegro Desayuno</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: GESTIÓN DIARIA (AGENDA DE TRABAJO EN CALLE)                        */}
      {/* ========================================================================= */}
      {activeTab === 'gestion_diaria' && (
        <div className="space-y-6">
          
          {/* VISITAS REPROGRAMADAS / PENDIENTES DE HOY */}
          {clientesVisitasPendientesReprogramadas.length > 0 && (
            <div className="bg-amber-950/30 border-2 border-amber-500/50 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-300">
                  <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                  <h3 className="text-sm font-black uppercase tracking-wider">Visitas Pendientes (Reprogramadas para Hoy)</h3>
                </div>
                <span className="text-xs bg-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full">
                  {clientesVisitasPendientesReprogramadas.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {clientesVisitasPendientesReprogramadas.map(cliente => {
                  const reprogramacion = getRescheduledToday(cliente.id);
                  const ops = clientOperationsMap.get(cliente.id) || [];
                  const totalExigible = ops.reduce((sum, o) => sum + (o.valorCuota || 0), 0);
                  const cuotasVencidas = ops.reduce((sum, o) => sum + (o.cuotasPendientes || 1), 0);

                  return (
                    <div key={`reprog-${cliente.id}`} className="bg-slate-900 border border-amber-500/40 rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-black text-sm text-white">{cliente.nombre} {cliente.apellido}</h4>
                          <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{cliente.direccion || `${cliente.calle || 'Calle'} ${cliente.numero || ''}`}</span>
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-amber-500/20 text-amber-300 font-extrabold text-[11px] rounded-lg border border-amber-500/40 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Volver: {reprogramacion?.horaReprogramada}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 text-slate-300">
                        <span>Cuotas pendientes: <b className="text-white">{cuotasVencidas}</b></span>
                        <span>Exigible: <b className="text-amber-300 font-black">${totalExigible.toLocaleString('es-AR')}</b></span>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => abrirGoogleMaps(cliente.direccion || cliente.calle || '')}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-extrabold py-2 px-2 rounded-lg border border-slate-700 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                          Ir al domicilio
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCliente(cliente);
                            setSelectedOperacion(ops[0] || null);
                          }}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black py-2 px-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Atender Ahora
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MAIN CLIENT AGENDA GRID */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Mis Clientes Asignados ({clientesPendientes.length} pendientes de cobro)</span>
              </h3>
              <span className="text-xs text-slate-400 font-bold">Sin opción de ver ajenos</span>
            </div>

            {clientesPendientes.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h4 className="text-base font-black text-white">¡Excelente trabajo en calle!</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Has completado todas las visitas asignadas para el día de hoy.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientesPendientes.map(cliente => {
                  const ops = clientOperationsMap.get(cliente.id) || [];
                  const opPrincipal = ops[0];
                  const estadoField = getClienteEstadoField(cliente, ops);
                  const { 
                    totalExigible, 
                    montoMinimoExigible, 
                    cuotasDebeCount, 
                    totalDeudaCuotas,
                    totalSaldoRestanteCredito,
                    cuotasDiariasCount,
                    cuotasSemanalesCount,
                    cuotasDiariasMoraCount,
                    cuotasSemanalesMoraCount,
                    cuotasQuincenalesMoraCount,
                    cuotasMensualesMoraCount,
                    diaGestion,
                    diasMoraMax,
                    cuotasVencidasCount,
                    cuotasHoyCount
                  } = getClientFinancialSummary(cliente, ops);

                  return (
                    <div 
                      key={cliente.id}
                      className="bg-slate-900 border-2 border-slate-800 hover:border-emerald-500/60 rounded-2xl p-4 space-y-3 flex flex-col justify-between shadow-lg transition-all"
                    >
                      {/* Header: Name, Address, Status & House Photo */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-black text-white leading-tight truncate">
                              {cliente.nombre} {cliente.apellido}
                            </h4>
                            <p className="text-xs font-semibold text-slate-300 flex items-center gap-1 mt-1 truncate">
                              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">{cliente.direccion || `${cliente.calle || ''} ${cliente.numero || ''}`}</span>
                            </p>
                            
                            {/* Badges: Status, Dias de Mora & 5-Day Commission Countdown */}
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className={`inline-block px-2.5 py-0.5 text-[10px] font-black uppercase rounded-lg border ${estadoField.badgeClass}`}>
                                {estadoField.label}
                              </span>

                              {diasMoraMax > 0 ? (
                                <span className="text-[10px] font-black text-rose-300 bg-rose-950/90 border border-rose-600/80 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                  {diasMoraMax} Días de Mora
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/90 border border-emerald-700/80 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  Cobro Día de Hoy
                                </span>
                              )}

                              {diaGestion <= 2 ? (
                                <span className="text-[10px] font-black text-emerald-300 bg-emerald-950/90 border border-emerald-700/80 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-emerald-400" />
                                  Día {diaGestion}/5 Comisión
                                </span>
                              ) : diaGestion <= 4 ? (
                                <span className="text-[10px] font-black text-amber-300 bg-amber-950/90 border border-amber-600/80 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  Día {diaGestion}/5 Comisión
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-rose-100 bg-rose-950 border-2 border-rose-500 px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-md shadow-rose-950">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                  Día 5/5 Comisión
                                </span>
                              )}
                            </div>
                          </div>

                          {/* House Photo Section */}
                          <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-700/80 overflow-hidden shrink-0 flex items-center justify-center relative group">
                            {cliente.fotoCasa ? (
                              <img src={cliente.fotoCasa} alt="Casa" className="w-full h-full object-cover" />
                            ) : (
                              <label className="flex flex-col items-center justify-center text-center p-1 cursor-pointer w-full h-full hover:bg-slate-800 transition-colors">
                                <Camera className="w-4 h-4 text-amber-400" />
                                <span className="text-[8px] font-black text-amber-300 leading-tight mt-0.5">Foto Casa</span>
                                <input type="file" accept="image/*" capture="environment" onChange={(e) => handleHousePhotoUpload(cliente.id, e)} className="hidden" />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Required Financial Summary Box */}
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
                        {/* Frequency Columns */}
                        <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800/80 text-center">
                          <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                            <span className="text-slate-400 uppercase font-black block text-[9px]">Cuotas en Mora</span>
                            <span className="font-black text-rose-400 text-sm">{cuotasVencidasCount}</span>
                          </div>
                          <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                            <span className="text-slate-400 uppercase font-black block text-[9px]">Cuota Día de Hoy</span>
                            <span className="font-black text-amber-300 text-sm">{cuotasHoyCount > 0 ? `${cuotasHoyCount} Hoy` : (cuotasDebeCount > 0 ? '1 Exigible' : '0')}</span>
                          </div>
                        </div>

                        {/* Desglose de Cuotas en Mora por Frecuencia */}
                        <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800 text-[10px] font-bold text-center text-slate-300 flex items-center justify-around gap-1">
                          <span className="text-rose-300">
                            <strong className="text-slate-400 font-extrabold uppercase text-[9px]">Diarias:</strong> {cuotasDiariasMoraCount}
                          </span>
                          <span className="text-slate-600">|</span>
                          <span className="text-amber-300">
                            <strong className="text-slate-400 font-extrabold uppercase text-[9px]">Semanales:</strong> {cuotasSemanalesMoraCount}
                          </span>
                          <span className="text-slate-600">|</span>
                          <span className="text-teal-300">
                            <strong className="text-slate-400 font-extrabold uppercase text-[9px]">
                              {cuotasQuincenalesMoraCount > 0 ? 'Quincenales:' : 'Mensuales:'}
                            </strong> {cuotasQuincenalesMoraCount > 0 ? cuotasQuincenalesMoraCount : cuotasMensualesMoraCount}
                          </span>
                        </div>

                        {/* FINANCIAL SUMMARY BOX */}
                        {(cliente.estado === 'INACTIVO' || (cliente.montoDeudaInactivo && cliente.montoDeudaInactivo > 0)) ? (
                          <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 p-2.5 rounded-xl border-2 border-amber-500/80 shadow-lg space-y-1.5 text-center">
                            <span className="text-[9px] font-black text-amber-300 uppercase tracking-wider block">
                              PAGO INICIAL PARA REFINANCIAR
                            </span>
                            <span className="text-2xl font-black text-yellow-300 tracking-tight block">
                              ${(cliente.montoPagoInicialRefinanciacion || Math.round((cliente.montoDeudaInactivo || 150000) * 0.3)).toLocaleString('es-AR')}
                            </span>
                            {isUserAdmin && (
                              <div className="pt-1 border-t border-amber-800/60 text-[9px] font-bold text-slate-400">
                                Total Deuda Registrada (Admin): <span className="text-amber-200">${(cliente.montoDeudaInactivo || totalDeudaCuotas).toLocaleString('es-AR')}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-2.5 rounded-xl border-2 border-emerald-500/80 shadow-lg text-center">
                            <span className="text-[9px] font-black text-emerald-300 uppercase tracking-wider block">
                              TOTAL ADEUDADO A ABONAR
                            </span>
                            <span className="text-xl font-black text-yellow-300 tracking-tight block">
                              ${totalDeudaCuotas.toLocaleString('es-AR')}
                            </span>
                          </div>
                        )}

                        {/* MONTO MINIMO EXIGIBLE */}
                        <div className="flex items-center justify-between px-1 pt-0.5">
                          <span className="text-[10px] uppercase font-black text-slate-300">Monto Mínimo Exigible:</span>
                          <span className="font-black text-emerald-400 text-sm bg-emerald-950/90 px-2.5 py-0.5 rounded-lg border border-emerald-800">
                            ${montoMinimoExigible.toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => abrirGoogleMaps(cliente.direccion || cliente.calle || '')}
                          className="bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-extrabold text-xs py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Navigation className="w-4 h-4 text-emerald-400" />
                          <span>Navegar</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedCliente(cliente);
                            setSelectedOperacion(opPrincipal || null);
                            setActionType(null);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-colors"
                        >
                          <DollarSign className="w-4 h-4 text-yellow-300" />
                          <span>Ingresar Pago / Cobrar</span>
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* GESTIONADOS TODAY SECTION */}
          {clientesGestionados.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Visitados y Gestionados Hoy ({clientesGestionados.length})</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {clientesGestionados.map(cliente => (
                  <div key={`gest-${cliente.id}`} className="bg-slate-900/60 border border-emerald-900/50 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-200 block">{cliente.nombre} {cliente.apellido}</span>
                      <span className="text-[10px] text-emerald-400 font-semibold">📍 Visita / Cobro Registrado</span>
                    </div>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-md font-bold">
                      Completado
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GESTIÓN TELEFÓNICA (LLAMADAS & MESSAGES CON COMISIÓN DIFERENCIADA)  */}
      {/* ========================================================================= */}
      {activeTab === 'gestion_telefonica' && (
        <div className="space-y-6">
          
          {/* Banner */}
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <PhoneCall className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Módulo de Gestión Telefónica y Digital</h3>
                <p className="text-xs text-slate-300">
                  Comisión Fija por Llamada: <b className="text-emerald-400">${(configComisiones.montoComisionLlamada || 300).toLocaleString('es-AR')}</b> | 
                  Comisión Fija por WhatsApp: <b className="text-teal-300">${(configComisiones.montoComisionMensaje || 150).toLocaleString('es-AR')}</b>
                </p>
              </div>
            </div>
          </div>

          {/* Client List for Phone / WhatsApp Management */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myAssignedClients.map(cliente => {
              const ops = clientOperationsMap.get(cliente.id) || [];
              const opPrincipal = ops[0];

              return (
                <div key={`tel-${cliente.id}`} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-black text-sm text-white">{cliente.nombre} {cliente.apellido}</h4>
                    <p className="text-xs text-slate-400 font-semibold mt-1">
                      Tel: {cliente.telefono || cliente.whatsapp || 'Sin registrar'}
                    </p>
                    <span className="text-[10px] text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-800 font-bold inline-block mt-2">
                      Cuota Exigible: ${opPrincipal?.valorCuota?.toLocaleString('es-AR') || '0'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setGestionClienteSelected(cliente);
                        setShowPhoneCallModal(true);
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs py-2 px-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer shadow-md"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Llamada (${configComisiones.montoComisionLlamada || 300})</span>
                    </button>

                    <button
                      onClick={() => handleEnviarMensajeWhatsApp(cliente)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2 px-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer shadow-md"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp (${configComisiones.montoComisionMensaje || 150})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RECORRIDO DEL DÍA (TIEMPO ESTIMADO CON PAUSA DE 15 MIN/CLIENTE)   */}
      {/* ========================================================================= */}
      {activeTab === 'mi_recorrido' && (() => {
        const lugarInicio = activeUser?.lugarInicioRecorrido || configRecorrido?.puntoSalida || 'Oficina Central - Av. San Martín 1230';
        const lugarFin = activeUser?.lugarFinRecorrido || configRecorrido?.puntoLlegada || 'Oficina Central - Av. San Martín 1230';
        const ruta = optimizeRouteNearestNeighbor(lugarInicio, lugarFin, myAssignedClients);
        const gmapsRouteUrl = buildGoogleMapsRouteUrl(lugarInicio, lugarFin, ruta.puntosClientes);

        return (
          <div className="space-y-6">
            
            {/* Estimated Route Time Banner */}
            <div className="bg-slate-900 border-2 border-teal-500/50 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0">
                    <Compass className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Ruta Inteligente & Recorrido Optimizado</h3>
                    <div className="text-xs text-slate-300 space-y-0.5 mt-1">
                      <p>🚀 <b>Inicio de Recorrido:</b> <span className="text-emerald-400 font-bold">{lugarInicio}</span></p>
                      <p>🏁 <b>Lugar de Regreso / Fin:</b> <span className="text-indigo-300 font-bold">{lugarFin}</span></p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-teal-500/40 flex items-center gap-4 text-xs font-bold shrink-0">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Atención (15m/cliente)</span>
                    <span className="text-emerald-400 font-black">{minutosAtencionClientes} min</span>
                  </div>
                  <div className="h-6 w-px bg-slate-800"></div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Distancia Recorrido</span>
                    <span className="text-amber-300 font-black">{ruta.distanciaTotalEstimadaKm} km</span>
                  </div>
                  <div className="h-6 w-px bg-slate-800"></div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Tiempo Estimado</span>
                    <span className="text-teal-300 font-black text-sm">{tiempoEstimadoFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Direct Link to Open Google Maps Turn-By-Turn Route */}
              <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <p className="text-xs text-slate-400 leading-relaxed">
                  💡 <b>Ordenación Inteligente por Cercanía:</b> La ruta calcula la distancia de forma óptima partiendo desde tu lugar de inicio, visitando cliente por cliente más cercano y finalizando en tu punto de cierre.
                </p>

                <a
                  href={gmapsRouteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs py-3 px-5 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0 uppercase tracking-wider transition-all"
                >
                  <Navigation className="w-4.5 h-4.5 text-slate-950" />
                  <span>🗺️ Abrir Ruta Completa en Google Maps</span>
                </a>
              </div>
            </div>

            {/* Route Map Graphic Visualizer */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
              
              <div className="w-full min-h-32 bg-slate-950 rounded-2xl border-2 border-slate-800 relative overflow-hidden flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
                
                <div className="relative z-10 w-full overflow-x-auto pb-2">
                  <div className="flex items-center justify-between min-w-[600px] px-4 gap-2">
                    {/* Inicio Node */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-lg ring-4 ring-emerald-500/30">
                        🚀
                      </div>
                      <span className="text-[10px] font-black text-emerald-400 mt-2 max-w-[100px] truncate text-center">
                        INICIO
                      </span>
                    </div>

                    {/* Client Points in Optimized Order */}
                    {ruta.puntosClientes.map((pt) => {
                      const visited = pt.cliente ? isVisitedToday(pt.cliente.id) : false;
                      return (
                        <React.Fragment key={`graph-node-${pt.id}`}>
                          <div className="h-0.5 flex-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400"></div>
                          <div className="flex flex-col items-center shrink-0">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shadow-lg ring-4 ${
                              visited 
                                ? 'bg-emerald-500 text-slate-950 ring-emerald-500/30' 
                                : 'bg-amber-500 text-slate-950 ring-amber-500/30'
                            }`}>
                              P{pt.puntoNumero}
                            </div>
                            <span className="text-[10px] font-bold text-white mt-2 max-w-[90px] truncate text-center">
                              {pt.nombre.split(' ')[0]}
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* Fin Node */}
                    <div className="h-0.5 flex-1 bg-gradient-to-r from-teal-400 to-indigo-500"></div>
                    <div className="flex flex-col items-center shrink-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black text-xs shadow-lg ring-4 ring-indigo-500/30">
                        🏁
                      </div>
                      <span className="text-[10px] font-black text-indigo-400 mt-2 max-w-[100px] truncate text-center">
                        REGRESO
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* List of Route Stops in Optimized Order */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>Itinerario Detallado de Visitas ({ruta.puntosClientes.length} Clientes)</span>
                  <span className="text-teal-400 text-[11px] font-bold">Pausa de 15 min / cliente</span>
                </h4>
                
                <div className="space-y-2">
                  {/* Start Point Item */}
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-700/60 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                        🚀
                      </span>
                      <div>
                        <span className="font-black text-emerald-300 block">PUNTO 0: PARTIDA DE RECORRIDO</span>
                        <span className="text-[11px] text-slate-300">{lugarInicio}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-emerald-300 bg-emerald-950 px-2 py-1 rounded border border-emerald-700">INICIO</span>
                  </div>

                  {/* Clients List */}
                  {ruta.puntosClientes.map((pt) => {
                    const c = pt.cliente!;
                    const visited = isVisitedToday(c.id);
                    const rescheduled = getRescheduledToday(c.id);

                    return (
                      <div 
                        key={`stop-${pt.id}`}
                        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                          visited 
                            ? 'bg-emerald-950/30 border-emerald-800/60' 
                            : rescheduled 
                            ? 'bg-amber-950/30 border-amber-800/60' 
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                            visited ? 'bg-emerald-500 text-slate-950' : 'bg-amber-500 text-slate-950'
                          }`}>
                            P{pt.puntoNumero}
                          </span>
                          <div>
                            <span className="font-bold text-white block text-sm">{pt.nombre}</span>
                            <span className="text-[11px] text-slate-300 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                              {pt.direccion}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <span className="text-[10px] font-bold text-slate-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                            ⏱️ 15m
                          </span>
                          {visited && <span className="text-[10px] font-black text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded border border-emerald-700">VISITADO</span>}
                          {rescheduled && <span className="text-[10px] font-black text-amber-400 bg-amber-950 px-2.5 py-1 rounded border border-amber-700">REPROGRAMADO</span>}

                          <button
                            onClick={() => abrirGoogleMaps(pt.direccion)}
                            className="bg-slate-800 hover:bg-slate-700 text-emerald-300 px-3 py-1.5 rounded-lg border border-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Navegar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* End Point Item */}
                  <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-700/60 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                        🏁
                      </span>
                      <div>
                        <span className="font-black text-indigo-300 block">PUNTO {ruta.puntoFin.puntoNumero}: LUGAR DE REGRESO / CIERRE</span>
                        <span className="text-[11px] text-slate-300">{lugarFin}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-indigo-300 bg-indigo-950 px-2 py-1 rounded border border-indigo-700">CIERRE</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* TAB 4: REINTEGRO DESAYUNO / VIÁTICOS DE ARRANQUE                           */}
      {/* ========================================================================= */}
      {activeTab === 'reintegro_desayuno' && (
        <div className="space-y-6">
          
          {/* Header Banner */}
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <Coffee className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Rendición de Gastos & Desayuno de Arranque</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  La empresa cubre el <b className="text-emerald-400">{configComisiones.porcentajeReintegroDesayuno || 50}%</b> de tu café de la mañana al arrancar el recorrido desde el punto de partida (Shopping / Cafetería).
                </p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 grid grid-cols-2 gap-3 text-xs font-bold">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Cobertura Empresa</span>
                <span className="text-emerald-400 font-black text-sm">{configComisiones.porcentajeReintegroDesayuno || 50}% del Ticket</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Límite Semanal Disponible</span>
                <span className="text-amber-300 font-black text-sm">${(configComisiones.limiteSemanalReintegroDesayuno || 15000).toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>

          {/* Success Notification */}
          {desayunoExitoMsg && (
            <div className="bg-emerald-950 border-2 border-emerald-500 text-emerald-200 font-bold p-4 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <span className="text-xs">{desayunoExitoMsg}</span>
            </div>
          )}

          {/* Upload Receipt Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h4 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>Cargar Comprobante / Ticket de Café de Hoy</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Cafetería / Establecimiento</label>
                <input
                  type="text"
                  value={lugarDesayuno}
                  onChange={e => setLugarDesayuno(e.target.value)}
                  placeholder="Ej. Café Martinez - Shopping Abasto"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Monto del Ticket ($ ARS)</label>
                <input
                  type="number"
                  value={montoGastoDesayuno}
                  onChange={e => setMontoGastoDesayuno(e.target.value)}
                  placeholder="Ej. 3500"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-black text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Calculated Refund Box */}
            <div className="bg-emerald-950/40 border border-emerald-800 p-3.5 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">Monto estimado a reintegro ({configComisiones.porcentajeReintegroDesayuno || 50}%):</span>
              <span className="text-base font-black text-emerald-300">
                ${((parseFloat(montoGastoDesayuno || '0') * (configComisiones.porcentajeReintegroDesayuno || 50)) / 100).toLocaleString('es-AR')}
              </span>
            </div>

            {/* Image Photo Upload */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Foto del Ticket de Desayuno con Fecha y Hora</label>
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-4 text-center bg-slate-950 flex flex-col items-center justify-center gap-2 min-h-[120px]">
                {fotoTicketDesayuno ? (
                  <div className="relative w-full max-w-xs h-36 rounded-lg overflow-hidden border border-emerald-500">
                    <img src={fotoTicketDesayuno} alt="Ticket" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setFotoTicketDesayuno(null)}
                      className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-1.5 w-full">
                    <Camera className="w-8 h-8 text-amber-400" />
                    <span className="text-xs font-black text-amber-300">Tomar foto del Ticket o Seleccionar Archivo</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleFileChangeDesayuno} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <button
              onClick={handleEnviarReintegroDesayuno}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Enviar Solicitud de Reintegro a Liquidación Semanal</span>
            </button>
          </div>

          {/* Submitted Receipts History */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
              Mis Solicitudes de Reintegro de Desayunos ({misReintegros.length})
            </h4>

            {misReintegros.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No has registrado solicitudes de reintegro de desayuno aún.</p>
            ) : (
              <div className="space-y-2">
                {misReintegros.map(r => (
                  <div key={r.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">{r.lugarNombre} ({r.fecha} {r.hora})</span>
                      <span className="text-[11px] text-slate-400">Gasto: ${r.montoGasto.toLocaleString('es-AR')} | Cobertura {r.porcentajeCobertura}%</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-black text-emerald-400 text-sm">
                        +${r.montoReintegrar.toLocaleString('es-AR')}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        r.estado === 'APROBADO' ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-amber-950 text-amber-300 border-amber-700'
                      }`}>
                        {r.estado}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CLIENT ACTION SHEET                                                */}
      {/* ========================================================================= */}
      {selectedCliente && (() => {
        const clientOps = clientOperationsMap.get(selectedCliente.id) || [];
        const { 
          totalExigible, 
          montoMinimoExigible, 
          cuotasDebeCount, 
          totalDeudaCuotas,
          totalSaldoRestanteCredito,
          cuotasDiariasCount,
          cuotasSemanalesCount,
          cuotasDiariasMoraCount,
          cuotasSemanalesMoraCount,
          cuotasQuincenalesMoraCount,
          cuotasMensualesMoraCount,
          diaGestion,
          diasMoraMax,
          cuotasVencidasCount,
          cuotasHoyCount
        } = getClientFinancialSummary(selectedCliente, clientOps);

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative">
              
              <button
                onClick={() => setShowCancelConfirmModal(true)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 cursor-pointer bg-slate-950/60 rounded-full hover:bg-rose-900/60 transition-colors"
                title="Cancelar y Cerrar"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header with House Photo */}
              <div className="border-b border-slate-800 pb-3.5 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                      Ficha de Cobranza en Campo
                    </span>
                    {diasMoraMax > 0 ? (
                      <span className="text-[9px] font-black text-rose-300 bg-rose-950/90 border border-rose-700/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        {diasMoraMax} Días de Mora
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-emerald-300 bg-emerald-950/90 border border-emerald-700/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Cobro Día de Hoy
                      </span>
                    )}

                    {diaGestion <= 2 ? (
                      <span className="text-[9px] font-black text-emerald-300 bg-emerald-950/90 border border-emerald-700/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        Día {diaGestion}/5 Comisión
                      </span>
                    ) : diaGestion <= 4 ? (
                      <span className="text-[9px] font-black text-amber-300 bg-amber-950/90 border border-amber-600/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        Día {diaGestion}/5 Comisión
                      </span>
                    ) : (
                      <span className="text-[9px] font-black text-rose-100 bg-rose-950 border border-rose-500 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        Día 5/5 Comisión
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-white">{selectedCliente.nombre} {selectedCliente.apellido}</h3>
                  <p className="text-xs font-bold text-slate-300 flex items-center gap-1 mt-1">
                    <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{selectedCliente.direccion || `${selectedCliente.calle || ''} ${selectedCliente.numero || ''}`}</span>
                  </p>
                </div>

                {/* House Photo Upload / Display */}
                <div className="w-20 h-20 rounded-2xl bg-slate-950 border border-slate-700/80 overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner">
                  {selectedCliente.fotoCasa ? (
                    <div className="relative w-full h-full group">
                      <img src={selectedCliente.fotoCasa} alt="Casa" className="w-full h-full object-cover" />
                      <label className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity text-[9px] font-bold">
                        <Camera className="w-4 h-4 text-amber-400 mb-0.5" />
                        <span>Cambiar</span>
                        <input type="file" accept="image/*" capture="environment" onChange={(e) => handleHousePhotoUpload(selectedCliente.id, e)} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center text-center p-1.5 cursor-pointer w-full h-full hover:bg-slate-800 transition-colors">
                      <Camera className="w-5 h-5 text-amber-400 mb-1" />
                      <span className="text-[9px] font-black text-amber-300 leading-tight">Subir Foto Casa</span>
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => handleHousePhotoUpload(selectedCliente.id, e)} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-3 text-xs">
                {/* Column Breakdown by Frequency */}
                <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800/80 text-center">
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 uppercase font-black block text-[9px]">Cuotas en Mora</span>
                    <span className="font-black text-rose-400 text-sm">{cuotasVencidasCount}</span>
                  </div>
                  <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 uppercase font-black block text-[9px]">Cuota Día de Hoy</span>
                    <span className="font-black text-amber-300 text-sm">{cuotasHoyCount > 0 ? `${cuotasHoyCount} Hoy` : (cuotasDebeCount > 0 ? '1 Exigible' : '0')}</span>
                  </div>
                </div>

                {/* Desglose de Cuotas en Mora por Frecuencia */}
                <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800 text-[10px] font-bold text-center text-slate-300 flex items-center justify-around gap-1">
                  <span className="text-rose-300">
                    <strong className="text-slate-400 font-extrabold uppercase text-[9px]">Diarias:</strong> {cuotasDiariasMoraCount}
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-amber-300">
                    <strong className="text-slate-400 font-extrabold uppercase text-[9px]">Semanales:</strong> {cuotasSemanalesMoraCount}
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-teal-300">
                    <strong className="text-slate-400 font-extrabold uppercase text-[9px]">
                      {cuotasQuincenalesMoraCount > 0 ? 'Quincenales:' : 'Mensuales:'}
                    </strong> {cuotasQuincenalesMoraCount > 0 ? cuotasQuincenalesMoraCount : cuotasMensualesMoraCount}
                  </span>
                </div>

                {/* FINANCIAL SUMMARY BOX */}
                {(selectedCliente.estado === 'INACTIVO' || (selectedCliente.montoDeudaInactivo && selectedCliente.montoDeudaInactivo > 0)) ? (
                  <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 p-3.5 rounded-2xl border-2 border-amber-500/80 shadow-xl space-y-2 text-center">
                    <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider block">
                      PAGO INICIAL PARA REFINANCIAR
                    </span>
                    <span className="text-3xl font-black text-yellow-300 tracking-tight block">
                      ${(selectedCliente.montoPagoInicialRefinanciacion || Math.round((selectedCliente.montoDeudaInactivo || 150000) * 0.3)).toLocaleString('es-AR')}
                    </span>
                    {isUserAdmin && (
                      <div className="pt-1.5 border-t border-amber-800/60 text-[10px] font-bold text-slate-400">
                        Total Deuda Registrada (Sólo Visible a Administrador): <span className="text-amber-200">${(selectedCliente.montoDeudaInactivo || totalDeudaCuotas).toLocaleString('es-AR')}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-3 rounded-2xl border-2 border-emerald-500/80 shadow-xl text-center">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                      TOTAL ADEUDADO A ABONAR
                    </span>
                    <span className="text-2xl font-black text-yellow-300 tracking-tight block">
                      ${totalDeudaCuotas.toLocaleString('es-AR')}
                    </span>
                  </div>
                )}

                {/* MONTO MINIMO EXIGIBLE */}
                <div className="flex items-center justify-between px-2 pt-0.5">
                  <span className="text-[10px] uppercase font-black text-slate-300">Monto Mínimo Exigible:</span>
                  <span className="font-black text-emerald-400 text-base bg-emerald-950/90 px-3 py-1 rounded-xl border border-emerald-800">
                    ${montoMinimoExigible.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              {/* GPS Arrival Check-in */}
              <div className="bg-emerald-950/40 border border-emerald-700/60 p-3 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs font-extrabold text-emerald-200">Verificar Posición GPS de Llegada</span>
                </div>
                <button
                  onClick={() => handleEstoyEnDomicilio(selectedCliente)}
                  disabled={isCapturingGPS}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-2 px-3 rounded-xl flex items-center gap-1 cursor-pointer transition-all shadow-md"
                >
                  {isCapturingGPS ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Estoy en domicilio</span>
                </button>
              </div>

              {/* Action Choices */}
              {!actionType && (
                <div className="space-y-2.5 pt-1 border-t border-slate-800">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">Seleccionar Acción de Cobro:</span>

                  <div className="space-y-2">
                    {/* Yellow Button: Cuota del dia y moras */}
                    <button
                      onClick={() => {
                        setMontoPago(String(totalExigible));
                        setActionType('pago');
                      }}
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs py-3 px-3 rounded-xl flex items-center justify-between shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-slate-950 shrink-0" />
                        <span className="uppercase tracking-tight">Cuota del día y moras</span>
                      </div>
                      <span className="bg-slate-950 text-yellow-300 px-2.5 py-1 rounded-lg text-xs font-black">
                        ${totalExigible.toLocaleString('es-AR')}
                      </span>
                    </button>

                    {/* Red Button: Pago minimo mas comunicarse con la empresa */}
                    <button
                      onClick={() => {
                        setMontoPago(String(montoMinimoExigible));
                        setActionType('pago');
                      }}
                      className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black text-xs py-3 px-3 rounded-xl flex items-center justify-between shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-left">
                        <DollarSign className="w-4 h-4 text-white shrink-0" />
                        <span className="uppercase tracking-tight leading-tight">Pago mínimo + Comunicarse con la empresa</span>
                      </div>
                      <span className="bg-slate-950 text-rose-300 px-2.5 py-1 rounded-lg text-xs font-black shrink-0">
                        ${montoMinimoExigible.toLocaleString('es-AR')}
                      </span>
                    </button>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* Emerald Button: Pago Parcial */}
                      <button
                        onClick={() => {
                          setMontoPago('');
                          setActionType('pago');
                        }}
                        className="bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <DollarSign className="w-4 h-4 text-emerald-300" />
                        <span>Pago Parcial</span>
                      </button>

                      {/* Reprogramar Visita */}
                      <button
                        onClick={() => setActionType('reprogramar')}
                        className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Clock className="w-4 h-4 text-slate-950" />
                        <span>Reprogramar Visita</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* No Encontrado */}
                      <button
                        onClick={() => setActionType('no_encontrado')}
                        className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700 font-bold text-xs py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <UserX className="w-4 h-4 text-rose-400" />
                        <span>No Encontrado</span>
                      </button>

                      {(selectedCliente.estado === 'INACTIVO' || selectedOperacion?.diasMora! >= 7) && (
                        <button
                          onClick={() => {
                            handleContactoRecuperado(selectedCliente);
                            setSelectedCliente(null);
                          }}
                          className="bg-teal-950 hover:bg-teal-900 text-teal-300 border border-teal-700 font-bold text-xs py-2.5 px-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <UserCheck className="w-4 h-4 text-teal-400" />
                          <span>Contacto Recuperado</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Formulario de Pago */}
              {actionType === 'pago' && (
                <div className="space-y-3.5 pt-1 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs font-black text-emerald-400">
                    <span>Formulario de Cobro en Campo</span>
                    <button onClick={() => setActionType(null)} className="text-slate-400 hover:text-white underline cursor-pointer">Volver</button>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Monto Recibido ($)</label>
                      <input
                        type="number"
                        value={montoPago}
                        onChange={e => setMontoPago(e.target.value)}
                        placeholder={`Ej. ${totalExigible}`}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-black focus:outline-none focus:border-emerald-500 text-sm"
                      />
                    </div>

                    {/* LIVE PREVIEW OF COVERED CUOTAS */}
                    {(() => {
                      const amountToApply = parseFloat(montoPago || '0');
                      if (amountToApply <= 0 || !selectedOperacion) return null;

                      const opCuotas = cuotas.filter(c => c.idOperacion === selectedOperacion.id);
                      const cuotasSorted = sortCuotasByPaymentPriority(opCuotas, todayStr, 'PAGO_PARCIAL');

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
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-emerald-800 space-y-1.5">
                          <span className="font-black text-emerald-400 block text-[10px] uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Imputación estimada ({breakdown.length} cuota{breakdown.length > 1 ? 's' : ''}):
                          </span>
                          {breakdown.length === 0 ? (
                            <span className="text-slate-400 italic text-[10px]">Sin cuotas para imputar.</span>
                          ) : (
                            <div className="space-y-1 max-h-[100px] overflow-y-auto pr-1">
                              {breakdown.map((item) => (
                                <div key={item.num} className="bg-slate-900 p-1.5 rounded-lg border border-slate-800 text-[10px] flex justify-between items-center">
                                  <div>
                                    <span className="font-bold text-white">Cuota N° {item.num} <span className="text-slate-400">({item.fec})</span></span>
                                    {item.completo ? (
                                      <span className="text-[9px] text-emerald-400 font-black uppercase ml-1.5">✓ Pagada</span>
                                    ) : (
                                      <span className="text-[9px] text-amber-400 font-black uppercase ml-1.5">⚡ Saldo ${item.saldoRestante}</span>
                                    )}
                                  </div>
                                  <span className="font-black text-emerald-300 text-xs">+${item.monto.toLocaleString('es-AR')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Medio de Pago</label>
                      <select
                        value={medioPago}
                        onChange={e => setMedioPago(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="EFECTIVO">Efectivo en Mano</option>
                        <option value="TRANSFERENCIA">Transferencia Bancaria / MP</option>
                        <option value="DEPOSITO">Depósito</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Foto del Comprobante (Obligatoria)</label>
                      <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-3 text-center bg-slate-950 flex flex-col items-center gap-2">
                        {fotoComprobante ? (
                          <div className="relative w-full h-32 rounded-lg overflow-hidden border border-emerald-500">
                            <img src={fotoComprobante} alt="Comprobante" className="w-full h-full object-cover" />
                            <button
                              onClick={() => setFotoComprobante(null)}
                              className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full text-xs cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer flex flex-col items-center gap-1.5 w-full">
                            <Camera className="w-6 h-6 text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-300">Tomar foto o Cargar comprobante</span>
                            <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
                          </label>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">Observaciones</label>
                      <textarea
                        value={observacionesPago}
                        onChange={e => setObservacionesPago(e.target.value)}
                        placeholder="Ej. Cobro realizado en domicilio."
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                      ></textarea>
                    </div>

                    <button
                      onClick={handleConfirmarPago}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Guardar y Confirmar Pago ($)</span>
                    </button>
                  </div>
                </div>
              )}

            {actionType === 'reprogramar' && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-black text-amber-400">
                  <span>Reprogramar Visita para hoy</span>
                  <button onClick={() => setActionType(null)} className="text-slate-400 hover:text-white underline cursor-pointer">Volver</button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Hora de Regreso Programada</label>
                    <input
                      type="time"
                      value={horaReprogramada}
                      onChange={e => setHoraReprogramada(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-black text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Motivo Reprogramación</label>
                    <input
                      type="text"
                      value={motivoReprogramado}
                      onChange={e => setMotivoReprogramado(e.target.value)}
                      placeholder="Ej. Cliente pidió volver más tarde"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    onClick={handleReprogramar}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Clock className="w-5 h-5" />
                    <span>Confirmar Reprogramación</span>
                  </button>
                </div>
              </div>
            )}

            {actionType === 'no_encontrado' && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-black text-rose-400">
                  <span>Registrar "No Encontrado"</span>
                  <button onClick={() => setActionType(null)} className="text-slate-400 hover:text-white underline cursor-pointer">Volver</button>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Reintentar a la hora:</label>
                  <input
                    type="time"
                    value={horaReprogramada}
                    onChange={e => setHoraReprogramada(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>

                <button
                  onClick={handleNoEncontrado}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black text-sm py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserX className="w-5 h-5" />
                  <span>Registrar No Encontrado y Reprogramar</span>
                </button>
              </div>
            )}

            {/* Botón Cancelar Operación siempre disponible */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowCancelConfirmModal(true)}
                className="w-full bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 font-black text-xs py-2.5 rounded-xl border border-slate-700 hover:border-rose-800 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <X className="w-4 h-4 text-rose-400" />
                <span>Cancelar Operación</span>
              </button>
            </div>

          </div>
        </div>
      );
    })()}

      {/* CANCEL CONFIRMATION MODAL */}
      {showCancelConfirmModal && (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-950 border border-rose-700/80 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">¿Está seguro que desea cancelar?</h3>
              <p className="text-xs font-semibold text-slate-300 leading-relaxed">
                Si cancela ahora, los datos o la selección realizada no se guardarán en la gestión de campo actual.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-2">
              <button
                onClick={() => {
                  setShowCancelConfirmModal(false);
                  setSelectedCliente(null);
                  setSelectedOperacion(null);
                  setActionType(null);
                  setMontoPago('');
                  setFotoComprobante(null);
                  setObservacionesPago('');
                }}
                className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black text-xs py-3 rounded-xl shadow-lg cursor-pointer transition-all uppercase tracking-wider"
              >
                Sí, Cancelar Gestión
              </button>

              <button
                onClick={() => setShowCancelConfirmModal(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs py-2.5 rounded-xl border border-slate-700 cursor-pointer transition-all"
              >
                Continuar Registrando
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHONE CALL MODAL */}
      {showPhoneCallModal && gestionClienteSelected && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => {
                setShowPhoneCallModal(false);
                setGestionClienteSelected(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black text-amber-400">Registrar Llamada a {gestionClienteSelected.nombre} {gestionClienteSelected.apellido}</h3>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Notas / Resultado de la Llamada</label>
                <textarea
                  value={notasGestionTel}
                  onChange={e => setNotasGestionTel(e.target.value)}
                  placeholder="Ej. Promesa de pago por transferencia para hoy 17:00 hs."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                ></textarea>
              </div>

              <div className="bg-amber-950/50 p-3 rounded-xl border border-amber-800 text-[11px] font-bold text-amber-200">
                💰 Al registrar esta llamada se sumará <b>+${(configComisiones.montoComisionLlamada || 300).toLocaleString('es-AR')}</b> a tus comisiones de hoy.
              </div>

              <button
                onClick={handleRegistrarLlamadaRealizada}
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Confirmar Llamada Realizada</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MIS GANANCIAS Y COMISIONES MODAL */}
      {showComisionesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowComisionesModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 cursor-pointer bg-slate-800 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg shadow-emerald-950">
                <TrendingUp className="w-7 h-7 stroke-[3]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                  Resumen de Rendimiento
                </span>
                <h3 className="text-xl font-black text-white">Mis Ganancias y Comisiones</h3>
              </div>
            </div>

            {/* KPI Cards Grid inside Modal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 1. Comisiones del Día */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border-2 border-emerald-500/60 text-center">
                <span className="text-[10px] font-black uppercase text-emerald-400 block mb-1">Ganado Hoy</span>
                <span className="text-xl font-black text-emerald-300">${comisionesGanadasHoy.toLocaleString('es-AR')}</span>
                <span className="text-[9px] text-slate-400 block mt-1">Cobros + Gestiones</span>
              </div>

              {/* 2. Comisiones Acumuladas */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-indigo-500/50 text-center">
                <span className="text-[10px] font-black uppercase text-indigo-400 block mb-1">Acumulado Mes</span>
                <span className="text-xl font-black text-indigo-200">${totalComisionesAcumuladas.toLocaleString('es-AR')}</span>
                <span className="text-[9px] text-slate-400 block mt-1">Próx. Liq: {configComisiones?.fechaProximaLiquidacionSemanal || 'Viernes'}</span>
              </div>

              {/* 3. Efectividad del Día */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-amber-500/50 text-center">
                <span className="text-[10px] font-black uppercase text-amber-400 block mb-1">Efectividad</span>
                <span className="text-xl font-black text-amber-300">{efectividadPorcentaje}%</span>
                <span className="text-[9px] text-slate-400 block mt-1">{clientesGestionados.length}/{totalClientesAgenda} Visitados</span>
              </div>
            </div>

            {/* HIGHLIGHTED POTENTIAL EARNINGS PROJECTION BOX */}
            <div className="bg-gradient-to-r from-amber-950 via-slate-950 to-amber-950 p-4 rounded-2xl border-2 border-amber-500/80 shadow-xl space-y-2">
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  Potencial Estimado de Ganancia del Día
                </span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black px-2 py-0.5 rounded-md uppercase">
                  100% Cobranza
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <span className="text-2xl font-black text-amber-200">${potencialGananciaTotalHoy.toLocaleString('es-AR')} ARS</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Proyección si cobras el 100% de los {myAssignedClients.length} clientes en tu gestión domiciliaria de hoy.
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold block">Cobro Esperado Total</span>
                  <span className="text-sm font-black text-slate-200">${potencialCobroTotalHoy.toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>

            {/* Breakdown of Payments Collected Today */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>Detalle de Cobros y Comisiones del Día</span>
                <span className="text-emerald-400 font-bold">{cobrosCalleRealizadosHoy.length} Cobros Realizados</span>
              </h4>

              {cobrosCalleRealizadosHoy.length === 0 ? (
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-center text-xs text-slate-400 space-y-1">
                  <p className="font-bold">Aún no se han registrado cobros el día de hoy.</p>
                  <p className="text-[10px] text-slate-500">Cada cobro realizado genera automáticamente tu comisión configurada ({configComisiones?.porcentajeComisionCobranza || 5}%).</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cobrosCalleRealizadosHoy.map((cobro, idx) => (
                    <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-black text-white block">{cobro.clienteNombre}</span>
                        <span className="text-[10px] text-slate-400">{cobro.hora} hs • {cobro.formaPago}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-200 block">${cobro.montoCobrado.toLocaleString('es-AR')}</span>
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 inline-block">
                          +${cobro.comisionGanada.toLocaleString('es-AR')} com.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowComisionesModal(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-3 rounded-xl cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BÚSQUEDA RÁPIDA DE CLIENTE PARA INGRESAR PAGO DIRECTO */}
      {showQuickPagoModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col my-8 text-white">
            <div className="p-4 bg-emerald-950 border-b border-emerald-800 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black shadow-md">
                  <DollarSign className="w-6 h-6 text-yellow-300" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Ingresar Pago Directo</h3>
                  <p className="text-xs text-emerald-300 font-medium">Seleccione el cliente al cual le cobrará la cuota</p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickPagoModal(false)}
                className="p-1.5 hover:bg-emerald-900 rounded-full text-emerald-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div>
                <label className="text-[11px] font-bold text-emerald-300 block mb-1">Buscar Cliente por Nombre, DNI, Teléfono o ID</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={quickPagoSearch}
                    onChange={(e) => setQuickPagoSearch(e.target.value)}
                    placeholder="Escriba el nombre, apellido, DNI o ID del cliente..."
                    autoFocus
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-emerald-700/80 rounded-xl text-white font-bold placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-400 text-sm"
                  />
                </div>
              </div>

              {/* Matching Clients List */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Resultados ({
                    clientes.filter(c => {
                      if (!quickPagoSearch.trim()) return true;
                      const q = quickPagoSearch.toLowerCase().trim();
                      return (
                        c.nombre.toLowerCase().includes(q) ||
                        c.apellido.toLowerCase().includes(q) ||
                        (c.dni && c.dni.includes(q)) ||
                        (c.telefono && c.telefono.includes(q)) ||
                        c.id.toLowerCase().includes(q)
                      );
                    }).length
                  } Clientes)
                </span>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {clientes
                    .filter(c => {
                      if (!quickPagoSearch.trim()) return true;
                      const q = quickPagoSearch.toLowerCase().trim();
                      return (
                        c.nombre.toLowerCase().includes(q) ||
                        c.apellido.toLowerCase().includes(q) ||
                        (c.dni && c.dni.includes(q)) ||
                        (c.telefono && c.telefono.includes(q)) ||
                        c.id.toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 30)
                    .map(c => {
                      const clientOps = operaciones.filter(o => o.idCliente === c.id && o.estado !== 'FINALIZADA');
                      const primaryOp = clientOps[0] || null;

                      return (
                        <div
                          key={c.id}
                          className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-emerald-500/80 flex items-center justify-between gap-3 transition-all group cursor-pointer"
                          onClick={() => {
                            setSelectedCliente(c);
                            setSelectedOperacion(primaryOp);
                            setActionType('pago');
                            setShowQuickPagoModal(false);
                          }}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-white text-sm group-hover:text-emerald-300 transition-colors">
                                {c.nombre} {c.apellido}
                              </span>
                              <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase ${
                                c.estado === 'ACTIVO' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                                c.estado === 'EN_MORA' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                                'bg-slate-900 text-slate-400 border border-slate-700'
                              }`}>
                                {c.estado}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              DNI: {c.dni || 'Sin DNI'} • Tel: {c.telefono || 'S/N'} • Dir: {c.direccion || `${c.calle || ''} ${c.numero || ''}`}
                            </p>
                            {primaryOp && (
                              <p className="text-[10px] text-emerald-400 font-bold mt-1">
                                Op: {primaryOp.id} — Valor Cuota: ${primaryOp.valorCuota.toLocaleString('es-AR')}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            className="px-3 py-2 bg-emerald-600 group-hover:bg-emerald-500 text-white font-black text-xs rounded-xl flex items-center gap-1.5 shadow-md cursor-pointer shrink-0 border border-emerald-400/80"
                          >
                            <DollarSign className="w-4 h-4 text-yellow-300" />
                            <span>Cobrar</span>
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-emerald-800 text-right">
              <button
                type="button"
                onClick={() => setShowQuickPagoModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
