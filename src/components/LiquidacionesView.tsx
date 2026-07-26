/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  UsuarioRol, ConfiguracionComisiones, LiquidacionSemanal, LiquidacionMensual, 
  ComisionCobrador 
} from '../types';
import { 
  FileText, DollarSign, Calendar, CheckCircle2, Clock, Printer, 
  Download, Send, Settings, ShieldCheck, UserCheck, Plus, Trash2, 
  ChevronRight, Award, Layers, AlertCircle, Edit, Save, Check, Filter,
  Cloud, Upload, RefreshCw, Smartphone, Monitor, Database
} from 'lucide-react';
import { 
  uploadAllToFirestore, 
  downloadAllFromFirestore, 
  isFirebaseEnabled,
  generateShareableFirebaseLink
} from '../lib/firebaseSync';

interface LiquidacionesViewProps {
  usuarios: UsuarioRol[];
  activeUser: UsuarioRol | null;
  configComisiones: ConfiguracionComisiones;
  comisiones: ComisionCobrador[];
  liquidacionesSemanales: LiquidacionSemanal[];
  liquidacionesMensuales: LiquidacionMensual[];
  onUpdateConfigComisiones: (newConfig: ConfiguracionComisiones) => void;
  onAddLiquidacionSemanal: (liq: LiquidacionSemanal) => void;
  onAddLiquidacionMensual: (liq: LiquidacionMensual) => void;
  onUpdateEstadoSemanal: (id: string, nuevoEstado: 'PENDIENTE' | 'APROBADA' | 'PAGADA') => void;
  onUpdateEstadoMensual: (id: string, nuevoEstado: 'PENDIENTE' | 'APROBADA' | 'PAGADA') => void;
}

export default function LiquidacionesView({
  usuarios,
  activeUser,
  configComisiones,
  comisiones,
  liquidacionesSemanales,
  liquidacionesMensuales,
  onUpdateConfigComisiones,
  onAddLiquidacionSemanal,
  onAddLiquidacionMensual,
  onUpdateEstadoSemanal,
  onUpdateEstadoMensual,
}: LiquidacionesViewProps) {
  // Navigation tabs inside Liquidaciones module
  const [activeTab, setActiveTab] = useState<'semanales' | 'mensuales' | 'configuracion'>('semanales');

  // Config Form State
  const [editingConfig, setEditingConfig] = useState<ConfiguracionComisiones>({ ...configComisiones });
  const [configSaveSuccess, setConfigSaveSuccess] = useState<boolean>(false);

  // Date Range and Period Filters for Liquidations / Commissions
  const todayObj = new Date();
  const currentYear = todayObj.getFullYear();
  const currentMonth = String(todayObj.getMonth() + 1).padStart(2, '0');
  
  const [fechaDesde, setFechaDesde] = useState<string>(`${currentYear}-${currentMonth}-01`);
  const [fechaHasta, setFechaHasta] = useState<string>(todayObj.toISOString().split('T')[0]);
  const [fechaCortePruebas, setFechaCortePruebas] = useState<string>(
    configComisiones?.fechaProximaLiquidacionMensual || `${currentYear}-${currentMonth}-01`
  );
  const [filtroRol, setFiltroRol] = useState<'TODOS' | 'COBRADOR' | 'GESTION_DIARIA' | 'SUPERVISOR'>('TODOS');
  const [filtroUsuarioId, setFiltroUsuarioId] = useState<string>('TODOS');

  // Cloud sync feedback states inside Liquidaciones View
  const [cloudSyncStatus, setCloudSyncStatus] = useState<string | null>(null);

  // Selected liquidation for Printable Receipt Modal
  const [selectedSemanal, setSelectedSemanal] = useState<LiquidacionSemanal | null>(null);
  const [selectedMensual, setSelectedMensual] = useState<LiquidacionMensual | null>(null);

  // Form states to generate new Weekly Liquidation
  const [showNewSemanalModal, setShowNewSemanalModal] = useState<boolean>(false);
  const [semUsuarioId, setSemUsuarioId] = useState<string>(usuarios[0]?.id || '');
  const [semPeriodo, setSemPeriodo] = useState<string>(`Semana ${getWeekNumber(new Date())} (${fechaDesde} a ${fechaHasta})`);
  const [semMobility, setSemMobility] = useState<number>(configComisiones?.adicionalMovilidadSemanal || 25000);
  const [semAdicionales, setSemAdicionales] = useState<number>(0);

  // Form states to generate new Monthly Liquidation
  const [showNewMensualModal, setShowNewMensualModal] = useState<boolean>(false);
  const [mesUsuarioId, setMesUsuarioId] = useState<string>(usuarios[0]?.id || '');
  const [mesPeriodo, setMesPeriodo] = useState<string>(`Período ${fechaDesde} al ${fechaHasta}`);
  const [mesBasico, setMesBasico] = useState<number>(configComisiones?.basicoMensual || 450000);
  const [mesDescuentos, setMesDescuentos] = useState<number>(0);
  const [mesFinanciacionBeneficios, setMesFinanciacionBeneficios] = useState<number>(configComisiones?.descuentoBeneficiosFinanciacion || 0);

  function getWeekNumber(d: Date) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  // Quick Date Cycle Preset Handler
  const handleApplyPresetCycle = (tipo: 'MES_ACTUAL' | 'CICLO_25_A_24' | 'CICLO_15_A_14' | 'ULTIMOS_30_DIAS') => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed

    if (tipo === 'MES_ACTUAL') {
      const start = new Date(year, month, 1).toISOString().split('T')[0];
      const end = new Date(year, month + 1, 0).toISOString().split('T')[0];
      setFechaDesde(start);
      setFechaHasta(end);
    } else if (tipo === 'CICLO_25_A_24') {
      // From 25th of previous month to 24th of current month
      const start = new Date(year, month - 1, 25).toISOString().split('T')[0];
      const end = new Date(year, month, 24).toISOString().split('T')[0];
      setFechaDesde(start);
      setFechaHasta(end);
    } else if (tipo === 'CICLO_15_A_14') {
      // From 15th of previous month to 14th of current month
      const start = new Date(year, month - 1, 15).toISOString().split('T')[0];
      const end = new Date(year, month, 14).toISOString().split('T')[0];
      setFechaDesde(start);
      setFechaHasta(end);
    } else if (tipo === 'ULTIMOS_30_DIAS') {
      const end = now.toISOString().split('T')[0];
      const startObj = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      setFechaDesde(startObj.toISOString().split('T')[0]);
      setFechaHasta(end);
    }
  };

  // Helper filter for commissions based on date range and cutoff date
  const getComisionesFiltradas = () => {
    return comisiones.filter(c => {
      // Date bounds
      if (c.fecha < fechaDesde || c.fecha > fechaHasta) return false;
      // Cutoff for test payments
      if (fechaCortePruebas && c.fecha < fechaCortePruebas) return false;

      // User filter
      if (filtroUsuarioId !== 'TODOS' && c.cobradorId !== filtroUsuarioId) return false;

      // Role filter
      if (filtroRol !== 'TODOS') {
        const u = usuarios.find(usr => usr.id === c.cobradorId);
        if (filtroRol === 'COBRADOR' && u?.rolId !== 'COBRADOR') return false;
        if (filtroRol === 'GESTION_DIARIA' && u?.rolId !== 'OPERADOR' && u?.rolId !== 'SUPERVISOR') return false;
        if (filtroRol === 'SUPERVISOR' && u?.rolId !== 'SUPERVISOR') return false;
      }

      return true;
    });
  };

  // Handle Save Commission Config
  const handleSaveConfig = () => {
    onUpdateConfigComisiones(editingConfig);
    setConfigSaveSuccess(true);
    setTimeout(() => setConfigSaveSuccess(false), 3000);
  };

  // Generate Weekly Liquidation with strict date range filtering
  const handleCreateSemanal = () => {
    const user = usuarios.find(u => u.id === semUsuarioId);
    if (!user) return;

    // Calculate verified commissions strictly within selected date range and cutoff date
    const comsInPeriod = comisiones.filter(c => 
      c.cobradorId === user.id && 
      (c.estado === 'VERIFICADO' || c.estado === 'PENDIENTE') &&
      c.fecha >= fechaDesde &&
      c.fecha <= fechaHasta &&
      (!fechaCortePruebas || c.fecha >= fechaCortePruebas)
    );

    const verComs = comsInPeriod.reduce((sum, c) => sum + c.montoComision, 0);
    const netTotal = verComs + semMobility + semAdicionales;

    const newLiq: LiquidacionSemanal = {
      id: `LIQ-SEM-${Date.now().toString().slice(-5)}`,
      usuarioId: user.id,
      usuarioNombre: user.nombre,
      rolNombre: user.rolId === 'COBRADOR' ? 'Cobrador de Campo' : 'Gestión Diaria / Operador',
      periodoSemana: semPeriodo,
      fechaGeneracion: new Date().toISOString().split('T')[0],
      comisionesVerificadas: verComs,
      adicionalMovilidad: semMobility,
      otrosAdicionales: semAdicionales,
      totalNetoSemanal: netTotal,
      estado: 'PENDIENTE',
      observaciones: `Liquidación período ${fechaDesde} al ${fechaHasta}. (${comsInPeriod.length} comisiones registradas en rango)`
    };

    onAddLiquidacionSemanal(newLiq);
    setShowNewSemanalModal(false);
  };

  // Generate Monthly Liquidation with strict date range filtering
  const handleCreateMensual = () => {
    const user = usuarios.find(u => u.id === mesUsuarioId);
    if (!user) return;

    // Calculate verified commissions strictly within selected date range and cutoff date
    const comsInPeriod = comisiones.filter(c => 
      c.cobradorId === user.id && 
      (c.estado === 'VERIFICADO' || c.estado === 'PENDIENTE') &&
      c.fecha >= fechaDesde &&
      c.fecha <= fechaHasta &&
      (!fechaCortePruebas || c.fecha >= fechaCortePruebas)
    );

    const pendComs = comsInPeriod.reduce((sum, c) => sum + c.montoComision, 0);
    const totalNeto = (mesBasico + pendComs) - (mesDescuentos + mesFinanciacionBeneficios);

    const newLiq: LiquidacionMensual = {
      id: `LIQ-MES-${Date.now().toString().slice(-5)}`,
      usuarioId: user.id,
      usuarioNombre: user.nombre,
      rolNombre: user.rolId === 'COBRADOR' ? 'Cobrador de Calle' : 'Gestión Diaria / Empleado',
      periodoMes: mesPeriodo,
      fechaGeneracion: new Date().toISOString().split('T')[0],
      sueldoBasico: mesBasico,
      comisionesPendientesLiquidar: pendComs,
      adicionales: 0,
      descuentos: mesDescuentos,
      descuentoFinanciacionBeneficios: mesFinanciacionBeneficios,
      totalNetoMensual: totalNeto,
      estado: 'PENDIENTE',
      observaciones: `Liquidación mensual ciclo ${fechaDesde} al ${fechaHasta}. (${comsInPeriod.length} comisiones liquidadas)`
    };

    onAddLiquidacionMensual(newLiq);
    setShowNewMensualModal(false);
  };

  // Cloud sync trigger directly inside liquidations view
  const handleSyncCloud = async () => {
    setCloudSyncStatus('Sincronizando con la nube...');
    try {
      const res = await downloadAllFromFirestore();
      if (res.success && res.data) {
        setCloudSyncStatus('✅ ¡Información de la empresa descargada con éxito!');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setCloudSyncStatus('⚠️ No se encontraron datos en la nube o requiere configurar Firebase en la pestaña Configuración.');
      }
    } catch (err: any) {
      setCloudSyncStatus(`❌ Error de conexión: ${err.message}`);
    }
  };

  // Print Window Trigger for Professional PDF Receipt Format
  const triggerPrintWindow = (elementId: string) => {
    const content = document.getElementById(elementId);
    if (!content) return;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Recibo de Liquidación CrediCash</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { font-family: sans-serif; color: #000; background: #fff; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body className="p-8 bg-white text-slate-900">
          ${content.innerHTML}
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Check if current active user is Administrator or Superadmin
  const isAdmin = activeUser?.rolId === 'ADMIN' || activeUser?.rolId === 'SUPERADMIN';

  // =========================================================================
  // COBRADOR / NON-ADMIN READ-ONLY VIEW
  // =========================================================================
  if (!isAdmin) {
    const todayStr = new Date().toISOString().split('T')[0];
    const myComisiones = comisiones.filter(c => c.cobradorId === activeUser?.id);
    const myComisionesHoy = myComisiones.filter(c => c.fecha === todayStr);

    // Calculate Saturday to Friday current week range
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sun, 6 is Sat
    const diffToSat = (dayOfWeek + 1) % 7;
    const lastSaturday = new Date(now);
    lastSaturday.setDate(now.getDate() - diffToSat);
    const lastSaturdayStr = lastSaturday.toISOString().split('T')[0];

    const myComisionesSemana = myComisiones.filter(c => c.fecha >= lastSaturdayStr && c.fecha <= todayStr);

    const comisionHoyTotal = myComisionesHoy.reduce((s, c) => s + (c.montoComision || 0), 0);
    const comisionSemanaTotal = myComisionesSemana.reduce((s, c) => s + (c.montoComision || 0), 0);
    const comisionMesTotal = myComisiones.reduce((s, c) => s + (c.montoComision || 0), 0);

    const misSemanales = liquidacionesSemanales.filter(l => l.usuarioId === activeUser?.id || l.colaboradorNombre === activeUser?.nombre);
    const misMensuales = liquidacionesMensuales.filter(l => l.usuarioId === activeUser?.id || l.colaboradorNombre === activeUser?.nombre);

    return (
      <div className="w-full max-w-7xl mx-auto space-y-6 font-sans text-slate-100 pb-20">
        
        {/* Header Banner Cobrador */}
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <DollarSign className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Mi Panel de Comisiones & Liquidaciones</h2>
              <p className="text-xs font-medium text-slate-400">
                Consulta de comisiones ganadas, días acumulados de cobro y fechas fijas de pago de haberes.
              </p>
            </div>
          </div>
          <div className="px-3 py-2 bg-emerald-950 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Cobrador: {activeUser?.nombre || 'Usuario'}</span>
          </div>
        </div>

        {/* Cronograma de Fechas de Cobro (Lectura Informativa) */}
        <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-black uppercase text-white tracking-wider">
              Fechas Fijas de Cobro y Cierre de Ciclos
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-950/90 border border-emerald-500/30 rounded-2xl space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                1. Cobro Semanal de Comisiones
              </span>
              <p className="text-base font-black text-white">
                SÁBADO DE CADA SEMANA
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                El ciclo cierra el Viernes a las 23:59hs. El total acumulado de Sábado a Viernes se cobra el día Sábado.
              </p>
            </div>

            <div className="p-4 bg-slate-950/90 border border-teal-500/30 rounded-2xl space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 block">
                2. Cobro Mensual de Haberes
              </span>
              <p className="text-base font-black text-white">
                Del 10 al 20 de cada mes
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Liquidación oficial del Sueldo Básico y balance de comisiones/adicionales correspondientes al período mensual.
              </p>
            </div>

            <div className="p-4 bg-slate-950/90 border border-indigo-500/30 rounded-2xl space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 block">
                3. Período Acumulativo Vigente
              </span>
              <p className="text-base font-black text-white">
                Sábado a Viernes
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cálculo automatizado de comisiones por cada cobro diario asentado y validado en calle.
              </p>
            </div>
          </div>
        </div>

        {/* Tarjetas de Métricas para Cobrador */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900 border border-emerald-500/40 rounded-2xl shadow-md space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
              Comisión de Hoy
            </span>
            <p className="text-2xl font-black text-emerald-400">
              ${comisionHoyTotal.toLocaleString('es-AR')}
            </p>
            <span className="text-[11px] text-slate-400 font-medium block">
              Ganada en el día de la fecha
            </span>
          </div>

          <div className="p-4 bg-slate-900 border border-teal-500/40 rounded-2xl shadow-md space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-300 block">
              Acumulado Semanal (Sáb a Vie)
            </span>
            <p className="text-2xl font-black text-teal-300">
              ${comisionSemanaTotal.toLocaleString('es-AR')}
            </p>
            <span className="text-[11px] text-teal-400/90 font-bold block">
              Disponible para cobrar este Sábado
            </span>
          </div>

          <div className="p-4 bg-slate-900 border border-indigo-500/40 rounded-2xl shadow-md space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 block">
              Acumulado Total Mes
            </span>
            <p className="text-2xl font-black text-indigo-300">
              ${comisionMesTotal.toLocaleString('es-AR')}
            </p>
            <span className="text-[11px] text-slate-400 font-medium block">
              Suma total de comisiones del mes
            </span>
          </div>

          <div className="p-4 bg-slate-900 border border-amber-500/40 rounded-2xl shadow-md space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">
              Sueldo Básico Referencial
            </span>
            <p className="text-2xl font-black text-amber-300">
              ${(configComisiones?.basicoMensual || 450000).toLocaleString('es-AR')}
            </p>
            <span className="text-[11px] text-slate-400 font-medium block">
              Cobro del 10 al 20 de cada mes
            </span>
          </div>
        </div>

        {/* Tabla Lectura de Mis Comisiones */}
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-400" />
              <span>Mi Historial de Comisiones Generadas</span>
            </h3>
            <span className="text-xs text-slate-400 font-bold">
              Total Registros: {myComisiones.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Monto Cobrado</th>
                  <th className="p-3">Tipo / Concepto</th>
                  <th className="p-3 text-right">Comisión Ganada</th>
                  <th className="p-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {myComisiones.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-bold">
                      Aún no registra comisiones acumuladas en el sistema.
                    </td>
                  </tr>
                ) : (
                  myComisiones.map((com) => (
                    <tr key={com.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono text-slate-300">{com.fecha}</td>
                      <td className="p-3 font-bold text-white">{com.nombreCliente}</td>
                      <td className="p-3 font-semibold text-emerald-300">${(com.montoCobrado || 0).toLocaleString('es-AR')}</td>
                      <td className="p-3 text-slate-400">{com.tipoComision || 'COBRANZA'}</td>
                      <td className="p-3 text-right font-black text-emerald-400 text-sm">${(com.montoComision || 0).toLocaleString('es-AR')}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                          com.estado === 'VERIFICADO' 
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}>
                          {com.estado || 'VERIFICADO'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mis Recibos Emitidos (Lectura) */}
        {(misSemanales.length > 0 || misMensuales.length > 0) && (
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2 border-b border-slate-800 pb-3">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>Mis Recibos y Comprobantes de Liquidación</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {misSemanales.map((liq) => (
                <div key={liq.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-400 block">Liquidación Semanal</span>
                    <span className="text-xs font-bold text-white block mt-0.5">{liq.periodo}</span>
                    <span className="text-[11px] text-slate-400 mt-1 block">Neto: ${liq.netoPagar.toLocaleString('es-AR')}</span>
                  </div>
                  <button
                    onClick={() => setSelectedSemanal(liq)}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Ver Recibo</span>
                  </button>
                </div>
              ))}

              {misMensuales.map((liq) => (
                <div key={liq.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-400 block">Liquidación Mensual</span>
                    <span className="text-xs font-bold text-white block mt-0.5">{liq.periodo}</span>
                    <span className="text-[11px] text-slate-400 mt-1 block">Neto: ${liq.totalNetoMensual.toLocaleString('es-AR')}</span>
                  </div>
                  <button
                    onClick={() => setSelectedMensual(liq)}
                    className="p-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Ver Recibo</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Recibo Impresión para Cobrador */}
        {selectedSemanal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-6 relative shadow-2xl">
              <button
                onClick={() => setSelectedSemanal(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕ Cerrar
              </button>
              <div id="receipt-semanal-cobrador-print" className="bg-white text-slate-900 p-6 rounded-2xl space-y-4 border font-sans">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h2 className="text-xl font-black text-emerald-800">CrediCash S.A.</h2>
                    <p className="text-[11px] text-slate-600 font-bold">RECIBO DE LIQUIDACIÓN SEMANAL DE COMISIONES</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-bold block">ID: {selectedSemanal.id}</span>
                    <span className="text-slate-500">{selectedSemanal.fechaGeneracion}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-100 p-3 rounded-lg border">
                  <div>
                    <span className="text-slate-500 font-semibold block">Cobrador:</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedSemanal.colaboradorNombre}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Período:</span>
                    <span className="font-bold text-slate-900">{selectedSemanal.periodo}</span>
                  </div>
                </div>
                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 flex justify-between items-center">
                  <span className="font-bold text-emerald-900 text-xs">TOTAL NETO A COBRAR:</span>
                  <span className="font-black text-emerald-900 text-xl">${selectedSemanal.netoPagar.toLocaleString('es-AR')}</span>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => triggerPrintWindow('receipt-semanal-cobrador-print')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Exportar Recibo PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedMensual && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-6 relative shadow-2xl">
              <button
                onClick={() => setSelectedMensual(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕ Cerrar
              </button>
              <div id="receipt-mensual-cobrador-print" className="bg-white text-slate-900 p-6 rounded-2xl space-y-4 border font-sans">
                <div className="flex justify-between items-center border-b pb-3">
                  <div>
                    <h2 className="text-xl font-black text-emerald-800">CrediCash S.A.</h2>
                    <p className="text-[11px] text-slate-600 font-bold">RECIBO DE LIQUIDACIÓN MENSUAL DE HABERES</p>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-bold block">ID: {selectedMensual.id}</span>
                    <span className="text-slate-500">{selectedMensual.fechaGeneracion}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs bg-slate-100 p-3 rounded-lg border">
                  <div>
                    <span className="text-slate-500 font-semibold block">Empleado:</span>
                    <span className="font-bold text-slate-900 text-sm">{selectedMensual.usuarioNombre}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block">Período Mensual:</span>
                    <span className="font-bold text-slate-900">{selectedMensual.periodoMes}</span>
                  </div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200 flex justify-between items-center">
                  <span className="font-bold text-indigo-900 text-xs">TOTAL NETO MENSUAL:</span>
                  <span className="font-black text-indigo-900 text-xl">${selectedMensual.totalNetoMensual.toLocaleString('es-AR')}</span>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => triggerPrintWindow('receipt-mensual-cobrador-print')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Exportar Recibo PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // =========================================================================
  // ADMIN FULL VIEW
  // =========================================================================
  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 font-sans text-slate-100 pb-20">
      
      {/* Header Banner Admin */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Módulo de Liquidaciones & Comisiones (Administrador)</h2>
            <p className="text-xs font-medium text-slate-400">
              Generación de recibos semanales, liquidaciones mensuales de sueldo y reglas de comisiones.
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 gap-1 shrink-0">
          <button
            onClick={() => setActiveTab('semanales')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'semanales'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Liquidaciones Semanales
          </button>
          <button
            onClick={() => setActiveTab('mensuales')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'mensuales'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Liquidaciones Mensuales
          </button>
          <button
            onClick={() => setActiveTab('configuracion')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'configuracion'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Configuración Comisiones
          </button>
        </div>
      </div>

      {/* Multi-Device Cloud Sync Notice Bar (Admin) */}
      <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-4 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 rounded-2xl shrink-0">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-indigo-300 tracking-wider flex items-center gap-2">
              <span>Sincronización de Base de Datos y Nube</span>
            </h3>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
              Sincronice o respalde los datos en Firestore para asegurar que todos los cobradores vean los clientes y pagos actualizados.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleSyncCloud}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
            title="Descargar base de datos actualizada desde Firestore"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Descargar de Nube</span>
          </button>
          <button
            onClick={async () => {
              setCloudSyncStatus('Subiendo base de datos a la nube...');
              try {
                const res = await uploadAllToFirestore({
                  clientes: (window as any).__credicashState?.clientes || [],
                  operaciones: (window as any).__credicashState?.operaciones || [],
                  cuotas: (window as any).__credicashState?.cuotas || [],
                  pagos: (window as any).__credicashState?.pagos || [],
                  transacciones: (window as any).__credicashState?.transacciones || [],
                  configuracion: (window as any).__credicashState?.configuracion || {},
                  feriados: (window as any).__credicashState?.feriados || [],
                  usuarios,
                  comisiones
                });
                if (res.success) {
                  setCloudSyncStatus('✅ ¡Toda la información fue subida a la nube exitosamente!');
                } else {
                  setCloudSyncStatus(`⚠️ Error al subir: ${res.error}`);
                }
              } catch (e: any) {
                setCloudSyncStatus(`❌ Error de subida: ${e.message}`);
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
            title="Subir estado local a Firestore"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Subir Todo a Nube</span>
          </button>
        </div>
      </div>

      {cloudSyncStatus && (
        <div className="p-3 bg-slate-900 border border-indigo-500/40 text-indigo-300 font-bold text-xs rounded-2xl flex items-center justify-between">
          <span>{cloudSyncStatus}</span>
          <button onClick={() => setCloudSyncStatus(null)} className="text-slate-400 hover:text-white font-black text-xs ml-2">✕</button>
        </div>
      )}

      {/* RANGO DE FECHAS Y CICLO DE INICIO DE MES PARA COBRADORES Y GESTIÓN */}
      <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-black uppercase text-white tracking-wider">
                Período de Liquidación y Rango de Fechas
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure la fecha de inicio/fin del ciclo mensual o semanal y excluya cobros o comisiones de prueba fuera de fecha.
              </p>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleApplyPresetCycle('MES_ACTUAL')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[11px] font-extrabold rounded-lg border border-slate-700 cursor-pointer"
            >
              Mes Actual (1 al 31)
            </button>
            <button
              onClick={() => handleApplyPresetCycle('CICLO_25_A_24')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-teal-300 text-[11px] font-extrabold rounded-lg border border-slate-700 cursor-pointer"
            >
              Ciclo Día 25 al 24
            </button>
            <button
              onClick={() => handleApplyPresetCycle('CICLO_15_A_14')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-extrabold rounded-lg border border-slate-700 cursor-pointer"
            >
              Ciclo Día 15 al 14
            </button>
            <button
              onClick={() => handleApplyPresetCycle('ULTIMOS_30_DIAS')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-extrabold rounded-lg border border-slate-700 cursor-pointer"
            >
              Últimos 30 Días
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
          {/* Fecha Desde */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block mb-1">
              Fecha Desde (Inicio)
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={e => setFechaDesde(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-emerald-300 font-extrabold"
            />
          </div>

          {/* Fecha Hasta */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block mb-1">
              Fecha Hasta (Cierre)
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={e => setFechaHasta(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-emerald-300 font-extrabold"
            />
          </div>

          {/* Fecha Corte / Omitir Cobros de Prueba */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1">
              Omitir Cobros de Prueba Ant. a
            </label>
            <input
              type="date"
              value={fechaCortePruebas}
              onChange={e => setFechaCortePruebas(e.target.value)}
              className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-amber-300 font-extrabold"
            />
          </div>

          {/* Filtrar por Rol / Tipo de Gestión */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block mb-1">
              Filtrar por Rol
            </label>
            <select
              value={filtroRol}
              onChange={e => setFiltroRol(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
            >
              <option value="TODOS">Todos los Roles</option>
              <option value="COBRADOR">Cobrador de Calle</option>
              <option value="GESTION_DIARIA">Gestión Diaria / Operador</option>
              <option value="SUPERVISOR">Supervisor / Admin</option>
            </select>
          </div>

          {/* Filtrar por Usuario Específico */}
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 block mb-1">
              Filtrar por Empleado
            </label>
            <select
              value={filtroUsuarioId}
              onChange={e => setFiltroUsuarioId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
            >
              <option value="TODOS">Todos los Empleados</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre} ({u.rolId})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Performance & Commission Metrics Summary Panel */}
      {(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const comisionesFiltradas = getComisionesFiltradas();
        const myComisiones = comisionesFiltradas.filter(c => !activeUser || activeUser.rolId !== 'COBRADOR' || c.cobradorId === activeUser.id);
        const myComisionesHoy = myComisiones.filter(c => c.fecha === todayStr);
        const comisionesGanadasHoy = myComisionesHoy.reduce((sum, c) => sum + c.montoComision, 0);
        const totalComisionesAcumuladas = myComisiones.reduce((sum, c) => sum + c.montoComision, 0);
        const efectividadPorcentaje = 100;
        const metaDiariaPorcentaje = Math.min(100, Math.round((comisionesGanadasHoy / (configComisiones?.montoMinimoCobroComision || 5000)) * 100)) || 100;

        return (
          <div className="bg-slate-900 border-2 border-emerald-500/60 rounded-3xl p-4 md:p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-black uppercase text-emerald-400 tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                Resumen Real en Vivo del Período ({fechaDesde} al {fechaHasta})
              </span>
              <span className="text-[10px] font-bold text-slate-400">{comisionesFiltradas.length} Comisiones en Rango</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Comisión Ganada Hoy */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-emerald-500/40 flex flex-col justify-between">
                <div className="flex items-center justify-between text-emerald-400 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">Comisión Ganada Hoy</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-xl font-black text-emerald-300">
                  ${comisionesGanadasHoy.toLocaleString('es-AR')}
                </span>
                <span className="text-[9px] text-emerald-400/80 font-bold mt-1">Cobros + Llamadas + WhatsApp</span>
              </div>

              {/* Comisiones Acumuladas */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-indigo-500/40 flex flex-col justify-between">
                <div className="flex items-center justify-between text-indigo-400 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">Comisiones Acumuladas</span>
                  <Calendar className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="text-xl font-black text-indigo-200">
                  ${totalComisionesAcumuladas.toLocaleString('es-AR')}
                </span>
                <span className="text-[9px] text-slate-400 mt-1">Próx. Liquidación: {configComisiones?.fechaProximaLiquidacionSemanal || 'Viernes'}</span>
              </div>

              {/* Efectividad del Día */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-amber-500/40 flex flex-col justify-between">
                <div className="flex items-center justify-between text-amber-400 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider">Efectividad del Día</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <span className="text-xl font-black text-amber-300">
                  {efectividadPorcentaje}%
                </span>
                <span className="text-[9px] text-slate-400 mt-1">Gestiones completadas</span>
              </div>

              {/* Meta Diaria de Cobro (%) */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-teal-500/40 flex flex-col justify-between space-y-1">
                <div className="flex items-center justify-between text-teal-400">
                  <span className="text-[10px] font-black uppercase tracking-wider">Meta Diaria de Cobro</span>
                  <span className="text-sm font-black text-emerald-400">{metaDiariaPorcentaje}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    style={{ width: `${Math.max(10, metaDiariaPorcentaje)}%` }}
                  ></div>
                </div>
                <span className="text-[9px] text-slate-400">Avance de objetivos globales</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* TAB 1: LIQUIDACIONES SEMANALES                                             */}
      {/* ========================================================================= */}
      {activeTab === 'semanales' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Liquidaciones Semanales de Comisiones y Movilidad</span>
              </h3>
            </div>

            <button
              onClick={() => setShowNewSemanalModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Generar Liquidación Semanal</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
            {liquidacionesSemanales.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No se han generado liquidaciones semanales aún. Haga clic en "Generar Liquidación Semanal".
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <th className="p-3">ID / Empleado</th>
                    <th className="p-3">Período</th>
                    <th className="p-3">Comisiones Verificadas</th>
                    <th className="p-3">Adic. Movilidad</th>
                    <th className="p-3">Total Neto Semanal</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {liquidacionesSemanales.map(l => (
                    <tr key={l.id} className="hover:bg-slate-850">
                      <td className="p-3">
                        <span className="font-bold text-white block">{l.usuarioNombre}</span>
                        <span className="text-[10px] text-slate-400">{l.id}</span>
                      </td>
                      <td className="p-3 font-semibold text-slate-300">{l.periodoSemana}</td>
                      <td className="p-3 font-black text-emerald-400">${l.comisionesVerificadas.toLocaleString('es-AR')}</td>
                      <td className="p-3 font-bold text-teal-300">${l.adicionalMovilidad.toLocaleString('es-AR')}</td>
                      <td className="p-3 font-black text-white text-sm">${l.totalNetoSemanal.toLocaleString('es-AR')}</td>
                      <td className="p-3 text-center">
                        {l.estado === 'PAGADA' ? (
                          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-black text-[10px]">
                            🟢 PAGADA
                          </span>
                        ) : l.estado === 'APROBADA' ? (
                          <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-full font-black text-[10px]">
                            🔵 APROBADA
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-black text-[10px]">
                            🟡 PENDIENTE
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => setSelectedSemanal(l)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 font-bold cursor-pointer"
                        >
                          Visualizar / Recibo
                        </button>
                        {l.estado === 'PENDIENTE' && (
                          <button
                            onClick={() => onUpdateEstadoSemanal(l.id, 'APROBADA')}
                            className="bg-teal-950 hover:bg-teal-900 text-teal-300 px-2 py-1 rounded-lg border border-teal-700 font-bold cursor-pointer"
                          >
                            Aprobar
                          </button>
                        )}
                        {l.estado !== 'PAGADA' && (
                          <button
                            onClick={() => onUpdateEstadoSemanal(l.id, 'PAGADA')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-lg font-black cursor-pointer"
                          >
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LIQUIDACIONES MENSUALES                                             */}
      {/* ========================================================================= */}
      {activeTab === 'mensuales' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Liquidaciones Mensuales de Sueldos y Haberes</span>
              </h3>
            </div>

            <button
              onClick={() => setShowNewMensualModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 px-4 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Generar Liquidación Mensual</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
            {liquidacionesMensuales.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No se han generado liquidaciones mensuales aún. Haga clic en "Generar Liquidación Mensual".
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                    <th className="p-3">ID / Empleado</th>
                    <th className="p-3">Período</th>
                    <th className="p-3">Sueldo Básico</th>
                    <th className="p-3">Comisiones Pend.</th>
                    <th className="p-3">Descuentos</th>
                    <th className="p-3">Total Neto Mensual</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {liquidacionesMensuales.map(m => (
                    <tr key={m.id} className="hover:bg-slate-850">
                      <td className="p-3">
                        <span className="font-bold text-white block">{m.usuarioNombre}</span>
                        <span className="text-[10px] text-slate-400">{m.id}</span>
                      </td>
                      <td className="p-3 font-semibold text-slate-300">{m.periodoMes}</td>
                      <td className="p-3 font-bold text-white">${m.sueldoBasico.toLocaleString('es-AR')}</td>
                      <td className="p-3 font-bold text-emerald-400">${m.comisionesPendientesLiquidar.toLocaleString('es-AR')}</td>
                      <td className="p-3 font-bold text-rose-400">-${(m.descuentos + m.descuentoFinanciacionBeneficios).toLocaleString('es-AR')}</td>
                      <td className="p-3 font-black text-emerald-300 text-sm">${m.totalNetoMensual.toLocaleString('es-AR')}</td>
                      <td className="p-3 text-center">
                        {m.estado === 'PAGADA' ? (
                          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-black text-[10px]">
                            🟢 PAGADA
                          </span>
                        ) : m.estado === 'APROBADA' ? (
                          <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-full font-black text-[10px]">
                            🔵 APROBADA
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full font-black text-[10px]">
                            🟡 PENDIENTE
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-1">
                        <button
                          onClick={() => setSelectedMensual(m)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 font-bold cursor-pointer"
                        >
                          Visualizar / Recibo
                        </button>
                        {m.estado === 'PENDIENTE' && (
                          <button
                            onClick={() => onUpdateEstadoMensual(m.id, 'APROBADA')}
                            className="bg-teal-950 hover:bg-teal-900 text-teal-300 px-2 py-1 rounded-lg border border-teal-700 font-bold cursor-pointer"
                          >
                            Aprobar
                          </button>
                        )}
                        {m.estado !== 'PAGADA' && (
                          <button
                            onClick={() => onUpdateEstadoMensual(m.id, 'PAGADA')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-lg font-black cursor-pointer"
                          >
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CONFIGURACIÓN DE COMISIONES Y VALORES EDITABLES                     */}
      {/* ========================================================================= */}
      {activeTab === 'configuracion' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-400" />
                <span>Configuración General de Comisiones de Cobradores</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ajuste los porcentajes, importes fijos, sueldos básicos y fechas de cierre semanal y mensual.
              </p>
            </div>

            <button
              onClick={handleSaveConfig}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 px-5 rounded-xl flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Configuración</span>
            </button>
          </div>

          {configSaveSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>¡Configuración de comisiones guardada exitosamente!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            
            {/* Box 1: Comisiones por Cobranza */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-black uppercase text-emerald-400 block border-b border-slate-800 pb-2">
                1. Comisiones por Cobranza Directa
              </span>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Porcentaje de Comisión (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={editingConfig.porcentajeComisionCobranza}
                  onChange={e => setEditingConfig({ ...editingConfig, porcentajeComisionCobranza: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-black"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">O Importe Fijo por Cuota ($)</label>
                <input
                  type="number"
                  value={editingConfig.fijoComisionCobranza}
                  onChange={e => setEditingConfig({ ...editingConfig, fijoComisionCobranza: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-black"
                />
              </div>
            </div>

            {/* Box 2: Comisiones por Recuperación */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-black uppercase text-teal-400 block border-b border-slate-800 pb-2">
                2. Recuperación de Clientes y Contactos
              </span>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Comisión Contacto Recuperado ($)</label>
                <input
                  type="number"
                  value={editingConfig.montoContactoRecuperado}
                  onChange={e => setEditingConfig({ ...editingConfig, montoContactoRecuperado: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-black"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Comisión Cliente Inactivo Reintegrado ($)</label>
                <input
                  type="number"
                  value={editingConfig.montoClienteInactivoRecuperado}
                  onChange={e => setEditingConfig({ ...editingConfig, montoClienteInactivoRecuperado: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-black"
                />
              </div>
            </div>

            {/* Box 3: Fechas de Cierre */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-black uppercase text-amber-400 block border-b border-slate-800 pb-2">
                3. Calendario de Cierre y Liquidación
              </span>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Día de Cierre Semanal</label>
                <select
                  value={editingConfig.diaCierreSemanal}
                  onChange={e => setEditingConfig({ ...editingConfig, diaCierreSemanal: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="VIERNES">Viernes</option>
                  <option value="SABADO">Sábado</option>
                  <option value="DOMINGO">Domingo</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Próxima Fecha Liquidación Semanal</label>
                <input
                  type="text"
                  value={editingConfig.fechaProximaLiquidacionSemanal}
                  onChange={e => setEditingConfig({ ...editingConfig, fechaProximaLiquidacionSemanal: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>
            </div>

            {/* Box 4: Haberes Básicos y Adicionales */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-black uppercase text-indigo-400 block border-b border-slate-800 pb-2">
                4. Sueldos Básicos y Adicionales
              </span>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Sueldo Básico Mensual ($)</label>
                <input
                  type="number"
                  value={editingConfig.basicoMensual}
                  onChange={e => setEditingConfig({ ...editingConfig, basicoMensual: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-black"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Adicional Semanal por Movilidad ($)</label>
                <input
                  type="number"
                  value={editingConfig.adicionalMovilidadSemanal}
                  onChange={e => setEditingConfig({ ...editingConfig, adicionalMovilidadSemanal: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-black"
                />
              </div>
            </div>

            {/* Box 5: Reintegro de Desayuno */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-black uppercase text-amber-400 block border-b border-slate-800 pb-2">
                5. Reintegro de Desayuno / Viáticos en Calle
              </span>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Porcentaje Cobertura Desayuno (%)</label>
                <input
                  type="number"
                  value={editingConfig.porcentajeReintegroDesayuno || 50}
                  onChange={e => setEditingConfig({ ...editingConfig, porcentajeReintegroDesayuno: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-black"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Límite Semanal Reintegro Desayuno ($)</label>
                <input
                  type="number"
                  value={editingConfig.limiteSemanalReintegroDesayuno || 15000}
                  onChange={e => setEditingConfig({ ...editingConfig, limiteSemanalReintegroDesayuno: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-black"
                />
              </div>
            </div>

            {/* Box 6: Configuración de Día de Inicio y Cobros de Prueba */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="text-xs font-black uppercase text-emerald-400 block border-b border-slate-800 pb-2">
                6. Día de Inicio de Ciclo & Exclusión de Pruebas
              </span>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Día de Inicio de Mes Predeterminado</label>
                <input
                  type="text"
                  placeholder="Ej: Día 25, Día 1, Día 15"
                  value={editingConfig.fechaProximaLiquidacionMensual || 'Día 1 de cada mes'}
                  onChange={e => setEditingConfig({ ...editingConfig, fechaProximaLiquidacionMensual: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-emerald-300 font-extrabold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-amber-400 block mb-1">Excluir Cobros/Comisiones de Prueba Ant. a</label>
                <input
                  type="date"
                  value={fechaCortePruebas}
                  onChange={e => setFechaCortePruebas(e.target.value)}
                  className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-amber-300 font-extrabold"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Todos los registros con fecha anterior a este corte no se sumarán a las ganancias reales de los cobradores.
                </p>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINTABLE RECEIPT FOR WEEKLY LIQUIDATION                           */}
      {/* ========================================================================= */}
      {selectedSemanal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-6 relative shadow-2xl">
            <button
              onClick={() => setSelectedSemanal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-sm"
            >
              ✕ Cerrar
            </button>

            {/* Print Container ID */}
            <div id="receipt-semanal-print" className="bg-white text-slate-900 p-6 rounded-2xl space-y-4 border font-sans">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h2 className="text-xl font-black text-emerald-800">CrediCash S.A.</h2>
                  <p className="text-[11px] text-slate-600 font-bold">RECIBO DE LIQUIDACIÓN SEMANAL DE COMISIONES</p>
                </div>
                <div className="text-right text-xs">
                  <span className="font-bold block">ID: {selectedSemanal.id}</span>
                  <span className="text-slate-500">{selectedSemanal.fechaGeneracion}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-100 p-3 rounded-lg border">
                <div>
                  <span className="text-slate-500 font-semibold block">Empleado:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedSemanal.usuarioNombre}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Período Semanal:</span>
                  <span className="font-bold text-slate-900">{selectedSemanal.periodoSemana}</span>
                </div>
              </div>

              <table className="w-full text-xs text-left border-collapse border my-2">
                <thead>
                  <tr className="bg-slate-200 text-slate-700 font-bold border-b">
                    <th className="p-2">Concepto</th>
                    <th className="p-2 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-2 font-medium">Comisiones Verificadas por Cobranza</td>
                    <td className="p-2 text-right font-bold">${selectedSemanal.comisionesVerificadas.toLocaleString('es-AR')}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Adicional por Movilidad Semanal</td>
                    <td className="p-2 text-right font-bold">${selectedSemanal.adicionalMovilidad.toLocaleString('es-AR')}</td>
                  </tr>
                  {selectedSemanal.otrosAdicionales > 0 && (
                    <tr>
                      <td className="p-2 font-medium">Otros Adicionales Configurados</td>
                      <td className="p-2 text-right font-bold">${selectedSemanal.otrosAdicionales.toLocaleString('es-AR')}</td>
                    </tr>
                  )}
                  <tr className="bg-emerald-50 font-black text-sm">
                    <td className="p-2 text-emerald-900">TOTAL NETO A COBRAR</td>
                    <td className="p-2 text-right text-emerald-900">${selectedSemanal.totalNetoSemanal.toLocaleString('es-AR')}</td>
                  </tr>
                </tbody>
              </table>

              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="border-t border-slate-400 pt-2 font-bold text-slate-600">
                  Firma Empleado / Cobrador
                </div>
                <div className="border-t border-slate-400 pt-2 font-bold text-slate-600">
                  Autorizado por Tesorería CrediCash
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => triggerPrintWindow('receipt-semanal-print')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Exportar Recibo PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PRINTABLE RECEIPT FOR MONTHLY LIQUIDATION                           */}
      {/* ========================================================================= */}
      {selectedMensual && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-6 relative shadow-2xl">
            <button
              onClick={() => setSelectedMensual(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-sm"
            >
              ✕ Cerrar
            </button>

            {/* Print Container ID */}
            <div id="receipt-mensual-print" className="bg-white text-slate-900 p-6 rounded-2xl space-y-4 border font-sans">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h2 className="text-xl font-black text-emerald-800">CrediCash S.A.</h2>
                  <p className="text-[11px] text-slate-600 font-bold">RECIBO OFICIAL DE HABERES Y SUELDO MENSUAL</p>
                </div>
                <div className="text-right text-xs">
                  <span className="font-bold block">ID: {selectedMensual.id}</span>
                  <span className="text-slate-500">{selectedMensual.fechaGeneracion}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-100 p-3 rounded-lg border">
                <div>
                  <span className="text-slate-500 font-semibold block">Colaborador:</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedMensual.usuarioNombre}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Período Mensual:</span>
                  <span className="font-bold text-slate-900">{selectedMensual.periodoMes}</span>
                </div>
              </div>

              <table className="w-full text-xs text-left border-collapse border my-2">
                <thead>
                  <tr className="bg-slate-200 text-slate-700 font-bold border-b">
                    <th className="p-2">Concepto</th>
                    <th className="p-2 text-right">Haberes ($)</th>
                    <th className="p-2 text-right">Descuentos ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-2 font-medium">Sueldo Básico Mensual</td>
                    <td className="p-2 text-right font-bold">${selectedMensual.sueldoBasico.toLocaleString('es-AR')}</td>
                    <td className="p-2 text-right">-</td>
                  </tr>
                  {selectedMensual.comisionesPendientesLiquidar > 0 && (
                    <tr>
                      <td className="p-2 font-medium">Comisiones Pendientes Acumuladas</td>
                      <td className="p-2 text-right font-bold">${selectedMensual.comisionesPendientesLiquidar.toLocaleString('es-AR')}</td>
                      <td className="p-2 text-right">-</td>
                    </tr>
                  )}
                  {selectedMensual.descuentos > 0 && (
                    <tr>
                      <td className="p-2 font-medium">Descuentos Generales</td>
                      <td className="p-2 text-right">-</td>
                      <td className="p-2 text-right font-bold text-rose-600">${selectedMensual.descuentos.toLocaleString('es-AR')}</td>
                    </tr>
                  )}
                  {selectedMensual.descuentoFinanciacionBeneficios > 0 && (
                    <tr>
                      <td className="p-2 font-medium">Financiación Beneficios Otorgados Empresa</td>
                      <td className="p-2 text-right">-</td>
                      <td className="p-2 text-right font-bold text-rose-600">${selectedMensual.descuentoFinanciacionBeneficios.toLocaleString('es-AR')}</td>
                    </tr>
                  )}
                  <tr className="bg-emerald-50 font-black text-sm">
                    <td className="p-2 text-emerald-900">NETO MENSUAL A LIQUIDAR</td>
                    <td colSpan={2} className="p-2 text-right text-emerald-900">${selectedMensual.totalNetoMensual.toLocaleString('es-AR')}</td>
                  </tr>
                </tbody>
              </table>

              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
                <div className="border-t border-slate-400 pt-2 font-bold text-slate-600">
                  Firma Colaborador
                </div>
                <div className="border-t border-slate-400 pt-2 font-bold text-slate-600">
                  Autorizado por Recursos Humanos / Tesorería CrediCash
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => triggerPrintWindow('receipt-mensual-print')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Exportar Recibo PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GENERATE NEW WEEKLY LIQUIDATION FORM                                */}
      {/* ========================================================================= */}
      {showNewSemanalModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <button onClick={() => setShowNewSemanalModal(false)} className="absolute top-4 right-4 text-slate-400">✕</button>

            <h3 className="text-base font-black text-white">Generar Liquidación Semanal</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Seleccionar Colaborador / Cobrador</label>
                <select
                  value={semUsuarioId}
                  onChange={e => setSemUsuarioId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                >
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.rolId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Período Semanal</label>
                <input
                  type="text"
                  value={semPeriodo}
                  onChange={e => setSemPeriodo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Adicional Movilidad Semanal ($)</label>
                <input
                  type="number"
                  value={semMobility}
                  onChange={e => setSemMobility(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <button
                onClick={handleCreateSemanal}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl cursor-pointer"
              >
                Generar Liquidación Semanal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GENERATE NEW MONTHLY LIQUIDATION FORM                               */}
      {/* ========================================================================= */}
      {showNewMensualModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <button onClick={() => setShowNewMensualModal(false)} className="absolute top-4 right-4 text-slate-400">✕</button>

            <h3 className="text-base font-black text-white">Generar Liquidación Mensual</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Seleccionar Empleado</label>
                <select
                  value={mesUsuarioId}
                  onChange={e => setMesUsuarioId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                >
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre} ({u.rolId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Período Mensual</label>
                <input
                  type="text"
                  value={mesPeriodo}
                  onChange={e => setMesPeriodo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Sueldo Básico ($)</label>
                <input
                  type="number"
                  value={mesBasico}
                  onChange={e => setMesBasico(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
                />
              </div>

              <button
                onClick={handleCreateMensual}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl cursor-pointer"
              >
                Generar Liquidación Mensual
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
