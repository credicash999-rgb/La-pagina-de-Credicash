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
  operadorAsignadoId?: string;
  operadorAsignadoNombre?: string;
  cobradorAsignadoId?: string;
  cobradorAsignadoNombre?: string;
  montoDeudaInactivo?: number;
  montoPagoInicialRefinanciacion?: number;
  montoMinimoInactivoConfigurado?: number; // Para que el admin configure el mínimo exigible de inactivos
  fechaInicioGestionCobro?: string; // Para la cuenta regresiva de 5 días de comisión
  esClienteInactivoRefinanciacion?: boolean;
  diasMora?: number;
  estado: 'ACTIVO' | 'FINALIZADO' | 'EVASIVO' | 'INACTIVO' | 'EN_MORA' | 'SOLICITANTE' | 'PROSPECTO' | 'SUSPENDIDO' | 'CONGELADO';
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
  fotoCasa?: string;
  gpsLat?: number;
  gpsLng?: number;
  observaciones?: string;
}

export type FrecuenciaPago = 'DIARIA' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';

export interface Operacion {
  id: string; // ID Operación automático (e.g. OPE-001)
  fechaOtorgamiento: string;
  idCliente: string;
  nombreCliente: string;
  estado: 'ACTIVA' | 'FINALIZADA' | 'REFINANCIADA' | 'VENCIDA' | 'CONGELADA';
  tipoOperacion: 'NUEVO' | 'RENOVACION' | 'REFINANCIACION' | 'AMPLIACION';
  descripcion: string;
  operadorAsignadoId?: string;
  operadorAsignadoNombre?: string;
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
  horaPago?: string; // HH:MM:SS
  importe: number;
  cobrador: string;
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO';
  modalidad?: 'PAGO_REGULAR' | 'PAGO_PARCIAL' | 'PAGO_ADELANTADO_OPCION_A' | 'PAGO_ADELANTADO_OPCION_B' | 'NO_PAGO' | 'PROMESA' | 'OBSERVACION' | 'REFINANCIACION';
  cuotasAfectadas?: string;
  observaciones: string;
}

export type FinalidadCompromiso = 'REFINANCIACION' | 'RENOVACION' | 'OTRA';
export type MesaGestionCompromiso = 'GESTION DIARIA' | 'GESTION TELEFONICA' | 'GESTION DOMICILIARIA';
export type EstadoCompromiso = 'PENDIENTE' | 'REALIZADO' | 'EN MORA' | 'CANCELADO';

export interface CompromisoPago {
  id: string;
  idCliente: string;
  nombreCliente: string;
  dniCliente: string;
  idOperacion?: string;
  fechaCompromiso: string;
  montoComprometido: number;
  finalidad: FinalidadCompromiso;
  mesaGestion: MesaGestionCompromiso;
  estado: EstadoCompromiso;
  observaciones?: string;
  usuarioRegistro: string;
  fechaHoraRegistro: string;
  fechaRealizado?: string;
  pagoIdRelacionado?: string;
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
  // Puntos predeterminados para la ruta de cobranza en calle
  lugarInicioRecorridoPredeterminado?: string;
  lugarFinRecorridoPredeterminado?: string;
  puntoSalida?: string;
  puntoLlegada?: string;
  // Política de Intereses por Atraso (configurable, default 50%)
  interesAtrasoDiario?: number;
  interesAtrasoSemanal?: number;
  interesAtrasoQuincenal?: number;
  interesAtrasoMensual?: number;
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
  lugarInicioRecorrido?: string; // e.g. "Oficina Central - Av. San Martín 1230"
  lugarFinRecorrido?: string;    // e.g. "Oficina Central - Av. San Martín 1230"
  fechaInicioLiquidacionActual?: string; // Fecha de inicio de cuenta limpia/período actual
  horasAjustadasOffset?: number;
  comisionesAjustadasOffset?: number;
}

export interface FichajeAsistencia {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  rolNombre?: string;
  usuarioRol?: string;
  fecha: string; // YYYY-MM-DD
  horaEntrada: string; // HH:MM:SS
  horaSalida?: string; // HH:MM:SS
  duracionMinutos?: number;
  horasTrabajadas?: number;
  estado: 'ACTIVA' | 'FINALIZADA';
  observaciones?: string;
}

export interface VisitaDomicilio {
  id: string;
  idCliente: string;
  nombreCliente: string;
  cobradorId: string;
  cobradorNombre: string;
  fecha: string;
  hora: string;
  tipoAccion: 'ESTOY_EN_DOMICILIO' | 'PAGO_REGISTRADO' | 'NO_ENCONTRADO' | 'REPROGRAMADO' | 'CONTACTO_RECUPERADO';
  gpsLat?: number;
  gpsLng?: number;
  gpsDireccion?: string;
  montoCobrado?: number;
  medioPago?: string;
  fotoComprobante?: string;
  observaciones?: string;
  horaReprogramada?: string;
}

export interface VisitaReprogramada {
  id: string;
  idCliente: string;
  nombreCliente: string;
  horaReprogramada: string;
  fechaReprogramada: string;
  motivo?: string;
  completada: boolean;
}

export interface ComisionCobrador {
  id: string;
  pagoId?: string;
  idCliente: string;
  nombreCliente: string;
  cobradorId: string;
  cobradorNombre: string;
  montoCobrado: number;
  montoComision: number;
  tipoComision: 'COBRANZA' | 'CONTACTO_RECUPERADO' | 'CLIENTE_INACTIVO' | 'GESTION_LLAMADA' | 'GESTION_MENSAJE';
  estado: 'PENDIENTE' | 'VERIFICADO' | 'LIQUIDADO';
  fecha: string;
  fechaLiquidacionEstimada?: string;
}

export interface ConfiguracionComisiones {
  modoComisionCobranza?: 'PORCENTAJE' | 'MONTO_FIJO';
  porcentajeComisionCobranza: number;
  fijoComisionCobranza: number;
  montoMinimoCobroComision?: number;
  montoContactoRecuperado: number;
  montoClienteInactivoRecuperado: number;
  montoComisionLlamada: number;
  montoComisionMensaje: number;
  montoComisionCaptacionCliente?: number;
  montoComisionVerificacionCliente?: number;
  porcentajeReintegroDesayuno: number;
  limiteSemanalReintegroDesayuno: number;
  diaCierreSemanal: string;
  fechaProximaLiquidacionSemanal: string;
  fechaProximaLiquidacionMensual: string;
  basicoMensual: number;
  adicionalMovilidadSemanal: number;
  otrosConceptosAdd: number;
  descuentoBeneficiosFinanciacion: number;
}

export interface SolicitudReintegroDesayuno {
  id: string;
  cobradorId: string;
  cobradorNombre: string;
  fecha: string;
  hora: string;
  montoGasto: number;
  porcentajeCobertura: number;
  montoReintegrar: number;
  lugarNombre?: string;
  fotoTicketUrl?: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  observaciones?: string;
}

export interface LiquidacionSemanal {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  rolNombre: string;
  periodoSemana: string;
  fechaGeneracion: string;
  comisionesVerificadas: number;
  adicionalMovilidad: number;
  otrosAdicionales: number;
  totalNetoSemanal: number;
  estado: 'PENDIENTE' | 'APROBADA' | 'PAGADA';
  fechaPago?: string;
  observaciones?: string;
}

export interface LiquidacionMensual {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  rolNombre: string;
  periodoMes: string;
  fechaGeneracion: string;
  sueldoBasico: number;
  comisionesPendientesLiquidar: number;
  adicionales: number;
  descuentos: number;
  descuentoFinanciacionBeneficios: number;
  totalNetoMensual: number;
  estado: 'PENDIENTE' | 'APROBADA' | 'PAGADA';
  fechaPago?: string;
  observaciones?: string;
}

export interface ConfiguracionRecorrido {
  puntoSalida?: string;
  puntoLlegada?: string;
  puntoRegreso?: string;
  lugarInicioRecorridoPredeterminado?: string;
  lugarFinRecorridoPredeterminado?: string;
}


