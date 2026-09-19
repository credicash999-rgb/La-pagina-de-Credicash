/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Cliente, Operacion, Cuota, Pago, Feriado, CompromisoPago,
  Configuracion, TransaccionTesoreria, PermisosRol, UsuarioRol, LiquidacionPersonal, FichajeAsistencia,
  ConfiguracionComisiones, ConfiguracionRecorrido, ComisionCobrador, VisitaDomicilio, VisitaReprogramada,
  LiquidacionSemanal, LiquidacionMensual, SolicitudReintegroDesayuno
} from './types';

import { calcularDiasAtrasoSinDomingos, sortCuotasByPaymentPriority, normalizeDateToISO, parseDateToTimestamp } from './utils/cuotasGenerator';

import { 
  getSavedFirebaseConfig, 
  initializeFirebase, 
  isFirebaseEnabled, 
  isAutoSyncEnabled,
  uploadDocToFirestore, 
  uploadAllToFirestore,
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
import ClientesTodosView from './components/ClientesTodosView';
import GestionAdministracionView from './components/GestionAdministracionView';
import AlertasOportunidadesView from './components/AlertasOportunidadesView';
import CaptacionClientesView from './components/CaptacionClientesView';
import VerificacionView from './components/VerificacionView';
import AsignacionClientesView from './components/AsignacionClientesView';

// Icons
import { 
  LayoutDashboard, Users, UserPlus, Briefcase, DollarSign, 
  Percent, Activity, Settings, Calendar, ShieldCheck, Mail, LogOut, CheckCircle2, ShieldAlert,
  Smartphone, PhoneCall, MapPin, Search, MessageCircle, Clock, ListOrdered, UserX, Bell, Sparkles, UserCheck, FileCheck,
  AlertTriangle, RefreshCw, Loader2
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
  REINTEGROS_DESAYUNO: 'credicash_reintegros_desayuno',
  COMPROMISOS_PAGO: 'credicash_compromisos_pago'
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

const SEED_COMISIONES: ComisionCobrador[] = [
  {
    id: 'COM-001',
    cobradorId: 'USR-2',
    cobradorNombre: 'Rodrigo Gómez',
    idCliente: 'CLI-001',
    nombreCliente: 'Carlos Mendoza',
    montoCobrado: 7500,
    montoComision: 875,
    tipoComision: 'COBRANZA',
    fecha: '2026-07-01',
    estado: 'VERIFICADO',
    pagoId: 'PAG-001'
  }
];

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
  },
  {
    id: 'CLI-004',
    nombre: 'Liliana Beatriz',
    apellido: 'Fernández',
    dni: '32184920',
    telefono: '+54 9 11 4920-1122',
    direccion: 'Av. San Martín 2100, Morón',
    trabajo: 'Comerciante (Boutique)',
    ingresos: 300000,
    captador: 'Sofía Martínez',
    analista: 'Héctor Delgado',
    estado: 'INACTIVO',
    fechaRegistro: '2026-05-10',
  },
  {
    id: 'CLI-005',
    nombre: 'Claudia',
    apellido: 'Vera Cabral',
    dni: '29841029',
    telefono: '+54 9 11 5821-9033',
    direccion: 'Calle Rivadavia 850, Quilmes',
    trabajo: 'Docente Primaria',
    ingresos: 280000,
    captador: 'Pedro Alarcón',
    analista: 'Héctor Delgado',
    estado: 'INACTIVO',
    montoDeudaInactivo: 25000,
    montoPagoInicialRefinanciacion: 7500,
    fechaRegistro: '2026-05-12',
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
  interesAtrasoDiario: 50,
  interesAtrasoSemanal: 50,
  interesAtrasoQuincenal: 50,
  interesAtrasoMensual: 50,
};

export const DEFAULT_ROLES: PermisosRol[] = [
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

export const DEFAULT_USUARIOS: UsuarioRol[] = [
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
  },
  {
    id: 'USR-4',
    nombre: 'Operador 1',
    email: 'operador1@credicash.com',
    password: '123',
    rolId: 'OPERADOR'
  },
  {
    id: 'USR-5',
    nombre: 'Operador General',
    email: 'operador@credicash.com',
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

// Liliana: Finished credit without delays -> Apto para Renovación Directa
const seedOperacionLiliana: Operacion = {
  id: 'OPE-004',
  fechaOtorgamiento: '2026-05-15',
  idCliente: 'CLI-004',
  nombreCliente: 'Liliana Beatriz Fernández',
  estado: 'FINALIZADA',
  tipoOperacion: 'NUEVO',
  descripcion: 'Crédito anterior finalizado 100% sin mora',
  capitalEntregado: 80000,
  promocionAplicada: '',
  descuentoPorcentaje: 0,
  totalFinanciado: 120000,
  frecuencia: 'DIARIA',
  cantidadCuotas: 10,
  valorCuota: 12000,
  primerVencimiento: '2026-05-16',
  ultimoVencimiento: '2026-05-27',
  cobrador: 'Rodrigo Gómez',
  captador: 'Sofía Martínez',
  analista: 'Héctor Delgado',
  ejecutivoAtencion: 'Sistema',
  capitalRecuperado: 80000,
  interesCobrado: 40000,
  capitalPendiente: 0,
  totalPendiente: 0,
  cuotasPagadas: 10,
  cuotasPendientes: 0,
  proximoVencimiento: 'PAGADO TOTAL',
  ultimoPago: '2026-05-27',
  diasMora: 0,
  nivelMora: 'Sano',
  numeroCredito: 1,
  mesesFinanciados: 1,
  elegibleRenovacion: true,
  elegibleAmpliacion: false,
  fechaFinalizacion: '2026-05-27',
  motivoCierre: 'FINALIZADO_OK',
  observaciones: 'Crédito anterior finalizado en término',
  cuotasGeneradas: true,
};

// Claudia Vera Cabral: Finished credit WITH DELAYS -> Calculates interest for Refinanciación
const seedOperacionClaudia: Operacion = {
  id: 'OPE-005',
  fechaOtorgamiento: '2026-05-15',
  idCliente: 'CLI-005',
  nombreCliente: 'Claudia Vera Cabral',
  estado: 'FINALIZADA',
  tipoOperacion: 'NUEVO',
  descripcion: 'Crédito anterior finalizado con retraso en cuotas finales',
  capitalEntregado: 80000,
  promocionAplicada: '',
  descuentoPorcentaje: 0,
  totalFinanciado: 120000,
  frecuencia: 'DIARIA',
  cantidadCuotas: 10,
  valorCuota: 12000,
  primerVencimiento: '2026-05-16',
  ultimoVencimiento: '2026-05-27',
  cobrador: 'Rodrigo Gómez',
  captador: 'Sofía Martínez',
  analista: 'Héctor Delgado',
  ejecutivoAtencion: 'Sistema',
  capitalRecuperado: 80000,
  interesCobrado: 40000,
  capitalPendiente: 0,
  totalPendiente: 0,
  cuotasPagadas: 10,
  cuotasPendientes: 0,
  proximoVencimiento: 'PAGADO TOTAL',
  ultimoPago: '2026-05-27',
  diasMora: 0,
  nivelMora: 'Sano',
  numeroCredito: 1,
  mesesFinanciados: 1,
  elegibleRenovacion: false,
  elegibleAmpliacion: false,
  fechaFinalizacion: '2026-05-27',
  motivoCierre: 'FINALIZADO_CON_ATRASO',
  observaciones: 'Crédito finalizado con mora en cuotas',
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

  // 10 cuotas for Liliana (All paid on time)
  for (let i = 0; i < 10; i++) {
    const dueDate = `2026-05-${String(16 + i).padStart(2, '0')}`;
    list.push({
      id: `OPE-004-CUO-${String(i + 1).padStart(2, '0')}`,
      idOperacion: 'OPE-004',
      idCliente: 'CLI-004',
      nombreCliente: 'Liliana Beatriz Fernández',
      numeroCredito: 1,
      numeroCuota: i + 1,
      frecuencia: 'DIARIA',
      fechaVencimiento: dueDate,
      capitalCuota: 8000,
      interesCuota: 4000,
      valorTotalCuota: 12000,
      estado: 'PAGADA',
      fechaPago: dueDate, // Paid strictly on time
      importePagado: 12000,
      saldoPendiente: 0,
      diasAtraso: 0,
      cobrador: 'Rodrigo Gómez',
      observaciones: 'Pago puntual',
    });
  }

  // 10 cuotas for Claudia Vera Cabral (Cuotas 7, 8, 9, 10 paid late)
  for (let i = 0; i < 10; i++) {
    const dueDate = `2026-05-${String(16 + i).padStart(2, '0')}`;
    const isLate = i >= 6; // Cuotas 7..10 paid late
    const paymentDate = isLate ? `2026-06-${String(5 + i).padStart(2, '0')}` : dueDate;
    const daysLate = isLate ? (10 + i * 2) : 0;

    list.push({
      id: `OPE-005-CUO-${String(i + 1).padStart(2, '0')}`,
      idOperacion: 'OPE-005',
      idCliente: 'CLI-005',
      nombreCliente: 'Claudia Vera Cabral',
      numeroCredito: 1,
      numeroCuota: i + 1,
      frecuencia: 'DIARIA',
      fechaVencimiento: dueDate,
      capitalCuota: 8000,
      interesCuota: 4000,
      valorTotalCuota: 12000,
      estado: 'PAGADA',
      fechaPago: paymentDate,
      importePagado: 12000,
      saldoPendiente: 0,
      diasAtraso: daysLate,
      cobrador: 'Rodrigo Gómez',
      observaciones: isLate ? `Abonado con ${daysLate} días de atraso` : 'Pago puntual',
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
  const [activeTab, setActiveTab] = useState<string>(() => {
    const savedRole = localStorage.getItem('credicash_real_user_rol_id');
    if (savedRole === 'OPERADOR') return 'pagos-whatsapp';
    if (savedRole === 'COBRADOR') return 'pagos-calle';
    return 'dashboard';
  });

  // Core State with Persistent Local Storage & Auto-Vault Fallback
  const [clientes, setClientes] = useState<Cliente[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLIENTES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const vault = localStorage.getItem('credicash_backup_auto_vault');
      if (vault) {
        const parsedVault = JSON.parse(vault);
        if (parsedVault && Array.isArray(parsedVault.clientes) && parsedVault.clientes.length > 0) {
          return parsedVault.clientes;
        }
      }
    } catch (e) {}
    return SEED_CLIENTES;
  });

  const [operaciones, setOperaciones] = useState<Operacion[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.OPERACIONES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const vault = localStorage.getItem('credicash_backup_auto_vault');
      if (vault) {
        const parsedVault = JSON.parse(vault);
        if (parsedVault && Array.isArray(parsedVault.operaciones) && parsedVault.operaciones.length > 0) {
          return parsedVault.operaciones;
        }
      }
    } catch (e) {}
    return [seedOperacion1];
  });

  const [cuotas, setCuotas] = useState<Cuota[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUOTAS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const vault = localStorage.getItem('credicash_backup_auto_vault');
      if (vault) {
        const parsedVault = JSON.parse(vault);
        if (parsedVault && Array.isArray(parsedVault.cuotas) && parsedVault.cuotas.length > 0) {
          return parsedVault.cuotas;
        }
      }
    } catch (e) {}
    return generateSeedCuotas();
  });

  const [pagos, setPagos] = useState<Pago[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PAGOS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const vault = localStorage.getItem('credicash_backup_auto_vault');
      if (vault) {
        const parsedVault = JSON.parse(vault);
        if (parsedVault && Array.isArray(parsedVault.pagos) && parsedVault.pagos.length > 0) {
          return parsedVault.pagos;
        }
      }
    } catch (e) {}
    return SEED_PAGOS;
  });

  const [compromisosPago, setCompromisosPago] = useState<CompromisoPago[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMPROMISOS_PAGO);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [liquidaciones, setLiquidaciones] = useState<LiquidacionPersonal[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LIQUIDACIONES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [configuracion, setConfiguracion] = useState<Configuracion>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONFIGURACION);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {}
    return {
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
    };
  });

  const [feriados, setFeriados] = useState<Feriado[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FERIADOS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [transacciones, setTransacciones] = useState<TransaccionTesoreria[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACCIONES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      const vault = localStorage.getItem('credicash_backup_auto_vault');
      if (vault) {
        const parsedVault = JSON.parse(vault);
        if (parsedVault && Array.isArray(parsedVault.transacciones) && parsedVault.transacciones.length > 0) {
          return parsedVault.transacciones;
        }
      }
    } catch (e) {}
    return SEED_TRANSACCIONES;
  });

  const [usuarios, setUsuarios] = useState<UsuarioRol[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USUARIOS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Guarantee superadmin exists in list
          const hasSuperAdmin = parsed.some((u: UsuarioRol) => u.id === 'USR-1' || u.email?.toLowerCase().trim() === 'credicash999@gmail.com');
          return hasSuperAdmin ? parsed : [...DEFAULT_USUARIOS, ...parsed];
        }
      }
    } catch (e) {}
    return DEFAULT_USUARIOS;
  });

  const [roles, setRoles] = useState<PermisosRol[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ROLES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, PermisosRol>();
          DEFAULT_ROLES.forEach(r => map.set(r.id.toUpperCase().trim(), r));
          parsed.forEach((r: PermisosRol) => {
            if (r && r.id) map.set(r.id.toUpperCase().trim(), r);
          });
          return Array.from(map.values());
        }
      }
    } catch (e) {}
    return DEFAULT_ROLES;
  });

  const [fichajes, setFichajes] = useState<FichajeAsistencia[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FICHAJES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  // Cloud single-source-of-truth status
  const [cloudLoading, setCloudLoading] = useState<boolean>(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Cobrador de Campo & Liquidaciones State
  const [configComisiones, setConfigComisiones] = useState<ConfiguracionComisiones>(SEED_CONFIG_COMISIONES);
  const [configRecorrido, setConfigRecorrido] = useState<ConfiguracionRecorrido>(SEED_CONFIG_RECORRIDO);
  const [comisiones, setComisiones] = useState<ComisionCobrador[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COMISIONES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [visitasHistory, setVisitasHistory] = useState<VisitaDomicilio[]>([]);
  const [visitasReprogramadas, setVisitasReprogramadas] = useState<VisitaReprogramada[]>([]);
  const [liquidacionesSemanales, setLiquidacionesSemanales] = useState<LiquidacionSemanal[]>([]);
  const [liquidacionesMensuales, setLiquidacionesMensuales] = useState<LiquidacionMensual[]>([]);
  const [reintegrosDesayuno, setReintegrosDesayuno] = useState<SolicitudReintegroDesayuno[]>([]);
  const [cobradorSubTab, setCobradorSubTab] = useState<'gestion_diaria' | 'mi_recorrido' | 'reintegro_desayuno'>('gestion_diaria');

  const [activeUser, setActiveUser] = useState<UsuarioRol>(() => {
    try {
      const isLogged = localStorage.getItem('credicash_logged_in');
      const savedActiveId = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID);
      const savedUsersRaw = localStorage.getItem(STORAGE_KEYS.USUARIOS);
      const usersList: UsuarioRol[] = [
        ...((savedUsersRaw ? JSON.parse(savedUsersRaw) : []) || []),
        ...DEFAULT_USUARIOS
      ];
      if (savedActiveId && isLogged !== 'false') {
        const cleanSaved = savedActiveId.toLowerCase().trim();
        const matching = usersList.find(u => 
          u.id.toLowerCase() === cleanSaved || 
          (u.email && u.email.toLowerCase().trim() === cleanSaved) ||
          (u.nombre && u.nombre.toLowerCase().trim() === cleanSaved)
        );
        if (matching) return matching;
      }
    } catch (e) {}
    return DEFAULT_USUARIOS[0];
  });

  const [realUserRolId, setRealUserRolId] = useState<string>(() => {
    return localStorage.getItem('credicash_real_user_rol_id') || 'ADMIN';
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const isLogged = localStorage.getItem('credicash_logged_in');
    if (isLogged === 'false') return false;
    return true;
  });

  // Reconcile dates & overdue statuses in memory from real data without altering database fields
  const reconcileOverdueData = (
    rawClientes: Cliente[],
    rawOperaciones: Operacion[],
    rawCuotas: Cuota[],
    config: Configuracion
  ) => {
    const todayStr = new Date().toISOString().split('T')[0];

    const recCuotas = (rawCuotas || []).map(c => {
      if (c.estado !== 'PAGADA') {
        const isPastDue = c.fechaVencimiento < todayStr;
        const targetEstado = isPastDue ? 'VENCIDA' as const : 'PENDIENTE' as const;
        if (c.estado !== targetEstado) {
          return { ...c, estado: targetEstado };
        }
      }
      return c;
    });

    const recOperaciones = (rawOperaciones || []).map(op => {
      if (op.estado === 'ACTIVA') {
        const opCuotas = recCuotas.filter(c => c.idOperacion === op.id && c.estado !== 'PAGADA');
        const sortedPending = [...opCuotas].sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
        
        let targetDiasMora = 0;
        let targetNivelMora = 'Sano';
        let targetProximoVencimiento = op.proximoVencimiento;
        
        if (sortedPending.length > 0) {
          const oldestPending = sortedPending[0];
          targetProximoVencimiento = oldestPending.fechaVencimiento;
          if (oldestPending.fechaVencimiento < todayStr) {
            targetDiasMora = calcularDiasAtrasoSinDomingos(oldestPending.fechaVencimiento, todayStr);
          }
        } else {
          targetProximoVencimiento = 'PAGADO TOTAL';
        }

        if (targetDiasMora === 0) {
          targetNivelMora = 'Sano';
        } else {
          const f = op.frecuencia;
          if (f === 'DIARIA') {
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
            const llamar = config.moraMensualLlamarDias ?? 2;
            if (targetDiasMora < llamar) {
              targetNivelMora = `Atraso Regular (${targetDiasMora} d)`;
            } else {
              targetNivelMora = `Enviar Cobrador / Alerta Crítica (${targetDiasMora} d)`;
            }
          } else if (f === 'SEMANAL') {
            const llamar = config.moraSemanalLlamarDias ?? 4;
            const cobrador = config.moraSemanalCobradorDias ?? 7;
            if (targetDiasMora < llamar) {
              targetNivelMora = `Atraso Regular (${targetDiasMora} d)`;
            } else if (targetDiasMora < cobrador) {
              targetNivelMora = `Notificar / Llamar (${targetDiasMora} d)`;
            } else {
              targetNivelMora = `Enviar Cobrador (Calle: ${targetDiasMora} d)`;
            }
          } else {
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

        if (op.diasMora !== targetDiasMora || op.nivelMora !== targetNivelMora || op.proximoVencimiento !== targetProximoVencimiento) {
          return { ...op, diasMora: targetDiasMora, nivelMora: targetNivelMora, proximoVencimiento: targetProximoVencimiento };
        }
      }
      return op;
    });

    const recClientes = (rawClientes || []).map(cli => {
      const cliOps = recOperaciones.filter(o => o.idCliente === cli.id && o.estado === 'ACTIVA');
      const hasOpsInMora = cliOps.some(o => o.diasMora > 0);
      const targetEstado = hasOpsInMora ? 'EN_MORA' as const : (cli.estado === 'EN_MORA' ? 'ACTIVO' as const : cli.estado);
      if (cli.estado !== targetEstado) {
        return { ...cli, estado: targetEstado };
      }
      return cli;
    });

    return { recClientes, recOperaciones, recCuotas };
  };

  const handleLogin = (user: UsuarioRol) => {
    setActiveUser(user);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, user.id);
    localStorage.setItem('credicash_logged_in', 'true');
    localStorage.setItem('credicash_real_user_rol_id', user.rolId);
    setRealUserRolId(user.rolId);
    setIsLoggedIn(true);

    if (user.rolId === 'COBRADOR') {
      setActiveTab('pagos-calle');
    } else if (user.rolId === 'OPERADOR') {
      setActiveTab('pagos-whatsapp');
    } else {
      setActiveTab('dashboard');
    }

    // Dynamic registration of login user in current users list
    setUsuarios(prev => {
      const exists = prev.some(u => u.email.toLowerCase() === user.email.toLowerCase() || u.id === user.id);
      if (!exists) {
        const updated = [...prev, user];
        saveToLocalStorage(STORAGE_KEYS.USUARIOS, updated);
        return updated;
      }
      return prev;
    });

    // Automatic Attendance Fichaje on Login
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    setFichajes(prev => {
      const alreadyFichado = prev.some(f => f.usuarioId === user.id && f.fecha === todayStr);
      if (!alreadyFichado) {
        const nuevoFichaje: FichajeAsistencia = {
          id: `FICH-${Date.now()}`,
          usuarioId: user.id,
          usuarioNombre: user.nombre,
          usuarioRol: user.rolId,
          fecha: todayStr,
          horaEntrada: timeStr,
          estado: 'ACTIVA'
        };
        const updated = [nuevoFichaje, ...prev];
        saveToLocalStorage(STORAGE_KEYS.FICHAJES, updated);
        return updated;
      }
      return prev;
    });

    if (isFirebaseEnabled()) {
      setCloudLoading(true);
      downloadAllFromFirestore().then(res => {
        setCloudLoading(false);
        if (res.success && res.data) {
          setCloudError(null);
          applyCloudSnapshotData(res.data);
        } else {
          setCloudError(res.error || 'Error al descargar datos de Firestore.');
        }
      }).catch(err => {
        setCloudLoading(false);
        setCloudError(err?.message || 'Error de conexión con Firestore.');
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('credicash_logged_in');
    localStorage.removeItem('credicash_real_user_rol_id');
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER_ID);
    setActiveUser(null);
    setRealUserRolId(null);
    setIsLoggedIn(false);
  };

  // Emergency Auto-Vault: Keep an encrypted/isolated recovery copy of all data in browser
  useEffect(() => {
    if (clientes && clientes.length > 0) {
      try {
        const vaultPayload = {
          clientes,
          operaciones,
          cuotas,
          pagos,
          transacciones,
          usuarios,
          roles,
          configuracion,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('credicash_backup_auto_vault', JSON.stringify(vaultPayload));
      } catch (e) {}
    }
  }, [clientes, operaciones, cuotas, pagos, transacciones, usuarios, roles, configuracion]);

  // Comprehensive helper to apply cloud snapshot to state strictly from Firestore
  const applyCloudSnapshotData = (data: any) => {
    if (!data) return;

    const rawClientes = data.clientes !== undefined ? data.clientes : clientes;
    const rawOperaciones = data.operaciones !== undefined ? data.operaciones : operaciones;
    const rawCuotas = data.cuotas !== undefined ? data.cuotas : cuotas;
    const rawConfig = data.configuracion || configuracion;

    const { recClientes, recOperaciones, recCuotas } = reconcileOverdueData(rawClientes, rawOperaciones, rawCuotas, rawConfig);

    // ANTI-DATA LOSS PROTECTION: Never replace populated local data with an empty cloud payload
    if (Array.isArray(data.clientes) && (data.clientes.length > 0 || clientes.length === 0)) {
      setClientes(recClientes);
      saveToLocalStorage(STORAGE_KEYS.CLIENTES, recClientes);
    }
    if (Array.isArray(data.operaciones) && (data.operaciones.length > 0 || operaciones.length === 0)) {
      setOperaciones(recOperaciones);
      saveToLocalStorage(STORAGE_KEYS.OPERACIONES, recOperaciones);
    }
    if (Array.isArray(data.cuotas) && (data.cuotas.length > 0 || cuotas.length === 0)) {
      setCuotas(recCuotas);
      saveToLocalStorage(STORAGE_KEYS.CUOTAS, recCuotas);
    }
    if (Array.isArray(data.pagos) && (data.pagos.length > 0 || pagos.length === 0)) {
      setPagos(data.pagos);
      saveToLocalStorage(STORAGE_KEYS.PAGOS, data.pagos);
    }
    if (Array.isArray(data.transacciones) && (data.transacciones.length > 0 || transacciones.length === 0)) {
      setTransacciones(data.transacciones);
      saveToLocalStorage(STORAGE_KEYS.TRANSACCIONES, data.transacciones);
    }
    if (Array.isArray(data.liquidaciones) && (data.liquidaciones.length > 0 || liquidaciones.length === 0)) {
      setLiquidaciones(data.liquidaciones);
      saveToLocalStorage(STORAGE_KEYS.LIQUIDACIONES, data.liquidaciones);
    }
    if (data.usuarios !== undefined && Array.isArray(data.usuarios)) {
      const resolvedUsers = data.usuarios.map((u: any) => ({
        ...u,
        id: String(u.id || '').trim(),
        nombre: String(u.nombre || u.name || u.email || u.id || '').trim(),
        email: String(u.email || '').trim(),
        password: u.password != null ? String(u.password).trim() : (u.clave != null ? String(u.clave).trim() : (u.contrasena != null ? String(u.contrasena).trim() : '')),
        rolId: String(u.rolId || u.rol || u.role || '').trim().toUpperCase()
      }));
      setUsuarios(resolvedUsers);
      saveToLocalStorage(STORAGE_KEYS.USUARIOS, resolvedUsers);

      // Restore active user strictly if matching in resolved users list
      const savedActiveUserId = localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID);
      if (savedActiveUserId) {
        const cleanSaved = savedActiveUserId.toLowerCase().trim();
        const matching = resolvedUsers.find((u: UsuarioRol) => 
          u.id.toLowerCase() === cleanSaved || 
          (u.email && u.email.toLowerCase().trim() === cleanSaved) ||
          (u.nombre && u.nombre.toLowerCase().trim() === cleanSaved)
        );
        if (matching) {
          setActiveUser(matching);
          setRealUserRolId(matching.rolId);
          localStorage.setItem('credicash_real_user_rol_id', matching.rolId);
          const normRol = matching.rolId.toUpperCase().trim();
          if (normRol === 'OPERADOR') {
            setActiveTab(prev => (prev === 'pagos-whatsapp' || prev === 'clientes' ? prev : 'pagos-whatsapp'));
          } else if (normRol === 'COBRADOR') {
            setActiveTab(prev => (prev === 'pagos-calle' || prev === 'liquidaciones' ? prev : 'pagos-calle'));
          }
        }
      }
    }
    if (data.roles !== undefined && Array.isArray(data.roles)) {
      const map = new Map<string, PermisosRol>();
      DEFAULT_ROLES.forEach(r => map.set(r.id.toUpperCase().trim(), r));
      (roles || []).forEach(r => {
        if (r && r.id) map.set(r.id.toUpperCase().trim(), r);
      });
      data.roles.forEach((r: PermisosRol) => {
        if (r && r.id) map.set(r.id.toUpperCase().trim(), r);
      });
      const resolvedRoles = Array.from(map.values());
      setRoles(resolvedRoles);
      saveToLocalStorage(STORAGE_KEYS.ROLES, resolvedRoles);
    }
    if (data.comisiones !== undefined) {
      setComisiones(data.comisiones);
      saveToLocalStorage(STORAGE_KEYS.COMISIONES, data.comisiones);
    }
    if (data.feriados !== undefined) {
      setFeriados(data.feriados);
      saveToLocalStorage(STORAGE_KEYS.FERIADOS, data.feriados);
    }
    if (data.visitasHistory !== undefined) {
      setVisitasHistory(data.visitasHistory);
      saveToLocalStorage(STORAGE_KEYS.VISITAS_HISTORY, data.visitasHistory);
    }
    if (data.configuracion) {
      setConfiguracion(data.configuracion);
      saveToLocalStorage(STORAGE_KEYS.CONFIGURACION, data.configuracion);
    }
  };

  // Re-fetch manual sync handler
  const handleRetryCloudSync = async () => {
    setCloudLoading(true);
    setCloudError(null);
    try {
      const res = await downloadAllFromFirestore();
      if (res.success && res.data) {
        applyCloudSnapshotData(res.data);
      } else {
        setCloudError(res.error || 'Error al conectar con Firestore.');
      }
    } catch (err: any) {
      setCloudError(err?.message || 'Error de conexión con Firestore.');
    } finally {
      setCloudLoading(false);
    }
  };

  // Initialize Firebase client on mount and pull latest cloud database (Single Source of Truth)
  useEffect(() => {
    let unsubRealtime: (() => void) | undefined;

    // Check if app was opened via a shareable linking URL (?fb=... or ?fb_config=...)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('fb') || urlParams.has('fb_config')) {
      initializeFirebase();
      localStorage.removeItem('credicash_logged_in');
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER_ID);
      setIsLoggedIn(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (isFirebaseEnabled()) {
      setCloudLoading(true);
      initializeFirebase();
      downloadAllFromFirestore().then(res => {
        setCloudLoading(false);
        if (res.success && res.data) {
          setCloudError(null);
          applyCloudSnapshotData(res.data);
        } else {
          setCloudError(res.error || 'No se pudo obtener datos de Firebase Firestore.');
        }
      }).catch(err => {
        setCloudLoading(false);
        setCloudError(err?.message || 'Error de conexión con Firestore.');
      });

      // Attach real-time listener for multi-device sync
      unsubRealtime = subscribeToFirestore((cloudData) => {
        setCloudError(null);
        applyCloudSnapshotData(cloudData);
      });
    } else {
      setCloudLoading(false);
      setCloudError(null);
    }

    // Cross-tab sync handler
    const handleStorageEvent = (e: StorageEvent) => {
      if (!e.key || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (e.key === STORAGE_KEYS.CLIENTES) setClientes(parsed);
        if (e.key === STORAGE_KEYS.OPERACIONES) setOperaciones(parsed);
        if (e.key === STORAGE_KEYS.CUOTAS) setCuotas(parsed);
        if (e.key === STORAGE_KEYS.PAGOS) setPagos(parsed);
        if (e.key === STORAGE_KEYS.TRANSACCIONES) setTransacciones(parsed);
        if (e.key === STORAGE_KEYS.USUARIOS) setUsuarios(parsed);
      } catch (err) {
        // ignore parse error
      }
    };
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      if (unsubRealtime) unsubRealtime();
    };
  }, []);

  // Sync state to global window reference for backup inspection
  useEffect(() => {
    (window as any).__credicashState = {
      clientes,
      operaciones,
      cuotas,
      pagos,
      transacciones,
      configuracion,
      feriados,
      usuarios,
      comisiones,
      liquidacionesSemanales,
      liquidacionesMensuales
    };
  }, [clientes, operaciones, cuotas, pagos, transacciones, configuracion, feriados, usuarios, comisiones, liquidacionesSemanales, liquidacionesMensuales]);

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
    if (!updated || !updated.id || updated.id.startsWith('OP-INACTIVO') || updated.id === 'SIN_CREDITO') return;
    const exists = operaciones.some(o => o.id === updated.id);
    const list = exists ? operaciones.map(o => o.id === updated.id ? updated : o) : [updated, ...operaciones];
    setOperaciones(list);
    saveToLocalStorage(STORAGE_KEYS.OPERACIONES, list);

    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      uploadDocToFirestore('operaciones', updated.id, updated);
    }
  };

  const handleUpdateOperacionWithCuotas = (updated: Operacion, updatedCuotasList?: Cuota[]) => {
    handleUpdateOperacion(updated);

    if (updatedCuotasList && updatedCuotasList.length > 0) {
      const updatedCuotaIds = new Set(updatedCuotasList.map(c => c.id));
      const newCuotasList = cuotas.map(c => {
        if (updatedCuotaIds.has(c.id)) {
          return updatedCuotasList.find(uc => uc.id === c.id) || c;
        }
        return c;
      });
      setCuotas(newCuotasList);
      saveToLocalStorage(STORAGE_KEYS.CUOTAS, newCuotasList);

      if (isFirebaseEnabled() && isAutoSyncEnabled()) {
        updatedCuotasList.forEach(c => uploadDocToFirestore('cuotas', c.id, c));
      }
    }
  };

  const handleDeleteOperacion = (idOperacion: string) => {
    const newOps = operaciones.filter(o => o.id !== idOperacion);
    const newCuotas = cuotas.filter(c => c.idOperacion !== idOperacion);
    const newPagos = pagos.filter(p => p.idOperacion !== idOperacion);

    setOperaciones(newOps);
    setCuotas(newCuotas);
    setPagos(newPagos);

    saveToLocalStorage(STORAGE_KEYS.OPERACIONES, newOps);
    saveToLocalStorage(STORAGE_KEYS.CUOTAS, newCuotas);
    saveToLocalStorage(STORAGE_KEYS.PAGOS, newPagos);

    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      deleteDocFromFirestore('operaciones', idOperacion);
    }
  };

  const handleDeleteCliente = (idCliente: string) => {
    const newClientes = clientes.filter(c => c.id !== idCliente);
    const newOps = operaciones.filter(o => o.idCliente !== idCliente);
    const opIds = new Set(operaciones.filter(o => o.idCliente === idCliente).map(o => o.id));
    const newCuotas = cuotas.filter(c => !opIds.has(c.idOperacion));
    const newPagos = pagos.filter(p => p.idCliente !== idCliente);

    setClientes(newClientes);
    setOperaciones(newOps);
    setCuotas(newCuotas);
    setPagos(newPagos);

    saveToLocalStorage(STORAGE_KEYS.CLIENTES, newClientes);
    saveToLocalStorage(STORAGE_KEYS.OPERACIONES, newOps);
    saveToLocalStorage(STORAGE_KEYS.CUOTAS, newCuotas);
    saveToLocalStorage(STORAGE_KEYS.PAGOS, newPagos);

    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      deleteDocFromFirestore('clientes', idCliente);
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

  const handleAddCompromisoPago = (nuevoCompromiso: CompromisoPago) => {
    const updated = [nuevoCompromiso, ...compromisosPago];
    setCompromisosPago(updated);
    saveToLocalStorage(STORAGE_KEYS.COMPROMISOS_PAGO, updated);
    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      uploadDocToFirestore('compromisos_pago', nuevoCompromiso.id, nuevoCompromiso);
    }
  };

  const handleAddCompromisosPagoBatch = (nuevosCompromisos: CompromisoPago[]) => {
    const updated = [...nuevosCompromisos, ...compromisosPago];
    setCompromisosPago(updated);
    saveToLocalStorage(STORAGE_KEYS.COMPROMISOS_PAGO, updated);
    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      nuevosCompromisos.forEach(c => uploadDocToFirestore('compromisos_pago', c.id, c));
    }
  };

  const handleUpdateCompromisoPago = (updatedCompromiso: CompromisoPago) => {
    const updated = compromisosPago.map(c => c.id === updatedCompromiso.id ? updatedCompromiso : c);
    setCompromisosPago(updated);
    saveToLocalStorage(STORAGE_KEYS.COMPROMISOS_PAGO, updated);
    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      uploadDocToFirestore('compromisos_pago', updatedCompromiso.id, updatedCompromiso);
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

    // 4b. Generate commission entry for collector according to configured mode (PORCENTAJE or MONTO_FIJO)
    const modoCom = configComisiones?.modoComisionCobranza || 'PORCENTAJE';
    let finalComision = 0;
    if (modoCom === 'MONTO_FIJO') {
      finalComision = configComisiones?.fijoComisionCobranza || 500;
    } else {
      finalComision = Math.round((nuevoPago.importe * (configComisiones?.porcentajeComisionCobranza || 5)) / 100);
    }

    const nuevaComision: ComisionCobrador = {
      id: `COM-${Date.now()}`,
      cobradorId: activeUser?.id || 'COB-01',
      cobradorNombre: activeUser?.nombre || 'Cobrador',
      idCliente: nuevoPago.idCliente,
      nombreCliente: nuevoPago.nombreCliente,
      montoCobrado: nuevoPago.importe,
      montoComision: finalComision,
      tipoComision: 'COBRANZA',
      fecha: nuevoPago.fechaPago,
      estado: 'PENDIENTE',
      pagoId: nuevoPago.id
    };
    const updatedComsList = [nuevaComision, ...comisiones];
    setComisiones(updatedComsList);
    saveToLocalStorage(STORAGE_KEYS.COMISIONES, updatedComsList);

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

  // Reorganize / Reallocate payment modality (e.g. switching from Option A to Option B)
  const handleReorganizePagoAllocation = (
    pagoId: string,
    newModalidad: 'PAGO_REGULAR' | 'PAGO_PARCIAL' | 'PAGO_ADELANTADO_OPCION_A' | 'PAGO_ADELANTADO_OPCION_B',
    newMetodoPago?: 'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO',
    newFechaPago?: string,
    newImporte?: number,
    newObservaciones?: string
  ) => {
    const targetPago = pagos.find(p => p.id === pagoId);
    if (!targetPago) return;

    const opId = targetPago.idOperacion;
    const targetOp = operaciones.find(o => o.id === opId);
    if (!targetOp) return;

    // 1. Clone & Update target payment in the payments array
    const updatedPagosList = pagos.map(p => {
      if (p.id === pagoId) {
        return {
          ...p,
          modalidad: newModalidad,
          metodoPago: newMetodoPago || p.metodoPago,
          fechaPago: normalizeDateToISO(newFechaPago || p.fechaPago),
          importe: newImporte !== undefined ? newImporte : p.importe,
          observaciones: newObservaciones !== undefined ? newObservaciones : p.observaciones,
        };
      }
      return p;
    });

    // 2. Get all payments for this operation
    const opPayments = updatedPagosList.filter(p => p.idOperacion === opId);

    // 3. Reset all cuotas for this operation to initial baseline (unpaid)
    const opCuotasOriginal = cuotas.filter(c => c.idOperacion === opId);
    const resetCuotasMap = new Map<string, Cuota>();
    opCuotasOriginal.forEach(c => {
      resetCuotasMap.set(c.id, {
        ...c,
        importePagado: 0,
        saldoPendiente: c.valorTotalCuota,
        estado: 'PENDIENTE',
        fechaPago: '',
        cobrador: ''
      });
    });

    let totalCapitalPaid = 0;
    let totalInteresPaid = 0;
    let totalAmountPaid = 0;
    let lastPaymentDate = '';

    // 4. Re-apply all payments sequentially according to their modality
    const sortedOpPayments = [...opPayments].sort((a, b) => parseDateToTimestamp(a.fechaPago) - parseDateToTimestamp(b.fechaPago));

    sortedOpPayments.forEach(p => {
      let rem = p.importe;
      totalAmountPaid += p.importe;
      lastPaymentDate = p.fechaPago;

      const currentCuotasList = Array.from(resetCuotasMap.values());
      const processOrder = sortCuotasByPaymentPriority(currentCuotasList, p.fechaPago, p.modalidad);

      const affectedCuotaNumbers: number[] = [];

      processOrder.forEach(cuo => {
        if (rem <= 0) return;
        const currentCuo = resetCuotasMap.get(cuo.id)!;
        const cuoSaldo = currentCuo.saldoPendiente;

        affectedCuotaNumbers.push(currentCuo.numeroCuota);

        if (rem >= cuoSaldo) {
          const paidThis = cuoSaldo;
          rem = parseFloat((rem - paidThis).toFixed(2));

          const ratioCap = currentCuo.capitalCuota / currentCuo.valorTotalCuota;
          const ratioInt = currentCuo.interesCuota / currentCuo.valorTotalCuota;

          totalCapitalPaid += parseFloat((paidThis * ratioCap).toFixed(2));
          totalInteresPaid += parseFloat((paidThis * ratioInt).toFixed(2));

          currentCuo.importePagado = parseFloat((currentCuo.importePagado + paidThis).toFixed(2));
          currentCuo.saldoPendiente = 0;
          currentCuo.estado = 'PAGADA';
          currentCuo.fechaPago = p.fechaPago;
          currentCuo.cobrador = p.cobrador;
        } else {
          const paidThis = rem;
          rem = 0;

          const ratioCap = currentCuo.capitalCuota / currentCuo.valorTotalCuota;
          const ratioInt = currentCuo.interesCuota / currentCuo.valorTotalCuota;

          totalCapitalPaid += parseFloat((paidThis * ratioCap).toFixed(2));
          totalInteresPaid += parseFloat((paidThis * ratioInt).toFixed(2));

          currentCuo.importePagado = parseFloat((currentCuo.importePagado + paidThis).toFixed(2));
          currentCuo.saldoPendiente = parseFloat((currentCuo.saldoPendiente - paidThis).toFixed(2));
          currentCuo.estado = 'PAGO_PARCIAL';
          currentCuo.fechaPago = p.fechaPago;
          currentCuo.cobrador = p.cobrador;
        }
        resetCuotasMap.set(currentCuo.id, currentCuo);
      });

      p.cuotasAfectadas = affectedCuotaNumbers.length > 0 ? `Cuotas N° ${affectedCuotaNumbers.sort((a,b)=>a-b).join(', ')}` : 'Sin cuotas';
    });

    // 5. Build final updated cuotas list
    const updatedCuotasForOp = Array.from(resetCuotasMap.values());
    const updatedCuotasMap = new Map<string, Cuota>(updatedCuotasForOp.map(c => [c.id, c]));
    const mergedCuotas = cuotas.map(c => updatedCuotasMap.get(c.id) || c);

    // 6. Build updated operation object
    const updatedOp = { ...targetOp };
    updatedOp.capitalRecuperado = parseFloat(totalCapitalPaid.toFixed(2));
    updatedOp.interesCobrado = parseFloat(totalInteresPaid.toFixed(2));
    updatedOp.capitalPendiente = Math.max(0, parseFloat((targetOp.capitalEntregado - totalCapitalPaid).toFixed(2)));
    updatedOp.totalPendiente = Math.max(0, parseFloat((targetOp.totalFinanciado - totalAmountPaid).toFixed(2)));

    const totalCuotasCount = updatedCuotasForOp.length;
    const pagadasCount = updatedCuotasForOp.filter(c => c.estado === 'PAGADA').length;
    updatedOp.cuotasPagadas = pagadasCount;
    updatedOp.cuotasPendientes = totalCuotasCount - pagadasCount;
    updatedOp.ultimoPago = lastPaymentDate || targetOp.ultimoPago;

    const nextPendingCuo = updatedCuotasForOp
      .filter(c => c.estado !== 'PAGADA')
      .sort((a, b) => a.numeroCuota - b.numeroCuota)[0];

    if (nextPendingCuo) {
      updatedOp.proximoVencimiento = nextPendingCuo.fechaVencimiento;
      const dueTime = new Date(nextPendingCuo.fechaVencimiento).getTime();
      const todayTime = new Date().getTime();
      const diffDays = Math.ceil((todayTime - dueTime) / (1000 * 60 * 60 * 24));
      updatedOp.diasMora = diffDays > 0 ? diffDays : 0;
      updatedOp.estado = 'ACTIVA';
    } else {
      updatedOp.proximoVencimiento = 'PAGADO TOTAL';
      updatedOp.estado = 'FINALIZADA';
      updatedOp.fechaFinalizacion = lastPaymentDate || new Date().toISOString().split('T')[0];
      updatedOp.diasMora = 0;
    }

    if (updatedOp.diasMora === 0) {
      updatedOp.nivelMora = 'Sano';
    } else if (updatedOp.diasMora <= 3) {
      updatedOp.nivelMora = 'Atraso Regular (1-3 días)';
    } else if (updatedOp.diasMora <= 6) {
      updatedOp.nivelMora = 'Cobranza Telefónica (4-6 días)';
    } else {
      updatedOp.nivelMora = 'Cobrador de Calle (7+ días)';
    }

    // 7. Update state and localStorage
    setPagos(updatedPagosList);
    saveToLocalStorage(STORAGE_KEYS.PAGOS, updatedPagosList);

    setCuotas(mergedCuotas);
    saveToLocalStorage(STORAGE_KEYS.CUOTAS, mergedCuotas);

    handleUpdateOperacion(updatedOp);

    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      const pMod = updatedPagosList.find(p => p.id === pagoId);
      if (pMod) uploadDocToFirestore('pagos', pMod.id, pMod);
      updatedCuotasForOp.forEach(c => uploadDocToFirestore('cuotas', c.id, c));
    }
  };

  // Delete / Annul a payment completely and recalculate loan state
  const handleDeletePago = (pagoId: string) => {
    const targetPago = pagos.find(p => p.id === pagoId);
    if (!targetPago) return;

    if (!confirm(`⚠️ ¿Está seguro de ELIMINAR/ANULAR el pago #${pagoId} por $${targetPago.importe.toLocaleString('es-ES')}? Se recalcularán las cuotas y saldos de la operación #${targetPago.idOperacion}.`)) {
      return;
    }

    const opId = targetPago.idOperacion;
    const targetOp = operaciones.find(o => o.id === opId);

    // 1. Remove target payment from pagos list
    const updatedPagosList = pagos.filter(p => p.id !== pagoId);

    // 2. Remove corresponding treasury transaction & commission entry
    const updatedTrxList = transacciones.filter(t => t.id !== `TRX-${pagoId}` && !t.concepto.includes(pagoId));
    const updatedComsList = comisiones.filter(c => c.pagoId !== pagoId);

    if (targetOp) {
      // 3. Get remaining payments for this operation
      const opPayments = updatedPagosList.filter(p => p.idOperacion === opId);

      // 4. Reset cuotas to baseline
      const opCuotasOriginal = cuotas.filter(c => c.idOperacion === opId);
      const resetCuotasMap = new Map<string, Cuota>();
      opCuotasOriginal.forEach(c => {
        resetCuotasMap.set(c.id, {
          ...c,
          importePagado: 0,
          saldoPendiente: c.valorTotalCuota,
          estado: 'PENDIENTE',
          fechaPago: '',
          cobrador: ''
        });
      });

      let totalCapitalPaid = 0;
      let totalInteresPaid = 0;
      let totalAmountPaid = 0;
      let lastPaymentDate = '';

      // 5. Re-apply remaining payments
      const sortedOpPayments = [...opPayments].sort((a, b) => parseDateToTimestamp(a.fechaPago) - parseDateToTimestamp(b.fechaPago));

      sortedOpPayments.forEach(p => {
        let rem = p.importe;
        totalAmountPaid += p.importe;
        lastPaymentDate = p.fechaPago;

        const currentCuotasList = Array.from(resetCuotasMap.values());
        const processOrder = sortCuotasByPaymentPriority(currentCuotasList, p.fechaPago, p.modalidad);

        const affectedCuotaNumbers: number[] = [];

        processOrder.forEach(cuo => {
          if (rem <= 0) return;
          const currentCuo = resetCuotasMap.get(cuo.id)!;
          const cuoSaldo = currentCuo.saldoPendiente;

          affectedCuotaNumbers.push(currentCuo.numeroCuota);

          if (rem >= cuoSaldo) {
            const paidThis = cuoSaldo;
            rem = parseFloat((rem - paidThis).toFixed(2));

            const ratioCap = currentCuo.capitalCuota / currentCuo.valorTotalCuota;
            const ratioInt = currentCuo.interesCuota / currentCuo.valorTotalCuota;

            totalCapitalPaid += parseFloat((paidThis * ratioCap).toFixed(2));
            totalInteresPaid += parseFloat((paidThis * ratioInt).toFixed(2));

            currentCuo.importePagado = parseFloat((currentCuo.importePagado + paidThis).toFixed(2));
            currentCuo.saldoPendiente = 0;
            currentCuo.estado = 'PAGADA';
            currentCuo.fechaPago = p.fechaPago;
            currentCuo.cobrador = p.cobrador;
          } else {
            const paidThis = rem;
            rem = 0;

            const ratioCap = currentCuo.capitalCuota / currentCuo.valorTotalCuota;
            const ratioInt = currentCuo.interesCuota / currentCuo.valorTotalCuota;

            totalCapitalPaid += parseFloat((paidThis * ratioCap).toFixed(2));
            totalInteresPaid += parseFloat((paidThis * ratioInt).toFixed(2));

            currentCuo.importePagado = parseFloat((currentCuo.importePagado + paidThis).toFixed(2));
            currentCuo.saldoPendiente = parseFloat((currentCuo.saldoPendiente - paidThis).toFixed(2));
            currentCuo.estado = 'PAGO_PARCIAL';
            currentCuo.fechaPago = p.fechaPago;
            currentCuo.cobrador = p.cobrador;
          }
          resetCuotasMap.set(currentCuo.id, currentCuo);
        });

        p.cuotasAfectadas = affectedCuotaNumbers.length > 0 ? `Cuotas N° ${affectedCuotaNumbers.sort((a,b)=>a-b).join(', ')}` : 'Sin cuotas';
      });

      // 6. Build final updated cuotas list & operation object
      const updatedCuotasForOp = Array.from(resetCuotasMap.values());
      const updatedCuotasMap = new Map<string, Cuota>(updatedCuotasForOp.map(c => [c.id, c]));
      const mergedCuotas = cuotas.map(c => updatedCuotasMap.get(c.id) || c);

      const updatedOp = { ...targetOp };
      updatedOp.capitalRecuperado = parseFloat(totalCapitalPaid.toFixed(2));
      updatedOp.interesCobrado = parseFloat(totalInteresPaid.toFixed(2));
      updatedOp.capitalPendiente = Math.max(0, parseFloat((targetOp.capitalEntregado - totalCapitalPaid).toFixed(2)));
      updatedOp.totalPendiente = Math.max(0, parseFloat((targetOp.totalFinanciado - totalAmountPaid).toFixed(2)));

      const totalCuotasCount = updatedCuotasForOp.length;
      const pagadasCount = updatedCuotasForOp.filter(c => c.estado === 'PAGADA').length;
      updatedOp.cuotasPagadas = pagadasCount;
      updatedOp.cuotasPendientes = totalCuotasCount - pagadasCount;
      updatedOp.ultimoPago = lastPaymentDate;

      const nextPendingCuo = updatedCuotasForOp
        .filter(c => c.estado !== 'PAGADA')
        .sort((a, b) => a.numeroCuota - b.numeroCuota)[0];

      if (nextPendingCuo) {
        updatedOp.proximoVencimiento = nextPendingCuo.fechaVencimiento;
        const dueTime = new Date(nextPendingCuo.fechaVencimiento).getTime();
        const todayTime = new Date().getTime();
        const diffDays = Math.ceil((todayTime - dueTime) / (1000 * 60 * 60 * 24));
        updatedOp.diasMora = diffDays > 0 ? diffDays : 0;
        updatedOp.estado = 'ACTIVA';
      } else {
        updatedOp.proximoVencimiento = 'PAGADO TOTAL';
        updatedOp.estado = 'FINALIZADA';
        updatedOp.fechaFinalizacion = lastPaymentDate || new Date().toISOString().split('T')[0];
        updatedOp.diasMora = 0;
      }

      setCuotas(mergedCuotas);
      saveToLocalStorage(STORAGE_KEYS.CUOTAS, mergedCuotas);
      handleUpdateOperacion(updatedOp);

      if (isFirebaseEnabled() && isAutoSyncEnabled()) {
        deleteDocFromFirestore('pagos', pagoId);
        updatedCuotasForOp.forEach(c => uploadDocToFirestore('cuotas', c.id, c));
      }
    }

    setPagos(updatedPagosList);
    saveToLocalStorage(STORAGE_KEYS.PAGOS, updatedPagosList);

    setTransacciones(updatedTrxList);
    saveToLocalStorage(STORAGE_KEYS.TRANSACCIONES, updatedTrxList);

    setComisiones(updatedComsList);
    saveToLocalStorage(STORAGE_KEYS.COMISIONES, updatedComsList);

    // Remove payment visit entry from visitasHistory so client returns to pending daily route list
    if (targetPago) {
      const updatedVisitasList = visitasHistory.filter(v => 
        !(v.idCliente === targetPago.idCliente && v.fecha === targetPago.fechaPago && v.tipoAccion === 'PAGO_REGISTRADO') &&
        !(v.montoCobrado && v.montoCobrado === targetPago.importe && v.fecha === targetPago.fechaPago)
      );
      setVisitasHistory(updatedVisitasList);
      saveToLocalStorage(STORAGE_KEYS.VISITAS_HISTORY, updatedVisitasList);
    }
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

  const handleBatchUpdateData = (
    repairedClientes: Cliente[],
    repairedOps?: Operacion[],
    repairedCuotas?: Cuota[],
    repairedPagos?: Pago[]
  ) => {
    if (repairedClientes && repairedClientes.length > 0) {
      setClientes(repairedClientes);
      saveToLocalStorage(STORAGE_KEYS.CLIENTES, repairedClientes);
    }
    if (repairedOps && repairedOps.length > 0) {
      setOperaciones(repairedOps);
      saveToLocalStorage(STORAGE_KEYS.OPERACIONES, repairedOps);
    }
    if (repairedCuotas && repairedCuotas.length > 0) {
      setCuotas(repairedCuotas);
      saveToLocalStorage(STORAGE_KEYS.CUOTAS, repairedCuotas);
    }
    if (repairedPagos && repairedPagos.length > 0) {
      setPagos(repairedPagos);
      saveToLocalStorage(STORAGE_KEYS.PAGOS, repairedPagos);
    }
    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      uploadAllToFirestore({
        clientes: repairedClientes || clientes,
        operaciones: repairedOps || operaciones,
        cuotas: repairedCuotas || cuotas,
        pagos: repairedPagos || pagos,
        transacciones,
        configuracion,
        feriados
      });
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
    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      uploadDocToFirestore('usuarios', nuevo.id, nuevo);
    }
  };

  const handleUpdateUsuario = (updated: UsuarioRol) => {
    const list = usuarios.map(u => u.id === updated.id ? updated : u);
    setUsuarios(list);
    saveToLocalStorage(STORAGE_KEYS.USUARIOS, list);
    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      uploadDocToFirestore('usuarios', updated.id, updated);
    }
    
    if (activeUser.id === updated.id) {
      setActiveUser(updated);
    }
  };

  const handleDeleteUsuario = (id: string) => {
    const list = usuarios.filter(u => u.id !== id);
    setUsuarios(list);
    saveToLocalStorage(STORAGE_KEYS.USUARIOS, list);
    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      deleteDocFromFirestore('usuarios', id);
    }
    
    // If the currently active user is deleted, log out immediately
    if (activeUser?.id === id) {
      handleLogout();
    }
  };

  const handleUpdateRolePermisos = (updated: PermisosRol) => {
    const list = roles.map(r => r.id === updated.id ? updated : r);
    setRoles(list);
    saveToLocalStorage(STORAGE_KEYS.ROLES, list);
    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      uploadDocToFirestore('roles', updated.id, updated);
    }
  };

  const handleAddRole = (nuevo: PermisosRol) => {
    const cleanId = (nuevo.id || '').toUpperCase().trim();
    const cleanNuevo = { ...nuevo, id: cleanId };
    const list = [...roles.filter(r => r.id.toUpperCase().trim() !== cleanId), cleanNuevo];
    setRoles(list);
    saveToLocalStorage(STORAGE_KEYS.ROLES, list);
    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      uploadDocToFirestore('roles', cleanId, cleanNuevo);
    }
  };

  const handleDeleteRole = (id: string) => {
    const cleanId = (id || '').toUpperCase().trim();
    if (['ADMIN', 'OPERADOR', 'COBRADOR', 'ATC'].includes(cleanId)) {
      alert('No es posible eliminar los roles base predeterminados del sistema.');
      return;
    }
    const list = roles.filter(r => r.id.toUpperCase().trim() !== cleanId);
    setRoles(list);
    saveToLocalStorage(STORAGE_KEYS.ROLES, list);
    if (isFirebaseEnabled() && isAutoSyncEnabled()) {
      deleteDocFromFirestore('roles', cleanId);
    }
  };

  const handleAddFichaje = (nuevo: FichajeAsistencia) => {
    const list = [nuevo, ...fichajes];
    setFichajes(list);
    saveToLocalStorage(STORAGE_KEYS.FICHAJES, list);
  };

  const handleUpdateFichaje = (updated: FichajeAsistencia) => {
    const list = fichajes.map(f => f.id === updated.id ? updated : f);
    setFichajes(list);
    saveToLocalStorage(STORAGE_KEYS.FICHAJES, list);
  };

  const handleToggleClockInSelf = () => {
    if (!activeUser) return;
    const todayStr = new Date().toISOString().split('T')[0];
    const nowTimeStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    // Check if user has an active session today
    const activeSession = fichajes.find(
      f => f.usuarioId === activeUser.id && f.fecha === todayStr && f.estado === 'ACTIVA'
    );

    if (activeSession) {
      // Clock OUT
      const updated: FichajeAsistencia = {
        ...activeSession,
        horaSalida: nowTimeStr,
        horasTrabajadas: 8,
        estado: 'FINALIZADA'
      };
      handleUpdateFichaje(updated);
      alert(`Jornada finalizada para ${activeUser.nombre} a las ${nowTimeStr}.`);
    } else {
      // Clock IN
      const nuevo: FichajeAsistencia = {
        id: `FICH-${Date.now()}`,
        usuarioId: activeUser.id,
        usuarioNombre: activeUser.nombre,
        usuarioRol: activeUserRole.nombre,
        fecha: todayStr,
        horaEntrada: nowTimeStr,
        estado: 'ACTIVA'
      };
      handleAddFichaje(nuevo);
      alert(`Jornada iniciada para ${activeUser.nombre} a las ${nowTimeStr}.`);
    }
  };

  const handleRegistrarVisita = (visita: VisitaDomicilio) => {
    const updated = [visita, ...visitasHistory];
    setVisitasHistory(updated);
    saveToLocalStorage(STORAGE_KEYS.VISITAS_HISTORY, updated);
  };

  const handleReprogramarVisita = (reprogramacion: VisitaReprogramada) => {
    const updated = [reprogramacion, ...visitasReprogramadas];
    setVisitasReprogramadas(updated);
    saveToLocalStorage(STORAGE_KEYS.VISITAS_REPROGRAMADAS, updated);
  };

  const handleRegistrarContactoRecuperado = (idCliente: string, cobradorId: string) => {
    const clienteObj = clientes.find(c => c.id === idCliente);
    const nuevaCom: ComisionCobrador = {
      id: `COM-${Date.now()}`,
      cobradorId: cobradorId,
      cobradorNombre: activeUser?.nombre || 'Cobrador',
      idCliente: idCliente,
      nombreCliente: clienteObj ? `${clienteObj.nombre} ${clienteObj.apellido}` : 'Cliente',
      montoCobrado: 0,
      montoComision: configComisiones.montoContactoRecuperado || 2500,
      tipoComision: 'CONTACTO_RECUPERADO',
      fecha: new Date().toISOString().split('T')[0],
      estado: 'PENDIENTE'
    };
    const updated = [nuevaCom, ...comisiones];
    setComisiones(updated);
    saveToLocalStorage(STORAGE_KEYS.COMISIONES, updated);
  };

  const handleRegistrarGestionTelefonica = (
    idCliente: string, 
    tipo: 'LLAMADA' | 'MENSAJE', 
    observaciones: string
  ) => {
    const clienteObj = clientes.find(c => c.id === idCliente);
    const montoCom = tipo === 'LLAMADA' 
      ? (configComisiones.montoComisionLlamada || 300) 
      : (configComisiones.montoComisionMensaje || 150);

    const nuevaCom: ComisionCobrador = {
      id: `COM-${Date.now()}`,
      cobradorId: activeUser?.id || 'COB-01',
      cobradorNombre: activeUser?.nombre || 'Cobrador',
      idCliente: idCliente,
      nombreCliente: clienteObj ? `${clienteObj.nombre} ${clienteObj.apellido}` : 'Cliente',
      montoCobrado: 0,
      montoComision: montoCom,
      tipoComision: tipo === 'LLAMADA' ? 'GESTION_LLAMADA' : 'GESTION_MENSAJE',
      fecha: new Date().toISOString().split('T')[0],
      estado: 'PENDIENTE'
    };
    const updatedComs = [nuevaCom, ...comisiones];
    setComisiones(updatedComs);
    saveToLocalStorage(STORAGE_KEYS.COMISIONES, updatedComs);

    // Also log as visit/management in history
    const nuevaVisita: VisitaDomicilio = {
      id: `VIS-${Date.now()}`,
      idCliente,
      nombreCliente: clienteObj ? `${clienteObj.nombre} ${clienteObj.apellido}` : 'Cliente',
      cobradorId: activeUser?.id || 'COB-01',
      cobradorNombre: activeUser?.nombre || 'Cobrador',
      fecha: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      tipoAccion: 'ESTOY_EN_DOMICILIO',
      observaciones: `Gestión Telefónica (${tipo}): ${observaciones}`
    };
    handleRegistrarVisita(nuevaVisita);
  };

  const handleSolicitarReintegroDesayuno = (solicitud: SolicitudReintegroDesayuno) => {
    const updated = [solicitud, ...reintegrosDesayuno];
    setReintegrosDesayuno(updated);
    saveToLocalStorage(STORAGE_KEYS.REINTEGROS_DESAYUNO, updated);
  };

  const handleUpdateEstadoReintegroDesayuno = (id: string, nuevoEstado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO') => {
    const updated = reintegrosDesayuno.map(r => r.id === id ? { ...r, estado: nuevoEstado } : r);
    setReintegrosDesayuno(updated);
    saveToLocalStorage(STORAGE_KEYS.REINTEGROS_DESAYUNO, updated);
  };

  const handleUpdateConfigComisiones = (newConfig: ConfiguracionComisiones) => {
    setConfigComisiones(newConfig);
    saveToLocalStorage(STORAGE_KEYS.CONFIG_COMISIONES, newConfig);
  };

  const handleAddLiquidacionSemanal = (liq: LiquidacionSemanal) => {
    const updated = [liq, ...liquidacionesSemanales];
    setLiquidacionesSemanales(updated);
    saveToLocalStorage(STORAGE_KEYS.LIQUIDACIONES_SEMANALES, updated);
  };

  const handleAddLiquidacionMensual = (liq: LiquidacionMensual) => {
    const updated = [liq, ...liquidacionesMensuales];
    setLiquidacionesMensuales(updated);
    saveToLocalStorage(STORAGE_KEYS.LIQUIDACIONES_MENSUALES, updated);
  };

  const handleUpdateEstadoSemanal = (id: string, nuevoEstado: 'PENDIENTE' | 'APROBADA' | 'PAGADA') => {
    const updated = liquidacionesSemanales.map(l => l.id === id ? { ...l, estado: nuevoEstado } : l);
    setLiquidacionesSemanales(updated);
    saveToLocalStorage(STORAGE_KEYS.LIQUIDACIONES_SEMANALES, updated);

    if (nuevoEstado === 'PAGADA') {
      const liq = liquidacionesSemanales.find(l => l.id === id);
      if (liq) {
        const trx: TransaccionTesoreria = {
          id: `TRX-${Date.now().toString().slice(-6)}`,
          fecha: new Date().toISOString().split('T')[0],
          tipo: 'EGRESO',
          concepto: `Pago Liquidación Semanal Comisiones - ${liq.usuarioNombre} (${liq.periodoSemana})`,
          monto: liq.totalNetoSemanal,
          referenciaId: liq.id
        };
        handleAddTransaccion(trx);
      }
    }
  };

  const handleUpdateEstadoMensual = (id: string, nuevoEstado: 'PENDIENTE' | 'APROBADA' | 'PAGADA') => {
    const updated = liquidacionesMensuales.map(l => l.id === id ? { ...l, estado: nuevoEstado } : l);
    setLiquidacionesMensuales(updated);
    saveToLocalStorage(STORAGE_KEYS.LIQUIDACIONES_MENSUALES, updated);

    if (nuevoEstado === 'PAGADA') {
      const liq = liquidacionesMensuales.find(l => l.id === id);
      if (liq) {
        const trx: TransaccionTesoreria = {
          id: `TRX-${Date.now().toString().slice(-6)}`,
          fecha: new Date().toISOString().split('T')[0],
          tipo: 'EGRESO',
          concepto: `Pago Liquidación Mensual Sueldo - ${liq.usuarioNombre} (${liq.periodoMes})`,
          monto: liq.totalNetoMensual,
          referenciaId: liq.id
        };
        handleAddTransaccion(trx);
      }
    }
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

  const normalizedActiveRolId = (activeUser?.rolId || '').toUpperCase().trim();

  // Super Administrator is guaranteed for the creator account, USR-1, or roles ADMIN / SUPERADMIN
  const isSuperAdmin = Boolean(
    !activeUser ||
    normalizedActiveRolId === 'ADMIN' ||
    normalizedActiveRolId === 'SUPERADMIN' ||
    normalizedActiveRolId === 'SUPERADMINISTRADOR' ||
    activeUser?.email?.toLowerCase().trim() === 'credicash999@gmail.com' ||
    activeUser?.id === 'USR-1'
  );
  const isAdmin = isSuperAdmin;

  const handleRestoreAdminSession = () => {
    setActiveUser(DEFAULT_USUARIOS[0]);
    setRealUserRolId('ADMIN');
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, 'USR-1');
    localStorage.setItem('credicash_real_user_rol_id', 'ADMIN');
    localStorage.setItem('credicash_logged_in', 'true');
    setActiveTab('dashboard');
  };

  const activeUserRole: PermisosRol = activeUser
    ? (isSuperAdmin
        ? {
            id: activeUser.rolId || 'ADMIN',
            nombre: 'Superadministrador',
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
          }
        : (roles.find(r => r.id === activeUser.rolId || r.id.toUpperCase() === normalizedActiveRolId) || DEFAULT_ROLES.find(r => r.id === activeUser.rolId || r.id.toUpperCase() === normalizedActiveRolId) || {
            id: activeUser.rolId || 'OPERADOR',
            nombre: activeUser.rolId === 'COBRADOR' ? 'Cobrador de Calle' : (activeUser.rolId === 'OPERADOR' ? 'Operador de Cobranzas' : activeUser.rolId),
            verDashboard: false,
            verClientes: true,
            crearClientes: false,
            verTelefonoCliente: true,
            verDniCliente: true,
            verDireccionCliente: true,
            verIngresosCliente: false,
            verPrestamos: false,
            crearPrestamos: false,
            verPagos: true,
            registrarPagos: true,
            verTesoreria: false,
            verConfiguracion: false,
          }))
    : {
        id: 'CARGANDO',
        nombre: 'Cargando sesión...',
        verDashboard: false,
        verClientes: false,
        crearClientes: false,
        verTelefonoCliente: false,
        verDniCliente: false,
        verDireccionCliente: false,
        verIngresosCliente: false,
        verPrestamos: false,
        crearPrestamos: false,
        verPagos: false,
        registrarPagos: false,
        verTesoreria: false,
        verConfiguracion: false,
      };

  // Automatic redirect if current tab is not allowed for the selected role
  useEffect(() => {
    if (!activeUser) return;
    const r = roles.find(rol => rol.id === activeUser.rolId || rol.id.toUpperCase() === normalizedActiveRolId) || DEFAULT_ROLES.find(rol => rol.id === activeUser.rolId || rol.id.toUpperCase() === normalizedActiveRolId);
    if (!r && !isAdmin) return;

    const isCurrentTabAllowed = 
      isAdmin ||
      (normalizedActiveRolId === 'COBRADOR' && (activeTab === 'pagos-calle' || activeTab === 'liquidaciones')) ||
      (normalizedActiveRolId === 'OPERADOR' && (activeTab === 'pagos-whatsapp' || activeTab === 'clientes')) ||
      (activeTab === 'dashboard' && r?.verDashboard) ||
      (activeTab === 'gestion-admin' && (r?.verClientes || isAdmin)) ||
      (activeTab === 'clientes' && r?.verClientes) ||
      (activeTab === 'clientes-todos' && r?.verClientes) ||
      (activeTab === 'clientes-inactivos' && r?.verClientes) ||
      (activeTab === 'alertas-oportunidades' && r?.verClientes) ||
      (activeTab === 'nuevo-cliente' && r?.crearClientes) ||
      (activeTab === 'operaciones' && r?.verPrestamos && normalizedActiveRolId !== 'OPERADOR') ||
      (activeTab === 'pagos' && r?.verPagos) ||
      (activeTab === 'pagos-whatsapp' && r?.verPagos) ||
      (activeTab === 'pagos-telefono' && r?.verPagos && normalizedActiveRolId !== 'OPERADOR') ||
      (activeTab === 'pagos-calle' && r?.verPagos && normalizedActiveRolId !== 'OPERADOR') ||
      (activeTab === 'captacion-clientes') ||
      (activeTab === 'verificacion') ||
      (activeTab === 'liquidaciones') ||
      (activeTab === 'tesoreria' && r?.verTesoreria) ||
      (activeTab === 'configuracion' && r?.verConfiguracion) ||
      (activeTab === 'usuarios' && isAdmin);

    if (!isCurrentTabAllowed) {
      if (normalizedActiveRolId === 'COBRADOR') setActiveTab('pagos-calle');
      else if (normalizedActiveRolId === 'OPERADOR') setActiveTab('pagos-whatsapp');
      else if (r?.verDashboard || isAdmin) setActiveTab('dashboard');
      else if (r?.verClientes) setActiveTab('clientes');
      else if (r?.verPagos) setActiveTab('pagos-whatsapp');
      else if (r?.verPrestamos) setActiveTab('operaciones');
      else if (r?.verTesoreria) setActiveTab('tesoreria');
      else if (r?.verConfiguracion) setActiveTab('configuracion');
    }
  }, [activeUser, roles, activeTab, isAdmin, normalizedActiveRolId]);

  // Role Based Access Data Filtering
  // Non-ADMIN operators (Cobradores, Operadores) only see active/renewal clients assigned to them.
  // Superadministrador (ADMIN) sees ALL clients, loans, cuotas, and payments without restrictions.
  const isOperator = !isAdmin;

  const uId = (activeUser?.id || '').toLowerCase().trim();
  const uName = (activeUser?.nombre || '').toLowerCase().trim();
  const uEmail = (activeUser?.email || '').toLowerCase().trim();
  const uUser = uEmail.includes('@') ? uEmail.split('@')[0] : uEmail;

  const matchesUser = (val: any) => {
    if (!val) return false;
    const s = String(val).toLowerCase().trim();
    return s === uId || s === uName || s === uEmail || s === uUser;
  };

  const filteredClientes = isOperator
    ? clientes.filter(c => {
        // Rule 1: Operators CANNOT see inactive, frozen or suspended clients under any circumstances
        const isInactive = c.estado === 'INACTIVO' || c.estado === 'CONGELADO' || c.estado === 'SUSPENDIDO';
        if (isInactive) return false;

        // Rule 2: Operator MUST ONLY see clients explicitly assigned to them
        const isAssignedToUser = 
          matchesUser(c.operadorAsignadoId) ||
          matchesUser(c.operadorAsignadoNombre) ||
          matchesUser(c.operadorTelefonicoId) ||
          matchesUser(c.operadorTelefonicoNombre) ||
          matchesUser(c.cobradorAsignadoId) ||
          matchesUser(c.cobradorAsignadoNombre) ||
          matchesUser(c.analista) ||
          matchesUser(c.captador) ||
          matchesUser((c as any).cobrador) ||
          matchesUser((c as any).operador) ||
          matchesUser((c as any).usuarioId) ||
          operaciones.some(o => o.idCliente === c.id && (
            matchesUser(o.cobrador) || 
            matchesUser(o.operadorAsignadoId) || 
            matchesUser(o.operadorTelefonicoId) || 
            matchesUser(o.cobradorAsignadoId) ||
            matchesUser(o.analista) ||
            matchesUser(o.captador)
          ));

        return isAssignedToUser;
      })
    : clientes;

  const filteredOperaciones = isOperator
    ? operaciones.filter(o => {
        const client = clientes.find(c => c.id === o.idCliente);
        if (!client || client.estado === 'INACTIVO' || client.estado === 'CONGELADO' || client.estado === 'SUSPENDIDO') {
          return false;
        }
        return (
          matchesUser(o.cobrador) || 
          matchesUser(o.operadorAsignadoId) || 
          matchesUser(o.operadorTelefonicoId) || 
          matchesUser(o.cobradorAsignadoId) || 
          matchesUser(o.analista) ||
          matchesUser(o.captador) ||
          matchesUser(client.operadorAsignadoId) || 
          matchesUser(client.operadorAsignadoNombre) ||
          matchesUser(client.operadorTelefonicoId) || 
          matchesUser(client.operadorTelefonicoNombre) ||
          matchesUser(client.cobradorAsignadoId) || 
          matchesUser(client.cobradorAsignadoNombre) ||
          matchesUser(client.analista) ||
          matchesUser(client.captador) ||
          matchesUser((client as any).cobrador) ||
          matchesUser((client as any).operador)
        );
      })
    : operaciones;

  const filteredCuotas = isOperator
    ? cuotas.filter(cuo => {
        const op = operaciones.find(o => o.id === cuo.idOperacion);
        if (!op) return false;
        return filteredOperaciones.some(fop => fop.id === op.id);
      })
    : cuotas;

  const filteredPagos = isOperator
    ? pagos.filter(p => {
        return filteredOperaciones.some(fop => fop.id === p.idOperacion);
      })
    : pagos;

  // Real-time pending opportunity / alert counter for sidebar titilating badge
  const alertCount = useMemo(() => {
    let count = 0;
    try {
      (clientes || []).forEach(c => {
        if (c && (c.estado === 'INACTIVO' || (c.montoDeudaInactivo && c.montoDeudaInactivo > 0))) {
          const cPagos = (pagos || []).filter(p => p && p.idCliente === c.id);
          const refinPagos = cPagos.filter(p => (p.idOperacion && typeof p.idOperacion === 'string' && p.idOperacion.startsWith('OP-INACTIVO')) || p.modalidad === 'REFINANCIACION');
          if (refinPagos.length > 0 || c.montoPagoInicialRefinanciacion === 0) {
            count++;
          }
        }
      });

      (operaciones || []).forEach(op => {
        if (op && (op.estado === 'ACTIVA' || op.estado === 'AL_DIA' || op.estado === 'CONGELADA')) {
          const totalCuo = op.cantidadCuotas || 1;
          const pagadasCount = op.cuotasPagadas || 0;
          const pctPagado = (pagadasCount / totalCuo) * 100;
          const pendientes = totalCuo - pagadasCount;
          if (pctPagado >= 70 || op.elegibleRenovacion || op.elegibleAmpliacion || (pendientes <= 5 && pendientes > 0)) {
            count++;
          }
        }
      });
    } catch (e) {
      console.error("Error al calcular alertCount:", e);
    }

    return count;
  }, [clientes, operaciones, pagos]);

  // Human readable active tab label
  const getTabLabel = () => {
    switch (activeTab) {
      case 'dashboard': return 'Consola Dashboard';
      case 'gestion-admin': return 'Gestión Administración';
      case 'alertas-oportunidades': return 'ALERTAS';
      case 'clientes': return 'Buscador de Clientes';
      case 'clientes-todos': return 'Todos los Clientes';
      case 'clientes-inactivos': return 'Clientes Inactivos con Deuda';
      case 'nuevo-cliente': return 'Nuevo Cliente (Ficha)';
      case 'operaciones': return 'Nuevo Crédito';
      case 'pagos': return 'Consola del Operador de Pagos';
      case 'pagos-whatsapp': return 'Gestión diaria (Cobranzas)';
      case 'pagos-telefono': return 'Gestión telefónica (Cobranzas)';
      case 'pagos-calle': return 'Gestión domiciliaria (Cobranzas)';
      case 'captacion-clientes': return 'Captación de Clientes';
      case 'verificacion': return 'Verificación';
      case 'liquidaciones': return 'Liquidaciones';
      case 'tesoreria': return 'Caja y Tesorería';
      case 'configuracion': return 'Configuraciones';
      case 'usuarios': return 'Seguridad y Accesos';
      default: return 'Panel';
    }
  };

  if (!isLoggedIn || !activeUser) {
    if (isLoggedIn && cloudLoading) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans p-6">
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <CrediCashLogo size="lg" showSubtitle={true} />
            <div className="flex items-center gap-3 mt-6 text-emerald-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm font-semibold tracking-wide">Cargando sesión y datos de Firestore...</span>
            </div>
          </div>
        </div>
      );
    }
    return <LoginView usuarios={usuarios} roles={roles} onLogin={handleLogin} onRefreshCloudData={applyCloudSnapshotData} />;
  }

  return (
    <div className="min-h-screen bg-[#0b132a] text-slate-100 flex flex-col font-sans antialiased">
      
      {/* Executive Financial Excel Top Bar Header */}
      <nav className="h-16 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between px-4 sm:px-8 shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          <CrediCashLogo size="md" showSubtitle={true} />
        </div>

        <div className="flex gap-4 sm:gap-6 items-center">
          <div className="hidden md:flex gap-2 text-[13px] font-medium text-slate-300">
            <span className="hover:text-emerald-400 cursor-pointer font-semibold transition-colors" onClick={() => {
              const uRole = roles.find(r => r.id === activeUser?.rolId);
              if (uRole?.verDashboard) {
                setActiveTab('dashboard');
              } else if (uRole?.verClientes) {
                setActiveTab('clientes');
              }
            }}>Panel</span>
            <span className="text-slate-600">/</span>
            <span className="text-white font-black tracking-wide">{getTabLabel()}</span>
          </div>
          <div className="hidden md:block h-8 w-px bg-slate-800"></div>
          
          <div className="flex items-center gap-4">
            {!isAdmin && (
              <button
                onClick={handleRestoreAdminSession}
                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer border border-amber-300 transition-all animate-bounce-short"
                title="Restaurar sesión completa de Super Administrador"
              >
                <ShieldCheck className="w-4 h-4 text-slate-950 shrink-0" />
                <span>Modo Empleado (Volver a Super Admin)</span>
              </button>
            )}

            <div className="flex items-center gap-3 border-r border-slate-800 pr-4">
              <div className="text-right leading-tight hidden sm:block">
                <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-widest block mb-0.5">
                  {isAdmin ? 'Super Administrador' : 'Colaborador'}
                </span>
                <span className="text-xs font-extrabold text-white bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700 inline-block shadow-xs">
                  {activeUser?.nombre} ({activeUserRole.nombre})
                </span>
              </div>
              <div className="w-9 h-9 bg-emerald-700 border border-emerald-500 text-white rounded-full flex items-center justify-center font-black text-xs uppercase shadow-inner shrink-0" title={`${activeUser?.nombre}`}>
                {activeUser?.nombre ? activeUser.nombre.substring(0, 2) : 'AP'}
              </div>
            </div>

            {/* Attendance Clock-In/Clock-Out Button */}
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0];
              const activeFichaje = fichajes.find(f => f.usuarioId === activeUser?.id && f.fecha === todayStr && f.estado === 'ACTIVA');
              return (
                <button
                  onClick={handleToggleClockInSelf}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border shadow-xs ${
                    activeFichaje
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 border-emerald-300 animate-pulse'
                      : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                  }`}
                  title={activeFichaje ? `Marcar Salida (En jornada desde ${activeFichaje.horaEntrada})` : 'Iniciar Jornada / Fichar Entrada'}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span>{activeFichaje ? `Fichar Salida (${activeFichaje.horaEntrada})` : 'Fichar Entrada'}</span>
                </button>
              );
            })()}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="text-slate-300 hover:text-rose-400 p-1.5 hover:bg-slate-800 rounded-xl transition-all cursor-pointer flex items-center gap-2 group ml-1"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4 text-slate-400 group-hover:text-rose-400 transition-colors" />
              <span className="text-xs font-bold text-slate-300 group-hover:text-rose-300 transition-colors">Salir</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <div className="w-full px-4 md:px-8 py-4 md:py-6 flex-1 flex flex-col md:flex-row gap-6">
        
        {/* Navigation Sidebar */}
        <aside className="md:w-64 shrink-0 flex flex-col gap-2">
          {/* Cloud Error / Offline Notice */}
          {cloudError && (
            <div className="p-3 bg-rose-950/80 border border-rose-600/80 rounded-xl text-rose-200 text-xs shadow-md mb-1 relative">
              <div className="flex items-center justify-between font-bold text-rose-100">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Aviso de Nube</span>
                </div>
                <button
                  onClick={() => setCloudError(null)}
                  className="text-rose-400 hover:text-white text-xs px-1 rounded cursor-pointer"
                  title="Cerrar aviso"
                >
                  ✕
                </button>
              </div>
              <div className="text-[11px] text-rose-300 mt-1 leading-snug">
                {cloudError}
              </div>
              <button
                onClick={handleRetryCloudSync}
                disabled={cloudLoading}
                className="mt-2.5 w-full py-1.5 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3 h-3 ${cloudLoading ? 'animate-spin' : ''}`} />
                <span>{cloudLoading ? 'Conectando...' : 'Reintentar sincronización'}</span>
              </button>
            </div>
          )}

          <div className="p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 flex items-center gap-3 mb-1 shadow-sm">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shrink-0"></div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 leading-none">Sesión Activa</span>
              <span className="text-xs font-extrabold text-white truncate mt-1 leading-none uppercase">{activeUserRole.nombre}</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-md">
            {isAdmin ? (
              // Comprehensive Main Menu - Absolute Access for Superadmin
              <>
                {/* 1. Consola Dashboard */}
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-left cursor-pointer shadow-xs ${
                    activeTab === 'dashboard'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-2 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-600'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Consola Dashboard</span>
                </button>

                {/* 2. Cartera de Clientes */}
                <button
                  onClick={() => setActiveTab('clientes')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-left cursor-pointer shadow-xs ${
                    activeTab === 'clientes'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-2 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-600'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0 text-teal-400" />
                  <span>Cartera de Clientes</span>
                </button>

                {/* 3. Panel Super Administrador */}
                <button
                  onClick={() => setActiveTab('gestion-admin')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-left cursor-pointer shadow-xs ${
                    activeTab === 'gestion-admin'
                      ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 border-2 border-amber-300 ring-2 ring-amber-400/40 font-black'
                      : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-700/60 hover:border-amber-400'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Gestión Super Administrador</span>
                </button>

                {/* 4. Otorgar Créditos */}
                <button
                  onClick={() => setActiveTab('operaciones')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-left cursor-pointer shadow-xs ${
                    activeTab === 'operaciones'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-2 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-600'
                  }`}
                >
                  <Briefcase className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Otorgar Créditos</span>
                </button>

                {/* 5. Asignación de Clientes */}
                <button
                  onClick={() => setActiveTab('asignar-clientes')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-left cursor-pointer shadow-xs ${
                    activeTab === 'asignar-clientes'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-2 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-600'
                  }`}
                >
                  <UserPlus className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Asignación de Clientes</span>
                </button>

                {/* 6. Consola de Cobranzas */}
                <button
                  onClick={() => setActiveTab('pagos-whatsapp')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-left cursor-pointer shadow-xs ${
                    ['pagos-whatsapp', 'pagos-telefono', 'pagos-calle', 'cobrador-campo'].includes(activeTab)
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-2 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-600'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Consola de Cobranzas</span>
                </button>

                {/* 7. Clientes Inactivos */}
                <button
                  onClick={() => setActiveTab('clientes-inactivos')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-left cursor-pointer shadow-xs ${
                    activeTab === 'clientes-inactivos'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-2 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-600'
                  }`}
                >
                  <UserX className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Clientes Inactivos</span>
                </button>

                {/* 8. Captación de Clientes */}
                <button
                  onClick={() => setActiveTab('captacion-clientes')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-left cursor-pointer shadow-xs ${
                    activeTab === 'captacion-clientes'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-2 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-600'
                  }`}
                >
                  <UserCheck className="w-4 h-4 shrink-0 text-teal-400" />
                  <span>Captación de Clientes</span>
                </button>

                {/* 9. Verificación */}
                <button
                  onClick={() => setActiveTab('verificacion')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-left cursor-pointer shadow-xs ${
                    activeTab === 'verificacion'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-2 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-600'
                  }`}
                >
                  <FileCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Verificación</span>
                </button>

                {/* 10. Caja y Tesorería */}
                <button
                  onClick={() => setActiveTab('tesoreria')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-left cursor-pointer shadow-xs ${
                    activeTab === 'tesoreria'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-2 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-600'
                  }`}
                >
                  <Activity className="w-4 h-4 shrink-0 text-teal-400" />
                  <span>Caja y Tesorería</span>
                </button>

                {/* 11. Liquidaciones */}
                <button
                  onClick={() => setActiveTab('liquidaciones')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-left cursor-pointer shadow-xs ${
                    activeTab === 'liquidaciones'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-2 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-600'
                  }`}
                >
                  <DollarSign className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Liquidaciones & Comisiones</span>
                </button>

                {/* 12. Configuraciones */}
                <button
                  onClick={() => setActiveTab('configuracion')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-left cursor-pointer shadow-xs ${
                    activeTab === 'configuracion'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-2 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-600'
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Configuración & Firebase</span>
                </button>

                {/* 13. Seguridad y Accesos */}
                <button
                  onClick={() => setActiveTab('usuarios')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all text-left cursor-pointer shadow-xs ${
                    activeTab === 'usuarios'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-2 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-600'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Seguridad, Roles y Accesos</span>
                </button>
              </>
             ) : normalizedActiveRolId === 'COBRADOR' ? (
              // FIELD COLLECTOR (COBRADOR EN CALLE): 3 tabs: Gestión Diaria del Día, Visualización de Recorrido & Liquidaciones y Comisiones
              <>
                <button
                  onClick={() => {
                    setActiveTab('pagos-calle');
                    setCobradorSubTab('gestion_diaria');
                  }}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                    activeTab === 'pagos-calle' && cobradorSubTab === 'gestion_diaria'
                      ? 'bg-emerald-600 text-white font-black border border-emerald-500 shadow-sm ring-2 ring-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}
                >
                  <ListOrdered className="w-4 h-4 shrink-0 text-emerald-400" />
                  1. Gestión Diaria
                </button>

                <button
                  onClick={() => {
                    setActiveTab('pagos-calle');
                    setCobradorSubTab('mi_recorrido');
                  }}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                    activeTab === 'pagos-calle' && cobradorSubTab === 'mi_recorrido'
                      ? 'bg-emerald-600 text-white font-black border border-emerald-500 shadow-sm ring-2 ring-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}
                >
                  <MapPin className="w-4 h-4 shrink-0 text-teal-400" />
                  2. Visualización de Recorrido
                </button>

                <button
                  onClick={() => setActiveTab('liquidaciones')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                    activeTab === 'liquidaciones'
                      ? 'bg-emerald-600 text-white font-black border border-emerald-500 shadow-sm ring-2 ring-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}
                >
                  <DollarSign className="w-4 h-4 shrink-0 text-emerald-400" />
                  3. Liquidaciones & Comisiones
                </button>
              </>
            ) : normalizedActiveRolId === 'OPERADOR' ? (
              // OPERATOR WHATSAPP strictly allowed tabs: pagos-whatsapp (Gestión Diaria) and clientes (Buscar Cliente)
              <>
                <button
                  onClick={() => setActiveTab('pagos-whatsapp')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                    activeTab === 'pagos-whatsapp'
                      ? 'bg-emerald-600 text-white font-black border border-emerald-500 shadow-sm ring-2 ring-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                  }`}
                >
                  <MessageCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  Gestión Diaria
                </button>

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
              </>
            ) : (
              // OPERATOR / COBRADOR Order: Operator Payments first, then Dashboard (if allowed), Clients, New Client, Loans, Treasury, Configuration
              <>
                {activeUserRole.verPagos && (
                  <div className="space-y-1 pl-2 border-l-2 border-slate-700 mt-1 mb-2">
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wider block px-2 py-1">Consolas de Cobranza</span>
                    <button
                      onClick={() => setActiveTab('pagos-whatsapp')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                        activeTab === 'pagos-whatsapp'
                          ? 'bg-emerald-500 text-slate-950 font-black border border-emerald-300 shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                      Gestión Diaria
                    </button>

                    <button
                      onClick={() => setActiveTab('pagos-telefono')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                        activeTab === 'pagos-telefono'
                          ? 'bg-amber-500 text-slate-950 font-black border border-amber-300 shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                      }`}
                    >
                      <PhoneCall className="w-4 h-4 shrink-0 text-amber-400" />
                      Gestión Cobranza Telefónica
                    </button>

                    <button
                      onClick={() => setActiveTab('pagos-calle')}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                        activeTab === 'pagos-calle'
                          ? 'bg-teal-500 text-slate-950 font-black border border-teal-300 shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                      }`}
                    >
                      <MapPin className="w-4 h-4 shrink-0 text-teal-400" />
                      Gestión Cobranza de Campo
                    </button>
                  </div>
                )}

                {activeUserRole.verDashboard && (
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                      activeTab === 'dashboard'
                        ? 'bg-emerald-600 text-white font-black border border-emerald-500 shadow-sm ring-2 ring-emerald-500/30'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0 text-emerald-400" />
                    Consola Dashboard
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
                    <Users className="w-4 h-4 shrink-0 text-teal-400" />
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span>Búsqueda de Cliente</span>
                      <span className="text-[10px] font-medium text-slate-400 mt-0.5">(Últimos Créditos Activos)</span>
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
                        ? 'bg-emerald-600 text-white font-black border border-emerald-400 shadow-sm ring-2 ring-emerald-400/30'
                        : 'text-emerald-100/90 hover:bg-emerald-900/80 hover:text-white border border-transparent'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 shrink-0 text-emerald-300" />
                    Otorgar Créditos
                  </button>
                )}

                {activeUserRole.verTesoreria && (
                  <button
                    onClick={() => setActiveTab('tesoreria')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                      activeTab === 'tesoreria'
                        ? 'bg-emerald-600 text-white font-black border border-emerald-400 shadow-sm ring-2 ring-emerald-400/30'
                        : 'text-emerald-100/90 hover:bg-emerald-900/80 hover:text-white border border-transparent'
                    }`}
                  >
                    <Activity className="w-4 h-4 shrink-0 text-teal-300" />
                    Caja y Tesorería
                  </button>
                )}

                {activeUserRole.verConfiguracion && (
                  <button
                    onClick={() => setActiveTab('configuracion')}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                      activeTab === 'configuracion'
                        ? 'bg-emerald-600 text-white font-black border border-emerald-400 shadow-sm ring-2 ring-emerald-400/30'
                        : 'text-emerald-100/90 hover:bg-emerald-900/80 hover:text-white border border-transparent'
                    }`}
                  >
                    <Settings className="w-4 h-4 shrink-0 text-emerald-300" />
                    Configuración & Feriados
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('liquidaciones')}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left cursor-pointer ${
                    activeTab === 'liquidaciones'
                      ? 'bg-emerald-600 text-white font-black border border-emerald-400 shadow-sm ring-2 ring-emerald-400/30'
                      : 'text-emerald-100/90 hover:bg-emerald-900/80 hover:text-white border border-transparent'
                  }`}
                >
                  <DollarSign className="w-4 h-4 shrink-0 text-emerald-300" />
                  Liquidaciones & Comisiones
                </button>
              </>
            )}
          </div>

          <div className="mt-4 p-4 bg-emerald-900/40 border border-emerald-700/60 rounded-xl shadow-xs">
            <div className="text-[11px] font-black text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              Seguridad del Sistema
            </div>
            <div className="text-[10px] text-emerald-200/90 leading-relaxed font-medium">
              Amortizaciones de alta precisión. Las moras, feriados y domingos se procesan según los roles establecidos.
            </div>
          </div>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 min-w-0 overflow-x-auto">
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
              cuotas={cuotas}
              pagos={pagos}
              usuarios={usuarios}
              activeUser={activeUser}
              onAddCliente={handleAddCliente}
              onUpdateCliente={handleUpdateCliente}
              onAddPago={handleAddPago}
              onUpdateOperacion={handleUpdateOperacionWithCuotas}
              onDeleteOperacion={handleDeleteOperacion}
              canManage={activeUserRole.crearClientes}
              isAdmin={isAdmin}
              verTelefonoCliente={activeUserRole.verTelefonoCliente}
              verDniCliente={activeUserRole.verDniCliente}
              verDireccionCliente={activeUserRole.verDireccionCliente}
              verIngresosCliente={activeUserRole.verIngresosCliente}
              onNavigateTo={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'clientes-todos' && isAdmin && (
            <ClientesTodosView
              clientes={clientes}
              operaciones={operaciones}
              cuotas={cuotas}
              pagos={pagos}
              usuarios={usuarios}
              activeUser={activeUser}
              onAddPago={handleAddPago}
              onUpdateOperacion={handleUpdateOperacionWithCuotas}
              onDeleteOperacion={handleDeleteOperacion}
              onUpdateCliente={handleUpdateCliente}
            />
          )}

          {activeTab === 'clientes-inactivos' && (isAdmin || activeUserRole.verClientes) && (
            <ClientesInactivosView
              clientes={clientes}
              operaciones={operaciones}
              activeUserRole={activeUser}
              usuarios={usuarios}
              configuracion={configuracion}
              feriados={(feriados || []).map(f => f.fecha)}
              onUpdateCliente={handleUpdateCliente}
              onAddOperacion={handleAddOperacion}
            />
          )}

          {activeTab === 'nuevo-cliente' && activeUserRole.crearClientes && (
            <NuevoClienteView
              clientes={filteredClientes}
              onAddCliente={handleAddCliente}
              onNavigateTo={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'operaciones' && (isAdmin || (activeUserRole.verPrestamos && activeUser?.rolId !== 'OPERADOR')) && (
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
              usuarios={usuarios}
              activeUser={activeUser}
              configuracion={configuracion}
              onAddPago={handleAddPago}
              onReorganizePago={handleReorganizePagoAllocation}
              onDeletePago={handleDeletePago}
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
              usuarios={usuarios}
              activeUser={activeUser}
              configuracion={configuracion}
              onAddPago={handleAddPago}
              onReorganizePago={handleReorganizePagoAllocation}
              onDeletePago={handleDeletePago}
              canAddPago={activeUserRole.registrarPagos}
              mode="TELEFONO"
            />
          )}

          {(activeTab === 'pagos-calle' || activeTab === 'cobrador-campo') && (
            <CobradorCampoView
              operaciones={filteredOperaciones}
              cuotas={filteredCuotas}
              pagos={filteredPagos}
              clientes={clientes}
              usuarios={usuarios}
              activeUser={activeUser}
              configComisiones={configComisiones}
              configRecorrido={configRecorrido}
              configuracion={configuracion}
              comisiones={comisiones}
              visitasHistory={visitasHistory}
              visitasReprogramadas={visitasReprogramadas}
              initialSubTab={cobradorSubTab}
              onAddPago={handleAddPago}
              onReorganizePago={handleReorganizePagoAllocation}
              onDeletePago={handleDeletePago}
              onRegistrarVisita={handleRegistrarVisita}
              onReprogramarVisita={handleReprogramarVisita}
              onRegistrarContactoRecuperado={handleRegistrarContactoRecuperado}
              onUpdateCliente={handleUpdateCliente}
            />
          )}

          {activeTab === 'gestion-admin' && isAdmin && (
            <GestionAdministracionView
              clientes={clientes}
              operaciones={operaciones}
              cuotas={cuotas}
              pagos={pagos}
              compromisosPago={compromisosPago}
              usuarios={usuarios}
              activeUser={activeUser}
              configuracion={configuracion}
              onAddPago={handleAddPago}
              onUpdateCliente={handleUpdateCliente}
              onDeleteCliente={handleDeleteCliente}
              onDeleteOperacion={handleDeleteOperacion}
              onUpdateOperacion={handleUpdateOperacionWithCuotas}
              onAddOperacion={handleAddOperacion}
              onAddCompromisoPago={handleAddCompromisoPago}
              onAddCompromisosPagoBatch={handleAddCompromisosPagoBatch}
              onUpdateCompromisoPago={handleUpdateCompromisoPago}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'alertas-oportunidades' && isAdmin && (
            <AlertasOportunidadesView
              clientes={clientes}
              operaciones={operaciones}
              cuotas={cuotas}
              pagos={pagos}
              usuarios={usuarios}
              activeUser={activeUser}
              configuracion={configuracion}
              feriados={feriados}
              onAddOperacion={handleAddOperacion}
              onUpdateCliente={handleUpdateCliente}
              onDeleteOperacion={handleDeleteOperacion}
              onUpdateOperacion={handleUpdateOperacionWithCuotas}
              onAddPago={handleAddPago}
              onAddCompromisoPago={handleAddCompromisoPago}
              onAddTransaccion={handleAddTransaccion}
            />
          )}

          {activeTab === 'liquidaciones' && (
            <LiquidacionesView
              usuarios={usuarios}
              activeUser={activeUser}
              configComisiones={configComisiones}
              comisiones={comisiones}
              liquidacionesSemanales={liquidacionesSemanales}
              liquidacionesMensuales={liquidacionesMensuales}
              onUpdateConfigComisiones={handleUpdateConfigComisiones}
              onAddLiquidacionSemanal={handleAddLiquidacionSemanal}
              onAddLiquidacionMensual={handleAddLiquidacionMensual}
              onUpdateEstadoSemanal={handleUpdateEstadoSemanal}
              onUpdateEstadoMensual={handleUpdateEstadoMensual}
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
              configComisiones={configComisiones}
              feriados={feriados}
              clientes={clientes}
              operaciones={operaciones}
              cuotas={cuotas}
              pagos={pagos}
              transacciones={transacciones}
              onUpdateConfiguracion={handleUpdateConfiguracion}
              onUpdateConfigComisiones={handleUpdateConfigComisiones}
              onAddFeriado={handleAddFeriado}
              onDeleteFeriado={handleDeleteFeriado}
              onClearDatabase={handleClearDatabase}
              onResetToSeed={handleResetToSeed}
              onRestoreBackup={handleRestoreBackup}
              onBatchUpdateData={handleBatchUpdateData}
            />
          )}

          {activeTab === 'captacion-clientes' && (
            <CaptacionClientesView />
          )}

          {activeTab === 'verificacion' && (
            <VerificacionView />
          )}

          {activeTab === 'asignar-clientes' && isAdmin && (
            <AsignacionClientesView
              clientes={clientes}
              usuarios={usuarios}
              operaciones={operaciones}
              activeUser={activeUser}
              onUpdateCliente={handleUpdateCliente}
              onNavigateTo={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'usuarios' && isAdmin && (
            <UsuariosView
              usuarios={usuarios}
              roles={roles}
              activeUser={activeUser}
              fichajes={fichajes}
              onAddFichaje={handleAddFichaje}
              onUpdateFichaje={handleUpdateFichaje}
              onAddUsuario={handleAddUsuario}
              onUpdateUsuario={handleUpdateUsuario}
              onDeleteUsuario={handleDeleteUsuario}
              onUpdateRolePermisos={handleUpdateRolePermisos}
              onAddRole={handleAddRole}
              onDeleteRole={handleDeleteRole}
            />
          )}

          {/* Fallback default render if activeTab does not match any valid view */}
          {(![
            'dashboard', 'clientes', 'clientes-inactivos', 'clientes-todos', 'nuevo-cliente',
            'operaciones', 'pagos', 'pagos-whatsapp', 'pagos-telefono',
            'pagos-calle', 'cobrador-campo', 'gestion-admin', 'asignar-clientes', 'alertas-oportunidades', 
            'captacion-clientes', 'verificacion',
            'liquidaciones', 'tesoreria',
            'configuracion', 'usuarios'
          ].includes(activeTab) ||
            (activeTab === 'dashboard' && !activeUserRole.verDashboard) ||
            (activeTab === 'clientes' && !activeUserRole.verClientes) ||
            (activeTab === 'nuevo-cliente' && !activeUserRole.crearClientes) ||
            (activeTab === 'operaciones' && !activeUserRole.verPrestamos) ||
            ((activeTab === 'pagos' || activeTab === 'pagos-whatsapp' || activeTab === 'pagos-telefono') && !activeUserRole.verPagos) ||
            (activeTab === 'tesoreria' && !activeUserRole.verTesoreria) ||
            (activeTab === 'configuracion' && !activeUserRole.verConfiguracion) ||
            (activeTab === 'asignar-clientes' && !isAdmin) ||
            (activeTab === 'usuarios' && !isAdmin)
          ) && (
            activeUser?.rolId === 'COBRADOR' ? (
              <CobradorCampoView
                operaciones={filteredOperaciones}
                cuotas={filteredCuotas}
                pagos={filteredPagos}
                clientes={clientes}
                usuarios={usuarios}
                activeUser={activeUser}
                configComisiones={configComisiones}
                configRecorrido={configRecorrido}
                configuracion={configuracion}
                comisiones={comisiones}
                visitasHistory={visitasHistory}
                visitasReprogramadas={visitasReprogramadas}
                initialSubTab={cobradorSubTab}
                onAddPago={handleAddPago}
                onReorganizePago={handleReorganizePagoAllocation}
                onDeletePago={handleDeletePago}
                onRegistrarVisita={handleRegistrarVisita}
                onReprogramarVisita={handleReprogramarVisita}
                onRegistrarContactoRecuperado={handleRegistrarContactoRecuperado}
                onUpdateCliente={handleUpdateCliente}
              />
            ) : activeUser?.rolId === 'OPERADOR' ? (
              <PagosView
                operaciones={filteredOperaciones}
                cuotas={filteredCuotas}
                pagos={filteredPagos}
                clientes={clientes}
                usuarios={usuarios}
                activeUser={activeUser}
                configuracion={configuracion}
                onAddPago={handleAddPago}
                onReorganizePago={handleReorganizePagoAllocation}
                onDeletePago={handleDeletePago}
                canAddPago={activeUserRole.registrarPagos}
                mode="WHATSAPP"
              />
            ) : (
              <DashboardView
                clientes={filteredClientes}
                operaciones={filteredOperaciones}
                cuotas={filteredCuotas}
                pagos={filteredPagos}
                configuracion={configuracion}
                onNavigateTo={(tab) => setActiveTab(tab)}
              />
            )
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-emerald-950/90 border-t border-emerald-800/80 text-emerald-300 text-xs py-4 text-center mt-auto shadow-inner">
        <p className="max-w-7xl mx-auto px-6 font-medium">© 2026 Credi-Cash | Sistema Maestro. Diseñado bajo el principio de utilidad pura y amortizaciones de alta precisión.</p>
      </footer>

    </div>
  );
}

