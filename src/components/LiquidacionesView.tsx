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
  ChevronRight, Award, Layers, AlertCircle, Edit, Save, Check
} from 'lucide-react';

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

  // Selected liquidation for Printable Receipt Modal
  const [selectedSemanal, setSelectedSemanal] = useState<LiquidacionSemanal | null>(null);
  const [selectedMensual, setSelectedMensual] = useState<LiquidacionMensual | null>(null);

  // Form states to generate new Weekly Liquidation
  const [showNewSemanalModal, setShowNewSemanalModal] = useState<boolean>(false);
  const [semUsuarioId, setSemUsuarioId] = useState<string>(usuarios[0]?.id || '');
  const [semPeriodo, setSemPeriodo] = useState<string>(`Semana ${getWeekNumber(new Date())}`);
  const [semMobility, setSemMobility] = useState<number>(configComisiones?.adicionalMovilidadSemanal || 25000);
  const [semAdicionales, setSemAdicionales] = useState<number>(0);

  // Form states to generate new Monthly Liquidation
  const [showNewMensualModal, setShowNewMensualModal] = useState<boolean>(false);
  const [mesUsuarioId, setMesUsuarioId] = useState<string>(usuarios[0]?.id || '');
  const [mesPeriodo, setMesPeriodo] = useState<string>('Julio 2026');
  const [mesBasico, setMesBasico] = useState<number>(configComisiones?.basicoMensual || 450000);
  const [mesDescuentos, setMesDescuentos] = useState<number>(0);
  const [mesFinanciacionBeneficios, setMesFinanciacionBeneficios] = useState<number>(configComisiones?.descuentoBeneficiosFinanciacion || 0);

  function getWeekNumber(d: Date) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  // Handle Save Commission Config
  const handleSaveConfig = () => {
    onUpdateConfigComisiones(editingConfig);
    setConfigSaveSuccess(true);
    setTimeout(() => setConfigSaveSuccess(false), 3000);
  };

  // Generate Weekly Liquidation
  const handleCreateSemanal = () => {
    const user = usuarios.find(u => u.id === semUsuarioId);
    if (!user) return;

    // Calculate verified commissions for this user
    const verComs = comisiones
      .filter(c => c.cobradorId === user.id && (c.estado === 'VERIFICADO' || c.estado === 'PENDIENTE'))
      .reduce((sum, c) => sum + c.montoComision, 0);

    const netTotal = verComs + semMobility + semAdicionales;

    const newLiq: LiquidacionSemanal = {
      id: `LIQ-SEM-${Date.now().toString().slice(-5)}`,
      usuarioId: user.id,
      usuarioNombre: user.nombre,
      rolNombre: 'Cobrador / Operador',
      periodoSemana: semPeriodo,
      fechaGeneracion: new Date().toISOString().split('T')[0],
      comisionesVerificadas: verComs,
      adicionalMovilidad: semMobility,
      otrosAdicionales: semAdicionales,
      totalNetoSemanal: netTotal,
      estado: 'PENDIENTE',
      observaciones: 'Liquidación semanal generada automáticamente por sistema'
    };

    onAddLiquidacionSemanal(newLiq);
    setShowNewSemanalModal(false);
  };

  // Generate Monthly Liquidation
  const handleCreateMensual = () => {
    const user = usuarios.find(u => u.id === mesUsuarioId);
    if (!user) return;

    // Calculate pending/unliquidated commissions
    const pendComs = comisiones
      .filter(c => c.cobradorId === user.id && c.estado === 'VERIFICADO')
      .reduce((sum, c) => sum + c.montoComision, 0);

    const totalNeto = (mesBasico + pendComs) - (mesDescuentos + mesFinanciacionBeneficios);

    const newLiq: LiquidacionMensual = {
      id: `LIQ-MES-${Date.now().toString().slice(-5)}`,
      usuarioId: user.id,
      usuarioNombre: user.nombre,
      rolNombre: 'Empleado / Operador',
      periodoMes: mesPeriodo,
      fechaGeneracion: new Date().toISOString().split('T')[0],
      sueldoBasico: mesBasico,
      comisionesPendientesLiquidar: pendComs,
      adicionales: 0,
      descuentos: mesDescuentos,
      descuentoFinanciacionBeneficios: mesFinanciacionBeneficios,
      totalNetoMensual: totalNeto,
      estado: 'PENDIENTE',
      observaciones: 'Liquidación mensual de sueldo básico y adicionales'
    };

    onAddLiquidacionMensual(newLiq);
    setShowNewMensualModal(false);
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

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 font-sans text-slate-100 pb-20">
      
      {/* Header Banner */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <DollarSign className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Módulo de Liquidaciones & Comisiones</h2>
            <p className="text-xs font-medium text-slate-400">
              Generación automática de recibos semanales, liquidaciones mensuales de sueldo y reglas de comisiones.
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

      {/* Performance & Commission Metrics Summary Panel */}
      {(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const myComisiones = comisiones.filter(c => !activeUser || activeUser.rolId !== 'COBRADOR' || c.cobradorId === activeUser.id);
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
                Resumen Real en Vivo: Comisiones y Efectividad
              </span>
              <span className="text-[10px] font-bold text-slate-400">Actualizado en Tiempo Real</span>
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
