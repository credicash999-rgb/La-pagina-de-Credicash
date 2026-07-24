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
import { 
  MapPin, DollarSign, Calendar, Clock, CheckCircle2, 
  Phone, MessageCircle, Navigation, TrendingUp, 
  Camera, ChevronRight, UserX, RefreshCw, Check, 
  X, UserCheck, Play, Compass, Coffee, Send, PhoneCall
} from 'lucide-react';

interface CobradorCampoViewProps {
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
  clientes: Cliente[];
  activeUser: UsuarioRol | null;
  configComisiones: ConfiguracionComisiones;
  configRecorrido: ConfiguracionRecorrido;
  comisiones: ComisionCobrador[];
  visitasHistory: VisitaDomicilio[];
  visitasReprogramadas: VisitaReprogramada[];
  reintegrosDesayuno?: SolicitudReintegroDesayuno[];
  onAddPago: (pago: Pago, updatedCuotas: Cuota[], updatedOperacion: Operacion, tesoreriaTrx: TransaccionTesoreria) => void;
  onRegistrarVisita: (visita: VisitaDomicilio) => void;
  onReprogramarVisita: (reprogramacion: VisitaReprogramada) => void;
  onRegistrarContactoRecuperado: (idCliente: string, cobradorId: string) => void;
  onRegistrarGestionTelefonica?: (idCliente: string, tipo: 'LLAMADA' | 'MENSAJE', observaciones: string) => void;
  onSolicitarReintegroDesayuno?: (solicitud: SolicitudReintegroDesayuno) => void;
}

export default function CobradorCampoView({
  operaciones,
  cuotas,
  pagos,
  clientes,
  activeUser,
  configComisiones,
  configRecorrido,
  comisiones,
  visitasHistory,
  visitasReprogramadas,
  reintegrosDesayuno = [],
  onAddPago,
  onRegistrarVisita,
  onReprogramarVisita,
  onRegistrarContactoRecuperado,
  onRegistrarGestionTelefonica,
  onSolicitarReintegroDesayuno
}: CobradorCampoViewProps) {
  // Navigation tabs (4 clean field collector tabs)
  const [activeTab, setActiveTab] = useState<'gestion_diaria' | 'gestion_telefonica' | 'mi_recorrido' | 'reintegro_desayuno'>('gestion_diaria');

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

  // Filter clients assigned strictly to active collector
  const isCobrador = activeUser?.rolId === 'COBRADOR';
  const myAssignedClients = clientes.filter(c => {
    if (!isCobrador) return true; // Show all for demo/admin testing
    return c.operadorAsignadoId === activeUser?.id || c.captador === activeUser?.nombre || c.analista === activeUser?.nombre;
  });

  // Get active loans for assigned clients
  const myAssignedOperations = operaciones.filter(o => 
    myAssignedClients.some(c => c.id === o.idCliente) && o.estado === 'ACTIVA'
  );

  // Group operations by client
  const clientOperationsMap = new Map<string, Operacion[]>();
  myAssignedOperations.forEach(op => {
    const list = clientOperationsMap.get(op.idCliente) || [];
    list.push(op);
    clientOperationsMap.set(op.idCliente, list);
  });

  // Determine client status for Field Collector agenda
  const getClienteEstadoField = (cliente: Cliente, ops: Operacion[]) => {
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
      label: 'Cobrar Cuota',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
    };
  };

  // Check visited today
  const todayStr = new Date().toISOString().split('T')[0];
  const isVisitedToday = (idCliente: string) => {
    return visitasHistory.some(v => v.idCliente === idCliente && v.fecha === todayStr);
  };

  // Check rescheduled today
  const getRescheduledToday = (idCliente: string) => {
    return visitasReprogramadas.find(r => r.idCliente === idCliente && r.fechaReprogramada === todayStr && !r.completada);
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

  // Effectiveness %
  const totalClientesAgenda = myAssignedClients.length || 1;
  const efectividadPorcentaje = Math.round((clientesGestionados.length / totalClientesAgenda) * 100);

  // Time Estimation for Route (15 minutes maximum pause per client)
  const clientesTotalesAVisitar = clientesPendientes.length + clientesVisitasPendientesReprogramadas.length;
  const minutosAtencionClientes = clientesTotalesAVisitar * 15; // 15 min por cliente
  const minutosTrasladoEstimados = Math.max(15, clientesTotalesAVisitar * 12);
  const minutosTotalesRecorrido = minutosAtencionClientes + minutosTrasladoEstimados;
  const hsRecorrido = Math.floor(minutosTotalesRecorrido / 60);
  const minsRecorrido = minutosTotalesRecorrido % 60;
  const tiempoEstimadoFormatted = `${hsRecorrido}h ${minsRecorrido}m`;

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
    if (!selectedCliente || !selectedOperacion) return;
    const monto = parseFloat(montoPago);
    if (isNaN(monto) || monto <= 0) {
      alert('Por favor ingrese un monto válido cobrado.');
      return;
    }

    const gps = await obtenerGPSActual();
    const horaStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const newPago: Pago = {
      id: `PAG-${Date.now().toString().slice(-6)}`,
      idOperacion: selectedOperacion.id,
      idCliente: selectedCliente.id,
      nombreCliente: `${selectedCliente.nombre} ${selectedCliente.apellido}`,
      fechaPago: todayStr,
      horaPago: horaStr,
      importe: monto,
      cobrador: activeUser?.nombre || 'Cobrador de Campo',
      metodoPago: medioPago,
      modalidad: 'PAGO_REGULAR',
      cuotasAfectadas: `Cuota ${selectedOperacion.cuotasPagadas + 1}`,
      observaciones: `${observacionesPago || 'Cobrado en campo'} (GPS: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)})`
    };

    const opCuotas = cuotas.filter(c => c.idOperacion === selectedOperacion.id);
    const updatedCuotas = opCuotas.map(c => {
      if (c.estado === 'PENDIENTE' || c.estado === 'VENCIDA' || c.estado === 'PAGO_PARCIAL') {
        if (monto >= c.valorTotalCuota) {
          return {
            ...c,
            estado: 'PAGADA' as const,
            fechaPago: todayStr,
            importePagado: c.valorTotalCuota,
            saldoPendiente: 0,
            cobrador: activeUser?.nombre || 'Cobrador Campo'
          };
        }
      }
      return c;
    });

    const updatedOperacion: Operacion = {
      ...selectedOperacion,
      capitalRecuperado: selectedOperacion.capitalRecuperado + monto,
      totalPendiente: Math.max(0, selectedOperacion.totalPendiente - monto),
      cuotasPagadas: selectedOperacion.cuotasPagadas + 1,
      cuotasPendientes: Math.max(0, selectedOperacion.cuotasPendientes - 1),
      ultimoPago: todayStr
    };

    const tesoreriaTrx: TransaccionTesoreria = {
      id: `TRX-${Date.now().toString().slice(-6)}`,
      fecha: todayStr,
      tipo: 'INGRESO',
      concepto: `Cobro en Campo - Cliente ${selectedCliente.nombre} ${selectedCliente.apellido} (Crédito ${selectedOperacion.id})`,
      monto: monto,
      referenciaId: newPago.id
    };

    onAddPago(newPago, updatedCuotas, updatedOperacion, tesoreriaTrx);

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
      fotoComprobante: fotoComprobante || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=300&auto=format&fit=crop&q=60',
      observaciones: observacionesPago
    };

    onRegistrarVisita(nuevaVisita);

    showToast(`✅ PAGO REGISTRADO: $${monto.toLocaleString('es-AR')} (${medioPago}). ¡Comisión sumada al instante!`);
    setSelectedCliente(null);
    setSelectedOperacion(null);
    setActionType(null);
    setMontoPago('');
    setFotoComprobante(null);
    setObservacionesPago('');
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

      {/* ========================================================================= */}
      {/* FIXED TOP MOTIVATIONAL & REAL-TIME PERFORMANCE METER                       */}
      {/* ========================================================================= */}
      <div className="sticky top-0 z-30 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-2 border-emerald-500/70 rounded-3xl p-4 md:p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          
          {/* Financial Metrics in Dollars ($) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            
            {/* Real-time Earnings Today in Money ($) */}
            <div className="bg-slate-950/90 p-3 rounded-2xl border-2 border-emerald-500/50 flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-400 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider">Comisión Ganada Hoy</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-xl md:text-2xl font-black text-emerald-300">
                ${comisionesGanadasHoy.toLocaleString('es-AR')}
              </span>
              <span className="text-[9px] text-emerald-400/90 font-bold mt-0.5">Cobros + Llamadas + WhatsApp</span>
            </div>

            {/* Acumulado Total en Comisiones ($) */}
            <div className="bg-slate-950/90 p-3 rounded-2xl border border-indigo-500/40 flex flex-col justify-between">
              <div className="flex items-center justify-between text-indigo-400 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider">Comisiones Acumuladas</span>
                <Calendar className="w-4 h-4 text-indigo-400" />
              </div>
              <span className="text-lg md:text-xl font-black text-indigo-200">
                ${totalComisionesAcumuladas.toLocaleString('es-AR')}
              </span>
              <span className="text-[9px] text-slate-400 mt-0.5">Próx. Liq: {configComisiones?.fechaProximaLiquidacionSemanal || 'Viernes'}</span>
            </div>

            {/* Visitas & Avance */}
            <div className="bg-slate-950/90 p-3 rounded-2xl border border-amber-500/40 flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-400 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider">Efectividad del Día</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl md:text-2xl font-black text-amber-300">{efectividadPorcentaje}%</span>
                <span className="text-[10px] font-bold text-slate-400">({clientesGestionados.length}/{totalClientesAgenda})</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-0.5">Visitas completadas</span>
            </div>

          </div>

          {/* Effectiveness Meter Gauge Bar */}
          <div className="bg-slate-950/90 p-3.5 rounded-2xl border border-slate-700/80 flex flex-col gap-2 min-w-[240px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Meta Diaria de Cobro
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-400">{efectividadPorcentaje}%</span>
              </div>
            </div>

            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(8, efectividadPorcentaje)}%` }}
              ></div>
            </div>

            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold pt-0.5">
              <span>Cartera Día: <b className="text-white">{myAssignedClients.length}</b></span>
              <span>Gestionados: <b className="text-emerald-300">{clientesGestionados.length}</b></span>
              <span className="text-emerald-400 font-black">Comisión del Día Alcanzada: ${comisionesGanadasHoy.toLocaleString('es-AR')}</span>
            </div>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* FIELD COLLECTOR TAB NAVIGATION MENU                                      */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-slate-900 p-2 rounded-2xl border border-slate-800 shadow-md">
        <button
          onClick={() => setActiveTab('gestion_diaria')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'gestion_diaria'
              ? 'bg-emerald-600 text-white shadow-lg border border-emerald-400 ring-2 ring-emerald-500/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4 shrink-0 text-emerald-300" />
          <span className="truncate">1. Gestión Diaria</span>
        </button>

        <button
          onClick={() => setActiveTab('gestion_telefonica')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'gestion_telefonica'
              ? 'bg-emerald-600 text-white shadow-lg border border-emerald-400 ring-2 ring-emerald-500/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <PhoneCall className="w-4 h-4 shrink-0 text-amber-300" />
          <span className="truncate">2. Gestión Telefónica</span>
        </button>

        <button
          onClick={() => setActiveTab('mi_recorrido')}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all cursor-pointer ${
            activeTab === 'mi_recorrido'
              ? 'bg-emerald-600 text-white shadow-lg border border-emerald-400 ring-2 ring-emerald-500/30'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Compass className="w-4 h-4 shrink-0 text-teal-300" />
          <span className="truncate">3. Visualización de Recorrido</span>
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

      {/* ========================================================================= */}
      {/* TAB 1: GESTIÓN DIARIA (AGENDA DE TRABAJO EN CALLE)                        */}
      {/* ========================================================================= */}
      {activeTab === 'gestion_diaria' && (
        <div className="space-y-6">

          {/* Daily Commissions Earned Counter Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-2 border-emerald-500/80 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shrink-0">
                <DollarSign className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block">
                  Comisiones del Día Alcanzadas
                </span>
                <span className="text-xl md:text-2xl font-black text-emerald-300">
                  ${comisionesGanadasHoy.toLocaleString('es-AR')} ARS
                </span>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-bold text-slate-400 block">Cartera de Clientes del Día</span>
              <span className="text-xs font-black text-emerald-400">{myAssignedClients.length} Clientes Asignados</span>
            </div>
          </div>
          
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
                  const cuotasVencidas = ops.reduce((sum, o) => sum + (o.cuotasPendientes || 1), 0);
                  const valorCuotaIndividual = opPrincipal?.valorCuota || 0;
                  const totalExigible = ops.reduce((sum, o) => sum + (o.valorCuota || 0), 0);

                  return (
                    <div 
                      key={cliente.id}
                      className="bg-slate-900 border-2 border-slate-800 hover:border-emerald-500/60 rounded-2xl p-4 space-y-3 flex flex-col justify-between shadow-lg transition-all"
                    >
                      {/* Header: Name & Address */}
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-base font-black text-white leading-tight">
                              {cliente.nombre} {cliente.apellido}
                            </h4>
                            <p className="text-xs font-semibold text-slate-300 flex items-center gap-1 mt-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>{cliente.direccion || `${cliente.calle || 'Av. San Martín'} ${cliente.numero || '123'}`}</span>
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          <span className={`inline-block px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border ${estadoField.badgeClass}`}>
                            {estadoField.label}
                          </span>
                        </div>
                      </div>

                      {/* Required Financial Summary */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-extrabold block">Pendientes</span>
                          <span className="font-black text-rose-400 text-xs">{cuotasVencidas} cuota(s)</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-extrabold block">Valor Cuota</span>
                          <span className="font-bold text-white text-xs">${valorCuotaIndividual.toLocaleString('es-AR')}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-400 uppercase font-extrabold block">Exigible</span>
                          <span className="font-black text-emerald-400 text-xs">${totalExigible.toLocaleString('es-AR')}</span>
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
                          <span>Gestionar</span>
                          <ChevronRight className="w-4 h-4" />
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
      {activeTab === 'mi_recorrido' && (
        <div className="space-y-6">
          
          {/* Estimated Route Time Banner */}
          <div className="bg-slate-900 border-2 border-teal-500/50 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 shrink-0">
                  <Compass className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Recorrido del Día & Tiempo Estimado de Ruta</h3>
                  <p className="text-xs text-slate-300">
                    Punto de Partida: <b className="text-emerald-400">{configRecorrido?.puntoSalida || 'Oficina Central / Shopping Abasto Cafetería'}</b>
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-teal-500/40 flex items-center gap-4 text-xs font-bold">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Atención (15m/cliente)</span>
                  <span className="text-emerald-400 font-black">{minutosAtencionClientes} minutos</span>
                </div>
                <div className="h-6 w-px bg-slate-800"></div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block">Tiempo Total Estimado</span>
                  <span className="text-teal-300 font-black text-sm">{tiempoEstimadoFormatted}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800 leading-relaxed">
              💡 <b>Optimización Inteligente de Ruta:</b> Se ha calculado una pausa máxima estimada de <b>15 minutos por cada cliente</b> en su domicilio para conversar, negociar y registrar el cobro, asegurando que tu jornada cumpla con el tiempo estimado de <b>{tiempoEstimadoFormatted}</b>.
            </p>
          </div>

          {/* Route Map Visualizer Simulation & Waypoint Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            
            <div className="w-full h-56 bg-slate-950 rounded-2xl border-2 border-slate-800 relative overflow-hidden flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
              
              <div className="absolute w-[80%] h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full"></div>

              <div className="relative z-10 w-full flex justify-between items-center px-6">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-lg ring-4 ring-emerald-500/30">
                    ☕ S
                  </div>
                  <span className="text-[10px] font-black text-emerald-400 mt-2">Shopping / Partida</span>
                </div>

                {myAssignedClients.slice(0, 4).map((c, i) => {
                  const visited = isVisitedToday(c.id);
                  return (
                    <div key={`map-pt-${c.id}`} className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-lg ring-4 ${
                        visited 
                          ? 'bg-emerald-500 text-slate-950 ring-emerald-500/30' 
                          : 'bg-amber-500 text-slate-950 ring-amber-500/30'
                      }`}>
                        {i + 1}
                      </div>
                      <span className="text-[10px] font-bold text-white mt-2 max-w-[80px] truncate text-center">
                        {c.nombre}
                      </span>
                    </div>
                  );
                })}

                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black text-xs shadow-lg ring-4 ring-indigo-500/30">
                    R
                  </div>
                  <span className="text-[10px] font-black text-indigo-400 mt-2">Regreso</span>
                </div>
              </div>
            </div>

            {/* List of Route Stops */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Orden de Recorrido Sugerido (15 min por cliente)</h4>
              
              <div className="space-y-2">
                {myAssignedClients.map((c, idx) => {
                  const visited = isVisitedToday(c.id);
                  const rescheduled = getRescheduledToday(c.id);

                  return (
                    <div 
                      key={`stop-${c.id}`}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                        visited 
                          ? 'bg-emerald-950/30 border-emerald-800/60' 
                          : rescheduled 
                          ? 'bg-amber-950/30 border-amber-800/60' 
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                          visited ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                        }`}>
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-white block">{c.nombre} {c.apellido}</span>
                          <span className="text-[11px] text-slate-400">{c.direccion || `${c.calle || 'Calle'} ${c.numero || ''}`}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          ⏱️ 15m est.
                        </span>
                        {visited && <span className="text-[10px] font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">VISITADO</span>}
                        {rescheduled && <span className="text-[10px] font-black text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-700">REPROGRAMADO</span>}

                        <button
                          onClick={() => abrirGoogleMaps(c.direccion || c.calle || '')}
                          className="bg-slate-800 hover:bg-slate-700 text-emerald-300 px-3 py-1.5 rounded-lg border border-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Ir</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}

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
      {selectedCliente && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative">
            
            <button
              onClick={() => {
                setSelectedCliente(null);
                setSelectedOperacion(null);
                setActionType(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider block mb-0.5">
                Ficha de Cobranza en Campo
              </span>
              <h3 className="text-xl font-black text-white">{selectedCliente.nombre} {selectedCliente.apellido}</h3>
              <p className="text-xs font-bold text-slate-300 flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{selectedCliente.direccion || `${selectedCliente.calle || ''} ${selectedCliente.numero || ''}`}</span>
              </p>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black block">Valor Cuota Individual</span>
                <span className="text-base font-black text-white">
                  ${selectedOperacion?.valorCuota?.toLocaleString('es-AR') || '0'}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black block">Total Exigible</span>
                <span className="text-base font-black text-emerald-400">
                  ${selectedOperacion?.valorCuota?.toLocaleString('es-AR') || '0'}
                </span>
              </div>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-700/60 p-3.5 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-xs font-extrabold text-emerald-200">Registrar Posición GPS Llegada</span>
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

            {!actionType && (
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 block">Seleccionar Acción:</span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setActionType('pago')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs p-3 rounded-xl flex flex-col items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <DollarSign className="w-5 h-5 text-white" />
                    <span>Registrar Pago</span>
                  </button>

                  <button
                    onClick={() => setActionType('reprogramar')}
                    className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs p-3 rounded-xl flex flex-col items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <Clock className="w-5 h-5 text-slate-950" />
                    <span>Reprogramar Visita</span>
                  </button>

                  <button
                    onClick={() => setActionType('no_encontrado')}
                    className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700 font-bold text-xs p-3 rounded-xl flex flex-col items-center gap-1.5 cursor-pointer"
                  >
                    <UserX className="w-5 h-5 text-rose-400" />
                    <span>No Encontrado</span>
                  </button>

                  {(selectedCliente.estado === 'INACTIVO' || selectedOperacion?.diasMora! >= 7) && (
                    <button
                      onClick={() => {
                        handleContactoRecuperado(selectedCliente);
                        setSelectedCliente(null);
                      }}
                      className="bg-teal-950 hover:bg-teal-900 text-teal-300 border border-teal-700 font-bold text-xs p-3 rounded-xl flex flex-col items-center gap-1.5 cursor-pointer"
                    >
                      <UserCheck className="w-5 h-5 text-teal-400" />
                      <span>Contacto Recuperado</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {actionType === 'pago' && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
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
                      placeholder={`Ej. ${selectedOperacion?.valorCuota || 5000}`}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-black focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>

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
                            className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full text-xs"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-1.5 w-full">
                          <Camera className="w-6 h-6 text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-300">Tomar foto o Cargar imagen</span>
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

    </div>
  );
}
