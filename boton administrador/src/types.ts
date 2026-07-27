export interface Cliente {
  id: string;
  nombre: string;
  apellido: string;
  dni?: string;
  telefono?: string;
  whatsapp?: string;
  direccion?: string;
  calle?: string;
  numero?: string;
  trabajo?: string;
  ingresos?: number;
  captador?: string;
  analista?: string;
  cobradorAsignadoId?: string;
  cobradorAsignadoNombre?: string;
  operadorAsignadoId?: string;
  operadorAsignadoNombre?: string;
  estado: 'ACTIVO' | 'EN_MORA' | 'INACTIVO' | 'SOLICITANTE' | 'EVASIVO' | 'CONGELADO' | 'SUSPENDIDO';
  fechaRegistro?: string;
  montoDeudaInactivo?: number;
  montoPagoInicialRefinanciacion?: number;
  montoMinimoInactivoConfigurado?: number;
  esClienteInactivoRefinanciacion?: boolean;
  fechaInicioGestionCobro?: string;
  diasMora?: number;
  fotoCasa?: string;
}

export interface Operacion {
  id: string;
  fechaOtorgamiento?: string;
  fechaInicio?: string;
  idCliente: string;
  nombreCliente?: string;
  estado: 'ACTIVA' | 'FINALIZADA' | 'REFINANCIADA' | 'VENCIDA';
  tipoOperacion?: string;
  descripcion?: string;
  capitalEntregado?: number;
  montoPrestamo?: number;
  totalFinanciado?: number;
  montoTotalDevolver?: number;
  frecuencia?: string;
  cantidadCuotas?: number;
  cuotasTotales?: number;
  mesesFinanciados?: number;
  valorCuota?: number;
  primerVencimiento?: string;
  ultimoVencimiento?: string;
  captador?: string;
  analista?: string;
  ejecutivoAtencion?: string;
  cobrador?: string;
  operadorAsignadoId?: string;
  capitalRecuperado: number;
  interesCobrado?: number;
  capitalPendiente?: number;
  totalPendiente: number;
  cuotasPagadas: number;
  cuotasPendientes: number;
  proximoVencimiento?: string;
  ultimoPago?: string;
  diasMora?: number;
  nivelMora?: string;
  numeroCredito?: number;
  elegibleRenovacion?: boolean;
  elegibleAmpliacion?: boolean;
  fechaFinalizacion?: string;
  motivoCierre?: string;
  observaciones?: string;
  cuotasGeneradas?: boolean;
  metodoPagoPref?: string;
}

export interface Cuota {
  id: string;
  idOperacion: string;
  idCliente: string;
  nombreCliente?: string;
  numeroCredito?: number;
  numeroCuota: number;
  frecuencia?: string;
  fechaVencimiento: string;
  capitalCuota: number;
  interesCuota: number;
  valorTotalCuota: number;
  estado: 'PENDIENTE' | 'PAGADA' | 'PAGO_PARCIAL' | 'VENCIDA';
  fechaPago?: string;
  importePagado: number;
  saldoPendiente: number;
  diasAtraso?: number;
  cobrador?: string;
  observaciones?: string;
}

export interface Pago {
  id: string;
  idOperacion: string;
  idCliente: string;
  nombreCliente: string;
  fechaPago: string;
  horaPago?: string;
  importe: number;
  cobrador: string;
  metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO';
  modalidad?: string;
  cuotasAfectadas?: string;
  observaciones?: string;
}

export interface Feriado {
  fecha: string;
  descripcion: string;
  seCobra: boolean;
}

export interface Configuracion {
  interesDiario: number;
  interesSemanal: number;
  interesQuincenal: number;
  interesMensual: number;
  tasaMensualBase: number;
  metaCobranzaMonto: number;
  metaCobranzaPlazo: string;
  pagoMinimoCuotas: number;
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
  referenciaId?: string;
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
  password?: string;
  rolId: string;
  lugarInicioRecorrido?: string;
  lugarFinRecorrido?: string;
}

export interface LiquidacionPersonal {
  id: string;
  fecha: string;
  colaboradorNombre: string;
  rolColaborador: string;
  periodo: string;
  montoBase: number;
  comisiones: number;
  premios: number;
  descuentos: number;
  montoTotal: number;
  estado: 'PAGADA' | 'PENDIENTE';
  medioPago?: string;
  observaciones?: string;
}

export interface FichajeAsistencia {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  usuarioRol: string;
  fecha: string;
  horaEntrada: string;
  horaSalida?: string;
  horasTrabajadas?: number;
  estado: 'ACTIVA' | 'FINALIZADA';
}

export interface ConfiguracionComisiones {
  modoComisionCobranza: 'PORCENTAJE' | 'MONTO_FIJO';
  porcentajeComisionCobranza: number;
  fijoComisionCobranza: number;
  montoContactoRecuperado?: number;
  montoClienteInactivoRecuperado?: number;
  montoComisionLlamada?: number;
  montoComisionMensaje?: number;
  montoComisionCaptacionCliente?: number;
  montoComisionVerificacionCliente?: number;
  porcentajeReintegroDesayuno?: number;
  limiteSemanalReintegroDesayuno?: number;
  diaCierreSemanal?: string;
  fechaProximaLiquidacionSemanal?: string;
  fechaProximaLiquidacionMensual?: string;
  basicoMensual?: number;
  adicionalMovilidadSemanal?: number;
  otrosConceptosAdd?: number;
  descuentoBeneficiosFinanciacion?: number;
}

export interface ConfiguracionRecorrido {
  puntoSalida: string;
  puntoRegreso?: string;
  puntoLlegada?: string;
}

export interface ComisionCobrador {
  id: string;
  cobradorId: string;
  cobradorNombre: string;
  idCliente: string;
  nombreCliente?: string;
  montoCobrado: number;
  montoComision: number;
  tipoComision: string;
  fecha: string;
  estado: 'PENDIENTE' | 'VERIFICADO' | 'PAGADO';
  pagoId?: string;
}

export interface VisitaDomicilio {
  id: string;
  idCliente: string;
  nombreCliente: string;
  cobradorId: string;
  cobradorNombre: string;
  fecha: string;
  hora: string;
  tipoAccion: string;
  gpsLat?: number;
  gpsLng?: number;
  gpsDireccion?: string;
  montoCobrado?: number;
  medioPago?: string;
  fotoComprobante?: string;
  observaciones?: string;
}

export interface VisitaReprogramada {
  id: string;
  idCliente: string;
  nombreCliente: string;
  horaReprogramada: string;
  fechaReprogramada: string;
  motivo: string;
  completada: boolean;
}

export interface LiquidacionSemanal {
  id: string;
  usuarioId?: string;
  usuarioNombre: string;
  periodoSemana: string;
  totalNetoSemanal: number;
  estado: 'PENDIENTE' | 'APROBADA' | 'PAGADA';
}

export interface LiquidacionMensual {
  id: string;
  usuarioId?: string;
  usuarioNombre: string;
  periodoMes: string;
  totalNetoMensual: number;
  estado: 'PENDIENTE' | 'APROBADA' | 'PAGADA';
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
  lugarNombre: string;
  fotoTicketUrl?: string;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  observaciones?: string;
}
