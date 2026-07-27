/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Cliente, Operacion, Cuota, Pago, Feriado, 
  Configuracion, TransaccionTesoreria, PermisosRol, UsuarioRol, LiquidacionPersonal, FichajeAsistencia,
  ConfiguracionComisiones, ConfiguracionRecorrido, ComisionCobrador, VisitaDomicilio, VisitaReprogramada,
  LiquidacionSemanal, LiquidacionMensual, SolicitudReintegroDesayuno
} from './types';

import { calcularDiasAtrasoSinDomingos, sortCuotasByPaymentPriority } from './utils/cuotasGenerator';

import { 
  getSavedFirebaseConfig, 
  initializeFirebase, 
  isFirebaseEnabled, 
  isAutoSyncEnabled,
  uploadDocToFirestore, 
  deleteDocFromFirestore,
  downloadAllFromFirestore,
  subscribeToFirestore,
  generateShareableFirebaseLink,
  syncToGoogleSheet
} from './lib/firebaseSync';

// Import Views
import DashboardView from './components/DashboardView';
import ClientesView from './components/ClientesView';
import NuevoClienteView from './components/NuevoClienteView';
import OperacionesView from './components/OperacionesView';
import PagosView from './components/PagosView';
import TesoreriaView from './components/TesoreriaView';
import ConfiguracionView from './components/ConfiguracionView';
import UsuariosView from './components/UsuariosView';
import LoginView from './components/LoginView';
import CrediCashLogo from './components/CrediCashLogo';
import CobradorCampoView from './components/CobradorCampoView';
import LiquidacionesView from './components/LiquidacionesView';
import ClientesInactivosView from './components/ClientesInactivosView';

// Icons
import { 
  LayoutDashboard, Users, UserPlus, Briefcase, DollarSign, 
  Percent, Activity, Settings, Calendar, ShieldCheck, Mail, LogOut, CheckCircle2, ShieldAlert,
  Smartphone, PhoneCall, MapPin, Search, MessageCircle, Clock, ListOrdered, UserX, Shield
} from 'lucide-react';

const STORAGE_KEYS = {
  CLIENTES: 'credicash_clientes',
  OPERACIONES: 'credicash_operaciones',
  CUOTAS: 'credicash_cuotas',
  PAGOS: 'credicash_pagos',
  CONFIGURACION: 'credicash_configuracion',
  FERIADOS: 'credicash_feriados',
  TRANSACCIONES: 'credicash_transacciones',
  USUARIOS: 'credicash_usuarios',
  ROLES: 'credicash_roles',
  ACTIVE_USER_ID: 'credicash_active_user_id',
  LIQUIDACIONES: 'credicash_liquidaciones',
  FICHAJES: 'credicash_fichajes',
  CONFIG_COMISIONES: 'credicash_config_comisiones',
  CONFIG_RECORRIDO: 'credicash_config_recorrido',
  COMISIONES: 'credicash_comisiones',
  VISITAS_HISTORY: 'credicash_visitas_history',
  VISITAS_REPROGRAMADAS: 'credicash_visitas_reprogramadas',
  LIQUIDACIONES_SEMANALES: 'credicash_liquidaciones_semanales',
  LIQUIDACIONES_MENSUALES: 'credicash_liquidaciones_mensuales',
  REINTEGROS_DESAYUNO: 'credicash_reintegros_desayuno'
};

const SEED_CONFIG_COMISIONES: ConfiguracionComisiones = {
  modoComisionCobranza: 'PORCENTAJE',
  porcentajeComisionCobranza: 5,
  fijoComisionCobranza: 500,
  montoContactoRecuperado: 2500,
  montoClienteInactivoRecuperado: 5000,
  montoComisionLlamada: 300,
  montoComisionMensaje: 150,
  montoComisionCaptacionCliente: 2500,
  montoComisionVerificacionCliente: 2000,
  porcentajeReintegroDesayuno: 50,
  limiteSemanalReintegroDesayuno: 15000,
  diaCierreSemanal: 'VIERNES',
  fechaProximaLiquidacionSemanal: 'Viernes 28/07',
  fechaProximaLiquidacionMensual: 'Viernes 31/07',
  basicoMensual: 450000,
  adicionalMovilidadSemanal: 25000,
  otrosConceptosAdd: 0,
  descuentoBeneficiosFinanciacion: 0
};

const SEED_CONFIG_RECORRIDO: ConfiguracionRecorrido = {
  puntoSalida: 'Oficina Central CrediCash, Av. Corrientes 1482',
  puntoRegreso: 'Base Cobranza Sur, Av. Hipólito Yrigoyen 4500'
};

const DEFAULT_ROLES: PermisosRol[] = [
  {
    id: 'ADMIN',
    nombre: 'Super Administrador',
    verDashboard: true,
    verClientes: true,
    crearClientes: true,
    verTelefonoCliente: true,
    verDniCliente: true,
    verDireccionCliente: true,
    verIngresosCliente: true,
    verPrestamos: true,
    crearPrestamos: true,
    verPagos: true,
    registrarPagos: true,
    verTesoreria: true,
    verConfiguracion: true,
  },
  {
    id: 'OPERADOR',
    nombre: 'Gestión Diaria',
    verDashboard: false,
    verClientes: true,
    crearClientes: false,
    verTelefonoCliente: true,
    verDniCliente: true,
    verDireccionCliente: false,
    verIngresosCliente: false,
    verPrestamos: true,
    crearPrestamos: false,
    verPagos: true,
    registrarPagos: true,
    verTesoreria: false,
    verConfiguracion: false,
  },
  {
    id: 'COBRADOR',
    nombre: 'Cobrador en Calle',
    verDashboard: false,
    verClientes: true,
    crearClientes: false,
    verTelefonoCliente: false,
    verDniCliente: true,
    verDireccionCliente: true,
    verIngresosCliente: false,
    verPrestamos: false,
    crearPrestamos: false,
    verPagos: true,
    registrarPagos: true,
    verTesoreria: false,
    verConfiguracion: false,
  }
];

const DEFAULT_USUARIOS: UsuarioRol[] = [
  {
    id: 'USR-1',
    nombre: 'Administrador Principal',
    email: 'credicash999@gmail.com',
    password: 'admin',
    rolId: 'ADMIN'
  },
  {
    id: 'USR-2',
    nombre: 'Rodrigo Gómez',
    email: 'rodrigo.cobros@gmail.com',
    password: '123',
    rolId: 'COBRADOR'
  },
  {
    id: 'USR-3',
    nombre: 'Carlos López',
    email: 'carlos.operador@gmail.com',
    password: '123',
    rolId: 'OPERADOR'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Core State
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [operaciones, setOperaciones] = useState<Operacion[]>([]);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<LiquidacionPersonal[]>([]);
  const [configuracion, setConfiguracion] = useState<Configuracion>({
    interesDiario: 50,
    interesSemanal: 50,
    interesQuincenal: 50,
    interesMensual: 50,
    tasaMensualBase: 50,
    metaCobranzaMonto: 1500000,
    metaCobranzaPlazo: 'Julio 2026',
    pagoMinimoCuotas: 1,
  });
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [transacciones, setTransacciones] = useState<TransaccionTesoreria[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioRol[]>(DEFAULT_USUARIOS);
  const [roles, setRoles] = useState<PermisosRol[]>(DEFAULT_ROLES);
  const [fichajes, setFichajes] = useState<FichajeAsistencia[]>([]);

  // Cobrador & Comisiones State
  const [configComisiones, setConfigComisiones] = useState<ConfiguracionComisiones>(SEED_CONFIG_COMISIONES);
  const [configRecorrido, setConfigRecorrido] = useState<ConfiguracionRecorrido>(SEED_CONFIG_RECORRIDO);
  const [comisiones, setComisiones] = useState<ComisionCobrador[]>([]);
  const [visitasHistory, setVisitasHistory] = useState<VisitaDomicilio[]>([]);
  const [visitasReprogramadas, setVisitasReprogramadas] = useState<VisitaReprogramada[]>([]);
  const [liquidacionesSemanales, setLiquidacionesSemanales] = useState<LiquidacionSemanal[]>([]);
  const [liquidacionesMensuales, setLiquidacionesMensuales] = useState<LiquidacionMensual[]>([]);
  const [reintegrosDesayuno, setReintegrosDesayuno] = useState<SolicitudReintegroDesayuno[]>([]);
  const [cobradorSubTab, setCobradorSubTab] = useState<'gestion_diaria' | 'mi_recorrido' | 'reintegro_desayuno'>('gestion_diaria');

  const [activeUser, setActiveUser] = useState<UsuarioRol>({
    id: 'USR-1',
    nombre: 'Administrador Principal',
    email: 'credicash999@gmail.com',
    rolId: 'ADMIN'
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);

  // Load state from local storage on mount
  useEffect(() => {
    const getOrSeed = <T,>(key: string, seed: T): T => {
      const stored = localStorage.getItem(key);
      if (stored) {
        try { return JSON.parse(stored) as T; } catch (e) {}
      }
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    };

    setClientes(getOrSeed(STORAGE_KEYS.CLIENTES, []));
    setOperaciones(getOrSeed(STORAGE_KEYS.OPERACIONES, []));
    setCuotas(getOrSeed(STORAGE_KEYS.CUOTAS, []));
    setPagos(getOrSeed(STORAGE_KEYS.PAGOS, []));
    setTransacciones(getOrSeed(STORAGE_KEYS.TRANSACCIONES, []));
    setUsuarios(getOrSeed(STORAGE_KEYS.USUARIOS, DEFAULT_USUARIOS));
    setRoles(getOrSeed(STORAGE_KEYS.ROLES, DEFAULT_ROLES));
  }, []);

  const saveToLocalStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const handleLogin = (user: UsuarioRol) => {
    setActiveUser(user);
    setIsLoggedIn(true);
    if (user.rolId === 'COBRADOR') {
      setActiveTab('pagos-calle');
    } else if (user.rolId === 'OPERADOR') {
      setActiveTab('pagos-whatsapp');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  const handleAddPago = (
    nuevoPago: Pago, 
    updatedCuotasList: Cuota[], 
    updatedOperacion: Operacion,
    tesoreriaTrx: TransaccionTesoreria
  ) => {
    const pagoList = [...pagos, nuevoPago];
    setPagos(pagoList);
    saveToLocalStorage(STORAGE_KEYS.PAGOS, pagoList);

    const updatedCuotasIds = new Set(updatedCuotasList.map(c => c.id));
    const mergedCuotas = cuotas.map(c => updatedCuotasIds.has(c.id) ? (updatedCuotasList.find(uc => uc.id === c.id) || c) : c);
    setCuotas(mergedCuotas);
    saveToLocalStorage(STORAGE_KEYS.CUOTAS, mergedCuotas);

    const opList = operaciones.map(o => o.id === updatedOperacion.id ? updatedOperacion : o);
    setOperaciones(opList);
    saveToLocalStorage(STORAGE_KEYS.OPERACIONES, opList);

    const trxList = [...transacciones, tesoreriaTrx];
    setTransacciones(trxList);
    saveToLocalStorage(STORAGE_KEYS.TRANSACCIONES, trxList);
  };

  const activeUserRole = roles.find(r => r.id === activeUser?.rolId) || DEFAULT_ROLES[0];

  const getTabLabel = () => {
    switch (activeTab) {
      case 'dashboard': return 'Consola Dashboard';
      case 'clientes': return 'Buscar Cliente';
      case 'clientes-inactivos': return 'Clientes Inactivos con Deuda';
      case 'nuevo-cliente': return 'Nuevo Cliente (Ficha)';
      case 'operaciones': return 'Nuevo Crédito';
      case 'pagos-whatsapp': return 'Gestión Diaria';
      case 'ingresar-pagos-admin': return 'INGRESAR PAGOS (solo administrador)';
      case 'pagos-telefono': return 'Gestión Telefónica';
      case 'pagos-calle': return 'Gestión Domiciliaria';
      case 'tesoreria': return 'Caja y Tesorería';
      case 'configuracion': return 'Configuración';
      case 'usuarios': return 'Seguridad y Accesos';
      default: return 'Panel';
    }
  };

  if (!isLoggedIn) {
    return <LoginView usuarios={usuarios} roles={roles} onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#0b132a] text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <nav className="h-16 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between px-4 sm:px-8 shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          <CrediCashLogo size="md" showSubtitle={true} />
        </div>

        <div className="flex gap-4 sm:gap-6 items-center">
          <div className="hidden md:flex gap-2 text-[13px] font-medium text-slate-300">
            <span className="hover:text-emerald-400 cursor-pointer font-semibold transition-colors" onClick={() => setActiveTab('dashboard')}>Panel</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-black tracking-wide">{getTabLabel()}</span>
          </div>
          <div className="hidden md:block h-8 w-px bg-slate-800"></div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 border-r border-slate-800 pr-4">
              <div className="text-right leading-tight hidden sm:block">
                <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest block mb-0.5">Usuario</span>
                <span className="text-xs font-extrabold text-white bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700 inline-block">
                  {activeUser?.nombre} ({activeUserRole.nombre})
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="text-slate-300 hover:text-rose-400 p-1.5 hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center gap-2 group"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-400 transition-colors" />
              <span className="text-xs font-bold text-slate-300 group-hover:text-rose-300 transition-colors">Salir</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="w-full px-4 md:px-8 py-4 md:py-6 flex-1 flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="md:w-64 shrink-0 flex flex-col gap-2">
          <div className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 flex items-center gap-3 mb-1 shadow-sm">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shrink-0"></div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 leading-none">Sesión Activa</span>
              <span className="text-xs font-extrabold text-white truncate mt-1 leading-none uppercase">{activeUserRole.nombre}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-md">
            {activeUserRole.verDashboard && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-black transition-all text-left cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-2 border-emerald-400 ring-2 ring-emerald-500/30'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-emerald-300 border border-slate-700/80 hover:border-emerald-600'
                }`}
              >
                <LayoutDashboard className="w-4.5 h-4.5 shrink-0 text-emerald-400" />
                <span>Consola Dashboard</span>
              </button>
            )}

            {activeUserRole.verClientes && (
              <button
                onClick={() => setActiveTab('clientes')}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'clientes'
                    ? 'bg-emerald-600 text-white font-black border border-emerald-500 shadow-sm ring-2 ring-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                }`}
              >
                <Search className="w-4 h-4 shrink-0 text-teal-400" />
                <div className="flex flex-col min-w-0 leading-tight">
                  <span>Buscar Cliente</span>
                  <span className="text-[10px] font-medium text-slate-400 mt-0.5">(Últimos Créditos Activos)</span>
                </div>
              </button>
            )}

            {/* INGRESAR PAGOS (SOLO ADMINISTRADOR) - Exclusivo para rol ADMIN */}
            {activeUser?.rolId === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('ingresar-pagos-admin')}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'ingresar-pagos-admin'
                    ? 'bg-amber-600 text-slate-950 font-black border border-amber-400 shadow-sm ring-2 ring-amber-500/40'
                    : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/80'
                }`}
              >
                <Shield className="w-4 h-4 shrink-0 text-amber-400" />
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="font-extrabold uppercase text-[11px] tracking-tight">INGRESAR PAGOS</span>
                  <span className="text-[9px] font-bold text-amber-400/90">(solo administrador - sin restricción)</span>
                </div>
              </button>
            )}

            {activeUserRole.crearClientes && (
              <button
                onClick={() => setActiveTab('nuevo-cliente')}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'nuevo-cliente'
                    ? 'bg-emerald-600 text-white font-black border border-emerald-500 shadow-sm ring-2 ring-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                }`}
              >
                <UserPlus className="w-4 h-4 shrink-0 text-emerald-400" />
                Nuevo Cliente (Ficha)
              </button>
            )}

            {activeUserRole.verPrestamos && (
              <button
                onClick={() => setActiveTab('operaciones')}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'operaciones'
                    ? 'bg-emerald-600 text-white font-black border border-emerald-500 shadow-sm ring-2 ring-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                }`}
              >
                <Briefcase className="w-4 h-4 shrink-0 text-emerald-400" />
                Nuevo Crédito
              </button>
            )}

            {/* Consola de Cobranza */}
            {activeUserRole.verPagos && (
              <div className="my-2 p-2.5 bg-gradient-to-b from-slate-950 to-emerald-950/60 rounded-xl border-2 border-emerald-600/60 shadow-md space-y-1">
                <div className="flex items-center justify-between px-2 py-1 border-b border-emerald-800/80 mb-1.5">
                  <span className="text-[10px] font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                    Consola de Cobranza
                  </span>
                </div>

                <button
                  onClick={() => setActiveTab('pagos-whatsapp')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-extrabold transition-all text-left cursor-pointer ${
                    activeTab === 'pagos-whatsapp'
                      ? 'bg-emerald-500 text-slate-950 font-black border border-emerald-300 shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Gestión Diaria</span>
                </button>

                <button
                  onClick={() => {
                    setCobradorSubTab('gestion_diaria');
                    setActiveTab('cobrador-campo');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-extrabold transition-all text-left cursor-pointer ${
                    activeTab === 'cobrador-campo'
                      ? 'bg-emerald-500 text-slate-950 font-black border border-emerald-300 shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}
                >
                  <MapPin className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Gestión de Campo (Visitas)</span>
                </button>

                <button
                  onClick={() => {
                    setCobradorSubTab('gestion_telefonica');
                    setActiveTab('gestion-telefonica');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-extrabold transition-all text-left cursor-pointer ${
                    activeTab === 'gestion-telefonica'
                      ? 'bg-emerald-500 text-slate-950 font-black border border-emerald-300 shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}
                >
                  <PhoneCall className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span>Gestión Telefónica</span>
                </button>

                <button
                  onClick={() => {
                    setCobradorSubTab('reintegro_desayuno');
                    setActiveTab('reintegro-desayuno');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-extrabold transition-all text-left cursor-pointer ${
                    activeTab === 'reintegro-desayuno'
                      ? 'bg-emerald-500 text-slate-950 font-black border border-emerald-300 shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0 text-orange-400" />
                  <span>Reintegro Desayuno</span>
                </button>
              </div>
            )}

            {activeUserRole.verTesoreria && (
              <button
                onClick={() => setActiveTab('tesoreria')}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'tesoreria'
                    ? 'bg-emerald-600 text-white font-black border border-emerald-500 shadow-sm ring-2 ring-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                }`}
              >
                <Activity className="w-4 h-4 shrink-0 text-teal-400" />
                Caja y Tesorería
              </button>
            )}

            {activeUserRole.verConfiguracion && (
              <button
                onClick={() => setActiveTab('configuracion')}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'configuracion'
                    ? 'bg-emerald-600 text-white font-black border border-emerald-500 shadow-sm ring-2 ring-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                }`}
              >
                <Settings className="w-4 h-4 shrink-0 text-emerald-400" />
                Configuración & Feriados
              </button>
            )}

            {activeUser?.rolId === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('usuarios')}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                  activeTab === 'usuarios'
                    ? 'bg-emerald-600 text-white font-black border border-emerald-500 shadow-sm ring-2 ring-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                Seguridad y Accesos
              </button>
            )}
          </div>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 min-w-0 overflow-x-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              clientes={clientes}
              operaciones={operaciones}
              cuotas={cuotas}
              pagos={pagos}
              configuracion={configuracion}
              onNavigateTo={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'clientes' && (
            <ClientesView
              clientes={clientes}
              operaciones={operaciones}
              usuarios={usuarios}
              onAddCliente={(nuevo) => {
                const list = [...clientes, nuevo];
                setClientes(list);
                saveToLocalStorage(STORAGE_KEYS.CLIENTES, list);
              }}
              onUpdateCliente={(updated) => {
                const list = clientes.map(c => c.id === updated.id ? updated : c);
                setClientes(list);
                saveToLocalStorage(STORAGE_KEYS.CLIENTES, list);
              }}
              canManage={activeUserRole.crearClientes}
              isAdmin={activeUser?.rolId === 'ADMIN'}
              verTelefonoCliente={true}
              verDniCliente={true}
              verDireccionCliente={true}
              verIngresosCliente={true}
            />
          )}

          {/* NUEVA PESTAÑA: INGRESAR PAGOS (SOLO ADMINISTRADOR) - SIN RESTRICCIÓN DE FECHAS NI ANTIGÜEDAD */}
          {activeTab === 'ingresar-pagos-admin' && activeUser?.rolId === 'ADMIN' && (
            <PagosView
              operaciones={operaciones}
              cuotas={cuotas}
              pagos={pagos}
              clientes={clientes}
              usuarios={usuarios}
              activeUser={activeUser}
              configuracion={configuracion}
              onAddPago={handleAddPago}
              onReorganizePago={() => {}}
              onDeletePago={() => {}}
              canAddPago={true}
              mode="WHATSAPP"
              allowAllDates={true}
            />
          )}

          {(activeTab === 'pagos' || activeTab === 'pagos-whatsapp') && (
            <PagosView
              operaciones={operaciones}
              cuotas={cuotas}
              pagos={pagos}
              clientes={clientes}
              usuarios={usuarios}
              activeUser={activeUser}
              configuracion={configuracion}
              onAddPago={handleAddPago}
              onReorganizePago={() => {}}
              onDeletePago={() => {}}
              canAddPago={activeUserRole.registrarPagos}
              mode="WHATSAPP"
            />
          )}

          {(activeTab === 'cobrador-campo' || activeTab === 'gestion-telefonica' || activeTab === 'reintegro-desayuno') && (
            <CobradorCampoView
              operaciones={operaciones}
              cuotas={cuotas}
              pagos={pagos}
              clientes={clientes}
              usuarios={usuarios}
              activeUser={activeUser}
              configComisiones={configComisiones}
              configRecorrido={configRecorrido}
              comisiones={comisiones}
              visitasHistory={visitasHistory}
              visitasReprogramadas={visitasReprogramadas}
              reintegrosDesayuno={reintegrosDesayuno}
              initialSubTab={cobradorSubTab}
              onAddPago={handleAddPago}
              onRegistrarVisita={(visita) => setVisitasHistory([visita, ...visitasHistory])}
              onReprogramarVisita={(reprog) => setVisitasReprogramadas([reprog, ...visitasReprogramadas])}
              onRegistrarContactoRecuperado={(idCliente, cobradorId) => {}}
              onRegistrarGestionTelefonica={(idCliente, tipo, obs) => {}}
              onSolicitarReintegroDesayuno={(sol) => setReintegrosDesayuno([sol, ...reintegrosDesayuno])}
              onUpdateCliente={(updated) => {
                const list = clientes.map(c => c.id === updated.id ? updated : c);
                setClientes(list);
                saveToLocalStorage(STORAGE_KEYS.CLIENTES, list);
              }}
            />
          )}

          {activeTab === 'nuevo-cliente' && (
            <NuevoClienteView
              clientes={clientes}
              onAddCliente={(nuevo) => {
                const list = [...clientes, nuevo];
                setClientes(list);
                saveToLocalStorage(STORAGE_KEYS.CLIENTES, list);
              }}
              onNavigateTo={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'operaciones' && (
            <OperacionesView
              operaciones={operaciones}
              clientes={clientes}
              cuotas={cuotas}
              configuracion={configuracion}
              feriados={feriados.map(f => f.fecha)}
              activeUser={activeUser}
              onAddOperacion={(nuevaOp, nuevasCuotas) => {
                setOperaciones([...operaciones, nuevaOp]);
                setCuotas([...cuotas, ...nuevasCuotas]);
              }}
              onUpdateOperacion={(updated) => {
                setOperaciones(operaciones.map(o => o.id === updated.id ? updated : o));
              }}
              onAddCuotas={(nuevasCuotas) => setCuotas([...cuotas, ...nuevasCuotas])}
            />
          )}

          {activeTab === 'tesoreria' && (
            <TesoreriaView
              transacciones={transacciones}
              onAddTransaccion={(trx) => setTransacciones([...transacciones, trx])}
              liquidaciones={liquidaciones}
              onAddLiquidacion={(liq) => setLiquidaciones([...liquidaciones, liq])}
              onUpdateLiquidacion={() => {}}
              clientes={clientes}
              operaciones={operaciones}
              cuotas={cuotas}
              pagos={pagos}
            />
          )}

          {activeTab === 'configuracion' && (
            <ConfiguracionView
              configuracion={configuracion}
              configComisiones={configComisiones}
              feriados={feriados}
              clientes={clientes}
              operaciones={operaciones}
              cuotas={cuotas}
              pagos={pagos}
              transacciones={transacciones}
              onUpdateConfiguracion={setConfiguracion}
              onUpdateConfigComisiones={setConfigComisiones}
              onAddFeriado={(f) => setFeriados([...feriados, f])}
              onDeleteFeriado={(fecha) => setFeriados(feriados.filter(f => f.fecha !== fecha))}
              onClearDatabase={() => {}}
              onResetToSeed={() => {}}
              onRestoreBackup={() => {}}
              onBatchUpdateData={() => {}}
            />
          )}

          {activeTab === 'usuarios' && activeUser?.rolId === 'ADMIN' && (
            <UsuariosView
              usuarios={usuarios}
              roles={roles}
              activeUser={activeUser}
              fichajes={fichajes}
              onAddFichaje={(f) => setFichajes([f, ...fichajes])}
              onUpdateFichaje={() => {}}
              onAddUsuario={(u) => setUsuarios([...usuarios, u])}
              onUpdateUsuario={(u) => setUsuarios(usuarios.map(usr => usr.id === u.id ? u : usr))}
              onDeleteUsuario={(id) => setUsuarios(usuarios.filter(usr => usr.id !== id))}
              onUpdateRolePermisos={() => {}}
              onAddRole={(r) => setRoles([...roles, r])}
            />
          )}
        </main>
      </div>

      <footer className="bg-emerald-950/90 border-t border-emerald-800/80 text-emerald-300 text-xs py-4 text-center mt-auto shadow-inner">
        <p className="max-w-7xl mx-auto px-6 font-medium">© 2026 Credi-Cash | Sistema Maestro.</p>
      </footer>
    </div>
  );
}
