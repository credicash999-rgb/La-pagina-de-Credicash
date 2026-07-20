/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Cliente {
  id: string; // ID Cliente automático (e.g. CLI-001)
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  direccion: string;
  trabajo: string;
  ingresos: number;
  captador: string;
  analista: string;
  estado: 'ACTIVO' | 'INACTIVO' | 'EN_MORA' | 'SOLICITANTE' | 'PROSPECTO' | 'SUSPENDIDO';
  fechaRegistro: string;

  // Nuevos campos solicitados por el usuario
  fechaNacimiento?: string;
  sexo?: string;
  whatsapp?: string;
  email?: string;
  telefonoAlternativo?: string;
  personaReferencia?: string;
  telefonoReferencia?: string;
  calle?: string;
  numero?: string;
  barrio?: string;
  ciudad?: string;
  provincia?: string;
  codigoPostal?: string;
  lugarTrabajo?: string;
  antiguedad?: string;
  aliasCbu?: string;
  banco?: string;
  origen?: string;
  documentosSimulados?: {
    dniFrente?: string; // nombre del archivo o "cargado"
    dniDorso?: string;
    comprobanteDomicilio?: string;
    reciboSueldo?: string;
    otros?: string;
  };
  observaciones?: string;
}

export type FrecuenciaPago = 'DIARIA' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';

export interface Operacion {
  id: string; // ID Operación automático (e.g. OPE-001)
  fechaOtorgamiento: string;
  idCliente: string;
  nombreCliente: string;
  estado: 'ACTIVA' | 'FINALIZADA' | 'REFINANCIADA' | 'VENCIDA';
  tipoOperacion: 'NUEVO' | 'RENOVACION' | 'REFINANCIACION' | 'AMPLIACION';
  descripcion: string;
  capitalEntregado: number;
  promocionAplicada: string;
  descuentoPorcentaje: number;
  totalFinanciado: number;
  frecuencia: FrecuenciaPago;
  cantidadCuotas: number;
  mesesFinanciados: number;
  valorCuota: number;
  primerVencimiento: string;
  ultimoVencimiento: string;
  captador: string;
  analista: string;
  ejecutivoAtencion: string;
  cobrador: string;
  capitalRecuperado: number;
  interesCobrado: number;
  capitalPendiente: number;
  totalPendiente: number;
  cuotasPagadas: number;
  cuotasPendientes: number;
  proximoVencimiento: string;
  ultimoPago: string;
  diasMora: number;
  nivelMora: string;
  numeroCredito: number; // Crédito 1, 2, 3...
  elegibleRenovacion: boolean;
  elegibleAmpliacion: boolean;
  fechaFinalizacion: string;
  motivoCierre: string;
  observaciones: string;
  cuotasGeneradas: boolean;
}

export interface Cuota {
  id: string; // e.g. OPE-001-CUO-01
  idOperacion: string;
  idCliente: string;
  nombreCliente: string;
  numeroCredito: number;
  numeroCuota: number;
  frecuencia: FrecuenciaPago;
  fechaVencimiento: string;
  capitalCuota: number;
  interesCuota: number;
  valorTotalCuota: number;
  estado: 'PENDIENTE' | 'PAGADA' | 'PAGO_PARCIAL' | 'VENCIDA';
  fechaPago: string;
  importePagado: number;
  saldoPendiente: number;
  diasAtraso: number;
  cobrador: string;
  observaciones: string;
}

export interface Pago {
  id: string; // ID Pago automático (e.g. PAG-001)
  idOperacion: string;
  idCliente: string;
  nombreCliente: string;
  fechaPago: string;
  importe: number;
  cobrador: string;
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO';
  observaciones: string;
}

export interface Feriado {
  fecha: string; // YYYY-MM-DD
  descripcion: string;
  seCobra: boolean; // Normalmente false
}

export interface Configuracion {
  interesDiario: number; // porcentaje e.g. 1.5%
  interesSemanal: number; // e.g. 5%
  interesQuincenal: number; // e.g. 12%
  interesMensual: number; // e.g. 25%
  tasaMensualBase: number; // e.g. 30%
  // Nuevos campos para metas y pagos mínimos
  metaCobranzaMonto?: number;
  metaCobranzaPlazo?: string;
  pagoMinimoCuotas?: number;
  // Alertas por frecuencia de pago (Días de mora necesarios para cambiar nivel de mora)
  moraDiarioAvisoDias?: number;
  moraDiarioLlamarDias?: number;
  moraDiarioCobradorDias?: number;
  moraSemanalAvisoDias?: number;
  moraSemanalLlamarDias?: number;
  moraSemanalCobradorDias?: number;
  moraQuincenalAvisoDias?: number;
  moraQuincenalLlamarDias?: number;
  moraQuincenalCobradorDias?: number;
  moraMensualAvisoDias?: number;
  moraMensualLlamarDias?: number;
  moraMensualCobradorDias?: number;
}

export interface TransaccionTesoreria {
  id: string;
  fecha: string;
  tipo: 'INGRESO' | 'EGRESO';
  concepto: string;
  monto: number;
  referenciaId?: string; // ID de Operacion o Pago
}

export interface LiquidacionPersonal {
  id: string;
  fecha: string;
  colaboradorNombre: string;
  rolColaborador: string;
  periodo: string; // e.g. "Julio 2026"
  montoBase: number;
  comisiones: number;
  premios: number;
  descuentos: number;
  montoTotal: number;
  estado: 'PAGADA' | 'PENDIENTE';
  medioPago?: 'EFECTIVO' | 'TRANSFERENCIA';
  observaciones?: string;
}

export interface PermisosRol {
  id: string;
  nombre: string;
  verDashboard: boolean;
  verClientes: boolean;
  crearClientes: boolean;
  verTelefonoCliente: boolean;
  verDniCliente: boolean;
  verDireccionCliente: boolean;
  verIngresosCliente: boolean;
  verPrestamos: boolean;
  crearPrestamos: boolean;
  verPagos: boolean;
  registrarPagos: boolean;
  verTesoreria: boolean;
  verConfiguracion: boolean;
}

export interface UsuarioRol {
  id: string;
  nombre: string;
  email: string;
  password?: string; // Contraseña para el inicio de sesión
  rolId: string;
}

