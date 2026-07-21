/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Cliente, Operacion, Cuota, Pago, Feriado, 
  Configuracion, TransaccionTesoreria, PermisosRol, UsuarioRol, LiquidacionPersonal 
} from './types';

import { calcularDiasAtrasoSinDomingos } from './utils/cuotasGenerator';

import { 
  getSavedFirebaseConfig, 
  initializeFirebase, 
  isFirebaseEnabled, 
  isAutoSyncEnabled,
  uploadDocToFirestore, 
  deleteDocFromFirestore,
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

// Icons
import { 
  LayoutDashboard, Users, UserPlus, Briefcase, DollarSign, 
  Percent, Activity, Settings, Calendar, ShieldCheck, Mail, LogOut, CheckCircle2, ShieldAlert,
  Smartphone, PhoneCall, MapPin, Search, MessageCircle
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
};

// Seed Data
const SEED_CLIENTES: Cliente[] = [
  {
    id: 'CLI-001',
    nombre: 'Carlos',
    apellido: 'Mendoza',
    dni: '38294012',
    telefono: '+54 9 11 5829-4012',
    direccion: 'Av. Corrientes 1482, CABA',
    trabajo: 'Comerciante Independiente (Minimercado)',
    ingresos: 250000,
    captador: 'Sofía Martínez',
    analista: 'Héctor Delgado',
    estado: 'ACTIVO',
    fechaRegistro: '2026-06-15',
  },
  {
    id: 'CLI-002',
    nombre: 'María Laura',
    apellido: 'Gómez',
    dni: '41093847',
    telefono: '+54 9 11 3049-3847',
    direccion: 'Calle Laprida 450, Lomas de Zamora',
    trabajo: 'Administrativa Contable',
    ingresos: 180000,
    captador: 'Sofía Martínez',
    analista: 'Héctor Delgado',
    estado: 'EN_MORA',
    fechaRegistro: '2026-06-20',
  },
  {
    id: 'CLI-003',
    nombre: 'Juan José',
    apellido: 'Pérez',
    dni: '36940381',
    telefono: '+54 9 11 6729-3811',
    direccion: 'Calle España 1240, San Isidro',
    trabajo: 'Gastronómico (Chef)',
    ingresos: 220000,
    captador: 'Pedro Alarcón',
    analista: 'Héctor Delgado',
    estado: 'SOLICITANTE',
    fechaRegistro: '2026-07-10',
  }
];

const SEED_FERIADOS: Feriado[] = [
  { fecha: '2026-01-01', descripcion: 'Año Nuevo', seCobra: false },
  { fecha: '2026-05-01', descripcion: 'Día del Trabajador', seCobra: false },
  { fecha: '2026-07-09', descripcion: 'Día de la Independencia', seCobra: false },
  { fecha: '2026-12-25', descripcion: 'Navidad', seCobra: false },
];

const SEED_CONFIGURACION: Configuracion = {
  interesDiario: 50, // %
  interesSemanal: 60,
  interesQuincenal: 70,
  interesMensual: 80,
  tasaMensualBase: 50,
  metaCobranzaMonto: 1500000,
  metaCobranzaPlazo: 'Julio 2026',
  pagoMinimoCuotas: 1,
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
  },
  {
    id: 'ATC',
    nombre: 'Atención al Cliente',
    verDashboard: true,
    verClientes: true,
    crearClientes: true,
    verTelefonoCliente: true,
    verDniCliente: true,
    verDireccionCliente: true,
    verIngresosCliente: true,
    verPrestamos: true,
    crearPrestamos: false,
    verPagos: true,
    registrarPagos: false,
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

// Prepopulate 1 Active operation with paid cuotas for Carlos Mendoza (CLI-001)
const seedOperacion1: Operacion = {
  id: 'OPE-001',
  fechaOtorgamiento: '2026-06-25',
  idCliente: 'CLI-001',
  nombreCliente: 'Carlos Mendoza',
  estado: 'ACTIVA',
  tipoOperacion: 'NUEVO',
  descripcion: 'Capital semilla para compra de stock de invierno',
  capitalEntregado: 100000,
  promocionAplicada: 'Promo Apertura',
  descuentoPorcentaje: 0,
  totalFinanciado: 150000,
  frecuencia: 'DIARIA',
  cantidadCuotas: 20,
  mesesFinanciados: 1,
  valorCuota: 7500,
  primerVencimiento: '2026-06-26',
  ultimoVencimiento: '2026-07-17',
  captador: 'Sofía Martínez',
  analista: 'Héctor Delgado',
  ejecutivoAtencion: 'Lucas Ferraro',
  cobrador: 'Rodrigo Gómez',
  capitalRecuperado: 25000, // Carlos paid first 5 cuotas of 7500
  interesCobrado: 12500,
  capitalPendiente: 75000,
  totalPendiente: 112500,
  cuotasPagadas: 5,
  cuotasPendientes: 15,
  proximoVencimiento: '2026-07-02',
  ultimoPago: '2026-07-01',
  diasMora: 0,
  nivelMora: 'Sano',
  numeroCredito: 1,
  elegibleRenovacion: false,
  elegibleAmpliacion: false,
  fechaFinalizacion: '',
  motivoCierre: '',
  observaciones: 'Cliente con excelente predisposición',
  cuotasGeneradas: true,
};

// Generate seed cuotas list
const generateSeedCuotas = (): Cuota[] => {
  const list: Cuota[] = [];
  const startDay = new Date('2026-06-26T12:00:00');
  
  for (let i = 0; i < 20; i++) {
    const isPaid = i < 5;
    const current = new Date(startDay.getTime() + i * 24 * 60 * 60 * 1000);
    
    // Avoid Sundays
    if (current.getDay() === 0) {
      current.setDate(current.getDate() + 1);
    }
    const dateStr = current.toISOString().split('T')[0];

    list.push({
      id: `OPE-001-CUO-${String(i + 1).padStart(2, '0')}`,
      idOperacion: 'OPE-001',
      idCliente: 'CLI-001',
      nombreCliente: 'Carlos Mendoza',
      numeroCredito: 1,
      numeroCuota: i + 1,
      frecuencia: 'DIARIA',
      fechaVencimiento: dateStr,
      capitalCuota: 5000,
      interesCuota: 2500,
      valorTotalCuota: 7500,
      estado: isPaid ? 'PAGADA' : 'PENDIENTE',
      fechaPago: isPaid ? '2026-07-01' : '',
      importePagado: isPaid ? 7500 : 0,
      saldoPendiente: isPaid ? 0 : 7500,
      diasAtraso: 0,
      cobrador: 'Rodrigo Gómez',
      observaciones: isPaid ? 'Abonado en terminal' : '',
    });
  }
  return list;
};

// Seed Payments history logs
const SEED_PAGOS: Pago[] = [
  {
    id: 'PAG-001',
    idOperacion: 'OPE-001',
    idCliente: 'CLI-001',
    nombreCliente: 'Carlos Mendoza',
    fechaPago: '2026-06-26',
    importe: 7500,
    cobrador: 'Rodrigo Gómez',
    metodoPago: 'EFECTIVO',
    observaciones: 'Recibo impreso nro 901',
  },
  {
    id: 'PAG-002',
    idOperacion: 'OPE-001',
    idCliente: 'CLI-001',
    nombreCliente: 'Carlos Mendoza',
    fechaPago: '2026-06-27',
    importe: 7500,
    cobrador: 'Rodrigo Gómez',
    metodoPago: 'EFECTIVO',
    observaciones: 'Recibo impreso nro 902',
  },
  {
    id: 'PAG-003',
    idOperacion: 'OPE-001',
    idCliente: 'CLI-001',
    nombreCliente: 'Carlos Mendoza',
    fechaPago: '2026-06-29',
    importe: 7500,
    cobrador: 'Rodrigo Gómez',
    metodoPago: 'TRANSFERENCIA',
    observaciones: 'Transferencia comprobante bancario 01293',
  },
  {
    id: 'PAG-004',
    idOperacion: 'OPE-001',
    idCliente: 'CLI-001',
    nombreCliente: 'Carlos Mendoza',
    fechaPago: '2026-06-30',
    importe: 7500,
    cobrador: 'Rodrigo Gómez',
    metodoPago: 'EFECTIVO',
    observaciones: 'Abono puntual',
  },
  {
    id: 'PAG-005',
    idOperacion: 'OPE-001',
    idCliente: 'CLI-001',
    nombreCliente: 'Carlos Mendoza',
    fechaPago: '2026-07-01',
    importe: 7500,
    cobrador: 'Rodrigo Gómez',
    metodoPago: 'EFECTIVO',
    observaciones: 'Abono puntual',
  }
];

const SEED_TRANSACCIONES: TransaccionTesoreria[] = [
  {
    id: 'TRX-001',
    fecha: '2026-06-25',
    tipo: 'EGRESO',
    concepto: 'Desembolso Capital Préstamo OPE-001 - Carlos Mendoza',
    monto: 100000,
    referenciaId: 'OPE-001',
  },
  {
    id: 'TRX-002',
    fecha: '2026-06-26',
    tipo: 'INGRESO',
    concepto: 'Cobranza Cuota 1 - OPE-001 - Carlos Mendoza',
    monto: 7500,
    referenciaId: 'PAG-001',
  },
  {
    id: 'TRX-003',
    fecha: '2026-06-27',
    tipo: 'INGRESO',
    concepto: 'Cobranza Cuota 2 - OPE-001 - Carlos Mendoza',
    monto: 7500,
    referenciaId: 'PAG-002',
  },
  {
    id: 'TRX-004',
    fecha: '2026-06-29',
    tipo: 'INGRESO',
    concepto: 'Cobranza Cuota 3 - OPE-001 - Carlos Mendoza',
    monto: 7500,
    referenciaId: 'PAG-003',
  },
  {
    id: 'TRX-005',
    fecha: '2026-06-30',
    tipo: 'INGRESO',
    concepto: 'Cobranza Cuota 4 - OPE-001 - Carlos Mendoza',
    monto: 7500,
    referenciaId: 'PAG-004',
  },
  {
    id: 'TRX-006',
    fecha: '2026-07-01',
    tipo: 'INGRESO',
    concepto: 'Cobranza Cuota 5 - OPE-001 - Carlos Mendoza',
    monto: 7500,
    referenciaId: 'PAG-005',
  }
];

const SEED_LIQUIDACIONES: LiquidacionPersonal[] = [
  {
    id: 'LIQ-001',
    fecha: '2026-07-05',
    colaboradorNombre: 'Sofía Martínez',
    rolColaborador: 'Cobrador de Calle',
    periodo: 'Junio 2026',
    montoBase: 150000,
    comisiones: 45000,
    premios: 15000,
    descuentos: 5000,
    montoTotal: 205000,
    estado: 'PAGADA',
    medioPago: 'TRANSFERENCIA',
    observaciones: 'Liquidación correspondiente al periodo de junio. Comisión del 5% sobre cobranza callejera.'
  },
  {
    id: 'LIQ-002',
    fecha: '2026-07-05',
    colaboradorNombre: 'Héctor Delgado',
    rolColaborador: 'Operador WhatsApp',
    periodo: 'Junio 2026',
    montoBase: 120000,
    comisiones: 25000,
    premios: 10000,
    descuentos: 0,
    montoTotal: 155000,
    estado: 'PAGADA',
    medioPago: 'EFECTIVO',
    observaciones: 'Pago completo de haberes y comisiones por captación de clientes nuevos.'
  },
  {
    id: 'LIQ-003',
    fecha: '2026-07-20',
    colaboradorNombre: 'Pedro Alarcón',
    rolColaborador: 'Asesor Telefónico',
    periodo: 'Julio 2026',
    montoBase: 130000,
    comisiones: 12000,
    premios: 0,
    descuentos: 0,
    montoTotal: 142000,
    estado: 'PENDIENTE',
    observaciones: 'Adelanto del periodo actual sujeto a comisiones finales.'
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
    moraDiarioAvisoDias: 1,
    moraDiarioLlamarDias: 2,
    moraDiarioCobradorDias: 6,
    moraSemanalAvisoDias: 2,
    moraSemanalLlamarDias: 4,
    moraSemanalCobradorDias: 7,
    moraQuincenalAvisoDias: 2,
    moraQuincenalLlamarDias: 5,
    moraQuincenalCobradorDias: 8,
    moraMensualAvisoDias: 1,
    moraMensualLlamarDias: 2,
    moraMensualCobradorDias: 2,
  });
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [transacciones, setTransacciones] = useState<TransaccionTesoreria[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioRol[]>([]);
  const [roles, setRoles] = useState<PermisosRol[]>([]);
  const [activeUser, setActiveUser] = useState<UsuarioRol>({
    id: 'USR-1',
    nombre: 'Administrador Principal',
    email: 'credicash999@gmail.com',
    rolId: 'ADMIN'
  });

  const [realUserRolId, setRealUserRolId] = useState<string>(() => {
    return localStorage.getItem('credicash_real_user_rol_id') || 'ADMIN';
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('credicash_logged_in') === 'true';
  });

  const handleLogin = (user: UsuarioRol) => {
    setActiveUser(user);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, user.id);
    localStorage.setItem('credicash_logged_in', 'true');
    localStorage.setItem('credicash_real_user_rol_id', user.rolId);
    setRealUserRolId(user.rolId);
    setIsLoggedIn(true);

    // Dynamic registration of login user to prevent stale local storage login lockout
    setUsuarios(prev => {
      const exists = prev.some(u => u.email.toLowerCase() === user.email.toLowerCase());
      if (!exists) {
        const updated = [...prev, user];
        saveToLocalStorage(STORAGE_KEYS.USUARIOS, updated);
        return updated;
      }
      return prev;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('credicash_logged_in');
    localStorage.removeItem('credicash_real_user_rol_id');
    setIsLoggedIn(false);
  };

  // Initialize Firebase client on mount if enabled
  useEffect(() => {
    if (isFirebaseEnabled()) {
      initializeFirebase();
    }
  }, []);

  // Load state from local storage on mount
  useEffect(() => {
    const getOrSeed = <T,>(key: string, seed: T): T => {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          return JSON.parse(stored) as T;
        } catch (e) {
          console.error(`Error parsing state for ${key}`, e);
        }
      }
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    };

    const loadedClientes = getOrSeed(STORAGE_KEYS.CLIENTES, SEED_CLIENTES);
    const loadedFeriados = getOrSeed(STORAGE_KEYS.FERIADOS, SEED_FERIADOS);
    const loadedConfig = getOrSeed(STORAGE_KEYS.CONFIGURACION, SEED_CONFIGURACION);
    const loadedOperaciones = getOrSeed(STORAGE_KEYS.OPERACIONES, [seedOperacion1]);
    const loadedCuotas = getOrSeed(STORAGE_KEYS.CUOTAS, generateSeedCuotas());
    const loadedPagos = getOrSeed(STORAGE_KEYS.PAGOS, SEED_PAGOS);
    const loadedTransacciones = getOrSeed(STORAGE_KEYS.TRANSACCIONES, SEED_TRANSACCIONES);
    const loadedLiquidaciones = getOrSeed(STORAGE_KEYS.LIQUIDACIONES, SEED_LIQUIDACIONES);
    const loadedUsuarios = getOrSeed(STORAGE_KEYS.USUARIOS, DEFAULT_USUARIOS);
    const loadedRolesRaw = getOrSeed(STORAGE_KEYS.ROLES, DEFAULT_ROLES);
    
    // Force latest hardcoded role configurations for system defaults, allowing custom roles to merge
    const loadedRoles = loadedRolesRaw.map(r => {
      const defaultRole = DEFAULT_ROLES.find(dr => dr.id === r.id);
      if (defaultRole) {
        return defaultRole;
      }
      return {
        id: r.id,
        nombre: r.nombre,
        verDashboard: true,
        verClientes: true,
        crearClientes: false,
        verTelefonoCliente: true,
        verDniCliente: true,
        verDireccionCliente: true,
        verIngresosCliente: true,
        verPrestamos: true,
        crearPrestamos: false,
        verPagos: true,
        registrarPagos: false,
        verTesoreria: false,
        verConfiguracion: false,
        ...r
      };
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date(todayStr + 'T12:00:00');
    let cuotasChanged = false;
    let opsChanged = false;
    let clientesChanged = false;

    // A. Reconcile Cuotas (Mark as VENCIDA if unpaid and past due date)
    const reconciledCuotas = loadedCuotas.map(c => {
      if (c.estado !== 'PAGADA') {
        const isPastDue = c.fechaVencimiento < todayStr;
        const targetEstado = isPastDue ? 'VENCIDA' as const : 'PENDIENTE' as const;
        if (c.estado !== targetEstado) {
          cuotasChanged = true;
          return { ...c, estado: targetEstado };
        }
      }
      return c;
    });

    // B. Reconcile Operaciones (Calculate diasMora & nivelMora based on oldest unpaid overdue installment)
    const reconciledOperaciones = loadedOperaciones.map(op => {
      if (op.estado === 'ACTIVA') {
        const opCuotas = reconciledCuotas.filter(c => c.idOperacion === op.id && c.estado !== 'PAGADA');
        const sortedPending = [...opCuotas].sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
        
        let targetDiasMora = 0;
        let targetNivelMora = 'Sano';
        
        if (sortedPending.length > 0) {
          const oldestPending = sortedPending[0];
          if (oldestPending.fechaVencimiento < todayStr) {
            targetDiasMora = calcularDiasAtrasoSinDomingos(oldestPending.fechaVencimiento, todayStr);
          }
        }

        if (targetDiasMora === 0) {
          targetNivelMora = 'Sano';
        } else {
          const f = op.frecuencia;
          const config = loadedConfig || configuracion;
          
          if (f === 'DIARIA') {
            const aviso = config.moraDiarioAvisoDias ?? 1;
            const llamar = config.moraDiarioLlamarDias ?? 2;
            const cobrador = config.moraDiarioCobradorDias ?? 6;
            
            if (targetDiasMora < llamar) {
              targetNivelMora = `Atraso Regular (Aviso WA: ${targetDiasMora} d)`;
            } else if (targetDiasMora < cobrador) {
              targetNivelMora = `Notificar / Llamar (Crítica: ${targetDiasMora} d)`;
            } else {
              targetNivelMora = `Enviar Cobrador (Calle: ${targetDiasMora} d)`;
            }
          } else if (f === 'MENSUAL') {
            const aviso = config.moraMensualAvisoDias ?? 1;
            const llamar = config.moraMensualLlamarDias ?? 2;
            const cobrador = config.moraMensualCobradorDias ?? 2;
            
            if (targetDiasMora < llamar) {
              targetNivelMora = `Atraso Regular (${targetDiasMora} d)`;
            } else {
              // At 2+ days on monthly, immediately send cobrador and alert!
              targetNivelMora = `Enviar Cobrador / Alerta Crítica (${targetDiasMora} d)`;
            }
          } else if (f === 'SEMANAL') {
            const aviso = config.moraSemanalAvisoDias ?? 2;
            const llamar = config.moraSemanalLlamarDias ?? 4;
            const cobrador = config.moraSemanalCobradorDias ?? 7;
            
            if (targetDiasMora < llamar) {
              targetNivelMora = `Atraso Regular (${targetDiasMora} d)`;
            } else if (targetDiasMora < cobrador) {
              targetNivelMora = `Notificar / Llamar (${targetDiasMora} d)`;
            } else {
              targetNivelMora = `Enviar Cobrador (Calle: ${targetDiasMora} d)`;
            }
          } else { // QUINCENAL
            const aviso = config.moraQuincenalAvisoDias ?? 2;
            const llamar = config.moraQuincenalLlamarDias ?? 5;
            const cobrador = config.moraQuincenalCobradorDias ?? 8;
            
            if (targetDiasMora < llamar) {
              targetNivelMora = `Atraso Regular (${targetDiasMora} d)`;
            } else if (targetDiasMora < cobrador) {
              targetNivelMora = `Notificar / Llamar (${targetDiasMora} d)`;
            } else {
              targetNivelMora = `Enviar Cobrador (Calle: ${targetDiasMora} d)`;
            }
          }
        }

        if (op.diasMora !== targetDiasMora || op.nivelMora !== targetNivelMora) {
          opsChanged = true;
          return { ...op, diasMora: targetDiasMora, nivelMora: targetNivelMora };
        }
      }
      return op;
    });

    // C. Reconcile Clientes (Set state as EN_MORA if they have operations in mora)
    const reconciledClientes = loadedClientes.map(cli => {
      const cliOps = reconciledOperaciones.filter(o => o.idCliente === cli.id && o.estado === 'ACTIVA');
      const hasOpsInMora = cliOps.some(o => o.diasMora > 0);
      const targetEstado = hasOpsInMora ? 'EN_MORA' as const : (cli.estado === 'EN_MORA' ? 'ACTIVO' as const : cli.estado);
      if (cli.estado !== targetEstado) {
        clientesChanged = true;
        return { ...cli, estado: targetEstado };
      }
      return cli;
    });

    // Save changes to localStorage if any occurred
    if (cuotasChanged) {
      localStorage.setItem(STORAGE_KEYS.CUOTAS, JSON.stringify(reconciledCuotas));
    }
    if (opsChanged) {
      localStorage.setItem(STORAGE_KEYS.OPERACIONES, JSON.stringify(reconciledOperaciones));
    }
    if (clientesChanged) {
      localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(reconciledClientes));
    }

    setClientes(reconciledClientes);
    setFeriados(loadedFeriados);
    setConfiguracion(loadedConfig);
    setOperaciones(reconciledOperaciones);
    setCuotas(reconciledCuotas);
    setPagos(loadedPagos);
    setTransacciones(loadedTransacciones);
    setLiquidaciones(loadedLiquidaciones);
    setUsuarios(loadedUsuarios);
    setRoles(loadedRoles);

    // Active user setup
    const savedActiveUserId = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID);
    const userFound = loadedUsuarios.find(u => u.id === savedActiveUserId);
    let finalUser = userFound;
    if (!finalUser && loadedUsuarios.length > 0) {
      finalUser = loadedUsuarios[0];
    }
    if (finalUser) {
      setActiveUser(finalUser);
      const storedRealRolId = localStorage.getItem('credicash_real_user_rol_id');
      if (storedRealRolId) {
        setRealUserRolId(storedRealRolId);
      } else {
        localStorage.setItem('credicash_real_user_rol_id', finalUser.rolId);
        setRealUserRolId(finalUser.rolId);
      }
    }
  }, []);

  // Save updates to LocalStorage
  const saveToLocalStorage = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  // State modification wrappers
  const handleAddCliente = (nuevo: Cliente) => {
    const list = [...clientes, nuevo];
    setClientes(list);
    saveToLocalStorage(STORAGE_KEYS.CLIENTES, list);

    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      uploadDocToFirestore('clientes', nuevo.id, nuevo);
    }
    syncToGoogleSheet('add_cliente', nuevo);
  };

  const handleUpdateCliente = (updated: Cliente) => {
    const list = clientes.map(c => c.id === updated.id ? updated : c);
    setClientes(list);
    saveToLocalStorage(STORAGE_KEYS.CLIENTES, list);

    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      uploadDocToFirestore('clientes', updated.id, updated);
    }
  };

  const handleAddOperacion = (nuevaOp: Operacion, nuevasCuotas: Cuota[]) => {
    // 1. Save operation
    const opList = [...operaciones, nuevaOp];
    setOperaciones(opList);
    saveToLocalStorage(STORAGE_KEYS.OPERACIONES, opList);

    // 2. Save installments
    const cuotasList = [...cuotas, ...nuevasCuotas];
    setCuotas(cuotasList);
    saveToLocalStorage(STORAGE_KEYS.CUOTAS, cuotasList);

    // 3. Register Capital Outlay Egreso in treasury
    const outlayTrx: TransaccionTesoreria = {
      id: `TRX-${String(Date.now())}`,
      fecha: nuevaOp.fechaOtorgamiento,
      tipo: 'EGRESO',
      concepto: `Desembolso Capital Préstamo ${nuevaOp.id} - ${nuevaOp.nombreCliente}`,
      monto: nuevaOp.capitalEntregado,
      referenciaId: nuevaOp.id,
    };
    const trxList = [...transacciones, outlayTrx];
    setTransacciones(trxList);
    saveToLocalStorage(STORAGE_KEYS.TRANSACCIONES, trxList);

    // 4. Update Client status to Active if it was solicitante or inactive
    const selectedCliente = clientes.find(c => c.id === nuevaOp.idCliente);
    if (selectedCliente && selectedCliente.estado !== 'EN_MORA') {
      const updatedCli = { ...selectedCliente, estado: 'ACTIVO' as const };
      handleUpdateCliente(updatedCli);
    }

    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      uploadDocToFirestore('operaciones', nuevaOp.id, nuevaOp);
      nuevasCuotas.forEach(c => uploadDocToFirestore('cuotas', c.id, c));
      uploadDocToFirestore('transacciones', outlayTrx.id, outlayTrx);
    }
    syncToGoogleSheet('add_prestamo', { operacion: nuevaOp, cuotas: nuevasCuotas });
  };

  const handleUpdateOperacion = (updated: Operacion) => {
    const list = operaciones.map(o => o.id === updated.id ? updated : o);
    setOperaciones(list);
    saveToLocalStorage(STORAGE_KEYS.OPERACIONES, list);

    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      uploadDocToFirestore('operaciones', updated.id, updated);
    }
  };

  const handleAddCuotas = (nuevasCuotas: Cuota[]) => {
    const list = [...cuotas, ...nuevasCuotas];
    setCuotas(list);
    saveToLocalStorage(STORAGE_KEYS.CUOTAS, list);

    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      nuevasCuotas.forEach(c => uploadDocToFirestore('cuotas', c.id, c));
    }
  };

  const handleAddPago = (
    nuevoPago: Pago, 
    updatedCuotasList: Cuota[], 
    updatedOperacion: Operacion,
    tesoreriaTrx: TransaccionTesoreria
  ) => {
    // 1. Add payment record
    const pagoList = [...pagos, nuevoPago];
    setPagos(pagoList);
    saveToLocalStorage(STORAGE_KEYS.PAGOS, pagoList);

    // 2. Update installments states
    const updatedCuotasIds = new Set(updatedCuotasList.map(c => c.id));
    const mergedCuotas = cuotas.map(c => {
      if (updatedCuotasIds.has(c.id)) {
        return updatedCuotasList.find(uc => uc.id === c.id) || c;
      }
      return c;
    });
    setCuotas(mergedCuotas);
    saveToLocalStorage(STORAGE_KEYS.CUOTAS, mergedCuotas);

    // 3. Update operation
    handleUpdateOperacion(updatedOperacion);

    // 4. Add Treasury Ingress
    const trxList = [...transacciones, tesoreriaTrx];
    setTransacciones(trxList);
    saveToLocalStorage(STORAGE_KEYS.TRANSACCIONES, trxList);

    // 5. Update client state if operation is finalized or active
    // If no operations are in mora, make client active.
    const clientOps = operaciones.map(o => o.id === updatedOperacion.id ? updatedOperacion : o)
      .filter(o => o.idCliente === updatedOperacion.idCliente);
    
    const clientInMora = clientOps.some(o => o.estado === 'VENCIDA');
    const selectedCli = clientes.find(c => c.id === updatedOperacion.idCliente);
    if (selectedCli) {
      const targetState = clientInMora ? 'EN_MORA' as const : 'ACTIVO' as const;
      if (selectedCli.estado !== targetState) {
        handleUpdateCliente({ ...selectedCli, estado: targetState });
      }
    }

    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      uploadDocToFirestore('pagos', nuevoPago.id, nuevoPago);
      updatedCuotasList.forEach(c => uploadDocToFirestore('cuotas', c.id, c));
      uploadDocToFirestore('transacciones', tesoreriaTrx.id, tesoreriaTrx);
    }
    syncToGoogleSheet('add_pago', { pago: nuevoPago, cuotas: updatedCuotasList, operacion: updatedOperacion });
  };

  const handleUpdateConfiguracion = (newConfig: Configuracion) => {
    setConfiguracion(newConfig);
    saveToLocalStorage(STORAGE_KEYS.CONFIGURACION, newConfig);

    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      uploadDocToFirestore('system_config', 'global', newConfig);
    }
  };

  const handleAddFeriado = (nuevo: Feriado) => {
    const list = [...feriados, nuevo];
    setFeriados(list);
    saveToLocalStorage(STORAGE_KEYS.FERIADOS, list);

    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      uploadDocToFirestore('feriados', nuevo.fecha, nuevo);
    }
  };

  const handleDeleteFeriado = (fecha: string) => {
    const list = feriados.filter(f => f.fecha !== fecha);
    setFeriados(list);
    saveToLocalStorage(STORAGE_KEYS.FERIADOS, list);

    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      deleteDocFromFirestore('feriados', fecha);
    }
  };

  const handleAddTransaccion = (nuevaTrx: TransaccionTesoreria) => {
    const list = [...transacciones, nuevaTrx];
    setTransacciones(list);
    saveToLocalStorage(STORAGE_KEYS.TRANSACCIONES, list);

    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      uploadDocToFirestore('transacciones', nuevaTrx.id, nuevaTrx);
    }
  };

  const handleAddLiquidacion = (liq: LiquidacionPersonal) => {
    const list = [...liquidaciones, liq];
    setLiquidaciones(list);
    saveToLocalStorage(STORAGE_KEYS.LIQUIDACIONES, list);

    if (liq.estado === 'PAGADA') {
      const trxPay: TransaccionTesoreria = {
        id: `TRX-${String(Date.now())}`,
        fecha: liq.fecha,
        tipo: 'EGRESO',
        concepto: `Liquidación de Haberes - ${liq.colaboradorNombre} (${liq.periodo})`,
        monto: liq.montoTotal,
        referenciaId: liq.id,
      };
      handleAddTransaccion(trxPay);
    }
  };

  const handleUpdateLiquidacion = (updated: LiquidacionPersonal) => {
    const prev = liquidaciones.find(l => l.id === updated.id);
    const list = liquidaciones.map(l => l.id === updated.id ? updated : l);
    setLiquidaciones(list);
    saveToLocalStorage(STORAGE_KEYS.LIQUIDACIONES, list);

    const becamePaid = prev && prev.estado === 'PENDIENTE' && updated.estado === 'PAGADA';
    if (becamePaid) {
      const trxPay: TransaccionTesoreria = {
        id: `TRX-${String(Date.now())}`,
        fecha: updated.fecha,
        tipo: 'EGRESO',
        concepto: `Liquidación de Haberes (Cobrado) - ${updated.colaboradorNombre} (${updated.periodo})`,
        monto: updated.montoTotal,
        referenciaId: updated.id,
      };
      handleAddTransaccion(trxPay);
    }
  };

  const handleClearDatabase = () => {
    setClientes([]);
    setOperaciones([]);
    setCuotas([]);
    setPagos([]);
    setTransacciones([]);
    saveToLocalStorage(STORAGE_KEYS.CLIENTES, []);
    saveToLocalStorage(STORAGE_KEYS.OPERACIONES, []);
    saveToLocalStorage(STORAGE_KEYS.CUOTAS, []);
    saveToLocalStorage(STORAGE_KEYS.PAGOS, []);
    saveToLocalStorage(STORAGE_KEYS.TRANSACCIONES, []);
  };

  const handleResetToSeed = () => {
    setClientes(SEED_CLIENTES);
    setOperaciones([seedOperacion1]);
    setCuotas(generateSeedCuotas());
    setPagos(SEED_PAGOS);
    setTransacciones(SEED_TRANSACCIONES);
    saveToLocalStorage(STORAGE_KEYS.CLIENTES, SEED_CLIENTES);
    saveToLocalStorage(STORAGE_KEYS.OPERACIONES, [seedOperacion1]);
    saveToLocalStorage(STORAGE_KEYS.CUOTAS, generateSeedCuotas());
    saveToLocalStorage(STORAGE_KEYS.PAGOS, SEED_PAGOS);
    saveToLocalStorage(STORAGE_KEYS.TRANSACCIONES, SEED_TRANSACCIONES);
  };

  const handleAddUsuario = (nuevo: UsuarioRol) => {
    const list = [...usuarios, nuevo];
    setUsuarios(list);
    saveToLocalStorage(STORAGE_KEYS.USUARIOS, list);
  };

  const handleUpdateUsuario = (updated: UsuarioRol) => {
    const list = usuarios.map(u => u.id === updated.id ? updated : u);
    setUsuarios(list);
    saveToLocalStorage(STORAGE_KEYS.USUARIOS, list);
    
    if (activeUser.id === updated.id) {
      setActiveUser(updated);
    }
  };

  const handleDeleteUsuario = (id: string) => {
    const list = usuarios.filter(u => u.id !== id);
    setUsuarios(list);
    saveToLocalStorage(STORAGE_KEYS.USUARIOS, list);
    
    // If the currently active user is deleted, fall back to Admin
    if (activeUser.id === id) {
      const adminUser = list.find(u => u.rolId === 'ADMIN') || list[0];
      if (adminUser) {
        setActiveUser(adminUser);
        localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, adminUser.id);
      }
    }
  };

  const handleUpdateRolePermisos = (updated: PermisosRol) => {
    const list = roles.map(r => r.id === updated.id ? updated : r);
    setRoles(list);
    saveToLocalStorage(STORAGE_KEYS.ROLES, list);
  };

  const handleAddRole = (nuevo: PermisosRol) => {
    const list = [...roles, nuevo];
    setRoles(list);
    saveToLocalStorage(STORAGE_KEYS.ROLES, list);
  };

  const handleRestoreBackup = (backupData: any) => {
    if (backupData.clientes) {
      setClientes(backupData.clientes);
      saveToLocalStorage(STORAGE_KEYS.CLIENTES, backupData.clientes);
    }
    if (backupData.operaciones) {
      setOperaciones(backupData.operaciones);
      saveToLocalStorage(STORAGE_KEYS.OPERACIONES, backupData.operaciones);
    }
    if (backupData.cuotas) {
      setCuotas(backupData.cuotas);
      saveToLocalStorage(STORAGE_KEYS.CUOTAS, backupData.cuotas);
    }
    if (backupData.pagos) {
      setPagos(backupData.pagos);
      saveToLocalStorage(STORAGE_KEYS.PAGOS, backupData.pagos);
    }
    if (backupData.transacciones) {
      setTransacciones(backupData.transacciones);
      saveToLocalStorage(STORAGE_KEYS.TRANSACCIONES, backupData.transacciones);
    }
    if (backupData.configuracion) {
      setConfiguracion(backupData.configuracion);
      saveToLocalStorage(STORAGE_KEYS.CONFIGURACION, backupData.configuracion);
    }
    if (backupData.usuarios) {
      setUsuarios(backupData.usuarios);
      saveToLocalStorage(STORAGE_KEYS.USUARIOS, backupData.usuarios);
    }
    if (backupData.roles) {
      setRoles(backupData.roles);
      saveToLocalStorage(STORAGE_KEYS.ROLES, backupData.roles);
    }
  };

  const activeUserRole = roles.find(r => r.id === activeUser?.rolId) || {
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
  };

  // Automatic redirect if current tab is not allowed for the selected role
  useEffect(() => {
    if (!activeUser || roles.length === 0) return;
    const r = roles.find(rol => rol.id === activeUser.rolId);
    if (!r) return;

    const isCurrentTabAllowed = 
      (activeTab === 'dashboard' && r.verDashboard) ||
      (activeTab === 'clientes' && r.verClientes) ||
      (activeTab === 'nuevo-cliente' && r.crearClientes) ||
      (activeTab === 'operaciones' && r.verPrestamos) ||
      (activeTab === 'pagos' && r.verPagos) ||
      (activeTab === 'pagos-whatsapp' && r.verPagos) ||
      (activeTab === 'pagos-telefono' && r.verPagos && activeUser.rolId !== 'OPERADOR') ||
      (activeTab === 'pagos-calle' && r.verPagos && activeUser.rolId !== 'OPERADOR') ||
      (activeTab === 'tesoreria' && r.verTesoreria) ||
      (activeTab === 'configuracion' && r.verConfiguracion) ||
      (activeTab === 'usuarios' && activeUser.rolId === 'ADMIN');

    if (!isCurrentTabAllowed) {
      if (activeUser.rolId === 'OPERADOR') setActiveTab('pagos-whatsapp');
      else if (r.verDashboard) setActiveTab('dashboard');
      else if (r.verClientes) setActiveTab('clientes');
      else if (r.verPagos) setActiveTab('pagos-whatsapp');
      else if (r.verPrestamos) setActiveTab('operaciones');
      else if (r.verTesoreria) setActiveTab('tesoreria');
      else if (r.verConfiguracion) setActiveTab('configuracion');
    }
  }, [activeUser, roles, activeTab]);

  // Role Based Access Data Filtering
  // "cobrador solo puede ver clientes que van a su lista..."
  const isCobrador = activeUser?.rolId === 'COBRADOR';

  const filteredOperaciones = isCobrador
    ? operaciones.filter(o => o.cobrador === activeUser.nombre)
    : operaciones;

  const filteredClientes = isCobrador
    ? clientes.filter(c => {
        // Only clients with active/pending loans where this user is the cobrador, or where this user was the captador
        const hasOp = operaciones.some(o => o.idCliente === c.id && o.cobrador === activeUser.nombre);
        return hasOp || c.captador === activeUser.nombre;
      })
    : clientes;

  const filteredCuotas = isCobrador
    ? cuotas.filter(c => c.cobrador === activeUser.nombre)
    : cuotas;

  const filteredPagos = isCobrador
    ? pagos.filter(p => p.cobrador === activeUser.nombre)
    : pagos;

  // Human readable active tab label
  const getTabLabel = () => {
    switch (activeTab) {
      case 'dashboard': return 'Consola Dashboard';
      case 'clientes': return 'Buscar Cliente';
      case 'operaciones': return 'Nuevo Crédito';
      case 'pagos': return 'Consola del Operador de Pagos';
      case 'pagos-whatsapp': return 'Mensajería';
      case 'pagos-telefono': return 'Gestión Cobranza Telefónica';
      case 'pagos-calle': return 'Gestión Cobranza de Campo';
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
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col font-sans antialiased text-slate-800">
      
      {/* Clean Utility / Minimal Top Bar Header */}
      <nav className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sm:px-8 shrink-0 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[#1E803B] rounded-lg flex items-center justify-center shrink-0 shadow-sm">
            {/* Minimal SVG replication inside topbar */}
            <svg className="w-6 h-6" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 70,30 C 50,15 25,25 25,50 C 25,75 50,85 70,70" stroke="white" strokeWidth="12" strokeLinecap="round" fill="none" />
              <path d="M 25,60 Q 50,55 70,35" stroke="#4ADE80" strokeWidth="8" strokeLinecap="round" fill="none" />
              <rect x="40" y="45" width="8" height="20" rx="2" fill="white" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold text-[#0B4B27] tracking-tight leading-none">CrediCash</span>
            <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-[#1E803B] mt-1">Sistema Maestro</span>
          </div>
        </div>

        <div className="flex gap-4 sm:gap-6 items-center">
          <div className="hidden md:flex gap-2 text-[13px] font-medium text-slate-500">
            <span className="hover:text-[#1E803B] cursor-pointer" onClick={() => {
              const uRole = roles.find(r => r.id === activeUser?.rolId);
              if (uRole?.verDashboard) {
                setActiveTab('dashboard');
              } else if (uRole?.verClientes) {
                setActiveTab('clientes');
              }
            }}>Panel</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold">{getTabLabel()}</span>
          </div>
          <div className="hidden md:block h-8 w-px bg-slate-200"></div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 border-r border-slate-200/80 pr-4">
              <div className="text-right leading-tight hidden sm:block">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Usuario</span>
                {realUserRolId === 'ADMIN' ? (
                  <select
                    value={activeUser?.id || ''}
                    onChange={(e) => {
                      const targetUser = usuarios.find(u => u.id === e.target.value);
                      if (targetUser) {
                        setActiveUser(targetUser);
                        localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, targetUser.id);
                        
                        // Trigger state refresh for current tab
                        const nextRole = roles.find(r => r.id === targetUser.rolId);
                        if (nextRole) {
                          alert(`Cambiando sesión a: ${targetUser.nombre}\nRol: ${nextRole.nombre}\n\nLos filtros y restricciones del sistema se han actualizado.`);
                        }
                      }
                    }}
                    className="text-xs font-extrabold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md focus:outline-none cursor-pointer transition-all shadow-xs"
                  >
                    {usuarios.map(u => {
                      const r = roles.find(rol => rol.id === u.rolId);
                      return (
                        <option key={u.id} value={u.id}>
                          {u.nombre} ({r?.nombre || u.rolId})
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 inline-block">
                    {activeUser?.nombre} ({activeUserRole.nombre})
                  </span>
                )}
              </div>
              <div className="w-9 h-9 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0" title={`${activeUser?.nombre}`}>
                {activeUser?.nombre ? activeUser.nombre.substring(0, 2) : 'AP'}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-xl transition-all cursor-pointer flex items-center gap-2 group"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4 text-slate-500 group-hover:text-rose-600 transition-colors" />
              <span className="text-xs font-bold text-slate-500 group-hover:text-rose-600 transition-colors">Salir</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="w-full px-4 md:px-8 py-4 md:py-6 flex-1 flex flex-col md:flex-row gap-6">
        
        {/* Navigation Sidebar */}
        <aside className="md:w-64 shrink-0 flex flex-col gap-2">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 flex items-center gap-3 mb-1 shadow-xs">
            <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse shrink-0"></div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">Sesión Activa</span>
              <span className="text-xs font-extrabold text-blue-700 truncate mt-1 leading-none uppercase">{activeUserRole.nombre}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            {activeUser?.rolId === 'ADMIN' ? (
              // ADMIN Order: Dashboard first, then Clients, New Client, Loans, Operator Payments, Treasury, Configuration, Security
              <>
                {activeUserRole.verDashboard && (
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer ${
                      activeTab === 'dashboard'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    Consola Dashboard
                  </button>
                )}

                {activeUserRole.verClientes && (
                  <button
                    onClick={() => setActiveTab('clientes')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer ${
                      activeTab === 'clientes'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <Search className="w-4 h-4 shrink-0 text-blue-600" />
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span>Buscar Cliente</span>
                      <span className="text-[10px] font-normal text-slate-400 mt-0.5">(Últimos Créditos Activos)</span>
                    </div>
                  </button>
                )}

                {activeUserRole.crearClientes && (
                  <button
                    onClick={() => setActiveTab('nuevo-cliente')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer ${
                      activeTab === 'nuevo-cliente'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <UserPlus className="w-4 h-4 shrink-0 text-emerald-600" />
                    Nuevo Cliente (Ficha)
                  </button>
                )}

                {activeUserRole.verPrestamos && (
                  <button
                    onClick={() => setActiveTab('operaciones')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer ${
                      activeTab === 'operaciones'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 shrink-0 text-blue-600" />
                    Nuevo Crédito
                  </button>
                )}

                {activeUserRole.verPagos && (
                  <div className="space-y-1 pl-2 border-l-2 border-slate-200 mt-1 mb-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block px-2 py-1">Consolas de Cobranza</span>
                    <button
                      onClick={() => setActiveTab('pagos-whatsapp')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                        activeTab === 'pagos-whatsapp'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                      Mensajería
                    </button>

                    <button
                      onClick={() => setActiveTab('pagos-telefono')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                        activeTab === 'pagos-telefono'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <PhoneCall className="w-4 h-4 shrink-0 text-amber-600" />
                      Gestión Cobranza Telefónica
                    </button>

                    <button
                      onClick={() => setActiveTab('pagos-calle')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                        activeTab === 'pagos-calle'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200 shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <MapPin className="w-4 h-4 shrink-0 text-rose-600" />
                      Gestión Cobranza de Campo
                    </button>
                  </div>
                )}

                {activeUserRole.verTesoreria && (
                  <button
                    onClick={() => setActiveTab('tesoreria')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer ${
                      activeTab === 'tesoreria'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <Activity className="w-4 h-4 shrink-0" />
                    Caja y Tesorería
                  </button>
                )}

                {activeUserRole.verConfiguracion && (
                  <button
                    onClick={() => setActiveTab('configuracion')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer ${
                      activeTab === 'configuracion'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <Settings className="w-4 h-4 shrink-0" />
                    Configuración & Feriados
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('usuarios')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer ${
                    activeTab === 'usuarios'
                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600" />
                  Seguridad y Accesos
                </button>
              </>
             ) : activeUser?.rolId === 'OPERADOR' ? (
              // OPERATOR WHATSAPP strictly allowed tabs: pagos-whatsapp, clientes (Búsqueda de Cliente), operaciones (Otorgar Créditos)
              <>
                <button
                  onClick={() => setActiveTab('pagos-whatsapp')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer ${
                    activeTab === 'pagos-whatsapp'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  Mensajería
                </button>

                <button
                  onClick={() => setActiveTab('clientes')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer ${
                    activeTab === 'clientes'
                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <Search className="w-4 h-4 shrink-0 text-blue-600" />
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span>Buscar Cliente</span>
                    <span className="text-[10px] font-normal text-slate-400 mt-0.5">(Últimos Créditos Activos)</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('operaciones')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer ${
                    activeTab === 'operaciones'
                      ? 'bg-blue-50 text-blue-700 border border-blue-100'
                      : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <Briefcase className="w-4 h-4 shrink-0 text-blue-600" />
                  Nuevo Crédito
                </button>
              </>
            ) : (
              // OPERATOR / COBRADOR Order: Operator Payments first, then Dashboard (if allowed), Clients, New Client, Loans, Treasury, Configuration
              <>
                {activeUserRole.verPagos && (
                  <div className="space-y-1 pl-2 border-l-2 border-slate-200 mt-1 mb-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block px-2 py-1">Consolas de Cobranza</span>
                    <button
                      onClick={() => setActiveTab('pagos-whatsapp')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                        activeTab === 'pagos-whatsapp'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                      Mensajería
                    </button>

                    <button
                      onClick={() => setActiveTab('pagos-telefono')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                        activeTab === 'pagos-telefono'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200 shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <PhoneCall className="w-4 h-4 shrink-0 text-amber-600" />
                      Gestión Cobranza Telefónica
                    </button>

                    <button
                      onClick={() => setActiveTab('pagos-calle')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                        activeTab === 'pagos-calle'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200 shadow-xs'
                          : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <MapPin className="w-4 h-4 shrink-0 text-rose-600" />
                      Gestión Cobranza de Campo
                    </button>
                  </div>
                )}

                {activeUserRole.verDashboard && (
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer ${
                      activeTab === 'dashboard'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0" />
                    Consola Dashboard
                  </button>
                )}

                {activeUserRole.verClientes && (
                  <button
                    onClick={() => setActiveTab('clientes')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer ${
                      activeTab === 'clientes'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span>Búsqueda de Cliente</span>
                      <span className="text-[10px] font-normal text-slate-400 mt-0.5">(Últimos Créditos Activos)</span>
                    </div>
                  </button>
                )}

                {activeUserRole.crearClientes && (
                  <button
                    onClick={() => setActiveTab('nuevo-cliente')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer ${
                      activeTab === 'nuevo-cliente'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <UserPlus className="w-4 h-4 shrink-0 text-emerald-600" />
                    Nuevo Cliente (Ficha)
                  </button>
                )}

                {activeUserRole.verPrestamos && (
                  <button
                    onClick={() => setActiveTab('operaciones')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer ${
                      activeTab === 'operaciones'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 shrink-0" />
                    Otorgar Créditos
                  </button>
                )}

                {activeUserRole.verTesoreria && (
                  <button
                    onClick={() => setActiveTab('tesoreria')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer ${
                      activeTab === 'tesoreria'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <Activity className="w-4 h-4 shrink-0" />
                    Caja y Tesorería
                  </button>
                )}

                {activeUserRole.verConfiguracion && (
                  <button
                    onClick={() => setActiveTab('configuracion')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all text-left cursor-pointer ${
                      activeTab === 'configuracion'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <Settings className="w-4 h-4 shrink-0" />
                    Configuración & Feriados
                  </button>
                )}
              </>
            )}
          </div>

          <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl">
            <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Seguridad del Sistema
            </div>
            <div className="text-[10px] text-amber-700 leading-relaxed font-medium">
              Amortizaciones de alta precisión. Las moras, feriados y domingos se procesan según los roles establecidos.
            </div>
          </div>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && activeUserRole.verDashboard && (
            <DashboardView
              clientes={filteredClientes}
              operaciones={filteredOperaciones}
              cuotas={filteredCuotas}
              pagos={filteredPagos}
              configuracion={configuracion}
              onNavigateTo={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'clientes' && activeUserRole.verClientes && (
            <ClientesView
              clientes={filteredClientes}
              operaciones={operaciones}
              onAddCliente={handleAddCliente}
              onUpdateCliente={handleUpdateCliente}
              canManage={activeUserRole.crearClientes}
              verTelefonoCliente={activeUserRole.verTelefonoCliente}
              verDniCliente={activeUserRole.verDniCliente}
              verDireccionCliente={activeUserRole.verDireccionCliente}
              verIngresosCliente={activeUserRole.verIngresosCliente}
            />
          )}

          {activeTab === 'nuevo-cliente' && activeUserRole.crearClientes && (
            <NuevoClienteView
              clientes={filteredClientes}
              onAddCliente={handleAddCliente}
              onNavigateTo={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'operaciones' && activeUserRole.verPrestamos && (
            <OperacionesView
              operaciones={filteredOperaciones}
              clientes={filteredClientes}
              cuotas={filteredCuotas}
              configuracion={configuracion}
              feriados={feriados.map(f => f.fecha)}
              activeUser={activeUser}
              onAddOperacion={handleAddOperacion}
              onUpdateOperacion={handleUpdateOperacion}
              onAddCuotas={handleAddCuotas}
            />
          )}

          {(activeTab === 'pagos' || activeTab === 'pagos-whatsapp') && activeUserRole.verPagos && (
            <PagosView
              operaciones={filteredOperaciones}
              cuotas={filteredCuotas}
              pagos={filteredPagos}
              clientes={clientes}
              activeUser={activeUser}
              configuracion={configuracion}
              onAddPago={handleAddPago}
              canAddPago={activeUserRole.registrarPagos}
              mode="WHATSAPP"
            />
          )}

          {activeTab === 'pagos-telefono' && activeUserRole.verPagos && (
            <PagosView
              operaciones={filteredOperaciones}
              cuotas={filteredCuotas}
              pagos={filteredPagos}
              clientes={clientes}
              activeUser={activeUser}
              configuracion={configuracion}
              onAddPago={handleAddPago}
              canAddPago={activeUserRole.registrarPagos}
              mode="TELEFONO"
            />
          )}

          {activeTab === 'pagos-calle' && activeUserRole.verPagos && (
            <PagosView
              operaciones={filteredOperaciones}
              cuotas={filteredCuotas}
              pagos={filteredPagos}
              clientes={clientes}
              activeUser={activeUser}
              configuracion={configuracion}
              onAddPago={handleAddPago}
              canAddPago={activeUserRole.registrarPagos}
              mode="CALLE"
            />
          )}

          {activeTab === 'tesoreria' && activeUserRole.verTesoreria && (
            <TesoreriaView
              transacciones={transacciones}
              onAddTransaccion={handleAddTransaccion}
              liquidaciones={liquidaciones}
              onAddLiquidacion={handleAddLiquidacion}
              onUpdateLiquidacion={handleUpdateLiquidacion}
              clientes={clientes}
              operaciones={operaciones}
              cuotas={cuotas}
              pagos={pagos}
            />
          )}

          {activeTab === 'configuracion' && activeUserRole.verConfiguracion && (
            <ConfiguracionView
              configuracion={configuracion}
              feriados={feriados}
              clientes={clientes}
              operaciones={operaciones}
              cuotas={cuotas}
              pagos={pagos}
              transacciones={transacciones}
              onUpdateConfiguracion={handleUpdateConfiguracion}
              onAddFeriado={handleAddFeriado}
              onDeleteFeriado={handleDeleteFeriado}
              onClearDatabase={handleClearDatabase}
              onResetToSeed={handleResetToSeed}
              onRestoreBackup={handleRestoreBackup}
            />
          )}

          {activeTab === 'usuarios' && activeUser?.rolId === 'ADMIN' && (
            <UsuariosView
              usuarios={usuarios}
              roles={roles}
              activeUser={activeUser}
              onAddUsuario={handleAddUsuario}
              onUpdateUsuario={handleUpdateUsuario}
              onDeleteUsuario={handleDeleteUsuario}
              onUpdateRolePermisos={handleUpdateRolePermisos}
              onAddRole={handleAddRole}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 text-slate-500 text-xs py-4 text-center mt-auto">
        <p className="max-w-7xl mx-auto px-6">© 2026 Credi-Cash | Sistema Maestro. Diseñado bajo el principio de utilidad pura y amortizaciones de alta precisión.</p>
      </footer>

    </div>
  );
}

