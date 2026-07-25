/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Configuracion, Feriado, Cliente, Operacion, Cuota, Pago, TransaccionTesoreria, ConfiguracionComisiones } from '../types';
import { 
  Settings, Calendar, Percent, Plus, Trash2, CheckCircle2, 
  HelpCircle, ShieldCheck, DollarSign, Download, Upload, FileSpreadsheet, Database,
  Cloud, Check, X, Wifi, AlertTriangle, FileText, Lock,
  TrendingUp, Phone, MessageCircle, UserCheck, UserPlus, Award
} from 'lucide-react';
import { 
  getSavedFirebaseConfig, 
  saveFirebaseConfig, 
  isFirebaseEnabled, 
  setFirebaseEnabled, 
  isAutoSyncEnabled, 
  setAutoSyncEnabled, 
  getGoogleSheetUrl, 
  saveGoogleSheetUrl,
  uploadAllToFirestore,
  downloadAllFromFirestore,
  initializeFirebase,
  syncToGoogleSheet
} from '../lib/firebaseSync';
import { 
  exportClientesToCSV, 
  exportOperacionesToCSV, 
  exportCuotasToCSV, 
  exportPagosToCSV, 
  exportTesoreriaToCSV, 
  downloadFullBackupJSON,
  exportAllToZIP
} from '../utils/exportHelper';

interface ConfiguracionViewProps {
  configuracion: Configuracion;
  configComisiones?: ConfiguracionComisiones;
  feriados: Feriado[];
  clientes: Cliente[];
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
  transacciones: TransaccionTesoreria[];
  onUpdateConfiguracion: (config: Configuracion) => void;
  onUpdateConfigComisiones?: (config: ConfiguracionComisiones) => void;
  onAddFeriado: (feriado: Feriado) => void;
  onDeleteFeriado: (fecha: string) => void;
  onClearDatabase: () => void;
  onResetToSeed: () => void;
  onRestoreBackup: (data: any) => void;
}

export default function ConfiguracionView({
  configuracion,
  configComisiones,
  feriados,
  clientes,
  operaciones,
  cuotas,
  pagos,
  transacciones,
  onUpdateConfiguracion,
  onUpdateConfigComisiones,
  onAddFeriado,
  onDeleteFeriado,
  onClearDatabase,
  onResetToSeed,
  onRestoreBackup,
}: ConfiguracionViewProps) {
  
  // Rate edit states
  const [interesDiario, setInteresDiario] = useState(configuracion.interesDiario);
  const [interesSemanal, setInteresSemanal] = useState(configuracion.interesSemanal);
  const [interesQuincenal, setInteresQuincenal] = useState(configuracion.interesQuincenal);
  const [interesMensual, setInteresMensual] = useState(configuracion.interesMensual);
  const [tasaMensualBase, setTasaMensualBase] = useState(configuracion.tasaMensualBase);

  // Commission Module States
  const [porcentajeComisionCobranza, setPorcentajeComisionCobranza] = useState(configComisiones?.porcentajeComisionCobranza ?? 5);
  const [fijoComisionCobranza, setFijoComisionCobranza] = useState(configComisiones?.fijoComisionCobranza ?? 500);
  const [montoComisionLlamada, setMontoComisionLlamada] = useState(configComisiones?.montoComisionLlamada ?? 300);
  const [montoComisionMensaje, setMontoComisionMensaje] = useState(configComisiones?.montoComisionMensaje ?? 150);
  const [montoComisionCaptacionCliente, setMontoComisionCaptacionCliente] = useState(configComisiones?.montoComisionCaptacionCliente ?? 2500);
  const [montoComisionVerificacionCliente, setMontoComisionVerificacionCliente] = useState(configComisiones?.montoComisionVerificacionCliente ?? 2000);

  // New Goal & Minimum Payments states
  const [metaCobranzaMonto, setMetaCobranzaMonto] = useState(configuracion.metaCobranzaMonto ?? 3000000);
  const [metaCobranzaPlazo, setMetaCobranzaPlazo] = useState(configuracion.metaCobranzaPlazo ?? 'mensual');
  const [pagoMinimoCuotas, setPagoMinimoCuotas] = useState(configuracion.pagoMinimoCuotas ?? 2);

  // Mora alerts thresholds states
  const [moraDiarioAvisoDias, setMoraDiarioAvisoDias] = useState(configuracion.moraDiarioAvisoDias ?? 1);
  const [moraDiarioLlamarDias, setMoraDiarioLlamarDias] = useState(configuracion.moraDiarioLlamarDias ?? 2);
  const [moraDiarioCobradorDias, setMoraDiarioCobradorDias] = useState(configuracion.moraDiarioCobradorDias ?? 6);

  const [moraSemanalAvisoDias, setMoraSemanalAvisoDias] = useState(configuracion.moraSemanalAvisoDias ?? 2);
  const [moraSemanalLlamarDias, setMoraSemanalLlamarDias] = useState(configuracion.moraSemanalLlamarDias ?? 4);
  const [moraSemanalCobradorDias, setMoraSemanalCobradorDias] = useState(configuracion.moraSemanalCobradorDias ?? 7);

  const [moraQuincenalAvisoDias, setMoraQuincenalAvisoDias] = useState(configuracion.moraQuincenalAvisoDias ?? 2);
  const [moraQuincenalLlamarDias, setMoraQuincenalLlamarDias] = useState(configuracion.moraQuincenalLlamarDias ?? 5);
  const [moraQuincenalCobradorDias, setMoraQuincenalCobradorDias] = useState(configuracion.moraQuincenalCobradorDias ?? 8);

  const [moraMensualAvisoDias, setMoraMensualAvisoDias] = useState(configuracion.moraMensualAvisoDias ?? 1);
  const [moraMensualLlamarDias, setMoraMensualLlamarDias] = useState(configuracion.moraMensualLlamarDias ?? 2);
  const [moraMensualCobradorDias, setMoraMensualCobradorDias] = useState(configuracion.moraMensualCobradorDias ?? 2);

  // Holiday form states
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevaDesc, setNuevaDesc] = useState('');

  // Firebase & Google Sheets Sync States
  const [fbConfig, setFbConfig] = useState(() => getSavedFirebaseConfig() || {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });
  const [fbEnabled, setFbEnabledState] = useState(() => isFirebaseEnabled());
  const [autoSync, setAutoSyncState] = useState(() => isAutoSyncEnabled());
  const [sheetUrl, setSheetUrlState] = useState(() => getGoogleSheetUrl());
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMsg, setSyncMsg] = useState('');

  const handleTestFirebase = () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      // Save configuration first
      saveFirebaseConfig(fbConfig);
      const initialized = initializeFirebase();
      if (initialized) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch (e) {
      console.error(e);
      setTestResult('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveSyncSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveFirebaseConfig(fbConfig);
    setFirebaseEnabled(fbEnabled);
    setAutoSyncEnabled(autoSync);
    saveGoogleSheetUrl(sheetUrl);
    
    if (fbEnabled) {
      initializeFirebase();
    }
    alert('¡Ajustes de sincronización guardados con éxito!');
  };

  const handleFullUpload = async () => {
    setSyncStatus('syncing');
    setSyncMsg('Preparando carga masiva de datos...');
    try {
      const result = await uploadAllToFirestore({
        clientes,
        operaciones,
        cuotas,
        pagos,
        transacciones,
        configuracion,
        feriados
      });
      if (result.success) {
        setSyncStatus('success');
        setSyncMsg('¡Todos los datos locales han sido respaldados con éxito en Firestore!');
        alert('¡Respaldo en la nube completado con éxito!');
      } else {
        setSyncStatus('error');
        setSyncMsg(`Error en la carga: ${result.error}`);
      }
    } catch (e: any) {
      setSyncStatus('error');
      setSyncMsg(`Fallo de conexión: ${e.message}`);
    }
  };

  const handleFullDownload = async () => {
    if (!confirm('¿Está seguro de que desea descargar los datos de la nube? Esto reemplazará TODOS los datos locales actuales de su computador por la información en Firebase.')) {
      return;
    }
    setSyncStatus('syncing');
    setSyncMsg('Conectando y descargando información de Firestore...');
    try {
      const result = await downloadAllFromFirestore();
      if (result.success && result.data) {
        onRestoreBackup(result.data);
        setSyncStatus('success');
        setSyncMsg('¡Información restaurada con éxito desde Firestore!');
        alert('¡Sincronización completada! Los datos de la nube han sido cargados localmente.');
      } else {
        setSyncStatus('error');
        setSyncMsg(`Error en la descarga: ${result.error}`);
      }
    } catch (e: any) {
      setSyncStatus('error');
      setSyncMsg(`Fallo de conexión: ${e.message}`);
    }
  };

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfiguracion({
      interesDiario,
      interesSemanal,
      interesQuincenal,
      interesMensual,
      tasaMensualBase,
      metaCobranzaMonto,
      metaCobranzaPlazo,
      pagoMinimoCuotas,
      moraDiarioAvisoDias,
      moraDiarioLlamarDias,
      moraDiarioCobradorDias,
      moraSemanalAvisoDias,
      moraSemanalLlamarDias,
      moraSemanalCobradorDias,
      moraQuincenalAvisoDias,
      moraQuincenalLlamarDias,
      moraQuincenalCobradorDias,
      moraMensualAvisoDias,
      moraMensualLlamarDias,
      moraMensualCobradorDias,
    });
    alert('¡Configuración de Tasas, Metas y Políticas de Alertas guardada con éxito!');
  };

  const handleAddFeriadoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaFecha || !nuevaDesc) {
      alert('Por favor complete la fecha y la descripción del feriado.');
      return;
    }
    
    // Check if duplicate
    if (feriados.some(f => f.fecha === nuevaFecha)) {
      alert('Ya existe un feriado registrado para esta fecha.');
      return;
    }

    onAddFeriado({
      fecha: nuevaFecha,
      descripcion: nuevaDesc,
      seCobra: false, // Default: no se cobra
    });

    setNuevaFecha('');
    setNuevaDesc('');
  };

  const handleSaveComisiones = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateConfigComisiones) {
      onUpdateConfigComisiones({
        ...(configComisiones || {
          montoContactoRecuperado: 2500,
          montoClienteInactivoRecuperado: 5000,
          porcentajeReintegroDesayuno: 50,
          limiteSemanalReintegroDesayuno: 15000,
          diaCierreSemanal: 'VIERNES',
          fechaProximaLiquidacionSemanal: 'Viernes 28/07',
          fechaProximaLiquidacionMensual: 'Viernes 31/07',
          basicoMensual: 450000,
          adicionalMovilidadSemanal: 25000,
          otrosConceptosAdd: 0,
          descuentoBeneficiosFinanciacion: 0
        }),
        porcentajeComisionCobranza,
        fijoComisionCobranza,
        montoComisionLlamada,
        montoComisionMensaje,
        montoComisionCaptacionCliente,
        montoComisionVerificacionCliente
      });
      alert('¡Módulo de Tarifas y Valores de Comisiones guardado con éxito!');
    }
  };

  return (
    <div id="configuracion-section" className="space-y-6">
      
      {/* Header */}
      <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg backdrop-blur-md">
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          Configuración Global del Sistema Maestro
        </h2>
        <p className="text-xs text-emerald-200/80 mt-1">
          Ajuste los parámetros financieros fundamentales, la tasa mensual base y el calendario de exclusión de cobro (domingos y feriados).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Card: Interest Rates Config */}
        <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg space-y-6 backdrop-blur-md">
          <h3 className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-2 border-b border-emerald-800/80 pb-3">
            <Percent className="w-4 h-4 text-emerald-400" />
            Parámetros y Tasas de Interés
          </h3>

          <form onSubmit={handleSaveRates} className="space-y-4">
            <div className="space-y-4">
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
                    Tasa Mensual de Interés Diario (%)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-bold">20 cuotas por mes</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step={0.1}
                    value={interesDiario}
                    onChange={(e) => setInteresDiario(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-800/80 rounded-lg text-sm font-bold text-white pr-10 focus:outline-hidden focus:border-emerald-400 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-emerald-400">%</span>
                </div>
                <p className="text-[10px] text-emerald-300/70 mt-1">
                  Tasa mensual aplicada a créditos diarios. Por ejemplo, 50% de interés mensual sobre el capital.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
                    Tasa Mensual de Interés Semanal (%)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-bold">4 cuotas por mes</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step={0.1}
                    value={interesSemanal}
                    onChange={(e) => setInteresSemanal(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-800/80 rounded-lg text-sm font-bold text-white pr-10 focus:outline-hidden focus:border-emerald-400 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-emerald-400">%</span>
                </div>
                <p className="text-[10px] text-emerald-300/70 mt-1">
                  Tasa mensual aplicada a créditos semanales. Un plan de 8 cuotas semanales equivale a 2 meses.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
                    Tasa Mensual de Interés Quincenal (%)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-bold">2 cuotas por mes</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step={0.1}
                    value={interesQuincenal}
                    onChange={(e) => setInteresQuincenal(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-800/80 rounded-lg text-sm font-bold text-white pr-10 focus:outline-hidden focus:border-emerald-400 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-emerald-400">%</span>
                </div>
                <p className="text-[10px] text-emerald-300/70 mt-1">
                  Tasa mensual aplicada a créditos quincenales. Un plan de 4 cuotas quincenales equivale a 2 meses.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
                    Tasa Mensual de Interés Mensual (%)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-bold">1 cuota por mes</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step={0.1}
                    value={interesMensual}
                    onChange={(e) => setInteresMensual(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-800/80 rounded-lg text-sm font-bold text-white pr-10 focus:outline-hidden focus:border-emerald-400 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-emerald-400">%</span>
                </div>
                <p className="text-[10px] text-emerald-300/70 mt-1">
                  Tasa de interés mensual aplicada directamente sobre la cantidad de meses totales del préstamo.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
                    Tasa Mensual Base de Respaldo (%)
                  </label>
                  <span className="text-[10px] text-emerald-300/80">Para cálculos de amortización extraordinaria</span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step={0.1}
                    value={tasaMensualBase}
                    onChange={(e) => setTasaMensualBase(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-800/80 rounded-lg text-sm font-bold text-white pr-10 focus:outline-hidden focus:border-emerald-400 focus:bg-slate-900 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-emerald-400">%</span>
                </div>
              </div>

              {/* Sub-section: Metas de Cobranza y Gestión de Mora */}
              <div className="pt-4 border-t border-emerald-800/80 space-y-4">
                <h4 className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
                  Metas de Cobranza y Alertas de Mora
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-200 uppercase tracking-wider mb-1">
                      Meta de Cobranza ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-emerald-400">$</span>
                      <input
                        type="number"
                        value={metaCobranzaMonto}
                        onChange={(e) => setMetaCobranzaMonto(Number(e.target.value))}
                        className="w-full pl-7 pr-3 py-2 bg-slate-900 border border-emerald-800/80 rounded-lg text-sm font-bold text-white focus:outline-hidden focus:border-emerald-400"
                        placeholder="Monto meta"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-emerald-200 uppercase tracking-wider mb-1">
                      Plazo de la Meta
                    </label>
                    <select
                      value={metaCobranzaPlazo}
                      onChange={(e) => setMetaCobranzaPlazo(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-emerald-800/80 rounded-lg text-sm font-bold text-white focus:outline-hidden focus:border-emerald-400 cursor-pointer"
                    >
                      <option value="diario">Diario</option>
                      <option value="semanal">Semanal</option>
                      <option value="quincenal">Quincenal</option>
                      <option value="mensual">Mensual</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-200 uppercase tracking-wider mb-1">
                    Pago Mínimo Requerido (Cuotas para Alerta)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={pagoMinimoCuotas}
                    onChange={(e) => setPagoMinimoCuotas(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-800/80 rounded-lg text-sm font-bold text-white focus:outline-hidden focus:border-emerald-400"
                    placeholder="E.g., 2 cuotas"
                  />
                  <p className="text-[10px] text-emerald-300/70 mt-1">
                    Cantidad de cuotas vencidas que el cobrador requiere saldar para evitar la advertencia de pago mínimo en el panel.
                  </p>
                </div>

                {/* Políticas de Alertas y Cobranza por Frecuencia */}
                <div className="pt-4 border-t border-emerald-800/80 space-y-4 text-left">
                  <h4 className="text-[10px] font-extrabold text-emerald-300 bg-emerald-900/60 border border-emerald-700/80 px-3.5 py-1.5 rounded-lg uppercase tracking-wider inline-block">
                    Políticas de Alertas por Frecuencia
                  </h4>
                  
                  <div className="space-y-4 bg-slate-900/80 p-4 rounded-xl border border-emerald-800/80">
                    {/* DIARIA */}
                    <div className="space-y-2 border-b border-emerald-800/50 pb-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-white">Crédito DIARIO</span>
                        <span className="text-[10px] bg-emerald-900/80 text-emerald-300 font-bold px-1.5 py-0.5 rounded border border-emerald-700/80 uppercase">Días de Mora</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-emerald-300/80 uppercase tracking-wide block mb-1">Aviso Regular</label>
                          <input
                            type="number"
                            min={1}
                            value={moraDiarioAvisoDias}
                            onChange={(e) => setMoraDiarioAvisoDias(Math.max(1, Number(e.target.value)))}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-emerald-800/80 rounded text-xs font-extrabold text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-emerald-300/80 uppercase tracking-wide block mb-1">Alerta/Llamar</label>
                          <input
                            type="number"
                            min={1}
                            value={moraDiarioLlamarDias}
                            onChange={(e) => setMoraDiarioLlamarDias(Math.max(1, Number(e.target.value)))}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-emerald-800/80 rounded text-xs font-extrabold text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-emerald-300/80 uppercase tracking-wide block mb-1">Enviar Cobrador</label>
                          <input
                            type="number"
                            min={1}
                            value={moraDiarioCobradorDias}
                            onChange={(e) => setMoraDiarioCobradorDias(Math.max(1, Number(e.target.value)))}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-emerald-800/80 rounded text-xs font-extrabold text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* SEMANAL */}
                    <div className="space-y-2 border-b border-emerald-800/50 pb-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-white">Crédito SEMANAL</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-emerald-300/80 uppercase tracking-wide block mb-1">Aviso Regular</label>
                          <input
                            type="number"
                            min={1}
                            value={moraSemanalAvisoDias}
                            onChange={(e) => setMoraSemanalAvisoDias(Math.max(1, Number(e.target.value)))}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-emerald-800/80 rounded text-xs font-extrabold text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-emerald-300/80 uppercase tracking-wide block mb-1">Alerta/Llamar</label>
                          <input
                            type="number"
                            min={1}
                            value={moraSemanalLlamarDias}
                            onChange={(e) => setMoraSemanalLlamarDias(Math.max(1, Number(e.target.value)))}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-emerald-800/80 rounded text-xs font-extrabold text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-emerald-300/80 uppercase tracking-wide block mb-1">Enviar Cobrador</label>
                          <input
                            type="number"
                            min={1}
                            value={moraSemanalCobradorDias}
                            onChange={(e) => setMoraSemanalCobradorDias(Math.max(1, Number(e.target.value)))}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-emerald-800/80 rounded text-xs font-extrabold text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* MENSUAL */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-white">Crédito MENSUAL</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] font-bold text-emerald-300/80 uppercase tracking-wide block mb-1">Aviso Regular</label>
                          <input
                            type="number"
                            min={1}
                            value={moraMensualAvisoDias}
                            onChange={(e) => setMoraMensualAvisoDias(Math.max(1, Number(e.target.value)))}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-emerald-800/80 rounded text-xs font-extrabold text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-emerald-300/80 uppercase tracking-wide block mb-1">Alerta/Llamar</label>
                          <input
                            type="number"
                            min={1}
                            value={moraMensualLlamarDias}
                            onChange={(e) => setMoraMensualLlamarDias(Math.max(1, Number(e.target.value)))}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-emerald-800/80 rounded text-xs font-extrabold text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-emerald-300/80 uppercase tracking-wide block mb-1">Enviar Cobrador</label>
                          <input
                            type="number"
                            min={1}
                            value={moraMensualCobradorDias}
                            onChange={(e) => setMoraMensualCobradorDias(Math.max(1, Number(e.target.value)))}
                            className="w-full px-2 py-1.5 bg-slate-900 border border-emerald-800/80 rounded text-xs font-extrabold text-white font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-md hover:shadow-none flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-500/30"
            >
              <CheckCircle2 className="w-4 h-4" />
              Guardar Configuración Financiera
            </button>
          </form>

          {/* Guidelines notes */}
          <div className="p-4 bg-slate-900/80 border border-emerald-800/80 rounded-lg space-y-2 text-xs text-emerald-200/80">
            <h4 className="font-bold text-emerald-300 uppercase flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Filosofía del Negocio Credi-Cash
            </h4>
            <p>
              1. <b>Frecuencia Diaria:</b> Siempre aplica exactamente un único mes de interés, sin importar la cantidad de cuotas (por defecto 20 cuotas).
            </p>
            <p>
              2. <b>Frecuencias Mayoristas (Semanal, Quincenal, Mensual):</b> Los meses de financiamiento se computan en base a la cantidad de cuotas, multiplicándose la tasa por mes por la duración del préstamo.
            </p>
          </div>
        </div>

        {/* Right Card: Calendario de Feriados (No Cobra) */}
        <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg space-y-6 backdrop-blur-md">
          <h3 className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-2 border-b border-emerald-800/80 pb-3">
            <Calendar className="w-5 h-5 text-emerald-400" />
            Calendario de Feriados No Cobrables
          </h3>

          {/* Form to add custom holiday */}
          <form onSubmit={handleAddFeriadoSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-emerald-200 uppercase tracking-wider mb-1">
                Fecha de Exclusión
              </label>
              <input
                type="date"
                required
                value={nuevaFecha}
                onChange={(e) => setNuevaFecha(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-emerald-800/80 text-white rounded-lg text-xs focus:outline-hidden focus:border-emerald-400"
              />
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-emerald-200 uppercase tracking-wider mb-1">
                  Descripción (Feriado nacional o interno)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Día de la Independencia"
                  value={nuevaDesc}
                  onChange={(e) => setNuevaDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-emerald-800/80 text-white rounded-lg text-xs focus:outline-hidden focus:border-emerald-400 placeholder:text-emerald-300/40"
                />
              </div>
              <button
                type="submit"
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer shadow-md hover:shadow-none border border-emerald-500/30"
                title="Agregar Feriado"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Calendar exclusion rules explanation */}
          <div className="bg-amber-950/60 border border-amber-800/80 p-3.5 rounded-lg text-xs text-amber-200 space-y-1.5">
            <p className="font-bold uppercase tracking-wider flex items-center gap-1 text-[10px] text-amber-300">
              <Calendar className="w-4 h-4 shrink-0" />
              REGLAS DEL CRONOGRAMA AUTOMÁTICO:
            </p>
            <ul className="list-disc list-inside space-y-1 text-amber-200/90 text-[11px]">
              <li><b>Domingos:</b> Nunca se cobra. Se corre automáticamente al siguiente día hábil.</li>
              <li><b>Feriados:</b> Si el vencimiento programado coincide con un feriado de la lista inferior, se pospone al siguiente día hábil.</li>
            </ul>
          </div>

          {/* Holidays list */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Feriados Cargados</h4>
            
            <div className="border border-emerald-800/80 rounded-2xl overflow-hidden max-h-[220px] overflow-y-auto bg-slate-900/60">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-emerald-900/50 border-b border-emerald-800/80 text-emerald-300 font-bold uppercase tracking-wider">
                    <th className="py-2 px-4">Fecha</th>
                    <th className="py-2 px-4">Descripción</th>
                    <th className="py-2 px-4 text-center">Se Cobra</th>
                    <th className="py-2 px-4 text-center">Eliminar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-800/50 text-emerald-100 font-medium">
                  {feriados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-emerald-400/70 italic">
                        No hay feriados nacionales o locales configurados.
                      </td>
                    </tr>
                  ) : (
                    [...feriados]
                      .sort((a, b) => a.fecha.localeCompare(b.fecha))
                      .map((f) => (
                        <tr key={f.fecha} className="hover:bg-emerald-900/30">
                          <td className="py-2.5 px-4 font-mono font-bold text-white">{f.fecha}</td>
                          <td className="py-2.5 px-4">{f.descripcion}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="px-1.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-800/80 font-bold rounded-sm text-[9px] uppercase">
                              NO
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => onDeleteFeriado(f.fecha)}
                              className="text-emerald-400 hover:text-rose-400 transition-colors p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

      {/* MODULE: CONFIGURACION DE COMISIONES POR ROL Y ACCION */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-6 rounded-2xl border-2 border-amber-500/80 shadow-xl space-y-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-500/40 pb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
              Módulo de Valores y Estructura Comercial
            </span>
            <h3 className="text-lg font-black text-white flex items-center gap-2 mt-0.5">
              <Award className="w-5 h-5 text-amber-400" />
              Configuración de Tarifas y Montos de Comisiones
            </h3>
          </div>
          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider self-start sm:self-auto">
            Impacto Directo en Liquidaciones
          </span>
        </div>

        <form onSubmit={handleSaveComisiones} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* 1. Comisiones Cobrador Calle / Cobro */}
            <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80 space-y-3">
              <div className="flex items-center gap-2 border-b border-emerald-800/60 pb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Cobranza de Calle (Cobrador)
                </h4>
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-emerald-200 uppercase tracking-wider block mb-1">
                  Porcentaje de Comisión por Cobro (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={porcentajeComisionCobranza}
                    onChange={(e) => setPorcentajeComisionCobranza(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-emerald-800 rounded-lg text-sm font-bold text-emerald-300 pr-8 focus:outline-hidden focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-amber-400">%</span>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-emerald-200 uppercase tracking-wider block mb-1">
                  Monto Fijo Mínimo por Cobro ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-400">$</span>
                  <input
                    type="number"
                    value={fijoComisionCobranza}
                    onChange={(e) => setFijoComisionCobranza(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-emerald-800 rounded-lg text-sm font-bold text-emerald-300 focus:outline-hidden focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            {/* 2. Cobranza Telefónica */}
            <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80 space-y-3">
              <div className="flex items-center gap-2 border-b border-emerald-800/60 pb-2">
                <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Cobranzas Telefónicas
                </h4>
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-emerald-200 uppercase tracking-wider block mb-1">
                  Comisión por Llamada / Gestión Concretada ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-amber-400">$</span>
                  <input
                    type="number"
                    value={montoComisionLlamada}
                    onChange={(e) => setMontoComisionLlamada(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-emerald-800 rounded-lg text-sm font-bold text-amber-300 focus:outline-hidden focus:border-amber-400"
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1">
                  Monto acreditado al operador al registrar una llamada efectuada.
                </p>
              </div>
            </div>

            {/* 3. Gestión de WhatsApp */}
            <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80 space-y-3">
              <div className="flex items-center gap-2 border-b border-emerald-800/60 pb-2">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Gestión de WhatsApp
                </h4>
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-emerald-200 uppercase tracking-wider block mb-1">
                  Comisión por Mensaje / Gestión enviada ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-400">$</span>
                  <input
                    type="number"
                    value={montoComisionMensaje}
                    onChange={(e) => setMontoComisionMensaje(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-emerald-800 rounded-lg text-sm font-bold text-emerald-300 focus:outline-hidden focus:border-amber-400"
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1">
                  Monto asignado por aviso o recordatorio enviado vía WhatsApp.
                </p>
              </div>
            </div>

            {/* 4. Captación de Cliente */}
            <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80 space-y-3">
              <div className="flex items-center gap-2 border-b border-emerald-800/60 pb-2">
                <UserPlus className="w-4 h-4 text-teal-400 shrink-0" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Captación de Cliente
                </h4>
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-emerald-200 uppercase tracking-wider block mb-1">
                  Monto Fijo por Captación / Alta de Nuevo Cliente ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-teal-400">$</span>
                  <input
                    type="number"
                    value={montoComisionCaptacionCliente}
                    onChange={(e) => setMontoComisionCaptacionCliente(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-emerald-800 rounded-lg text-sm font-bold text-teal-300 focus:outline-hidden focus:border-amber-400"
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1">
                  Comisión acreditada al asesor o captador que trae un nuevo cliente.
                </p>
              </div>
            </div>

            {/* 5. Verificación de Cliente */}
            <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80 space-y-3 lg:col-span-2">
              <div className="flex items-center gap-2 border-b border-emerald-800/60 pb-2">
                <UserCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Verificación de Cliente en Domicilio
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold text-emerald-200 uppercase tracking-wider block mb-1">
                    Monto Fijo por Verificación Concretada ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-indigo-400">$</span>
                    <input
                      type="number"
                      value={montoComisionVerificacionCliente}
                      onChange={(e) => setMontoComisionVerificacionCliente(Number(e.target.value))}
                      className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-emerald-800 rounded-lg text-sm font-bold text-indigo-300 focus:outline-hidden focus:border-amber-400"
                    />
                  </div>
                </div>
                <div className="flex items-center text-[10px] text-slate-300 leading-relaxed bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                  <p>
                    Acredita la tarifa fija cuando el verificador confirma presencialmente los datos, recibo de sueldo y foto de fachada del cliente.
                  </p>
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-end pt-2 border-t border-emerald-800/80">
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-6 py-3 rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-950/80 uppercase tracking-wider transition-all"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[3]" />
              <span>Guardar Tarifas de Comisiones</span>
            </button>
          </div>
        </form>
      </div>

      {/* Export & Excel Section */}
      <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg space-y-4 backdrop-blur-md">
        <h3 className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-2 border-b border-emerald-800/80 pb-3">
          <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-400" />
          Exportación de Reportes a Microsoft Excel (CSV)
        </h3>
        <p className="text-xs text-emerald-200/80 leading-relaxed">
          Descargue los datos actuales en formato de texto delimitado por comas (CSV) codificado en UTF-8 con marca de orden de bytes (BOM). 
          Esto permite que Microsoft Excel, Google Sheets, LibreOffice u otras hojas de cálculo abran la información con tildes, símbolos de moneda, números de teléfono y formatos de manera perfecta.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2">
          <button
            type="button"
            onClick={() => exportClientesToCSV(clientes)}
            className="p-3 bg-slate-900 hover:bg-emerald-900/60 hover:text-white text-emerald-200 rounded-xl border border-emerald-800/80 text-xs font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer text-center"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Exportar Clientes</span>
          </button>

          <button
            type="button"
            onClick={() => exportOperacionesToCSV(operaciones)}
            className="p-3 bg-slate-900 hover:bg-emerald-900/60 hover:text-white text-emerald-200 rounded-xl border border-emerald-800/80 text-xs font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer text-center"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Exportar Préstamos</span>
          </button>

          <button
            type="button"
            onClick={() => exportCuotasToCSV(cuotas)}
            className="p-3 bg-slate-900 hover:bg-emerald-900/60 hover:text-white text-emerald-200 rounded-xl border border-emerald-800/80 text-xs font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer text-center"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Plan de Cuotas</span>
          </button>

          <button
            type="button"
            onClick={() => exportPagosToCSV(pagos)}
            className="p-3 bg-slate-900 hover:bg-emerald-900/60 hover:text-white text-emerald-200 rounded-xl border border-emerald-800/80 text-xs font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer text-center"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Historial Pagos</span>
          </button>

          <button
            type="button"
            onClick={() => exportTesoreriaToCSV(transacciones)}
            className="p-3 bg-slate-900 hover:bg-emerald-900/60 hover:text-white text-emerald-200 rounded-xl border border-emerald-800/80 text-xs font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer text-center col-span-2 md:col-span-1"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Movimientos Caja</span>
          </button>

          <button
            type="button"
            onClick={() => exportAllToZIP({ clientes, operaciones, cuotas, pagos, transacciones })}
            className="p-3 bg-emerald-900/80 hover:bg-emerald-800 text-white rounded-xl border border-emerald-600 text-xs font-bold flex flex-col items-center gap-2 transition-all cursor-pointer text-center col-span-2 md:col-span-1"
          >
            <Database className="w-5 h-5 text-emerald-300" />
            <span>Respaldo ZIP (Excel)</span>
          </button>
        </div>
      </div>

      {/* Backup and Restore Section */}
      <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg space-y-4 backdrop-blur-md">
        <h3 className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-2 border-b border-emerald-800/80 pb-3">
          <Database className="w-4.5 h-4.5 text-emerald-400" />
          Copias de Seguridad y Respaldo Completo (JSON)
        </h3>
        <p className="text-xs text-emerald-200/80 leading-relaxed">
          Descargue un archivo de respaldo completo que incluye absolutamente todos los registros del sistema (clientes, cuotas, configuración de intereses, pagos y movimientos de caja). 
          Puede guardar este archivo en su computadora, Google Drive o enviarlo por correo. En caso de cambiar de computador, simplemente cargue el archivo aquí para recuperar su trabajo al instante.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          
          {/* Download card */}
          <div className="p-4 bg-slate-900/80 rounded-xl border border-emerald-800/80 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Paso 1: Descargar</span>
              <h4 className="text-xs font-bold text-white">Crear archivo de respaldo maestro</h4>
              <p className="text-[11px] text-emerald-200/70">Genera una copia en limpio con fecha y hora para resguardar su cartera.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                downloadFullBackupJSON({
                  clientes,
                  operaciones,
                  cuotas,
                  pagos,
                  transacciones,
                  configuracion
                });
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-md hover:shadow-none flex items-center justify-center gap-2 cursor-pointer self-start border border-emerald-500/30"
            >
              <Download className="w-4 h-4" />
              Descargar Respaldo Completo
            </button>
          </div>

          {/* Upload card */}
          <div className="p-4 bg-slate-900/80 rounded-xl border border-emerald-800/80 flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Paso 2: Restaurar</span>
              <h4 className="text-xs font-bold text-white">Cargar un archivo de respaldo previo</h4>
              <p className="text-[11px] text-emerald-200/70">Seleccione un archivo ".json" de su computador para reestablecer la base de datos.</p>
            </div>
            
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const json = JSON.parse(event.target?.result as string);
                      if (json && json.data) {
                        if (confirm('¡ATENCIÓN! Cargar este respaldo reemplazará por completo todos los datos actuales del sistema por los contenidos en la copia. ¿Desea proceder?')) {
                          onRestoreBackup(json.data);
                          alert('¡Base de datos restaurada con éxito! La página reflejará los datos cargados.');
                        }
                      } else {
                        alert('El archivo seleccionado no tiene el formato de respaldo de Credi-Cash válido.');
                      }
                    } catch (err) {
                      alert('Error al leer el archivo. Asegúrese de que sea un archivo JSON válido.');
                    }
                  };
                  reader.readAsText(file);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Cargar archivo"
              />
              <div className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-200 rounded-lg text-xs font-bold uppercase tracking-widest border border-emerald-700 transition-all flex items-center justify-center gap-2 pointer-events-none">
                <Upload className="w-4 h-4 text-emerald-400" />
                Seleccionar Respaldo (.json)
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Cloud & Sync Section */}
      <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg space-y-6 backdrop-blur-md">
        <h3 className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-2 border-b border-emerald-800/80 pb-3">
          <Cloud className="w-5 h-5 text-emerald-400" />
          Sincronización en la Nube (Firebase & Google Sheets)
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
          
          {/* Left Side: Firebase Settings */}
          <div className="space-y-4 border-r border-emerald-800/80 lg:pr-6">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-400" />
                Configurar Base de Datos Firebase
              </h4>
              <span className={`px-2 py-0.5 text-[9px] font-bold rounded-sm uppercase tracking-wide flex items-center gap-1 ${fbEnabled ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/80' : 'bg-slate-900 text-emerald-400/60 border border-emerald-800/80'}`}>
                {fbEnabled ? <Wifi className="w-2.5 h-2.5" /> : null}
                {fbEnabled ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <p className="text-xs text-emerald-200/80">
              Complete los campos inferiores con las credenciales de su proyecto Firebase (consola Firebase &gt; Configuración del proyecto &gt; Sus Apps). 
              Esto permitirá subir toda su información financiera de forma segura, duradera y acceder desde cualquier computador.
            </p>

            <form onSubmit={handleSaveSyncSettings} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-emerald-300/80 uppercase tracking-wide mb-1">API Key</label>
                  <input
                    type="password"
                    value={fbConfig.apiKey}
                    onChange={(e) => setFbConfig({ ...fbConfig, apiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-emerald-800/80 rounded-lg text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-emerald-300/80 uppercase tracking-wide mb-1">Project ID</label>
                  <input
                    type="text"
                    value={fbConfig.projectId}
                    onChange={(e) => setFbConfig({ ...fbConfig, projectId: e.target.value })}
                    placeholder="credicash-app"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-emerald-800/80 rounded-lg text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-emerald-300/80 uppercase tracking-wide mb-1">Auth Domain</label>
                  <input
                    type="text"
                    value={fbConfig.authDomain}
                    onChange={(e) => setFbConfig({ ...fbConfig, authDomain: e.target.value })}
                    placeholder="credicash-app.firebaseapp.com"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-emerald-800/80 rounded-lg text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-emerald-300/80 uppercase tracking-wide mb-1">Storage Bucket</label>
                  <input
                    type="text"
                    value={fbConfig.storageBucket}
                    onChange={(e) => setFbConfig({ ...fbConfig, storageBucket: e.target.value })}
                    placeholder="credicash-app.appspot.com"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-emerald-800/80 rounded-lg text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-emerald-300/80 uppercase tracking-wide mb-1">Messaging Sender ID</label>
                  <input
                    type="text"
                    value={fbConfig.messagingSenderId}
                    onChange={(e) => setFbConfig({ ...fbConfig, messagingSenderId: e.target.value })}
                    placeholder="1234567890"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-emerald-800/80 rounded-lg text-xs font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-emerald-300/80 uppercase tracking-wide mb-1">App ID</label>
                  <input
                    type="text"
                    value={fbConfig.appId}
                    onChange={(e) => setFbConfig({ ...fbConfig, appId: e.target.value })}
                    placeholder="1:123:web:abc"
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-emerald-800/80 rounded-lg text-xs font-mono text-white"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-2 pt-2 border-t border-emerald-800/80">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fbEnabled}
                    onChange={(e) => setFbEnabledState(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-white">Habilitar conexión activa a Firebase</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none pl-6">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => setAutoSyncState(e.target.checked)}
                    className="rounded text-emerald-500 focus:ring-emerald-500/20 w-4 h-4 cursor-pointer"
                    disabled={!fbEnabled}
                  />
                  <span className="text-[11px] text-emerald-200/80">Auto-guardar en la nube al ingresar un cliente, préstamo o pago</span>
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestFirebase}
                  disabled={isTesting}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-200 border border-emerald-800/80 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  {isTesting ? 'Probando...' : 'Probar Conexión'}
                  {testResult === 'success' && <Check className="w-4 h-4 text-emerald-400" />}
                  {testResult === 'error' && <X className="w-4 h-4 text-rose-400" />}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-none flex-1 flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-500/30"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Guardar Ajustes de Nube
                </button>
              </div>
            </form>

            {/* Cloud actions */}
            {fbEnabled && (
              <div className="p-4 bg-slate-900/80 border border-emerald-800/80 rounded-xl space-y-3 pt-3">
                <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest block">Panel de Sincronización Manual</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleFullUpload}
                    disabled={syncStatus === 'syncing'}
                    className="p-3 bg-slate-900 hover:bg-amber-950/50 hover:text-amber-200 text-emerald-200 rounded-lg border border-emerald-800/80 hover:border-amber-700 text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all text-center shadow-xs"
                  >
                    <Upload className="w-5 h-5 text-amber-400" />
                    <span>Subir a Firebase</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleFullDownload}
                    disabled={syncStatus === 'syncing'}
                    className="p-3 bg-slate-900 hover:bg-emerald-900/50 hover:text-white text-emerald-200 rounded-lg border border-emerald-800/80 hover:border-emerald-700 text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all text-center shadow-xs"
                  >
                    <Download className="w-5 h-5 text-emerald-400" />
                    <span>Descargar de Firebase</span>
                  </button>
                </div>

                {syncStatus !== 'idle' && (
                  <div className={`p-2 rounded text-[11px] font-bold flex items-center gap-1.5 ${
                    syncStatus === 'syncing' ? 'bg-amber-950/80 text-amber-200 border border-amber-800' :
                    syncStatus === 'success' ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-700' : 'bg-rose-950/80 text-rose-200 border border-rose-800'
                  }`}>
                    {syncStatus === 'syncing' ? <Cloud className="w-3.5 h-3.5 animate-bounce text-amber-400" /> : <Check className="w-3.5 h-3.5" />}
                    <span>{syncMsg}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side: Google Sheets Integration */}
          <div className="space-y-4 lg:pl-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
              <FileSpreadsheet className="w-4.5 h-4.5 text-emerald-400" />
              Sincronizar con Google Sheets (Excel)
            </h4>

            <p className="text-xs text-emerald-200/80 leading-relaxed">
              Envíe automáticamente un duplicado en tiempo real de cada cliente registrado y cuota cobrada directamente a su planilla de cálculo personal de Google Drive.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-bold text-emerald-300/80 uppercase tracking-wide mb-1">
                  Google Apps Script Web App URL
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrlState(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full px-3 py-2 bg-slate-900 border border-emerald-800/80 text-white rounded-lg text-xs font-mono pr-8 focus:outline-hidden focus:border-emerald-400"
                    />
                    <span className="absolute right-3 top-3 flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${sheetUrl ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${sheetUrl ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      saveGoogleSheetUrl(sheetUrl);
                      alert('¡URL de Google Sheets guardada con éxito!');
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-none flex items-center gap-1 cursor-pointer border border-emerald-500/30"
                  >
                    <Check className="w-4 h-4" />
                    Guardar URL
                  </button>
                </div>
                <p className="text-[10px] text-emerald-300/70 mt-1">
                  Pega la URL de la aplicación web de Google Sheets y haz clic en "Guardar URL" para habilitar la sincronización en tiempo real.
                </p>
              </div>

              {/* Steps Guide Accordion */}
              <div className="bg-slate-900/80 border border-emerald-800/80 rounded-xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                  <FileText className="w-4 h-4 shrink-0" />
                  GUÍA PASO A PASO PARA CONECTAR:
                </span>
                
                <ol className="list-decimal list-inside text-[11px] text-emerald-200/90 space-y-2 leading-relaxed">
                  <li>Abre tu hoja de cálculo: <a href="https://docs.google.com/spreadsheets/d/1tI37AbnjOyB6BtluAIBOUAdIOTsCbvej3YJ6ykLb8YM/edit?pli=1" target="_blank" rel="noreferrer" className="text-emerald-400 font-bold underline hover:text-emerald-300">Ver Planilla</a>.</li>
                  <li>Ve a <b>Extensiones</b> &gt; <b>Apps Script</b>.</li>
                  <li>Crea 3 hojas en tu planilla llamadas exactamente: <b className="font-mono text-white">Clientes</b>, <b className="font-mono text-white">Préstamos</b> y <b className="font-mono text-white">Pagos</b>.</li>
                  <li>Borra todo el código que aparezca y pega el siguiente script:</li>
                </ol>

                <div className="relative">
                  <textarea
                    readOnly
                    value={`function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    var data = requestData.data;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "add_cliente") {
      var sheet = ss.getSheetByName("Clientes") || ss.getSheets()[0];
      sheet.appendRow([
        data.id, data.nombre, data.apellido, data.dni,
        data.telefono, data.direccion, data.estado,
        new Date().toISOString().split('T')[0]
      ]);
    } else if (action === "add_prestamo") {
      var sheet = ss.getSheetByName("Préstamos") || ss.getSheets()[0];
      var op = data.operacion;
      sheet.appendRow([
        op.id, op.idCliente, op.nombreCliente, op.capitalEntregado,
        op.cantidadCuotas, op.frecuenciaPago, op.valorCuota,
        op.montoTotalPagar, op.estado, op.fechaOtorgamiento
      ]);
    } else if (action === "add_pago") {
      var sheet = ss.getSheetByName("Pagos") || ss.getSheets()[0];
      var pago = data.pago;
      sheet.appendRow([
        pago.id, pago.idOperacion, pago.numeroCuota, pago.montoPagado,
        pago.fechaPago, pago.metodoPago, pago.cobradorNombre
      ]);
    }
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}`}
                    rows={6}
                    className="w-full p-2 bg-slate-950 text-emerald-300 rounded-lg text-[10px] font-mono focus:outline-hidden border border-emerald-800/80"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`function doPost(e) {
  try {
    var requestData = JSON.parse(e.postData.contents);
    var action = requestData.action;
    var data = requestData.data;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "add_cliente") {
      var sheet = ss.getSheetByName("Clientes") || ss.getSheets()[0];
      sheet.appendRow([
        data.id, data.nombre, data.apellido, data.dni,
        data.telefono, data.direccion, data.estado,
        new Date().toISOString().split('T')[0]
      ]);
    } else if (action === "add_prestamo") {
      var sheet = ss.getSheetByName("Préstamos") || ss.getSheets()[0];
      var op = data.operacion;
      sheet.appendRow([
        op.id, op.idCliente, op.nombreCliente, op.capitalEntregado,
        op.cantidadCuotas, op.frecuenciaPago, op.valorCuota,
        op.montoTotalPagar, op.estado, op.fechaOtorgamiento
      ]);
    } else if (action === "add_pago") {
      var sheet = ss.getSheetByName("Pagos") || ss.getSheets()[0];
      var pago = data.pago;
      sheet.appendRow([
        pago.id, pago.idOperacion, pago.numeroCuota, pago.montoPagado,
        pago.fechaPago, pago.metodoPago, pago.cobradorNombre
      ]);
    }
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}`);
                      alert('¡Código de Apps Script copiado al portapapeles!');
                    }}
                    className="absolute right-2 top-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded text-[9px] uppercase tracking-wide cursor-pointer transition-colors"
                  >
                    Copiar Código
                  </button>
                </div>

                <ol start={5} className="list-decimal list-inside text-[11px] text-emerald-200/90 space-y-2 leading-relaxed">
                  <li>Presiona el ícono de <b>Guardar</b> (disco duro) en Apps Script.</li>
                  <li>Haz clic en <b>Implementar</b> (Deploy) &gt; <b>Nueva implementación</b>.</li>
                  <li>Selecciona tipo: <b>Aplicación web</b>.</li>
                  <li>En "Quién tiene acceso" selecciona obligatoriamente: <b>Cualquier persona</b> (Anyone).</li>
                  <li>Haz clic en <b>Implementar</b>, autoriza los permisos con tu cuenta de Google y copia la <b>URL de la aplicación web</b> generada para pegarla arriba.</li>
                </ol>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Database Maintenance Section */}
      <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg space-y-4 backdrop-blur-md">
        <h3 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest flex items-center gap-2 border-b border-emerald-800/80 pb-3">
          <Trash2 className="w-4 h-4 text-rose-400" />
          Mantenimiento y Control de Base de Datos
        </h3>
        <p className="text-xs text-emerald-200/80 leading-relaxed">
          Para su seguridad y comodidad, el sistema almacena de forma 100% local todos los registros en su computador. 
          Al iniciar, cargamos unos <b>datos de prueba (Carlos Mendoza, María Laura, etc.)</b> para que pudiera experimentar la interfaz. 
          Use los siguientes controles cuando esté listo para empezar a registrar su información real:
        </p>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (confirm('¿Está seguro de que desea borrar todos los clientes, préstamos y pagos registrados? Esta acción limpiará por completo el sistema para que registre sus datos reales.')) {
                onClearDatabase();
                alert('¡Base de datos limpiada con éxito! Ahora el sistema está en blanco y listo para su uso real.');
              }
            }}
            className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-md hover:shadow-none flex items-center justify-center gap-2 cursor-pointer border border-rose-500/30"
          >
            <Trash2 className="w-4 h-4" />
            Limpiar Datos de Prueba (Iniciar en Blanco)
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('¿Desea volver a cargar los datos de prueba iniciales (Carlos, María, etc.)? Se sobrescribirá el estado actual.')) {
                onResetToSeed();
                alert('¡Datos de prueba restablecidos con éxito!');
              }
            }}
            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-emerald-200 border border-emerald-800/80 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Restablecer Datos de Demostración
          </button>
        </div>
      </div>

    </div>
  );
}
