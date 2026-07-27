/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Operacion, Cuota, Pago, Cliente, UsuarioRol, 
  ComisionCobrador, VisitaDomicilio, VisitaReprogramada, 
  ConfiguracionComisiones, ConfiguracionRecorrido, TransaccionTesoreria, SolicitudReintegroDesayuno 
} from '../types';
import { sortCuotasByPaymentPriority, generarPlanCuotas } from '../utils/cuotasGenerator';
import { exportDailyRoutePDF } from '../utils/pdfExportRoute';
import { optimizeRouteNearestNeighbor, buildGoogleMapsRouteUrl } from '../utils/routeOptimizer';
import { 
  MapPin, DollarSign, Calendar, Clock, CheckCircle2, 
  Phone, MessageCircle, Navigation, TrendingUp, 
  Camera, ChevronRight, UserX, RefreshCw, Check, 
  X, UserCheck, Play, Compass, Coffee, Send, PhoneCall, Home, AlertTriangle, FileText
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
  comisiones: ComisionCobrador[];
  visitasHistory: VisitaDomicilio[];
  visitasReprogramadas: VisitaReprogramada[];
  reintegrosDesayuno?: SolicitudReintegroDesayuno[];
  initialSubTab?: 'gestion_diaria' | 'gestion_telefonica' | 'mi_recorrido' | 'reintegro_desayuno';
  onAddPago: (pago: Pago, updatedCuotas: Cuota[], updatedOperacion: Operacion, tesoreriaTrx: TransaccionTesoreria) => void;
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
  comisiones,
  visitasHistory,
  visitasReprogramadas,
  reintegrosDesayuno = [],
  initialSubTab,
  onAddPago,
  onRegistrarVisita,
  onReprogramarVisita,
  onRegistrarContactoRecuperado,
  onRegistrarGestionTelefonica,
  onSolicitarReintegroDesayuno,
  onUpdateCliente
}: CobradorCampoViewProps) {
  const isUserAdmin = activeUser?.rolId === 'ADMIN' || activeUser?.rolId === 'SUPERADMIN';
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
    if (!isCobrador) return true;
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

  if (isCobrador && rawAssigned.length === 0) {
    rawAssigned = clientes;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const myAssignedOperations = operaciones.filter(o => {
    if (o.estado === 'FINALIZADA' || o.estado === 'REFINANCIADA') return false;
    const isAssigned = rawAssigned.some(c => c.id === o.idCliente);
    return isAssigned;
  });

  const myAssignedClients = rawAssigned.filter(c => {
    if (c.estado === 'EVASIVO' || c.estado === 'EN_MORA' || c.estado === 'ACTIVO') return true;
    if (c.estado === 'INACTIVO' || (c.montoDeudaInactivo && c.montoDeudaInactivo > 0)) return true;
    const clientOps = myAssignedOperations.filter(o => o.idCliente === c.id);
    const isRescheduledToday = visitasReprogramadas.some(r => r.idCliente === c.id && r.fechaReprogramada === todayStr && !r.completada);
    return clientOps.length > 0 || isRescheduledToday || rawAssigned.length <= 10;
  });

  const clientOperationsMap = new Map<string, Operacion[]>();
  myAssignedOperations.forEach(op => {
    const list = clientOperationsMap.get(op.idCliente) || [];
    list.push(op);
    clientOperationsMap.set(op.idCliente, list);
  });

  const getClientFinancialSummary = (cliente: Cliente, ops: Operacion[]) => {
    let totalExigible = 0;
    let cuotasDebeCount = 0;
    let totalDeudaCuotas = 0;
    let totalSaldoRestanteCredito = 0;
    let cuotasDiariasCount = 0;
    let cuotasSemanalesCount = 0;
    let cuotasOtrasCount = 0;
    let diasMoraMax = 0;
    let cuotasVencidasCount = 0;
    let cuotasHoyCount = 0;

    ops.forEach(op => {
      let opCuotas = cuotas.filter(c => c.idOperacion === op.id && c.estado !== 'PAGADA');

      if (opCuotas.length === 0 && op.estado !== 'FINALIZADA' && op.estado !== 'REFINANCIADA') {
        opCuotas = generarPlanCuotas(op, []).filter(c => c.estado !== 'PAGADA');
      }

      const sumAllCuotas = opCuotas.reduce((s, c) => s + (c.saldoPendiente > 0 ? c.saldoPendiente : c.valorTotalCuota || op.valorCuota || 0), 0);
      totalSaldoRestanteCredito += sumAllCuotas;

      const overdue = opCuotas.filter(c => c.fechaVencimiento < todayStr);
      const dueToday = opCuotas.filter(c => c.fechaVencimiento === todayStr);

      cuotasVencidasCount += overdue.length;
      cuotasHoyCount += dueToday.length;

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
      montoMinimoExigible = Math.round(totalExigible * 0.5);
    }

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
      diaGestion,
      diasMoraMax,
      cuotasVencidasCount,
      cuotasHoyCount
    };
  };

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

  const isVisitedToday = (idCliente: string) => {
    const hasActivePagoToday = pagos.some(p => p.idCliente === idCliente && p.fechaPago === todayStr);
    if (hasActivePagoToday) return true;

    const hasNonPaymentVisit = visitasHistory.some(v => 
      v.idCliente === idCliente && 
      v.fecha === todayStr && 
      v.tipoAccion !== 'PAGO_REGISTRADO'
    );
    return hasNonPaymentVisit;
  };

  const getRescheduledToday = (idCliente: string) => {
    return visitasReprogramadas.find(r => r.idCliente === idCliente && r.fechaReprogramada === todayStr && !r.completada);
  };

  const clientesPendientes = myAssignedClients.filter(c => !isVisitedToday(c.id) && !getRescheduledToday(c.id));
  const clientesVisitasPendientesReprogramadas = myAssignedClients.filter(c => getRescheduledToday(c.id));
  const clientesGestionados = myAssignedClients.filter(c => isVisitedToday(c.id));

  const myComisiones = comisiones.filter(c => !isCobrador || c.cobradorId === activeUser?.id);
  const myComisionesHoy = myComisiones.filter(c => c.fecha === todayStr);

  const comisionesGanadasHoy = myComisionesHoy.reduce((sum, c) => sum + c.montoComision, 0);

  const totalComisionesAcumuladas = myComisiones.reduce((sum, c) => sum + c.montoComision, 0);

  const cobrosCalleRealizadosHoy = myComisionesHoy.map(c => ({
    clienteNombre: c.nombreCliente || 'Cliente',
    hora: 'Hoy',
    formaPago: c.tipoComision === 'COBRANZA' ? 'Efectivo / Calle' : (c.tipoComision || 'Gestión'),
    montoCobrado: c.montoCobrado || 0,
    comisionGanada: c.montoComision || 0
  }));

  const totalClientesAgenda = myAssignedClients.length || 1;
  const efectividadPorcentaje = Math.round((clientesGestionados.length / totalClientesAgenda) * 100);

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

  const clientesTotalesAVisitar = clientesPendientes.length + clientesVisitasPendientesReprogramadas.length;
  const minutosAtencionClientes = clientesTotalesAVisitar * 15;
  const minutosTrasladoEstimados = Math.max(15, clientesTotalesAVisitar * 12);
  const minutosTotalesRecorrido = minutosAtencionClientes + minutosTrasladoEstimados;
  const hsRecorrido = Math.floor(minutosTotalesRecorrido / 60);
  const minsRecorrido = minutosTotalesRecorrido % 60;
  const tiempoEstimadoFormatted = `${hsRecorrido}h ${minsRecorrido}m`;

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

  const abrirGoogleMaps = (direccion: string) => {
    if (!direccion) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 font-sans text-slate-100 pb-20">
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-slate-950 font-black px-5 py-3 rounded-2xl shadow-2xl border-2 border-emerald-300 flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-6 h-6 shrink-0 text-slate-950" />
          <span className="text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Persistent Top Long Bar */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-2 border-emerald-500/80 rounded-3xl p-4 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0 shadow-lg">
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

                <div className="flex flex-col sm:items-end gap-1.5">
                  <div className="bg-teal-950/80 border border-teal-500/50 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 text-teal-300 text-[11px] font-bold">
                    <Clock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>Tiempo Estimado Recorrido: <strong className="text-white font-black">{tiempoEstimadoFormatted}</strong></span>
                  </div>

                  <div className="bg-amber-950/70 border border-amber-500/60 px-3 py-1 rounded-xl flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase text-amber-300">Ganancia Potencial Hoy:</span>
                    <span className="text-sm font-black text-amber-200">${potencialGananciaTotalHoy.toLocaleString('es-AR')} ARS</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(6, efectividadPorcentaje)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            {isUserAdmin && (
              <button
                onClick={handleExportarPDFHojaRuta}
                className="bg-red-700 hover:bg-red-600 text-white font-black text-xs px-3.5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer uppercase tracking-wider shrink-0 border border-red-400"
              >
                <FileText className="w-4 h-4 text-white shrink-0" />
                <span>Exportar PDF Hoja de Ruta (Admin)</span>
              </button>
            )}

            <button
              onClick={() => setShowComisionesModal(true)}
              className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg cursor-pointer uppercase tracking-wider shrink-0"
            >
              <TrendingUp className="w-4 h-4 stroke-[3]" />
              <span>Mis Ganancias y Comisiones</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-md items-center">
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

        <button
          disabled={true}
          className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl font-bold text-[10px] bg-slate-950/80 border border-slate-800 text-slate-500 cursor-not-allowed opacity-50 shadow-inner"
        >
          <PhoneCall className="w-3.5 h-3.5 shrink-0 text-slate-600" />
          <span className="truncate">2. Gestión Telefónica (Deshabilitada)</span>
        </button>

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

      {/* Tab Contents */}
      {activeTab === 'gestion_diaria' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Clientes Asignados para Cobro Diario ({clientesPendientes.length} pendientes)</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientesPendientes.map(cliente => {
              const ops = clientOperationsMap.get(cliente.id) || [];
              const opPrincipal = ops[0];
              const { totalDeudaCuotas, montoMinimoExigible, cuotasVencidasCount, cuotasHoyCount } = getClientFinancialSummary(cliente, ops);

              return (
                <div key={cliente.id} className="bg-slate-900 border-2 border-slate-800 hover:border-emerald-500/60 rounded-2xl p-4 space-y-3 flex flex-col justify-between shadow-lg">
                  <div>
                    <h4 className="text-base font-black text-white">{cliente.nombre} {cliente.apellido}</h4>
                    <p className="text-xs font-semibold text-slate-300 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{cliente.direccion || `${cliente.calle || ''} ${cliente.numero || ''}`}</span>
                    </p>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2 text-xs">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-slate-900 p-2 rounded-xl">
                        <span className="text-slate-400 uppercase font-black block text-[9px]">En Mora</span>
                        <span className="font-black text-rose-400 text-sm">{cuotasVencidasCount}</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-xl">
                        <span className="text-slate-400 uppercase font-black block text-[9px]">Día Hoy</span>
                        <span className="font-black text-amber-300 text-sm">{cuotasHoyCount}</span>
                      </div>
                    </div>

                    <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-500/80 text-center">
                      <span className="text-[9px] font-black text-emerald-300 uppercase block">TOTAL ADEUDADO A ABONAR</span>
                      <span className="text-xl font-black text-yellow-300">${totalDeudaCuotas.toLocaleString('es-AR')}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedCliente(cliente);
                      setSelectedOperacion(opPrincipal || null);
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Ingresar Pagos / Gestionar</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: Ingresar Pagos / Action Sheet */}
      {selectedCliente && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedCliente(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 cursor-pointer bg-slate-950/60 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-black text-white">{selectedCliente.nombre} {selectedCliente.apellido}</h3>
            <p className="text-xs font-bold text-slate-300">{selectedCliente.direccion}</p>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Monto Recibido ($)</label>
                <input
                  type="number"
                  value={montoPago}
                  onChange={e => setMontoPago(e.target.value)}
                  placeholder="Ingrese el monto"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-black text-sm"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Medio de Pago</label>
                <select
                  value={medioPago}
                  onChange={e => setMedioPago(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-bold"
                >
                  <option value="EFECTIVO">Efectivo en Mano</option>
                  <option value="TRANSFERENCIA">Transferencia Bancaria / MP</option>
                  <option value="DEPOSITO">Depósito</option>
                </select>
              </div>

              <button
                onClick={handleConfirmarPago}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm py-3 rounded-xl shadow-lg cursor-pointer"
              >
                Confirmar Pago ($)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
