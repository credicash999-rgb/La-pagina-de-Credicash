import React, { useState, useMemo } from 'react';
import { 
  Cliente, Operacion, Cuota, Pago, UsuarioRol, 
  TransaccionTesoreria, Configuracion, FrecuenciaPago,
  CompromisoPago, FinalidadCompromiso, MesaGestionCompromiso, EstadoCompromiso
} from '../types';
import { 
  sortCuotasByPaymentPriority, 
  generarPlanCuotas, 
  normalizeDateToISO, 
  calcularDiasAtrasoSinDomingos,
  calcularMesesFinanciados,
  obtenerProximoDiaHabil
} from '../utils/cuotasGenerator';
import { 
  exportDailyRoutePDF, 
  exportComprobanteGestionDiariaPDF, 
  exportComprobanteGestionDomiciliariaPDF 
} from '../utils/pdfExportRoute';
import { calcularInteresesAtrasoCredito } from '../utils/interestCalculator';
import { 
  Users, Search, DollarSign, Calendar, FileText, 
  CheckCircle2, AlertTriangle, UserCheck, ShieldCheck, 
  Printer, ArrowRight, UserPlus, Phone, MapPin, 
  ChevronRight, Filter, RefreshCw, UserX, History,
  Divide, Layers, Smartphone, Home, Calculator, X,
  FileCheck2, Building2, Plus, Clock, Trash2, Eye,
  CheckCircle, XCircle, AlertCircle, BookmarkCheck
} from 'lucide-react';

interface GestionAdministracionViewProps {
  clientes: Cliente[];
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
  compromisosPago?: CompromisoPago[];
  usuarios?: UsuarioRol[];
  activeUser: UsuarioRol | null;
  configuracion?: Configuracion;
  onAddPago: (
    pago: Pago, 
    updatedCuotas: Cuota[], 
    updatedOperacion: Operacion, 
    tesoreriaTrx: TransaccionTesoreria
  ) => void;
  onUpdateCliente?: (cliente: Cliente) => void;
  onDeleteCliente?: (idCliente: string) => void;
  onUpdateOperacion?: (operacion: Operacion) => void;
  onAddOperacion?: (operacion: Operacion, cuotasGeneradas: Cuota[]) => void;
  onAddCompromisoPago?: (compromiso: CompromisoPago) => void;
  onAddCompromisosPagoBatch?: (compromisos: CompromisoPago[]) => void;
  onUpdateCompromisoPago?: (compromiso: CompromisoPago) => void;
  onNavigateTab?: (tab: string) => void;
}

export default function GestionAdministracionView({
  clientes = [],
  operaciones = [],
  cuotas = [],
  pagos = [],
  compromisosPago = [],
  usuarios = [],
  activeUser,
  configuracion,
  onAddPago,
  onUpdateCliente,
  onDeleteCliente,
  onUpdateOperacion,
  onAddOperacion,
  onAddCompromisoPago,
  onAddCompromisosPagoBatch,
  onUpdateCompromisoPago,
  onNavigateTab
}: GestionAdministracionViewProps) {
  const isAdmin = activeUser?.rolId === 'ADMIN' || activeUser?.rolId === 'SUPERADMIN' || activeUser?.rolId === 'ADMINISTRADOR';
  const [clienteToDelete, setClienteToDelete] = useState<Cliente | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<'TODOS' | 'ACTIVOS' | 'INACTIVOS'>('TODOS');
  const [filterStage, setFilterStage] = useState<'TODOS' | 'DIARIA' | 'TELEFONICA' | 'DOMICILIARIA'>('TODOS');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [activeTabFicha, setActiveTabFicha] = useState<'FICHA' | 'CUOTAS' | 'HISTORIAL' | 'COMPROMISOS'>('FICHA');

  // Modal / Form state for payment
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [selectedOperacionId, setSelectedOperacionId] = useState<string>('');
  const [selectedCompromisoId, setSelectedCompromisoId] = useState<string>('');
  const [tipoPago, setTipoPago] = useState<'REGULAR' | 'PARCIAL' | 'ADELANTADO'>('REGULAR');
  const [imputacionEstrategia, setImputacionEstrategia] = useState<'CONSECUTIVO' | 'FINAL_ATRAS'>('CONSECUTIVO');
  const [fechaPagoInput, setFechaPagoInput] = useState<string>('');
  const [montoIngresado, setMontoIngresado] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO'>('EFECTIVO');
  const [canalCobro, setCanalCobro] = useState<string>('ADMINISTRACION');
  const [cobradorComisionId, setCobradorComisionId] = useState<string>('');
  const [observacionesPago, setObservacionesPago] = useState('');

  // Compromiso de Pago Modal State
  const [isCompromisoModalOpen, setIsCompromisoModalOpen] = useState(false);
  const [compOperacionId, setCompOperacionId] = useState<string>('');
  const [compFinalidad, setCompFinalidad] = useState<FinalidadCompromiso>('REFINANCIACIÓN');
  const [compMesaGestion, setCompMesaGestion] = useState<MesaGestionCompromiso>('GESTIÓN DIARIA');
  const [compItems, setCompItems] = useState<Array<{ id: string; fecha: string; monto: string; observaciones: string }>>([]);
  const [compUsuario, setCompUsuario] = useState<string>('');
  const [selectedCompromisoDetail, setSelectedCompromisoDetail] = useState<CompromisoPago | null>(null);
  const [compFilterEstado, setCompFilterEstado] = useState<'TODOS' | 'PENDIENTE' | 'REALIZADO' | 'EN MORA' | 'CANCELADO'>('TODOS');

  // Search and Filter states for Historial de Pagos
  const [pagoSearchTerm, setPagoSearchTerm] = useState('');
  const [pagoFilterModalidad, setPagoFilterModalidad] = useState('TODOS');
  const [pagoFilterMetodo, setPagoFilterMetodo] = useState('TODOS');

  // Modal state for Refinancing / Simulator / Debt Splitting ("DIVIDIR DEUDA")
  const [isRefinanciarModalOpen, setIsRefinanciarModalOpen] = useState(false);
  const [refinanciarModo, setRefinanciarModo] = useState<'UNICO' | 'DIVIDIR_2' | 'DIVIDIR_3'>('UNICO');

  // Credit 1 config
  const [ref1Capital, setRef1Capital] = useState<number>(100000);
  const [ref1Frecuencia, setRef1Frecuencia] = useState<FrecuenciaPago>('DIARIA');
  const [ref1Cuotas, setRef1Cuotas] = useState<number>(20);
  const [ref1PrimerVenc, setRef1PrimerVenc] = useState<string>('');

  // Credit 2 config
  const [ref2Capital, setRef2Capital] = useState<number>(50000);
  const [ref2Frecuencia, setRef2Frecuencia] = useState<FrecuenciaPago>('SEMANAL');
  const [ref2Cuotas, setRef2Cuotas] = useState<number>(8);
  const [ref2PrimerVenc, setRef2PrimerVenc] = useState<string>('');

  // Credit 3 config
  const [ref3Capital, setRef3Capital] = useState<number>(25000);
  const [ref3Frecuencia, setRef3Frecuencia] = useState<FrecuenciaPago>('MENSUAL');
  const [ref3Cuotas, setRef3Cuotas] = useState<number>(4);
  const [ref3PrimerVenc, setRef3PrimerVenc] = useState<string>('');

  const [refCobrador, setRefCobrador] = useState<string>('');
  const [refObservaciones, setRefObservaciones] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper function to calculate collection stage based strictly on CONFIGURACION thresholds
  const getInstanciaCobroOperacion = (op: Operacion): 'DIARIA' | 'TELEFONICA' | 'DOMICILIARIA' => {
    if (!configuracion) return 'DIARIA';
    const opCuotas = cuotas.filter(c => c.idOperacion === op.id && c.estado !== 'PAGADA');
    const sortedPending = [...opCuotas].sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento));
    const oldestPending = sortedPending[0];
    const today = todayStr;
    const diasMora = oldestPending && oldestPending.fechaVencimiento < today
      ? calcularDiasAtrasoSinDomingos(oldestPending.fechaVencimiento, today)
      : (op.diasMora || 0);

    let llamarDias = 2;
    let cobradorDias = 6;
    if (op.frecuencia === 'DIARIA') {
      llamarDias = configuracion?.moraDiarioLlamarDias ?? 2;
      cobradorDias = configuracion?.moraDiarioCobradorDias ?? 6;
    } else if (op.frecuencia === 'SEMANAL') {
      llamarDias = configuracion?.moraSemanalLlamarDias ?? 4;
      cobradorDias = configuracion?.moraSemanalCobradorDias ?? 7;
    } else if (op.frecuencia === 'QUINCENAL') {
      llamarDias = configuracion?.moraQuincenalLlamarDias ?? 5;
      cobradorDias = configuracion?.moraQuincenalCobradorDias ?? 8;
    } else if (op.frecuencia === 'MENSUAL') {
      llamarDias = configuracion?.moraMensualLlamarDias ?? 2;
      cobradorDias = configuracion?.moraMensualCobradorDias ?? 2;
    }

    if (diasMora >= cobradorDias) return 'DOMICILIARIA';
    if (diasMora >= llamarDias) return 'TELEFONICA';
    return 'DIARIA';
  };

  const getInstanciaCobroCliente = (c: Cliente): 'DIARIA' | 'TELEFONICA' | 'DOMICILIARIA' => {
    const cOps = operaciones.filter(o => o.idCliente === c.id && o.estado !== 'FINALIZADA' && o.estado !== 'REFINANCIADA');
    if (cOps.length === 0) return 'DIARIA';
    const instancias = cOps.map(getInstanciaCobroOperacion);
    if (instancias.includes('DOMICILIARIA')) return 'DOMICILIARIA';
    if (instancias.includes('TELEFONICA')) return 'TELEFONICA';
    return 'DIARIA';
  };

  // Precompute stage counts for header filter cards
  const stageCounts = useMemo(() => {
    let diaria = 0;
    let telefonica = 0;
    let domiciliaria = 0;

    clientes.forEach(c => {
      const stage = getInstanciaCobroCliente(c);
      if (stage === 'DIARIA') diaria++;
      else if (stage === 'TELEFONICA') telefonica++;
      else if (stage === 'DOMICILIARIA') domiciliaria++;
    });

    return { diaria, telefonica, domiciliaria };
  }, [clientes, operaciones, cuotas, configuracion]);

  // Filter clients
  const filteredClientes = clientes.filter(c => {
    const term = searchTerm.toLowerCase().trim();
    const assignedCobrador = c.cobradorAsignadoNombre || '';
    const address = c.direccion || c.calle || '';

    const matchesSearch = 
      !term ||
      c.nombre.toLowerCase().includes(term) ||
      (c.apellido && c.apellido.toLowerCase().includes(term)) ||
      c.dni.includes(term) ||
      (c.telefono && c.telefono.includes(term)) ||
      address.toLowerCase().includes(term) ||
      assignedCobrador.toLowerCase().includes(term);

    if (!matchesSearch) return false;

    if (filterEstado === 'ACTIVOS' && c.estado !== 'ACTIVO') return false;
    if (filterEstado === 'INACTIVOS' && c.estado !== 'INACTIVO') return false;

    if (filterStage !== 'TODOS') {
      const stage = getInstanciaCobroCliente(c);
      if (stage !== filterStage) return false;
    }

    return true;
  });

  const selectedCliente = clientes.find(c => c.id === selectedClienteId) || null;

  const getFullAddress = (cli: Cliente) => {
    const parts = [
      cli.direccion || cli.calle,
      cli.barrio ? `B° ${cli.barrio}` : '',
      cli.provincia
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Sin domicilio registrado';
  };

  // Selected client loans & cuotas
  const clientOperations = selectedCliente 
    ? operaciones.filter(o => o.idCliente === selectedCliente.id && o.estado !== 'FINALIZADA' && o.estado !== 'REFINANCIADA')
    : [];

  const allClientOperations = selectedCliente
    ? operaciones.filter(o => o.idCliente === selectedCliente.id)
    : [];

  const selectedOp = useMemo(() => {
    if (!selectedCliente) return null;
    if (selectedOperacionId && selectedOperacionId !== 'DEUDA_INACTIVO') {
      const found = allClientOperations.find(o => o.id === selectedOperacionId);
      if (found) return found;
    }
    return clientOperations[0] || allClientOperations[0] || null;
  }, [selectedCliente, selectedOperacionId, allClientOperations, clientOperations]);

  const selectedOpCuotas = useMemo(() => {
    if (!selectedOp) return [];
    const directCuotas = cuotas.filter(c => c.idOperacion === selectedOp.id);
    if (directCuotas.length > 0) return directCuotas;
    return generarPlanCuotas(selectedOp, []);
  }, [selectedOp, cuotas]);

  const opOverdueCuotas = useMemo(() => {
    return selectedOpCuotas.filter(c => c.estado !== 'PAGADA' && c.fechaVencimiento < todayStr);
  }, [selectedOpCuotas, todayStr]);

  const countOverdue = opOverdueCuotas.length;
  const sumOverdue = opOverdueCuotas.reduce((sum, c) => sum + (c.saldoPendiente > 0 ? c.saldoPendiente : c.valorTotalCuota || 0), 0);

  const opTodayCuotas = useMemo(() => {
    return selectedOpCuotas.filter(c => c.estado !== 'PAGADA' && c.fechaVencimiento === todayStr);
  }, [selectedOpCuotas, todayStr]);

  const countToday = opTodayCuotas.length;
  const sumToday = opTodayCuotas.reduce((sum, c) => sum + (c.saldoPendiente > 0 ? c.saldoPendiente : c.valorTotalCuota || 0), 0);

  const exigTotal = sumOverdue + sumToday;

  const totalCuotasCount = selectedOp?.cantidadCuotas || selectedOpCuotas.length || 0;
  const cuotasPagadasCount = selectedOp?.cuotasPagadas || selectedOpCuotas.filter(c => c.estado === 'PAGADA').length || 0;
  const cuotasPendientesCount = totalCuotasCount - cuotasPagadasCount;

  // Active cuotas
  let clientCuotas = selectedCliente
    ? cuotas.filter(cu => clientOperations.some(o => o.id === cu.idOperacion))
    : [];

  // If no cuotas in state, generate dynamically
  if (selectedCliente && clientCuotas.length === 0 && clientOperations.length > 0) {
    clientCuotas = clientOperations.flatMap(o => generarPlanCuotas(o, []));
  }

  const unpaidCuotas = clientCuotas.filter(cu => cu.estado !== 'PAGADA');
  const totalDeudaCuotas = unpaidCuotas.reduce((sum, cu) => sum + (cu.saldoPendiente > 0 ? cu.saldoPendiente : cu.valorTotalCuota || 0), 0);

  // All client payments
  const clientPagos = selectedCliente
    ? pagos.filter(p => p.idCliente === selectedCliente.id)
    : [];

  // All client commitments
  const clientCompromisos = useMemo(() => {
    if (!selectedCliente) return [];
    return (compromisosPago || [])
      .filter(c => c.idCliente === selectedCliente.id)
      .sort((a, b) => b.fechaHoraRegistro.localeCompare(a.fechaHoraRegistro));
  }, [selectedCliente, compromisosPago]);

  // Pending Alerts Count for Top Indicator Badge
  const alertasPendientesCount = useMemo(() => {
    let count = 0;
    const effectiveConfig: Configuracion = configuracion || {
      interesAtrasoDiario: 0.5,
      interesAtrasoSemanal: 0.5,
      interesAtrasoQuincenal: 0.5,
      interesAtrasoMensual: 0.5,
      interesDiario: 50,
      interesSemanal: 50,
      interesQuincenal: 50,
      interesMensual: 50,
      tasaMensualBase: 30
    };

    (clientes || []).forEach(cli => {
      if (!cli) return;
      if (cli.estado === 'INACTIVO' || (cli.montoDeudaInactivo && cli.montoDeudaInactivo > 0)) {
        count++;
      } else if (cli.estado === 'SOLICITANTE' || cli.estado === 'PROSPECTO') {
        count++;
      }
    });
    (operaciones || []).forEach(op => {
      if (!op) return;
      const opCuotas = (cuotas || []).filter(cu => cu && cu.idOperacion === op.id);
      const totalCuo = op.cantidadCuotas || opCuotas.length || 1;
      const pagadasCount = op.cuotasPagadas || opCuotas.filter(cu => cu && cu.estado === 'PAGADA').length;
      const pct = Math.round((pagadasCount / totalCuo) * 100);
      if ((op.estado === 'ACTIVA' || op.estado === 'CONGELADA') && pct >= 70) {
        count++;
      }
      if (op.estado === 'FINALIZADA' || (opCuotas.length > 0 && opCuotas.every(c => c.estado === 'PAGADA'))) {
        const resumen = calcularInteresesAtrasoCredito(op, opCuotas, effectiveConfig);
        if (resumen.cuotasConAtraso > 0) {
          count++;
        }
      }
    });
    return count;
  }, [clientes, operaciones, cuotas, configuracion]);

  // PDF Export Handlers
  const handleExportComprobanteDiaria = () => {
    if (!selectedCliente) return;
    exportComprobanteGestionDiariaPDF(selectedCliente, operaciones, cuotas, pagos, compromisosPago);
  };

  const handleExportComprobanteDomiciliaria = () => {
    if (!selectedCliente) return;
    exportComprobanteGestionDomiciliariaPDF(selectedCliente, operaciones, cuotas, compromisosPago);
  };

  // Open Payment Modal for selected client
  const handleOpenPagoModal = (opId?: string) => {
    if (!selectedCliente) return;

    let opToSelect = opId;
    if (!opToSelect) {
      if (selectedCliente.estado === 'INACTIVO' || (selectedCliente.montoDeudaInactivo && selectedCliente.montoDeudaInactivo > 0) || (selectedCliente.montoPagoInicialRefinanciacion && selectedCliente.montoPagoInicialRefinanciacion > 0)) {
        opToSelect = 'DEUDA_INACTIVO';
      } else if (clientOperations.length > 0) {
        const opWithUnpaid = clientOperations.find(op => clientCuotas.some(cu => cu.idOperacion === op.id && cu.estado !== 'PAGADA'));
        opToSelect = opWithUnpaid ? opWithUnpaid.id : 'DEUDA_INACTIVO';
      } else {
        opToSelect = 'DEUDA_INACTIVO';
      }
    }

    setSelectedOperacionId(opToSelect);

    let suggestedMonto = 0;
    if (opToSelect !== 'DEUDA_INACTIVO') {
      const targetOpCuotas = clientCuotas.filter(cu => cu.idOperacion === opToSelect && cu.estado !== 'PAGADA');
      const priorityCuotas = sortCuotasByPaymentPriority(targetOpCuotas, todayStr);
      suggestedMonto = priorityCuotas.length > 0 ? (priorityCuotas[0].saldoPendiente || priorityCuotas[0].valorTotalCuota || 0) : 0;
    } else {
      const defaultDeuda = selectedCliente.montoDeudaInactivo !== undefined && selectedCliente.montoDeudaInactivo > 0
        ? selectedCliente.montoDeudaInactivo
        : 150000;
      const defaultPagoInicial = selectedCliente.montoPagoInicialRefinanciacion !== undefined && selectedCliente.montoPagoInicialRefinanciacion > 0
        ? selectedCliente.montoPagoInicialRefinanciacion
        : Math.round(defaultDeuda * 0.10);
      suggestedMonto = defaultPagoInicial;
    }

    setMontoIngresado(suggestedMonto > 0 ? String(suggestedMonto) : '');
    setFechaPagoInput(todayStr);
    setTipoPago('REGULAR');
    setImputacionEstrategia('CONSECUTIVO');
    setMetodoPago('EFECTIVO');
    setCanalCobro('ADMINISTRACION');
    setCobradorComisionId(selectedCliente.cobradorAsignadoNombre || activeUser?.nombre || '');
    setObservacionesPago('Cobro extraordinario / Pago refinanciación registrado desde Gestión Administración');
    setIsPagoModalOpen(true);
  };

  // Open Refinancing Modal
  const handleOpenRefinanciarModal = () => {
    if (!selectedCliente) return;
    const totalDeuda = selectedCliente.montoDeudaInactivo && selectedCliente.montoDeudaInactivo > 0
      ? selectedCliente.montoDeudaInactivo
      : (totalDeudaCuotas > 0 ? totalDeudaCuotas : 150000);

    setRefinanciarModo('UNICO');
    setRef1Capital(totalDeuda);
    setRef1Frecuencia('DIARIA');
    setRef1Cuotas(20);
    setRef1PrimerVenc(todayStr);

    setRef2Capital(Math.round(totalDeuda / 2));
    setRef2Frecuencia('SEMANAL');
    setRef2Cuotas(8);
    setRef2PrimerVenc(todayStr);

    setRef3Capital(Math.round(totalDeuda / 3));
    setRef3Frecuencia('MENSUAL');
    setRef3Cuotas(4);
    setRef3PrimerVenc(todayStr);

    setRefCobrador(selectedCliente.cobradorAsignadoNombre || activeUser?.nombre || 'Administración');
    setRefObservaciones(`Refinanciación consolidada de deuda $${totalDeuda.toLocaleString('es-AR')}`);
    setIsRefinanciarModalOpen(true);
  };

  // Compute live simulator estimates for Refinancing
  const simularCreditoHelper = (capital: number, frecuencia: FrecuenciaPago, cantCuotas: number) => {
    const meses = calcularMesesFinanciados(frecuencia, cantCuotas);
    let tasa = 50;
    if (configuracion) {
      if (frecuencia === 'DIARIA') tasa = configuracion.interesDiario;
      else if (frecuencia === 'SEMANAL') tasa = configuracion.interesSemanal;
      else if (frecuencia === 'QUINCENAL') tasa = configuracion.interesQuincenal;
      else if (frecuencia === 'MENSUAL') tasa = configuracion.interesMensual;
    }
    const interes = capital * (tasa / 100) * meses;
    const totalFinanciado = capital + interes;
    const valorCuota = cantCuotas > 0 ? parseFloat((totalFinanciado / cantCuotas).toFixed(2)) : 0;
    return { meses, tasa, interes, totalFinanciado, valorCuota };
  };

  const sim1 = simularCreditoHelper(ref1Capital, ref1Frecuencia, ref1Cuotas);
  const sim2 = simularCreditoHelper(ref2Capital, ref2Frecuencia, ref2Cuotas);
  const sim3 = simularCreditoHelper(ref3Capital, ref3Frecuencia, ref3Cuotas);

  // Submit Refinancing ("REFINANCIAR")
  const handleConfirmRefinanciar = () => {
    if (!selectedCliente) return;

    const createRefinancingOp = (capital: number, frecuencia: FrecuenciaPago, cantCuotas: number, primerVenc: string, subIdx: number) => {
      const sim = simularCreditoHelper(capital, frecuencia, cantCuotas);
      const nextNum = operaciones.reduce((max, o) => {
        if (o && o.id && typeof o.id === 'string') {
          const match = o.id.match(/OPE-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            return !isNaN(num) && num > max ? num : max;
          }
        }
        return max;
      }, 0) + 1 + subIdx;

      const generatedOpId = `OPE-${String(nextNum).padStart(3, '0')}`;
      const numCredito = operaciones.filter(o => o.idCliente === selectedCliente.id).length + 1 + subIdx;

      const tempOp: Operacion = {
        id: generatedOpId,
        fechaOtorgamiento: todayStr,
        idCliente: selectedCliente.id,
        nombreCliente: `${selectedCliente.nombre || ''} ${selectedCliente.apellido || ''}`.trim(),
        estado: 'ACTIVA',
        tipoOperacion: 'REFINANCIACION',
        descripcion: `Refinanciación ${refinanciarModo !== 'UNICO' ? `(Tramo ${subIdx + 1})` : ''} - ${frecuencia}`,
        capitalEntregado: capital,
        promocionAplicada: '',
        descuentoPorcentaje: 0,
        totalFinanciado: sim.totalFinanciado,
        frecuencia,
        cantidadCuotas: cantCuotas,
        mesesFinanciados: sim.meses,
        valorCuota: sim.valorCuota,
        primerVencimiento: primerVenc || todayStr,
        ultimoVencimiento: '',
        captador: selectedCliente.captador || activeUser?.nombre || 'Administración',
        analista: selectedCliente.analista || activeUser?.nombre || 'Administración',
        ejecutivoAtencion: activeUser?.nombre || 'Administración',
        cobrador: refCobrador || selectedCliente.cobradorAsignadoNombre || 'Administración',
        capitalRecuperado: 0,
        interesCobrado: 0,
        capitalPendiente: capital,
        totalPendiente: sim.totalFinanciado,
        cuotasPagadas: 0,
        cuotasPendientes: cantCuotas,
        proximoVencimiento: primerVenc || todayStr,
        ultimoPago: '',
        diasMora: 0,
        nivelMora: 'Sano',
        numeroCredito: numCredito,
        elegibleRenovacion: false,
        elegibleAmpliacion: false,
        fechaFinalizacion: '',
        motivoCierre: '',
        observaciones: refObservaciones,
        cuotasGeneradas: true
      };

      const planCuotas = generarPlanCuotas(tempOp, []);
      if (planCuotas.length > 0) {
        tempOp.ultimoVencimiento = planCuotas[planCuotas.length - 1].fechaVencimiento;
      }

      return { tempOp, planCuotas };
    };

    try {
      const opsToCreate: { tempOp: Operacion; planCuotas: Cuota[] }[] = [];

      opsToCreate.push(createRefinancingOp(ref1Capital, ref1Frecuencia, ref1Cuotas, ref1PrimerVenc, 0));

      if (refinanciarModo === 'DIVIDIR_2' || refinanciarModo === 'DIVIDIR_3') {
        opsToCreate.push(createRefinancingOp(ref2Capital, ref2Frecuencia, ref2Cuotas, ref2PrimerVenc, 1));
      }

      if (refinanciarModo === 'DIVIDIR_3') {
        opsToCreate.push(createRefinancingOp(ref3Capital, ref3Frecuencia, ref3Cuotas, ref3PrimerVenc, 2));
      }

      // Execute creation for each sub-credit
      opsToCreate.forEach(item => {
        if (onAddOperacion) {
          onAddOperacion(item.tempOp, item.planCuotas);
        }
      });

      // Update client state
      if (onUpdateCliente) {
        onUpdateCliente({
          ...selectedCliente,
          estado: 'ACTIVO',
          montoDeudaInactivo: 0,
          montoPagoInicialRefinanciacion: 0
        });
      }

      setIsRefinanciarModalOpen(false);
      alert(`🎉 ¡Refinanciación efectuada con éxito!\nSe generaron ${opsToCreate.length} crédito(s) de refinanciación para ${selectedCliente.nombre}.\nEl cliente ha pasado a estado ACTIVO.`);
    } catch (e) {
      console.error('Error al efectuar refinanciación:', e);
      alert('Ocurrió un error al procesar la refinanciación.');
    }
  };

  // Preview allocation impact
  const previewImpacto = useMemo(() => {
    const amountToApply = parseFloat(montoIngresado || '0');
    if (amountToApply <= 0 || !selectedOperacionId || selectedOperacionId === 'DEUDA_INACTIVO') return null;

    const targetOp = operaciones.find(o => o.id === selectedOperacionId);
    if (!targetOp) return null;

    let opCuotas = cuotas.filter(cu => cu.idOperacion === targetOp.id);
    if (opCuotas.length === 0) {
      opCuotas = generarPlanCuotas(targetOp, []);
    }

    const effectiveFecha = normalizeDateToISO(fechaPagoInput || todayStr);
    const cuotasPriorizadas = sortCuotasByPaymentPriority(
      opCuotas.filter(c => c.estado !== 'PAGADA'),
      effectiveFecha,
      imputacionEstrategia === 'FINAL_ATRAS' ? 'PAGO_ADELANTADO_OPCION_B' : undefined
    );

    let rem = amountToApply;
    const items: { num: number; fechaVenc: string; cobrado: number; completo: boolean; saldoRestante: number }[] = [];

    for (const c of cuotasPriorizadas) {
      if (rem <= 0) break;
      const saldoActual = c.saldoPendiente > 0 ? c.saldoPendiente : c.valorTotalCuota;
      if (rem >= saldoActual) {
        items.push({
          num: c.numeroCuota,
          fechaVenc: c.fechaVencimiento,
          cobrado: saldoActual,
          completo: true,
          saldoRestante: 0
        });
        rem -= saldoActual;
      } else {
        items.push({
          num: c.numeroCuota,
          fechaVenc: c.fechaVencimiento,
          cobrado: rem,
          completo: false,
          saldoRestante: saldoActual - rem
        });
        rem = 0;
      }
    }

    return items;
  }, [montoIngresado, selectedOperacionId, operaciones, cuotas, fechaPagoInput, todayStr, imputacionEstrategia]);

  // Open Commitment Modal
  const handleOpenCompromisoModal = () => {
    if (!selectedCliente) {
      alert('Por favor seleccione un cliente primero.');
      return;
    }
    const stage = getInstanciaCobroCliente(selectedCliente);
    const mesaMap: Record<string, MesaGestionCompromiso> = {
      'DIARIA': 'GESTION DIARIA',
      'TELEFONICA': 'GESTION TELEFONICA',
      'DOMICILIARIA': 'GESTION DOMICILIARIA'
    };
    setCompMesaGestion(mesaMap[stage] || 'GESTION DIARIA');
    setCompFinalidad('REFINANCIACION');

    const clientActiveOps = clientOperations.filter(o => o.estado !== 'FINALIZADA' && o.estado !== 'REFINANCIADA');
    setCompOperacionId(clientActiveOps.length > 0 ? clientActiveOps[0].id : '');
    setCompUsuario(activeUser?.nombre || 'Administración');

    setCompItems([
      { id: String(Date.now()), fecha: todayStr, monto: '', observaciones: '' }
    ]);

    setIsCompromisoModalOpen(true);
  };

  const handleAddCompromisoRow = () => {
    setCompItems(prev => [
      ...prev,
      { id: String(Date.now() + Math.random()), fecha: todayStr, monto: '', observaciones: '' }
    ]);
  };

  const handleRemoveCompromisoRow = (id: string) => {
    if (compItems.length <= 1) {
      alert('Debe haber al menos un compromiso en la lista.');
      return;
    }
    setCompItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateCompromisoRow = (id: string, field: 'fecha' | 'monto' | 'observaciones', val: string) => {
    setCompItems(prev => prev.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  const handleSaveCompromisos = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return;

    const validItems = compItems.filter(item => {
      const m = parseFloat(item.monto);
      return !isNaN(m) && m > 0 && item.fecha.trim() !== '';
    });

    if (validItems.length === 0) {
      alert('Por favor complete al menos un compromiso con fecha e importe mayor a $0.');
      return;
    }

    const timestampNow = new Date().toISOString();
    const newCompromisos: CompromisoPago[] = validItems.map((item, idx) => ({
      id: `COM-${Date.now()}-${idx + 1}`,
      idCliente: selectedCliente.id,
      nombreCliente: `${selectedCliente.nombre} ${selectedCliente.apellido || ''}`.trim(),
      dniCliente: selectedCliente.dni || '',
      idOperacion: compOperacionId || undefined,
      fechaCompromiso: normalizeDateToISO(item.fecha),
      montoComprometido: parseFloat(item.monto),
      finalidad: compFinalidad,
      mesaGestion: compMesaGestion,
      estado: normalizeDateToISO(item.fecha) < todayStr ? 'EN MORA' : 'PENDIENTE',
      observaciones: item.observaciones.trim(),
      usuarioRegistro: compUsuario || activeUser?.nombre || 'Administración',
      fechaHoraRegistro: timestampNow
    }));

    if (newCompromisos.length === 1 && onAddCompromisoPago) {
      onAddCompromisoPago(newCompromisos[0]);
    } else if (onAddCompromisosPagoBatch) {
      onAddCompromisosPagoBatch(newCompromisos);
    } else if (onAddCompromisoPago) {
      newCompromisos.forEach(c => onAddCompromisoPago(c));
    }

    setIsCompromisoModalOpen(false);
    alert(`✅ ¡Se registraron ${newCompromisos.length} compromiso(s) de pago correctamente para ${selectedCliente.nombre}!\n\nRECUERDE: El compromiso de pago NO descuenta deuda ni altera Tesorería/Caja hasta que el pago real sea registrado.`);
  };

  const handleOpenPagoModalWithCompromiso = (comp: CompromisoPago) => {
    if (!selectedCliente) return;
    setSelectedCompromisoId(comp.id);
    setMontoIngresado(String(comp.montoComprometido));
    setFechaPagoInput(todayStr);
    setSelectedOperacionId(comp.idOperacion || (clientOperations.length > 0 ? clientOperations[0].id : 'DEUDA_INACTIVO'));
    setTipoPago('REGULAR');
    setMetodoPago('EFECTIVO');
    setCanalCobro('ADMINISTRACION');
    setObservacionesPago(`Cumplimiento de Compromiso #${comp.id} (${comp.finalidad} - ${comp.mesaGestion})`);
    setIsPagoModalOpen(true);
  };

  // Submit Payment
  const handleSubmitPago = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente || !selectedOperacionId) {
      alert('Por favor seleccione una opción para registrar el cobro.');
      return;
    }

    const montoNum = parseFloat(montoIngresado);
    if (isNaN(montoNum) || montoNum <= 0) {
      alert('Por favor ingrese un monto válido mayor a 0.');
      return;
    }

    const effectiveFechaPago = normalizeDateToISO(fechaPagoInput || todayStr);
    const assignedStaffName = cobradorComisionId || selectedCliente.cobradorAsignadoNombre || activeUser?.nombre || 'Administración';
    const newPagoId = `PAG-${String(Date.now())}`;

    // Process inactive debt payment
    const processInactiveDebtPayment = () => {
      const currentDeuda = selectedCliente.montoDeudaInactivo !== undefined && selectedCliente.montoDeudaInactivo > 0
        ? selectedCliente.montoDeudaInactivo
        : 150000;
      const currentPagoInicial = selectedCliente.montoPagoInicialRefinanciacion !== undefined && selectedCliente.montoPagoInicialRefinanciacion > 0
        ? selectedCliente.montoPagoInicialRefinanciacion
        : Math.round(currentDeuda * 0.10);

      const nuevoPagoInicial = Math.max(0, currentPagoInicial - montoNum);
      const nuevaDeudaInactivo = Math.max(0, currentDeuda - montoNum);

      const dummyOp: Operacion = {
        id: `OP-INACTIVO-${selectedCliente.id}`,
        idCliente: selectedCliente.id,
        nombreCliente: `${selectedCliente.nombre} ${selectedCliente.apellido || ''}`.trim(),
        fechaOtorgamiento: effectiveFechaPago,
        capitalEntregado: currentDeuda,
        promocionAplicada: '',
        descuentoPorcentaje: 0,
        totalFinanciado: currentDeuda,
        totalPendiente: nuevaDeudaInactivo,
        capitalPendiente: nuevaDeudaInactivo,
        capitalRecuperado: montoNum,
        interesCobrado: 0,
        cantidadCuotas: 1,
        cuotasPagadas: 1,
        cuotasPendientes: 0,
        valorCuota: currentPagoInicial,
        frecuencia: 'DIARIA',
        estado: 'REFINANCIADA',
        tipoOperacion: 'REFINANCIACION',
        descripcion: 'Refinanciación Cliente Inactivo',
        primerVencimiento: effectiveFechaPago,
        ultimoVencimiento: effectiveFechaPago,
        proximoVencimiento: effectiveFechaPago,
        ultimoPago: effectiveFechaPago,
        captador: selectedCliente.captador || 'Sistema',
        analista: selectedCliente.analista || 'Sistema',
        ejecutivoAtencion: 'Sistema',
        cobrador: selectedCliente.cobradorAsignadoNombre || 'Administración',
        diasMora: 0,
        nivelMora: 'Normal',
        numeroCredito: 1,
        mesesFinanciados: 1,
        elegibleRenovacion: false,
        elegibleAmpliacion: false,
        fechaFinalizacion: effectiveFechaPago,
        motivoCierre: '',
        observaciones: 'Cliente Inactivo',
        cuotasGeneradas: true
      };

      const nuevoPago: Pago = {
        id: newPagoId,
        idOperacion: dummyOp.id,
        idCliente: selectedCliente.id,
        nombreCliente: `${selectedCliente.nombre} ${selectedCliente.apellido || ''}`.trim(),
        fechaPago: effectiveFechaPago,
        importe: montoNum,
        metodoPago,
        cobrador: assignedStaffName,
        modalidad: 'REFINANCIACION',
        observaciones: `[${canalCobro}] Pago Cliente Inactivo / Refinanciación - ${observacionesPago}`.trim(),
      };

      const tesoreriaTrx: TransaccionTesoreria = {
        id: `TRX-${String(Date.now())}`,
        fecha: effectiveFechaPago,
        tipo: 'INGRESO',
        concepto: `Cobro Inactivo / Refinanciación Admin [${canalCobro}] - ${selectedCliente.nombre}`,
        monto: montoNum,
        referenciaId: newPagoId,
      };

      const updatedCli: Cliente = {
        ...selectedCliente,
        montoDeudaInactivo: nuevaDeudaInactivo,
        montoPagoInicialRefinanciacion: nuevoPagoInicial,
        estado: nuevaDeudaInactivo === 0 ? 'ACTIVO' : selectedCliente.estado
      };

      onAddPago(nuevoPago, [], dummyOp, tesoreriaTrx);
      if (onUpdateCliente) onUpdateCliente(updatedCli);

      setIsPagoModalOpen(false);
      alert(`✅ Pago de $${montoNum.toLocaleString('es-AR')} para cliente inactivo registrado correctamente.\n• Pago Inicial Refinanciación Restante: $${nuevoPagoInicial.toLocaleString('es-AR')}\n• Deuda Total Restante: $${nuevaDeudaInactivo.toLocaleString('es-AR')}`);
    };

    if (selectedOperacionId === 'DEUDA_INACTIVO' || !operaciones.find(o => o.id === selectedOperacionId)) {
      processInactiveDebtPayment();
      return;
    }

    const targetOp = operaciones.find(o => o.id === selectedOperacionId)!;

    let opCuotas = cuotas.filter(cu => cu.idOperacion === targetOp.id);
    if (opCuotas.length === 0) {
      opCuotas = generarPlanCuotas(targetOp, []);
    }

    const pendingOpCuotas = opCuotas.filter(cu => cu.estado !== 'PAGADA');
    const sortedPending = sortCuotasByPaymentPriority(
      pendingOpCuotas, 
      effectiveFechaPago,
      imputacionEstrategia === 'FINAL_ATRAS' ? 'PAGO_ADELANTADO_OPCION_B' : undefined
    );

    if (sortedPending.length === 0 && tipoPago !== 'ADELANTADO') {
      if (selectedCliente.estado === 'INACTIVO' || (selectedCliente.montoDeudaInactivo !== undefined && selectedCliente.montoDeudaInactivo > 0)) {
        processInactiveDebtPayment();
        return;
      }
      alert('No hay cuotas pendientes para esta operación.');
      return;
    }

    const nuevoPago: Pago = {
      id: newPagoId,
      idOperacion: targetOp.id,
      idCliente: selectedCliente.id,
      nombreCliente: `${selectedCliente.nombre} ${selectedCliente.apellido || ''}`.trim(),
      fechaPago: effectiveFechaPago,
      importe: montoNum,
      metodoPago,
      cobrador: assignedStaffName,
      observaciones: `[${canalCobro}] ${observacionesPago}`.trim(),
    };

    let remainingMonto = montoNum;
    const updatedCuotasList: Cuota[] = [];
    const mutableCuotasMap = new Map(opCuotas.map(c => [c.id, { ...c }]));

    const cuotasPriorizadas = sortCuotasByPaymentPriority(
      opCuotas.filter(c => c.estado !== 'PAGADA'),
      effectiveFechaPago,
      imputacionEstrategia === 'FINAL_ATRAS' ? 'PAGO_ADELANTADO_OPCION_B' : undefined
    );

    for (const prio of cuotasPriorizadas) {
      if (remainingMonto <= 0) break;
      const c = mutableCuotasMap.get(prio.id);
      if (!c || c.estado === 'PAGADA') continue;

      const saldoActual = c.saldoPendiente > 0 ? c.saldoPendiente : c.valorTotalCuota;
      if (remainingMonto >= saldoActual) {
        remainingMonto -= saldoActual;
        c.estado = 'PAGADA';
        c.importePagado = (c.importePagado || 0) + saldoActual;
        c.saldoPendiente = 0;
        c.fechaPago = effectiveFechaPago;
        c.diasAtraso = effectiveFechaPago <= c.fechaVencimiento ? 0 : Math.max(0, Math.floor((new Date(effectiveFechaPago).getTime() - new Date(c.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24)));
        updatedCuotasList.push(c);
      } else {
        c.estado = 'PAGO_PARCIAL';
        c.importePagado = (c.importePagado || 0) + remainingMonto;
        c.saldoPendiente = saldoActual - remainingMonto;
        c.fechaPago = effectiveFechaPago;
        remainingMonto = 0;
        updatedCuotasList.push(c);
      }
    }

    const allMutableCuotas = Array.from(mutableCuotasMap.values());
    const newCuotasPagadas = allMutableCuotas.filter(c => c.estado === 'PAGADA').length;
    const isFullyPaid = newCuotasPagadas >= targetOp.cantidadCuotas;

    const updatedOperacion: Operacion = {
      ...targetOp,
      cuotasPagadas: newCuotasPagadas,
      ultimoPago: effectiveFechaPago,
      estado: isFullyPaid ? 'FINALIZADA' : targetOp.estado,
      capitalRecuperado: (targetOp.capitalRecuperado || 0) + (montoNum * 0.7),
      interesCobrado: (targetOp.interesCobrado || 0) + (montoNum * 0.3),
    };

    const tesoreriaTrx: TransaccionTesoreria = {
      id: `TRX-${String(Date.now())}`,
      fecha: effectiveFechaPago,
      tipo: 'INGRESO',
      concepto: `Cobro Extraordinario Admin [${canalCobro}] - ${selectedCliente.nombre} (Crédito ${targetOp.id})`,
      monto: montoNum,
      referenciaId: newPagoId,
    };

    onAddPago(nuevoPago, updatedCuotasList, updatedOperacion, tesoreriaTrx);

    if (selectedCliente.estado === 'INACTIVO' || (selectedCliente.montoDeudaInactivo && selectedCliente.montoDeudaInactivo > 0)) {
      const currentDeuda = selectedCliente.montoDeudaInactivo ?? 150000;
      const currentPagoInicial = selectedCliente.montoPagoInicialRefinanciacion ?? Math.round(currentDeuda * 0.10);

      const nuevoPagoInicial = Math.max(0, currentPagoInicial - montoNum);
      const nuevaDeudaInactivo = Math.max(0, currentDeuda - montoNum);

      const updatedCli: Cliente = {
        ...selectedCliente,
        montoDeudaInactivo: nuevaDeudaInactivo,
        montoPagoInicialRefinanciacion: nuevoPagoInicial,
        estado: nuevaDeudaInactivo === 0 ? 'ACTIVO' : selectedCliente.estado,
      };
      if (onUpdateCliente) onUpdateCliente(updatedCli);
    }

    if (selectedCompromisoId && onUpdateCompromisoPago) {
      const targetComp = (compromisosPago || []).find(c => c.id === selectedCompromisoId);
      if (targetComp) {
        onUpdateCompromisoPago({
          ...targetComp,
          estado: 'REALIZADO',
          fechaRealizado: effectiveFechaPago,
          pagoIdRelacionado: newPagoId
        });
      }
    }

    setIsPagoModalOpen(false);
    alert(`✅ Pago extraordinario de $${montoNum.toLocaleString('es-AR')} registrado con éxito.`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      
      {/* HEADER BAR */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 p-5 rounded-2xl border-2 border-emerald-600/60 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded uppercase tracking-wider">
              Exclusivo Administrador
            </span>
            <span className="text-slate-400 text-xs font-semibold">| Consola de Cobro & Fichas</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            Gestión Administración de Cobros
          </h1>
          <p className="text-xs text-slate-300 font-medium max-w-2xl">
            Herramienta centralizada para inspeccionar la ficha completa de clientes, verificar historial de créditos, exportar comprobantes en PDF e ingresar cobros extraordinarios imputando el canal y cobrador correspondiente.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-800/80 text-right">
            <span className="text-[10px] font-black text-emerald-300 uppercase block">Total Clientes Activos</span>
            <span className="text-xl font-black text-white">{clientes.filter(c => c.estado === 'ACTIVO').length}</span>
          </div>
          <div className="bg-slate-950/80 p-3 rounded-xl border border-amber-800/80 text-right">
            <span className="text-[10px] font-black text-amber-300 uppercase block">Total Inactivos</span>
            <span className="text-xl font-black text-white">{clientes.filter(c => c.estado === 'INACTIVO').length}</span>
          </div>
        </div>
      </div>

      {/* ESTADO DE COBRANZA EN ADMINISTRACIÓN — Dynamic Cards Filter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-emerald-400" />
            <span>Estado de Cobranza (Según Configuración Existente)</span>
          </h2>
          {filterStage !== 'TODOS' && (
            <button
              onClick={() => setFilterStage('TODOS')}
              className="text-[10px] text-amber-400 hover:underline font-bold"
            >
              Ver Todos los Estados
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card 1: GESTIÓN DIARIA */}
          <button
            onClick={() => setFilterStage(filterStage === 'DIARIA' ? 'TODOS' : 'DIARIA')}
            className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex items-center justify-between ${
              filterStage === 'DIARIA'
                ? 'bg-emerald-950/90 border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg'
                : 'bg-slate-900 border-slate-800 hover:border-emerald-600/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                🟢
              </div>
              <div>
                <span className="text-xs font-black text-white block">GESTIÓN DIARIA</span>
                <span className="text-[10px] text-emerald-300 font-medium">Clientes al día / cobro regular</span>
              </div>
            </div>
            <span className="text-lg font-black text-emerald-300 bg-slate-950 px-2.5 py-1 rounded-xl border border-emerald-800">
              {stageCounts.diaria}
            </span>
          </button>

          {/* Card 2: GESTIÓN TELEFÓNICA */}
          <button
            onClick={() => setFilterStage(filterStage === 'TELEFONICA' ? 'TODOS' : 'TELEFONICA')}
            className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex items-center justify-between ${
              filterStage === 'TELEFONICA'
                ? 'bg-amber-950/90 border-amber-400 ring-2 ring-amber-500/40 shadow-lg'
                : 'bg-slate-900 border-slate-800 hover:border-amber-600/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                🟠
              </div>
              <div>
                <span className="text-xs font-black text-white block">GESTIÓN TELEFÓNICA</span>
                <span className="text-[10px] text-amber-300 font-medium">Clientes en mora media</span>
              </div>
            </div>
            <span className="text-lg font-black text-amber-300 bg-slate-950 px-2.5 py-1 rounded-xl border border-amber-800">
              {stageCounts.telefonica}
            </span>
          </button>

          {/* Card 3: GESTIÓN DOMICILIARIA */}
          <button
            onClick={() => setFilterStage(filterStage === 'DOMICILIARIA' ? 'TODOS' : 'DOMICILIARIA')}
            className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex items-center justify-between ${
              filterStage === 'DOMICILIARIA'
                ? 'bg-rose-950/90 border-rose-400 ring-2 ring-rose-500/40 shadow-lg'
                : 'bg-slate-900 border-slate-800 hover:border-rose-600/60'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-black">
                🔴
              </div>
              <div>
                <span className="text-xs font-black text-white block">GESTIÓN DOMICILIARIA</span>
                <span className="text-[10px] text-rose-300 font-medium">Cobrador de campo / atraso alto</span>
              </div>
            </div>
            <span className="text-lg font-black text-rose-300 bg-slate-950 px-2.5 py-1 rounded-xl border border-rose-800">
              {stageCounts.domiciliaria}
            </span>
          </button>
        </div>
      </div>

      {/* SUB-NAVEGACION MODULO ADMINISTRACION */}
      {onNavigateTab && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-2.5 rounded-2xl border border-slate-800 shadow-md">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2">Accesos Rápidos:</span>
          
          <button
            onClick={() => onNavigateTab('clientes-todos')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-emerald-900/60 text-emerald-300 hover:text-white border border-slate-700 hover:border-emerald-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>Todos los Clientes</span>
          </button>

          <button
            onClick={() => onNavigateTab('clientes-inactivos')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-rose-900/60 text-rose-300 hover:text-white border border-slate-700 hover:border-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <UserX className="w-3.5 h-3.5 text-rose-400" />
            <span>Clientes Inactivos</span>
          </button>

          <button
            onClick={() => onNavigateTab('alertas-oportunidades')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              alertasPendientesCount > 0
                ? 'bg-amber-950/90 text-amber-300 border-amber-500 hover:bg-amber-900 shadow-md animate-pulse ring-2 ring-amber-500/40'
                : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700 hover:border-amber-600'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 text-amber-400 ${alertasPendientesCount > 0 ? 'animate-bounce' : ''}`} />
            <span>ALERTAS ({alertasPendientesCount})</span>
            {alertasPendientesCount > 0 && (
              <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                ¡NUEVAS!
              </span>
            )}
          </button>

          <button
            onClick={() => onNavigateTab('nuevo-cliente')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-emerald-900/60 text-emerald-300 hover:text-white border border-slate-700 hover:border-emerald-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nuevo Cliente (Ficha)</span>
          </button>

          <button
            onClick={() => onNavigateTab('operaciones')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-teal-900/60 text-teal-300 hover:text-white border border-slate-700 hover:border-teal-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
            <span>Nuevo Crédito</span>
          </button>
        </div>
      )}

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: CLIENT LIST & SEARCH (5 COLUMNS) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Directorio de Clientes
              </h2>
              <span className="text-xs text-slate-400 font-bold">
                {filteredClientes.length} / {clientes.length}
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por Nombre, DNI, Teléfono o Cobrador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 text-white pl-9 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 text-[11px] font-bold">
              <button
                onClick={() => setFilterEstado('TODOS')}
                className={`flex-1 py-1.5 px-2 rounded-lg border transition-all ${
                  filterEstado === 'TODOS'
                    ? 'bg-emerald-600 text-white border-emerald-500 font-black'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Todos ({clientes.length})
              </button>
              <button
                onClick={() => setFilterEstado('ACTIVOS')}
                className={`flex-1 py-1.5 px-2 rounded-lg border transition-all ${
                  filterEstado === 'ACTIVOS'
                    ? 'bg-emerald-600 text-white border-emerald-500 font-black'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Activos ({clientes.filter(c => c.estado === 'ACTIVO').length})
              </button>
              <button
                onClick={() => setFilterEstado('INACTIVOS')}
                className={`flex-1 py-1.5 px-2 rounded-lg border transition-all ${
                  filterEstado === 'INACTIVOS'
                    ? 'bg-rose-600 text-white border-rose-500 font-black'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Inactivos ({clientes.filter(c => c.estado === 'INACTIVO').length})
              </button>
            </div>
          </div>

          {/* Client Cards List */}
          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredClientes.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                No se encontraron clientes con los filtros seleccionados.
              </div>
            ) : (
              filteredClientes.map(cliente => {
                const isSelected = selectedClienteId === cliente.id;
                const cOps = operaciones.filter(o => o.idCliente === cliente.id && o.estado !== 'FINALIZADA' && o.estado !== 'REFINANCIADA');
                const isInactive = cliente.estado === 'INACTIVO';
                const stage = getInstanciaCobroCliente(cliente);

                let stageBadge = '🟢 Diaria';
                if (stage === 'TELEFONICA') stageBadge = '🟠 Telefónica';
                if (stage === 'DOMICILIARIA') stageBadge = '🔴 Domiciliaria';

                return (
                  <div
                    key={cliente.id}
                    onClick={() => setSelectedClienteId(cliente.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg'
                        : 'bg-slate-900/90 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div>
                        <span className="text-xs font-extrabold text-white block leading-tight">
                          {cliente.nombre} {cliente.apellido || ''}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          DNI: {cliente.dni} {cliente.telefono ? `| Tel: ${cliente.telefono}` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-md border bg-slate-950 text-slate-300 border-slate-800">
                          {stageBadge}
                        </span>
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md border shrink-0 ${
                          isInactive
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}>
                          {cliente.estado}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="w-3 h-3 text-teal-400" />
                        <span className="truncate max-w-[180px]">{cliente.direccion || cliente.calle || 'Sin domicilio'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                        <span>{cOps.length} crédito(s)</span>
                        <ChevronRight className="w-4 h-4 text-emerald-400" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: SELECTED CLIENT FULL SHEET & ACTION CENTER (7 COLUMNS) */}
        <div className="lg:col-span-7 space-y-4">
          {!selectedCliente ? (
            <div className="p-12 text-center bg-slate-900/90 rounded-2xl border-2 border-dashed border-slate-800 space-y-3">
              <Users className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-black text-white">Seleccione un cliente de la lista</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Haga clic en cualquier cliente de la izquierda para abrir su ficha completa, inspeccionar sus créditos, descargar el plan de cuotas en PDF o registrar un cobro extraordinario.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* SELECTED CLIENT CARD HEADER */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                        ID: {selectedCliente.id}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${
                        selectedCliente.estado === 'INACTIVO'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}>
                        {selectedCliente.estado}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-white mt-1">
                      {selectedCliente.nombre} {selectedCliente.apellido || ''}
                    </h2>
                    <span className="text-xs text-slate-300 font-medium">
                      DNI: <strong className="text-white">{selectedCliente.dni}</strong> | Trabajo/Comercio: <strong className="text-slate-200">{selectedCliente.trabajo || selectedCliente.lugarTrabajo || 'N/A'}</strong>
                    </span>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleOpenCompromisoModal}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-black border border-amber-400 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Registrar Ficha de Compromiso de Pago"
                    >
                      <BookmarkCheck className="w-4 h-4 text-amber-200" />
                      <span>Compromiso de Pago</span>
                    </button>

                    <button
                      onClick={handleOpenRefinanciarModal}
                      className="px-3 py-2 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-purple-200 text-xs font-black border border-purple-500 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Refinanciar o Dividir Deuda"
                    >
                      <Divide className="w-3.5 h-3.5 text-purple-300" />
                      <span>REFINANCIAR</span>
                    </button>

                    <button
                      onClick={() => handleOpenPagoModal()}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black border border-emerald-400 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <DollarSign className="w-4 h-4 text-emerald-200" />
                      <span>Ingresar Pago</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => setClienteToDelete(selectedCliente)}
                        className="px-3 py-2 rounded-xl bg-rose-950/90 hover:bg-rose-900 text-rose-200 text-xs font-black border border-rose-700/80 shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Eliminar Cliente de la Base de Datos (Acción Exclusiva de Administrador)"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>ELIMINAR CLIENTE</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* PDF Receipts Buttons (Requirement 9) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <button
                    onClick={handleExportComprobanteDiaria}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-emerald-950/80 text-emerald-300 hover:text-white border border-emerald-800/80 flex items-center justify-between text-xs font-bold transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-emerald-400" />
                      <span>Comprobante Gestión Diaria (Completo)</span>
                    </div>
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  </button>

                  <button
                    onClick={handleExportComprobanteDomiciliaria}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/80 text-rose-300 hover:text-white border border-rose-800/80 flex items-center justify-between text-xs font-bold transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-rose-400" />
                      <span>Comprobante Gestión Domiciliaria (Campo)</span>
                    </div>
                    <Printer className="w-3.5 h-3.5 text-rose-400" />
                  </button>
                </div>

                {/* Client Sheet Tabs Navigation */}
                <div className="flex flex-wrap border-b border-slate-800 text-xs font-bold gap-4">
                  <button
                    onClick={() => setActiveTabFicha('FICHA')}
                    className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                      activeTabFicha === 'FICHA'
                        ? 'text-emerald-400 border-emerald-400 font-black'
                        : 'text-slate-400 border-transparent hover:text-slate-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Resumen Ficha</span>
                  </button>

                  <button
                    onClick={() => setActiveTabFicha('CUOTAS')}
                    className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                      activeTabFicha === 'CUOTAS'
                        ? 'text-emerald-400 border-emerald-400 font-black'
                        : 'text-slate-400 border-transparent hover:text-slate-200'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Visualización de Cuotas</span>
                  </button>

                  <button
                    onClick={() => setActiveTabFicha('HISTORIAL')}
                    className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                      activeTabFicha === 'HISTORIAL'
                        ? 'text-emerald-400 border-emerald-400 font-black'
                        : 'text-slate-400 border-transparent hover:text-slate-200'
                    }`}
                  >
                    <History className="w-4 h-4" />
                    <span>Historial de Crédito ({clientPagos.length} pagos)</span>
                  </button>

                  <button
                    onClick={() => setActiveTabFicha('COMPROMISOS')}
                    className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                      activeTabFicha === 'COMPROMISOS'
                        ? 'text-amber-400 border-amber-400 font-black'
                        : 'text-slate-400 border-transparent hover:text-slate-200'
                    }`}
                  >
                    <BookmarkCheck className="w-4 h-4 text-amber-400" />
                    <span>Compromisos de Pago ({clientCompromisos.length})</span>
                  </button>
                </div>

                {/* TAB CONTENT 1: RESUMEN FICHA + CRONOGRAMA DE AMORTIZACIÓN */}
                {activeTabFicha === 'FICHA' && (
                  <div className="space-y-5">
                    {/* Ficha de Resumen Rápido Card */}
                    <div className="bg-[#0B4B27] text-emerald-50 p-5 rounded-2xl border border-emerald-800 shadow-lg space-y-4 relative overflow-hidden">
                      <div className="absolute right-0 top-0 opacity-10 translate-x-4 -translate-y-4 pointer-events-none">
                        <DollarSign className="w-40 h-40 text-emerald-300" />
                      </div>

                      {/* Card Header & Credit Switcher */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-3 gap-2 relative z-10">
                        <div>
                          <span className="text-[10px] font-extrabold tracking-widest text-emerald-300 uppercase block mb-0.5">
                            Ficha de Resumen Rápido
                          </span>
                          <h3 className="text-base font-extrabold text-white tracking-tight">
                            {selectedCliente.nombre} {selectedCliente.apellido || ''}
                          </h3>
                          {selectedOp && (
                            <span className="text-[11px] text-emerald-200/80 font-mono">
                              Crédito Nro: #{selectedOp.id}
                            </span>
                          )}
                        </div>

                        {/* Dropdown to switch credit if client has multiple */}
                        {allClientOperations.length > 1 && (
                          <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/10">
                            <span className="text-[10px] font-bold text-emerald-300 uppercase shrink-0">
                              Ver Crédito:
                            </span>
                            <select
                              value={selectedOperacionId || (selectedOp ? selectedOp.id : '')}
                              onChange={(e) => setSelectedOperacionId(e.target.value)}
                              className="bg-emerald-950/90 text-white font-bold text-xs px-2.5 py-1 rounded-lg border border-emerald-600 focus:outline-none cursor-pointer"
                            >
                              {allClientOperations.map((o) => (
                                <option key={o.id} value={o.id}>
                                  #{o.id} - {o.frecuencia} (${(o.totalFinanciado || o.capitalEntregado || 0).toLocaleString('es-AR')}) [{o.estado}]
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Main Grid */}
                      {selectedOp ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs relative z-10">
                          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                            <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">Estado Crédito</span>
                            <strong className="text-white font-bold uppercase">{selectedOp.estado} ({selectedOp.diasMora > 0 ? 'Mora' : 'Al Día'})</strong>
                          </div>

                          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                            <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">Valor Cuota</span>
                            <strong className="text-white font-bold">${(selectedOp.valorCuota || 0).toLocaleString('es-AR')}</strong>
                          </div>

                          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                            <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">Cuotas Totales</span>
                            <strong className="text-white font-bold font-mono">{totalCuotasCount} cuotas ({selectedOp.frecuencia?.toLowerCase() || 'diaria'})</strong>
                          </div>

                          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                            <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">Cuotas Pagadas</span>
                            <strong className="text-emerald-300 font-bold font-mono">{cuotasPagadasCount} pagadas</strong>
                          </div>

                          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 sm:col-span-2">
                            <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">Cuotas Pendientes</span>
                            <strong className="text-amber-300 font-bold font-mono">{cuotasPendientesCount} restantes</strong>
                          </div>

                          {/* 3-line debt breakdown requested by operator */}
                          <div className="bg-rose-950/70 p-3 rounded-xl border border-rose-500/40 sm:col-span-2 space-y-2">
                            <span className="text-[9px] uppercase tracking-widest text-rose-300 font-black block">
                              📊 Desglose para Estar al Día
                            </span>
                            <div className="text-[11px] space-y-1 text-slate-100 font-medium">
                              <div className="flex justify-between items-center">
                                <span className="text-rose-200">Cuotas Vencidas (Mora):</span>
                                <span className="font-mono font-bold text-white bg-rose-900/60 px-1.5 py-0.5 rounded">
                                  {countOverdue} (${sumOverdue.toLocaleString('es-AR')})
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-emerald-200">Cuota de Hoy:</span>
                                <span className="font-mono font-bold text-white bg-emerald-900/60 px-1.5 py-0.5 rounded">
                                  {countToday} (${sumToday.toLocaleString('es-AR')})
                                </span>
                              </div>
                              <div className="flex justify-between items-center border-t border-rose-500/30 pt-1.5 mt-1">
                                <span className="text-white font-extrabold uppercase text-[10px]">Monto para Estar al Día:</span>
                                <span className="font-mono font-black text-rose-300 text-xs">
                                  ${exigTotal.toLocaleString('es-AR')} ARS
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 sm:col-span-2">
                            <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">Próximo Vencimiento</span>
                            <strong className="text-white font-bold font-mono flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                              {selectedOp.proximoVencimiento || 'N/A'}
                            </strong>
                          </div>

                          {/* Domicilio del cliente con botón Google Maps */}
                          {(() => {
                            const address = getFullAddress(selectedCliente);
                            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                            return (
                              <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/50 sm:col-span-2 space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] uppercase tracking-wider text-emerald-300 font-extrabold flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                                    Domicilio del Cliente
                                  </span>
                                  <a 
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[9px] px-2 py-1 rounded transition-colors flex items-center gap-1 uppercase tracking-wider cursor-pointer"
                                  >
                                    🗺️ Google Maps
                                  </a>
                                </div>
                                <div className="text-[11px] text-white font-semibold">
                                  {address}
                                </div>
                                {selectedCliente.observaciones && (
                                  <div className="text-[10px] text-emerald-200/80 italic font-medium leading-normal border-t border-slate-800 pt-1.5">
                                    📌 {selectedCliente.observaciones}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-[11px]">
                            <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">¿Apto Renovación?</span>
                            <strong className={selectedOp.elegibleRenovacion ? "text-emerald-300 font-bold" : "text-emerald-100/50 font-medium"}>
                              {selectedOp.elegibleRenovacion ? '✅ Sí, Elegible' : '❌ No'}
                            </strong>
                          </div>

                          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10 text-[11px]">
                            <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">¿Apto Ampliación?</span>
                            <strong className={selectedOp.elegibleAmpliacion ? "text-emerald-300 font-bold" : "text-emerald-100/50 font-medium"}>
                              {selectedOp.elegibleAmpliacion ? '✅ Sí, Elegible' : '❌ No'}
                            </strong>
                          </div>
                        </div>
                      ) : (
                        /* Cliente sin operación activa (INACTIVO o PROSPECTO) */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs relative z-10">
                          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                            <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">Estado Cliente</span>
                            <strong className="text-amber-300 font-bold uppercase">{selectedCliente.estado}</strong>
                          </div>

                          <div className="bg-white/5 p-2.5 rounded-xl border border-white/10">
                            <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">Cobrador Asignado</span>
                            <strong className="text-white font-bold">{selectedCliente.cobradorAsignadoNombre || 'Sin asignar'}</strong>
                          </div>

                          {(selectedCliente.montoDeudaInactivo || 0) > 0 && (
                            <div className="bg-rose-950/70 p-3 rounded-xl border border-rose-500/40 sm:col-span-2 space-y-1">
                              <span className="text-[9px] uppercase tracking-widest text-rose-300 font-black block">
                                ⚠️ Deuda Histórica Registrada (Inactivo)
                              </span>
                              <div className="text-lg font-black text-white">
                                ${(selectedCliente.montoDeudaInactivo || 0).toLocaleString('es-AR')} ARS
                              </div>
                              <div className="text-[10px] text-rose-200">
                                Pago Inicial Sugerido para Refinanciación: <strong className="text-amber-300">${(selectedCliente.montoPagoInicialRefinanciacion || Math.round((selectedCliente.montoDeudaInactivo || 0) * 0.3)).toLocaleString('es-AR')}</strong>
                              </div>
                            </div>
                          )}

                          {/* Domicilio */}
                          {(() => {
                            const address = getFullAddress(selectedCliente);
                            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
                            return (
                              <div className="bg-slate-900/50 p-2.5 rounded-xl border border-slate-700/50 sm:col-span-2 space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-[9px] uppercase tracking-wider text-emerald-300 font-extrabold flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                                    Domicilio del Cliente
                                  </span>
                                  <a 
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[9px] px-2 py-1 rounded transition-colors flex items-center gap-1 uppercase tracking-wider cursor-pointer"
                                  >
                                    🗺️ Google Maps
                                  </a>
                                </div>
                                <div className="text-[11px] text-white font-semibold">
                                  {address}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Integrated Amortization Cronograma Table for Selected Op */}
                    {selectedOp && (
                      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                          <h4 className="text-xs font-black uppercase text-emerald-400 flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-emerald-400" />
                            <span>Cronograma Detallado de Cuotas (#{selectedOp.id})</span>
                          </h4>
                          <span className="text-[10px] font-mono font-semibold text-slate-400">
                            {clientCuotas.filter(c => c.idOperacion === selectedOp.id).length} Cuotas Totales
                          </span>
                        </div>

                        <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                          <table className="w-full text-left text-xs text-slate-300 border-collapse">
                            <thead className="bg-slate-900 text-[10px] uppercase font-black text-emerald-400 sticky top-0 border-b border-slate-800">
                              <tr>
                                <th className="p-2.5">N° Cuota</th>
                                <th className="p-2.5">Vencimiento</th>
                                <th className="p-2.5 text-right">Valor Cuota</th>
                                <th className="p-2.5 text-right">Abonado</th>
                                <th className="p-2.5 text-right">Saldo</th>
                                <th className="p-2.5 text-center">Estado</th>
                                <th className="p-2.5 text-center">Días Mora</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-medium">
                              {clientCuotas.filter(c => c.idOperacion === selectedOp.id).map(cuo => {
                                const isPagada = cuo.estado === 'PAGADA';
                                const isMora = !isPagada && (cuo.estado === 'VENCIDA' || cuo.fechaVencimiento < todayStr);
                                const isHoy = !isPagada && cuo.fechaVencimiento === todayStr;
                                const isParcial = cuo.estado === 'PAGO_PARCIAL';

                                let badgeClass = 'bg-amber-950 text-amber-300 border-amber-800';
                                let badgeLabel = '⚪ PENDIENTE';

                                if (isPagada) {
                                  badgeClass = 'bg-emerald-950 text-emerald-300 border-emerald-800 font-bold';
                                  badgeLabel = '🟢 PAGADA';
                                } else if (isMora) {
                                  badgeClass = 'bg-rose-950 text-rose-300 border-rose-800 font-black';
                                  badgeLabel = '🔴 EN MORA';
                                } else if (isHoy) {
                                  badgeClass = 'bg-yellow-950 text-yellow-300 border-yellow-800 font-black';
                                  badgeLabel = '🟡 VENCE HOY';
                                } else if (isParcial) {
                                  badgeClass = 'bg-cyan-950 text-cyan-300 border-cyan-800 font-bold';
                                  badgeLabel = '⚡ PARCIAL';
                                }

                                const dias = cuo.diasAtraso || (!isPagada && cuo.fechaVencimiento < todayStr ? calcularDiasAtrasoSinDomingos(cuo.fechaVencimiento, todayStr) : 0);

                                return (
                                  <tr key={cuo.id} className="hover:bg-slate-900/50">
                                    <td className="p-2.5 font-bold text-white font-mono">Cuota #{cuo.numeroCuota}</td>
                                    <td className="p-2.5 font-mono text-slate-300">{cuo.fechaVencimiento}</td>
                                    <td className="p-2.5 text-right font-mono text-white">${(cuo.valorTotalCuota || 0).toLocaleString('es-AR')}</td>
                                    <td className="p-2.5 text-right font-mono text-emerald-300">${(cuo.importePagado || 0).toLocaleString('es-AR')}</td>
                                    <td className="p-2.5 text-right font-mono text-rose-300">${(cuo.saldoPendiente || 0).toLocaleString('es-AR')}</td>
                                    <td className="p-2.5 text-center">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${badgeClass}`}>
                                        {badgeLabel}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-center font-mono text-slate-300 font-bold">
                                      {dias > 0 ? <span className="text-rose-400 font-black">{dias}d</span> : '0d'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT 2: VISUALIZACION COMPLETA DE CUOTAS */}
                {activeTabFicha === 'CUOTAS' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      <div>
                        <h4 className="text-xs font-black uppercase text-white flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-emerald-400" />
                          <span>Desglose Completo de Cuotas del Cliente</span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {selectedCliente.nombre} {selectedCliente.apellido} - Total de {clientCuotas.length} cuotas registradas
                        </p>
                      </div>

                      {selectedOp && (
                        <button
                          type="button"
                          onClick={() => exportComprobanteGestionDiariaPDF(
                            selectedCliente,
                            [selectedOp],
                            clientCuotas.filter(c => c.idOperacion === selectedOp.id),
                            pagos.filter(p => p.idCliente === selectedCliente.id),
                            compromisosPago
                          )}
                          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Imprimir PDF Plan de Cuotas</span>
                        </button>
                      )}
                    </div>

                    {clientCuotas.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs bg-slate-950 rounded-xl border border-slate-800">
                        No hay cuotas registradas para este cliente.
                      </div>
                    ) : (
                      <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden max-h-[450px] overflow-y-auto">
                        <table className="w-full text-left text-xs text-slate-300 border-collapse">
                          <thead className="bg-slate-900 text-[10px] uppercase font-black text-emerald-400 sticky top-0 border-b border-slate-800">
                            <tr>
                              <th className="p-2.5">Crédito</th>
                              <th className="p-2.5">N° Cuota</th>
                              <th className="p-2.5">Vencimiento</th>
                              <th className="p-2.5 text-right">Valor Cuota</th>
                              <th className="p-2.5 text-right">Abonado</th>
                              <th className="p-2.5 text-right">Saldo Pendiente</th>
                              <th className="p-2.5 text-center">Estado</th>
                              <th className="p-2.5 text-center">Días Atraso</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 font-medium">
                            {clientCuotas.map(cuo => {
                              const isPagada = cuo.estado === 'PAGADA';
                              const isMora = !isPagada && (cuo.estado === 'VENCIDA' || cuo.fechaVencimiento < todayStr);
                              const isHoy = !isPagada && cuo.fechaVencimiento === todayStr;
                              const isParcial = cuo.estado === 'PAGO_PARCIAL';

                              let badge = 'bg-amber-950 text-amber-300 border-amber-800';
                              let badgeTxt = '⚪ PENDIENTE';

                              if (isPagada) {
                                badge = 'bg-emerald-950 text-emerald-300 border-emerald-800 font-bold';
                                badgeTxt = '🟢 PAGADA';
                              } else if (isMora) {
                                badge = 'bg-rose-950 text-rose-300 border-rose-800 font-black';
                                badgeTxt = '🔴 EN MORA';
                              } else if (isHoy) {
                                badge = 'bg-yellow-950 text-yellow-300 border-yellow-800 font-black';
                                badgeTxt = '🟡 VENCE HOY';
                              } else if (isParcial) {
                                badge = 'bg-cyan-950 text-cyan-300 border-cyan-800 font-bold';
                                badgeTxt = '⚡ PARCIAL';
                              }

                              const dias = cuo.diasAtraso || (!isPagada && cuo.fechaVencimiento < todayStr ? calcularDiasAtrasoSinDomingos(cuo.fechaVencimiento, todayStr) : 0);

                              return (
                                <tr key={cuo.id} className="hover:bg-slate-900/50">
                                  <td className="p-2.5 font-bold text-white font-mono">{cuo.idOperacion}</td>
                                  <td className="p-2.5 font-bold text-slate-200">Cuota #{cuo.numeroCuota}</td>
                                  <td className="p-2.5 font-mono text-slate-300">{cuo.fechaVencimiento}</td>
                                  <td className="p-2.5 text-right font-mono text-white">${(cuo.valorTotalCuota || 0).toLocaleString('es-AR')}</td>
                                  <td className="p-2.5 text-right font-mono text-emerald-300">${(cuo.importePagado || 0).toLocaleString('es-AR')}</td>
                                  <td className="p-2.5 text-right font-mono text-rose-300">${(cuo.saldoPendiente || 0).toLocaleString('es-AR')}</td>
                                  <td className="p-2.5 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${badge}`}>
                                      {badgeTxt}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center font-mono font-bold">
                                    {dias > 0 ? <span className="text-rose-400 font-black">{dias}d</span> : <span className="text-slate-500">0d</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB CONTENT 3: AUDITORÍA E HISTORIAL COMPLETO DE PAGOS (Exact model from PagosView) */}
                {activeTabFicha === 'HISTORIAL' && (
                  <div className="space-y-5">
                    {/* Stats summary cards matching PagosView */}
                    {(() => {
                      const totalHistPagos = clientPagos.reduce((acc, p) => acc + (p.importe || 0), 0);
                      const modBPagos = clientPagos.filter(p => (p as any).modalidadImputada === 'B_PAGO_ATRASO' || (p as any).modalidadImputada === 'MODALIDAD_B').reduce((acc, p) => acc + (p.importe || 0), 0);
                      const modAPagos = totalHistPagos - modBPagos;

                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="bg-emerald-950/80 p-3.5 rounded-2xl border border-emerald-800 shadow-sm">
                            <span className="text-[10px] font-extrabold uppercase text-emerald-400 block tracking-wider">Total Pagos Registrados</span>
                            <div className="text-lg font-black text-white font-mono mt-0.5">
                              ${totalHistPagos.toLocaleString('es-AR')} ARS
                            </div>
                            <span className="text-[10px] text-emerald-300/80 mt-1 block">
                              {clientPagos.length} transacciones procesadas
                            </span>
                          </div>

                          <div className="bg-emerald-950/80 p-3.5 rounded-2xl border border-emerald-800 shadow-sm">
                            <span className="text-[10px] font-extrabold uppercase text-emerald-400 block tracking-wider">Imputación Modalidad A (Consecutiva)</span>
                            <div className="text-lg font-black text-emerald-300 font-mono mt-0.5">
                              ${modAPagos.toLocaleString('es-AR')} ARS
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              Abonos a cuota actual / ordinaria
                            </span>
                          </div>

                          <div className="bg-amber-950/60 p-3.5 rounded-2xl border border-amber-800 shadow-sm">
                            <span className="text-[10px] font-extrabold uppercase text-amber-400 block tracking-wider">Imputación Modalidad B (Atraso/Atrás)</span>
                            <div className="text-lg font-black text-amber-300 font-mono mt-0.5">
                              ${modBPagos.toLocaleString('es-AR')} ARS
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              Abonos a última cuota o mora previa
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Filter and Search Bar for Historial */}
                    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Buscar por ID Pago, Operación o Cobrador..."
                          value={pagoSearchTerm}
                          onChange={(e) => setPagoSearchTerm(e.target.value)}
                          className="w-full bg-slate-900 text-white pl-9 pr-3 py-1.5 rounded-xl border border-slate-700 text-xs focus:outline-none focus:border-emerald-500 font-medium"
                        />
                      </div>

                      <div className="flex gap-2">
                        <select
                          value={pagoFilterModalidad}
                          onChange={(e) => setPagoFilterModalidad(e.target.value)}
                          className="bg-slate-900 text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-700 focus:outline-none cursor-pointer"
                        >
                          <option value="TODOS">Todas las Modalidades</option>
                          <option value="A_CONSECUTIVO">Modalidad A (Consecutivo)</option>
                          <option value="B_ATRAS">Modalidad B (Atraso/Atrás)</option>
                        </select>

                        <select
                          value={pagoFilterMetodo}
                          onChange={(e) => setPagoFilterMetodo(e.target.value)}
                          className="bg-slate-900 text-slate-200 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-700 focus:outline-none cursor-pointer"
                        >
                          <option value="TODOS">Todos los Medios</option>
                          <option value="EFECTIVO">Efectivo</option>
                          <option value="TRANSFERENCIA">Transferencia</option>
                          <option value="DEPOSITO">Depósito</option>
                        </select>
                      </div>
                    </div>

                    {/* Detailed Payments Table */}
                    {(() => {
                      const filteredPagos = clientPagos.filter(p => {
                        const matchesSearch = !pagoSearchTerm || 
                          p.id.toLowerCase().includes(pagoSearchTerm.toLowerCase()) ||
                          p.idOperacion.toLowerCase().includes(pagoSearchTerm.toLowerCase()) ||
                          (p.cobrador && p.cobrador.toLowerCase().includes(pagoSearchTerm.toLowerCase()));
                        
                        const matchesMetodo = pagoFilterMetodo === 'TODOS' || p.metodoPago === pagoFilterMetodo;
                        const modVal = (p as any).modalidadImputada;
                        const matchesModalidad = pagoFilterModalidad === 'TODOS' || 
                          (pagoFilterModalidad === 'B_ATRAS' && (modVal === 'B_PAGO_ATRASO' || modVal === 'MODALIDAD_B')) ||
                          (pagoFilterModalidad === 'A_CONSECUTIVO' && modVal !== 'B_PAGO_ATRASO' && modVal !== 'MODALIDAD_B');

                        return matchesSearch && matchesMetodo && matchesModalidad;
                      });

                      if (filteredPagos.length === 0) {
                        return (
                          <div className="p-8 text-center text-slate-400 text-xs bg-slate-950 rounded-2xl border border-slate-800">
                            No se encontraron registros de pago en este historial.
                          </div>
                        );
                      }

                      return (
                        <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-lg max-h-[420px] overflow-y-auto">
                          <table className="w-full text-left text-xs text-slate-300 border-collapse">
                            <thead className="bg-slate-900 text-[10px] uppercase font-black text-emerald-400 sticky top-0 border-b border-slate-800">
                              <tr>
                                <th className="p-3">ID Pago / Hora</th>
                                <th className="p-3">Crédito N°</th>
                                <th className="p-3 text-right">Importe Cobrado</th>
                                <th className="p-3">Medio de Pago</th>
                                <th className="p-3">Modalidad Imputada</th>
                                <th className="p-3">Cuotas Impactadas</th>
                                <th className="p-3">Cobrador / Registrado por</th>
                                <th className="p-3 text-center">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-medium">
                              {filteredPagos.map(pago => {
                                const opCuotas = cuotas.filter(c => c.idOperacion === pago.idOperacion);
                                const cuotasCubiertas = opCuotas.filter(c => c.fechaPago === pago.fechaPago || (c.importePagado && c.importePagado > 0));
                                const op = operaciones.find(o => o.id === pago.idOperacion);
                                const isModB = (pago as any).modalidadImputada === 'B_PAGO_ATRASO' || (pago as any).modalidadImputada === 'MODALIDAD_B';

                                return (
                                  <tr key={pago.id} className="hover:bg-slate-900/50 transition-colors">
                                    <td className="p-3">
                                      <span className="font-bold text-white block">#{pago.id}</span>
                                      <span className="text-[10px] text-emerald-400 font-mono font-bold">[{pago.fechaPago}]</span>
                                    </td>
                                    <td className="p-3 font-mono font-bold text-slate-200">
                                      {pago.idOperacion}
                                    </td>
                                    <td className="p-3 text-right font-mono font-black text-emerald-300 text-sm">
                                      ${pago.importe.toLocaleString('es-AR')}
                                    </td>
                                    <td className="p-3">
                                      <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-200 border border-slate-700 text-[10px] font-bold">
                                        {pago.metodoPago}
                                      </span>
                                    </td>
                                    <td className="p-3">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                                        isModB 
                                          ? 'bg-amber-950 text-amber-300 border-amber-800' 
                                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                      }`}>
                                        {isModB ? 'Modalidad B (Atraso)' : 'Modalidad A (Consecutivo)'}
                                      </span>
                                    </td>
                                    <td className="p-3">
                                      <div className="flex flex-wrap gap-1">
                                        {cuotasCubiertas.length > 0 ? (
                                          cuotasCubiertas.map(cu => (
                                            <span key={cu.id} className="bg-slate-900 border border-slate-700 text-slate-200 px-1.5 py-0.5 rounded text-[9px] font-mono">
                                              Cuota #{cu.numeroCuota}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-slate-500 italic text-[10px]">Abono general al saldo</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-3 text-slate-300 font-semibold">
                                      {pago.cobrador || 'Oficina Administración'}
                                    </td>
                                    <td className="p-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => exportComprobanteGestionDiariaPDF(
                                          selectedCliente,
                                          operaciones.filter(o => o.idCliente === selectedCliente.id),
                                          cuotas,
                                          [pago],
                                          compromisosPago
                                        )}
                                        className="p-1.5 bg-slate-900 hover:bg-emerald-900 text-emerald-400 hover:text-emerald-200 rounded-lg transition-colors border border-slate-700 hover:border-emerald-600 flex items-center justify-center gap-1 mx-auto cursor-pointer"
                                        title="Imprimir Comprobante PDF"
                                      >
                                        <Printer className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-bold">PDF</span>
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* TAB CONTENT 4: COMPROMISOS DE PAGO */}
                {activeTabFicha === 'COMPROMISOS' && (
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          <BookmarkCheck className="w-4 h-4 text-amber-400" />
                          <span>Ficha de Compromisos de Pago</span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Registro formal de acuerdos de pago diferido ({clientCompromisos.length} totales)
                        </p>
                      </div>

                      <button
                        onClick={handleOpenCompromisoModal}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-black border border-amber-400 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-amber-200" />
                        <span>Nuevo Compromiso</span>
                      </button>
                    </div>

                    {/* Filter Buttons */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {(['TODOS', 'PENDIENTE', 'REALIZADO', 'EN MORA', 'CANCELADO'] as const).map(st => {
                        const count = st === 'TODOS'
                          ? clientCompromisos.length
                          : clientCompromisos.filter(c => c.estado === st).length;
                        return (
                          <button
                            key={st}
                            onClick={() => setCompFilterEstado(st)}
                            className={`px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer text-[11px] ${
                              compFilterEstado === st
                                ? 'bg-amber-950 text-amber-200 border-amber-600 font-black'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                            }`}
                          >
                            {st} ({count})
                          </button>
                        );
                      })}
                    </div>

                    {/* Compromisos List */}
                    {clientCompromisos.filter(c => compFilterEstado === 'TODOS' || c.estado === compFilterEstado).length === 0 ? (
                      <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-400 text-xs space-y-2">
                        <BookmarkCheck className="w-8 h-8 text-slate-600 mx-auto" />
                        <p className="font-bold text-white">No hay compromisos de pago en esta categoría.</p>
                        <p className="text-[11px]">Haga clic en "Nuevo Compromiso" para registrar un acuerdo de pago diferido.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                        {clientCompromisos
                          .filter(c => compFilterEstado === 'TODOS' || c.estado === compFilterEstado)
                          .map(comp => {
                            const isPendingOrMora = comp.estado === 'PENDIENTE' || comp.estado === 'EN MORA';
                            return (
                              <div
                                key={comp.id}
                                className={`p-4 rounded-xl border transition-all space-y-3 ${
                                  comp.estado === 'REALIZADO'
                                    ? 'bg-emerald-950/20 border-emerald-800/80'
                                    : comp.estado === 'EN MORA'
                                    ? 'bg-rose-950/20 border-rose-800/80'
                                    : comp.estado === 'CANCELADO'
                                    ? 'bg-slate-950 border-slate-800 opacity-60'
                                    : 'bg-slate-950 border-amber-800/60'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black text-white text-xs font-mono">#{comp.id}</span>
                                    
                                    {/* Finalidad Badge */}
                                    <span className="bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-black px-2 py-0.5 rounded">
                                      {comp.finalidad}
                                    </span>

                                    {/* Mesa Badge */}
                                    <span className="bg-slate-900 text-slate-300 border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                                      {comp.mesaGestion}
                                    </span>
                                  </div>

                                  {/* Estado Badge */}
                                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                                    comp.estado === 'REALIZADO'
                                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                      : comp.estado === 'EN MORA'
                                      ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                                      : comp.estado === 'CANCELADO'
                                      ? 'bg-slate-900 text-slate-400 border-slate-700'
                                      : 'bg-amber-950 text-amber-300 border-amber-700'
                                  }`}>
                                    {comp.estado}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                  <div>
                                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Fecha Acordada:</span>
                                    <strong className="text-white font-mono text-sm">{comp.fechaCompromiso}</strong>
                                  </div>

                                  <div>
                                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Monto Comprometido:</span>
                                    <strong className="text-amber-300 font-mono text-sm">${comp.montoComprometido.toLocaleString('es-AR')}</strong>
                                  </div>

                                  <div>
                                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Registrado Por:</span>
                                    <span className="text-slate-200 font-medium">{comp.usuarioRegistro}</span>
                                  </div>

                                  <div>
                                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Fecha y Hora:</span>
                                    <span className="text-slate-400 text-[10px]">{new Date(comp.fechaHoraRegistro).toLocaleDateString('es-AR')}</span>
                                  </div>
                                </div>

                                {comp.observaciones && (
                                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 text-[11px] text-slate-300 italic">
                                    Obs: "{comp.observaciones}"
                                  </div>
                                )}

                                {comp.estado === 'REALIZADO' && (
                                  <div className="bg-emerald-950/60 p-2 rounded-lg border border-emerald-800/80 text-[11px] text-emerald-300 flex items-center justify-between font-bold">
                                    <span>✅ Cumplido mediante Pago Real</span>
                                    {comp.fechaRealizado && <span>Fecha Pago: {comp.fechaRealizado}</span>}
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/60">
                                  {isPendingOrMora && (
                                    <>
                                      <button
                                        onClick={() => handleOpenPagoModalWithCompromiso(comp)}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                                      >
                                        <DollarSign className="w-3.5 h-3.5" />
                                        <span>Cobrar (Registrar Pago Real)</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          if (confirm(`¿Marcar como CANCELADO el compromiso #${comp.id}?`)) {
                                            if (onUpdateCompromisoPago) {
                                              onUpdateCompromisoPago({ ...comp, estado: 'CANCELADO' });
                                            }
                                          }
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-rose-300 hover:text-rose-200 border border-slate-800 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>Cancelar</span>
                                      </button>
                                    </>
                                  )}

                                  <button
                                    onClick={() => setSelectedCompromisoDetail(comp)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1 border border-slate-800 transition-all cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Ver Detalle</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

              </div>

            </div>
          )}
        </div>

      </div>

      {/* PAYMENT MODAL (REGISTRAR COBRO EXTRAORDINARIO ADMINISTRACIÓN) */}
      {isPagoModalOpen && selectedCliente && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Gestión Extraordinaria
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  Ingresar Cobro — {selectedCliente.nombre}
                </h3>
              </div>

              <button
                onClick={() => setIsPagoModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPago} className="space-y-4 text-xs">
              
              {/* Link Commitment if any */}
              {clientCompromisos.some(c => c.estado === 'PENDIENTE' || c.estado === 'EN MORA') && (
                <div className="space-y-1 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/80">
                  <label className="font-extrabold text-amber-300 block flex items-center gap-1.5">
                    <BookmarkCheck className="w-4 h-4 text-amber-400" />
                    Vincular a Compromiso de Pago Pendiente:
                  </label>
                  <select
                    value={selectedCompromisoId}
                    onChange={(e) => {
                      const compId = e.target.value;
                      setSelectedCompromisoId(compId);
                      if (compId) {
                        const targetComp = clientCompromisos.find(c => c.id === compId);
                        if (targetComp) {
                          setMontoIngresado(String(targetComp.montoComprometido));
                          if (targetComp.idOperacion) {
                            setSelectedOperacionId(targetComp.idOperacion);
                          }
                          setObservacionesPago(`Cumplimiento de Compromiso #${targetComp.id} (${targetComp.finalidad} - ${targetComp.mesaGestion})`);
                        }
                      }
                    }}
                    className="w-full bg-slate-950 text-amber-200 font-bold p-2 rounded-lg border border-amber-700/80 text-xs"
                  >
                    <option value="">-- Ninguno (Pago Regular) --</option>
                    {clientCompromisos
                      .filter(c => c.estado === 'PENDIENTE' || c.estado === 'EN MORA')
                      .map(comp => (
                        <option key={comp.id} value={comp.id}>
                          #{comp.id} | Fecha: {comp.fechaCompromiso} | Monto: ${comp.montoComprometido.toLocaleString('es-AR')} | {comp.finalidad} ({comp.estado})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Select Operation */}
              <div className="space-y-1">
                <label className="font-extrabold text-slate-300 block">Seleccionar Crédito Afectado:</label>
                <select
                  value={selectedOperacionId}
                  onChange={(e) => {
                    setSelectedOperacionId(e.target.value);
                    if (e.target.value === 'DEUDA_INACTIVO') {
                      const currentDeuda = selectedCliente.montoDeudaInactivo ?? 150000;
                      const currentPagoInicial = selectedCliente.montoPagoInicialRefinanciacion ?? Math.round(currentDeuda * 0.10);
                      setMontoIngresado(String(currentPagoInicial));
                    } else {
                      const targetOpCuotas = clientCuotas.filter(cu => cu.idOperacion === e.target.value && cu.estado !== 'PAGADA');
                      const priorityCuotas = sortCuotasByPaymentPriority(targetOpCuotas, todayStr);
                      if (priorityCuotas.length > 0) {
                        setMontoIngresado(String(priorityCuotas[0].saldoPendiente || priorityCuotas[0].valorTotalCuota || 0));
                      }
                    }
                  }}
                  className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  {clientOperations.map(op => (
                    <option key={op.id} value={op.id}>
                      Crédito N° {op.id} | Otorgado: {op.fechaOtorgamiento} | Frecuencia: {op.frecuencia}
                    </option>
                  ))}
                  {(clientOperations.length === 0 || selectedCliente.estado === 'INACTIVO' || (selectedCliente.montoDeudaInactivo && selectedCliente.montoDeudaInactivo > 0)) && (
                    <option value="DEUDA_INACTIVO">
                      ⚡ Deuda Inactiva / Pago Inicial Refinanciación (Sin crédito activo)
                    </option>
                  )}
                </select>
              </div>

              {/* Payment Mode */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTipoPago('REGULAR')}
                  className={`py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                    tipoPago === 'REGULAR'
                      ? 'bg-emerald-600 text-white border-emerald-400 font-black'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Cuota Regular
                </button>

                <button
                  type="button"
                  onClick={() => setTipoPago('PARCIAL')}
                  className={`py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                    tipoPago === 'PARCIAL'
                      ? 'bg-amber-600 text-white border-amber-400 font-black'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Pago Parcial
                </button>

                <button
                  type="button"
                  onClick={() => setTipoPago('ADELANTADO')}
                  className={`py-2 px-2 rounded-xl font-bold border transition-all text-center ${
                    tipoPago === 'ADELANTADO'
                      ? 'bg-teal-600 text-white border-teal-400 font-black'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Pago Adelantado
                </button>
              </div>

              {/* Imputation Strategy Selector (Requirement 8) */}
              <div className="space-y-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <label className="font-extrabold text-amber-300 block">Estrategia de Imputación de Pago:</label>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setImputacionEstrategia('CONSECUTIVO')}
                    className={`p-2 rounded-lg border font-bold text-center transition-all ${
                      imputacionEstrategia === 'CONSECUTIVO'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    1. Aplicar a cuota correspondiente y consecutivas
                  </button>

                  <button
                    type="button"
                    onClick={() => setImputacionEstrategia('FINAL_ATRAS')}
                    className={`p-2 rounded-lg border font-bold text-center transition-all ${
                      imputacionEstrategia === 'FINAL_ATRAS'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    2. Aplicar desde el final hacia atrás
                  </button>
                </div>
              </div>

              {/* Date, Amount & Method */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-extrabold text-teal-300 block">Fecha Real del Cobro:</label>
                  <input
                    type="date"
                    value={fechaPagoInput}
                    onChange={(e) => setFechaPagoInput(e.target.value)}
                    className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-teal-500 focus:outline-none focus:border-teal-400"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-emerald-300 block">Importe A Cobrar ($):</label>
                  <input
                    type="number"
                    step="any"
                    value={montoIngresado}
                    onChange={(e) => setMontoIngresado(e.target.value)}
                    placeholder="Ej: 5000"
                    className="w-full bg-slate-950 text-yellow-300 font-black text-base p-2.5 rounded-xl border border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-300 block">Medio de Pago:</label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value as any)}
                    className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-slate-700 focus:outline-none"
                  >
                    <option value="EFECTIVO">EFECTIVO</option>
                    <option value="TRANSFERENCIA">TRANSFERENCIA BANCARIA / CPT</option>
                    <option value="DEPOSITO">DEPÓSITO EN CUENTA</option>
                  </select>
                </div>
              </div>

              {/* Live Preview of Payment Allocation Impact */}
              {previewImpacto && previewImpacto.length > 0 && (
                <div className="bg-slate-950 p-3 rounded-xl border border-emerald-500/40 space-y-2">
                  <div className="text-xs font-black text-emerald-400 flex items-center justify-between">
                    <span>Impacto Estimado en Fecha Seleccionada ({fechaPagoInput || todayStr}):</span>
                    <span className="text-[10px] text-slate-400 font-normal">Cuota de fecha → Moras recientes hacia atrás</span>
                  </div>
                  <div className="space-y-1">
                    {previewImpacto.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                        <span className="font-bold text-white">
                          Cuota N° {item.num} <span className="text-slate-400 font-normal">({item.fechaVenc})</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-amber-300">${item.cobrado.toLocaleString('es-AR')}</span>
                          {item.completo ? (
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-600">
                              100% PAGADA
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-600">
                              PARCIAL (Mora rest.: ${item.saldoRestante.toLocaleString('es-AR')})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attribution: Canal & Cobrador / Employee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div className="space-y-1">
                  <label className="font-extrabold text-amber-300 block">Origen / Canal de Cobro:</label>
                  <select
                    value={canalCobro}
                    onChange={(e) => setCanalCobro(e.target.value)}
                    className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-slate-700 focus:outline-none"
                  >
                    <option value="ADMINISTRACION">Administración Directa (Oficina)</option>
                    <option value="GESTION_DIARIA_CAMPO">Gestión Diaria / Cobrador de Campo</option>
                    <option value="GESTION_TELEFONICA">Gestión Telefónica / Asesor</option>
                    <option value="GESTION_DOMICILIARIA">Gestión Domiciliaria</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-emerald-300 block">Comisión Asignada A:</label>
                  <select
                    value={cobradorComisionId}
                    onChange={(e) => setCobradorComisionId(e.target.value)}
                    className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-slate-700 focus:outline-none"
                  >
                    <option value="">Administración (Sin Comisión)</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.nombre}>
                        {u.nombre} ({u.rolId})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Observaciones */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300 block">Observaciones / Nota interna:</label>
                <input
                  type="text"
                  value={observacionesPago}
                  onChange={(e) => setObservacionesPago(e.target.value)}
                  placeholder="Detalles sobre el cobro extraordinario..."
                  className="w-full bg-slate-950 text-white p-2 rounded-xl border border-slate-800 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPagoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>Confirmar e Ingresar Pago</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* REFINANCING & DEBT SPLITTING MODAL WITH SIMULATOR ("REFINANCIAR") */}
      {isRefinanciarModalOpen && selectedCliente && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-emerald-950 border-2 border-purple-500/80 rounded-3xl p-6 max-w-4xl w-full space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-purple-800/80 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-purple-300 tracking-wider bg-purple-900/80 border border-purple-700 px-2.5 py-0.5 rounded-md inline-block mb-1">
                  Módulo de Refinanciación & Simulador
                </span>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-purple-400" />
                  REFINANCIAR — {selectedCliente.nombre} {selectedCliente.apellido}
                </h3>
                <p className="text-xs text-purple-200/80 mt-1 font-medium">
                  Configure los tramos de refinanciación usando el simulador y las reglas oficiales.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsRefinanciarModalOpen(false)}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer border border-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DIVIDIR DEUDA Selector */}
            <div className="bg-slate-900 p-4 rounded-2xl border border-purple-800 space-y-2">
              <label className="text-xs font-black uppercase text-purple-300 block">
                Modalidad de Refinanciación / Dividir Deuda:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRefinanciarModo('UNICO')}
                  className={`p-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                    refinanciarModo === 'UNICO'
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md font-black'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  Crédito Único
                </button>

                <button
                  type="button"
                  onClick={() => setRefinanciarModo('DIVIDIR_2')}
                  className={`p-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                    refinanciarModo === 'DIVIDIR_2'
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md font-black'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  DIVIDIR DEUDA (2 Créditos)
                </button>

                <button
                  type="button"
                  onClick={() => setRefinanciarModo('DIVIDIR_3')}
                  className={`p-2.5 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                    refinanciarModo === 'DIVIDIR_3'
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md font-black'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  DIVIDIR DEUDA (3 Créditos)
                </button>
              </div>
            </div>

            {/* CREDIT 1 CONFIG & SIMULATOR */}
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-purple-800/80 space-y-3">
              <span className="text-xs font-black text-purple-300 uppercase tracking-wider block border-b border-purple-800/60 pb-1">
                {refinanciarModo === 'UNICO' ? 'Configuración del Crédito de Refinanciación' : 'Tramo 1 - Configuración & Simulador'}
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">Monto Capital ($):</label>
                  <input
                    type="number"
                    value={ref1Capital}
                    onChange={e => setRef1Capital(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-purple-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">Frecuencia:</label>
                  <select
                    value={ref1Frecuencia}
                    onChange={e => setRef1Frecuencia(e.target.value as FrecuenciaPago)}
                    className="w-full bg-slate-950 border border-purple-800 rounded-xl px-3 py-2 text-white font-bold"
                  >
                    <option value="DIARIA">DIARIA</option>
                    <option value="SEMANAL">SEMANAL</option>
                    <option value="QUINCENAL">QUINCENAL</option>
                    <option value="MENSUAL">MENSUAL</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">Cantidad de Cuotas:</label>
                  <input
                    type="number"
                    value={ref1Cuotas}
                    onChange={e => setRef1Cuotas(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-purple-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">1° Vencimiento:</label>
                  <input
                    type="date"
                    value={ref1PrimerVenc}
                    onChange={e => setRef1PrimerVenc(e.target.value)}
                    className="w-full bg-slate-950 border border-purple-800 rounded-xl px-3 py-2 text-white font-bold"
                  />
                </div>
              </div>

              {/* Simulator Output Row */}
              <div className="bg-slate-950 p-3 rounded-xl border border-purple-800/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <span className="text-[9px] text-purple-300 uppercase block">Capital</span>
                  <span className="font-mono font-black text-white">${ref1Capital.toLocaleString('es-AR')}</span>
                </div>
                <div>
                  <span className="text-[9px] text-purple-300 uppercase block">Tasa / Interés Total</span>
                  <span className="font-mono font-black text-amber-300">${sim1.interes.toLocaleString('es-AR')} ({sim1.tasa}%)</span>
                </div>
                <div>
                  <span className="text-[9px] text-purple-300 uppercase block">Total Financiado</span>
                  <span className="font-mono font-black text-emerald-300">${sim1.totalFinanciado.toLocaleString('es-AR')}</span>
                </div>
                <div>
                  <span className="text-[9px] text-purple-300 uppercase block">Valor por Cuota</span>
                  <span className="font-mono font-black text-yellow-300 text-sm">${sim1.valorCuota.toLocaleString('es-AR')}</span>
                </div>
              </div>
            </div>

            {/* CREDIT 2 CONFIG & SIMULATOR (IF DIVIDIR_2 OR DIVIDIR_3) */}
            {(refinanciarModo === 'DIVIDIR_2' || refinanciarModo === 'DIVIDIR_3') && (
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-purple-800/80 space-y-3">
                <span className="text-xs font-black text-purple-300 uppercase tracking-wider block border-b border-purple-800/60 pb-1">
                  Tramo 2 - Configuración & Simulador
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">Monto Capital ($):</label>
                    <input
                      type="number"
                      value={ref2Capital}
                      onChange={e => setRef2Capital(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-purple-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">Frecuencia:</label>
                    <select
                      value={ref2Frecuencia}
                      onChange={e => setRef2Frecuencia(e.target.value as FrecuenciaPago)}
                      className="w-full bg-slate-950 border border-purple-800 rounded-xl px-3 py-2 text-white font-bold"
                    >
                      <option value="DIARIA">DIARIA</option>
                      <option value="SEMANAL">SEMANAL</option>
                      <option value="QUINCENAL">QUINCENAL</option>
                      <option value="MENSUAL">MENSUAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">Cantidad de Cuotas:</label>
                    <input
                      type="number"
                      value={ref2Cuotas}
                      onChange={e => setRef2Cuotas(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-purple-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">1° Vencimiento:</label>
                    <input
                      type="date"
                      value={ref2PrimerVenc}
                      onChange={e => setRef2PrimerVenc(e.target.value)}
                      className="w-full bg-slate-950 border border-purple-800 rounded-xl px-3 py-2 text-white font-bold"
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-purple-800/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[9px] text-purple-300 uppercase block">Capital</span>
                    <span className="font-mono font-black text-white">${ref2Capital.toLocaleString('es-AR')}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-purple-300 uppercase block">Tasa / Interés Total</span>
                    <span className="font-mono font-black text-amber-300">${sim2.interes.toLocaleString('es-AR')} ({sim2.tasa}%)</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-purple-300 uppercase block">Total Financiado</span>
                    <span className="font-mono font-black text-emerald-300">${sim2.totalFinanciado.toLocaleString('es-AR')}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-purple-300 uppercase block">Valor por Cuota</span>
                    <span className="font-mono font-black text-yellow-300 text-sm">${sim2.valorCuota.toLocaleString('es-AR')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* CREDIT 3 CONFIG & SIMULATOR (IF DIVIDIR_3) */}
            {refinanciarModo === 'DIVIDIR_3' && (
              <div className="bg-slate-900/90 p-4 rounded-2xl border border-purple-800/80 space-y-3">
                <span className="text-xs font-black text-purple-300 uppercase tracking-wider block border-b border-purple-800/60 pb-1">
                  Tramo 3 - Configuración & Simulador
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">Monto Capital ($):</label>
                    <input
                      type="number"
                      value={ref3Capital}
                      onChange={e => setRef3Capital(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-purple-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">Frecuencia:</label>
                    <select
                      value={ref3Frecuencia}
                      onChange={e => setRef3Frecuencia(e.target.value as FrecuenciaPago)}
                      className="w-full bg-slate-950 border border-purple-800 rounded-xl px-3 py-2 text-white font-bold"
                    >
                      <option value="DIARIA">DIARIA</option>
                      <option value="SEMANAL">SEMANAL</option>
                      <option value="QUINCENAL">QUINCENAL</option>
                      <option value="MENSUAL">MENSUAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">Cantidad de Cuotas:</label>
                    <input
                      type="number"
                      value={ref3Cuotas}
                      onChange={e => setRef3Cuotas(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-purple-800 rounded-xl px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">1° Vencimiento:</label>
                    <input
                      type="date"
                      value={ref3PrimerVenc}
                      onChange={e => setRef3PrimerVenc(e.target.value)}
                      className="w-full bg-slate-950 border border-purple-800 rounded-xl px-3 py-2 text-white font-bold"
                    />
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-purple-800/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[9px] text-purple-300 uppercase block">Capital</span>
                    <span className="font-mono font-black text-white">${ref3Capital.toLocaleString('es-AR')}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-purple-300 uppercase block">Tasa / Interés Total</span>
                    <span className="font-mono font-black text-amber-300">${sim3.interes.toLocaleString('es-AR')} ({sim3.tasa}%)</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-purple-300 uppercase block">Total Financiado</span>
                    <span className="font-mono font-black text-emerald-300">${sim3.totalFinanciado.toLocaleString('es-AR')}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-purple-300 uppercase block">Valor por Cuota</span>
                    <span className="font-mono font-black text-yellow-300 text-sm">${sim3.valorCuota.toLocaleString('es-AR')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* General Attribution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-900/80 p-4 rounded-2xl border border-purple-800">
              <div>
                <label className="text-[10px] font-bold text-purple-300 uppercase block mb-1">Cobrador Asignado:</label>
                <select
                  value={refCobrador}
                  onChange={e => setRefCobrador(e.target.value)}
                  className="w-full bg-slate-950 border border-purple-800 rounded-xl px-3 py-2 text-white font-bold"
                >
                  <option value="">Administración General</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.nombre}>{u.nombre} ({u.rolId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-purple-300 uppercase block mb-1">Observaciones / Acuerdo:</label>
                <input
                  type="text"
                  value={refObservaciones}
                  onChange={e => setRefObservaciones(e.target.value)}
                  placeholder="Detalles sobre el plan de refinanciación..."
                  className="w-full bg-slate-950 border border-purple-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            {/* Footer Actions (Strictly REFINANCIAR) */}
            <div className="flex justify-end gap-3 pt-3 border-t border-purple-800/80">
              <button
                type="button"
                onClick={() => setIsRefinanciarModalOpen(false)}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs px-5 py-3 rounded-xl cursor-pointer border border-slate-800"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmRefinanciar}
                className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-6 py-3 rounded-xl flex items-center gap-2 cursor-pointer shadow-xl shadow-purple-950/80 transition-all uppercase tracking-wider border border-purple-400"
              >
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>REFINANCIAR</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL FICHA COMPROMISO DE PAGO (CREAR NUEVO COMPROMISO) */}
      {isCompromisoModalOpen && selectedCliente && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 my-8">
            
            <div className="flex items-center justify-between border-b border-amber-800/80 pb-3">
              <div>
                <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest bg-amber-950 px-2.5 py-0.5 rounded border border-amber-700">
                  Ficha de Compromiso de Pago
                </span>
                <h3 className="text-xl font-black text-white mt-1 flex items-center gap-2">
                  <BookmarkCheck className="w-6 h-6 text-amber-400" />
                  Acuerdo de Pago — {selectedCliente.nombre} {selectedCliente.apellido || ''}
                </h3>
              </div>

              <button
                onClick={() => setIsCompromisoModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Explanatory Banner */}
            <div className="bg-amber-950/40 border border-amber-700/80 p-3 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-300 font-extrabold uppercase text-[11px]">Aviso Importante — Compromiso de Pago vs Pago Real:</strong>
                <span>
                  El registro de un compromiso de pago NO cancela deuda, NO modifica el saldo de cuotas ni altera la Tesorería/Caja. Registra el compromiso del cliente para su seguimiento en las Mesas de Gestión.
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveCompromisos} className="space-y-4 text-xs">
              
              {/* Header Grid: DNI, Finalidad, Mesa, Crédito, Usuario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cliente & DNI:</label>
                  <input
                    type="text"
                    readOnly
                    value={`${selectedCliente.nombre} ${selectedCliente.apellido || ''} (DNI: ${selectedCliente.dni || 'S/D'})`}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold cursor-not-allowed opacity-90"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-amber-300 uppercase block mb-1">Finalidad del Compromiso (*):</label>
                  <select
                    value={compFinalidad}
                    onChange={e => setCompFinalidad(e.target.value as FinalidadCompromiso)}
                    className="w-full bg-slate-900 border border-amber-700 rounded-lg px-3 py-2 text-amber-200 font-black focus:outline-none focus:border-amber-400"
                  >
                    <option value="REFINANCIACIÓN">REFINANCIACIÓN</option>
                    <option value="RENOVACIÓN">RENOVACIÓN</option>
                    <option value="OTRA">OTRA (ACUERDO REGULAR / ESPECIAL)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-amber-300 uppercase block mb-1">Mesa de Gestión Destino (*):</label>
                  <select
                    value={compMesaGestion}
                    onChange={e => setCompMesaGestion(e.target.value as MesaGestionCompromiso)}
                    className="w-full bg-slate-900 border border-amber-700 rounded-lg px-3 py-2 text-amber-200 font-black focus:outline-none focus:border-amber-400"
                  >
                    <option value="GESTIÓN DIARIA">GESTIÓN DIARIA</option>
                    <option value="GESTIÓN TELEFÓNICA">GESTIÓN TELEFÓNICA</option>
                    <option value="GESTIÓN DOMICILIARIA">GESTIÓN DOMICILIARIA</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Crédito Asociado (Opcional):</label>
                  <select
                    value={compOperacionId}
                    onChange={e => setCompOperacionId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold"
                  >
                    <option value="">-- Sin Crédito Específico / General --</option>
                    {clientOperations.map(op => (
                      <option key={op.id} value={op.id}>
                        Crédito N° {op.id} ({op.frecuencia} - Otorgado: {op.fechaOtorgamiento})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Usuario que Registra:</label>
                  <input
                    type="text"
                    value={compUsuario}
                    onChange={e => setCompUsuario(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 font-medium"
                  />
                </div>
              </div>

              {/* Dynamic List of Compromise Items */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-black text-amber-300 uppercase flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    Fechas e Importes de Compromisos Acordados ({compItems.length})
                  </span>

                  <button
                    type="button"
                    onClick={handleAddCompromisoRow}
                    className="px-2.5 py-1 rounded-lg bg-amber-950 hover:bg-amber-900 text-amber-200 font-bold border border-amber-700 text-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Agregar otra fecha</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {compItems.map((item, idx) => (
                    <div key={item.id} className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-400 uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          Fecha / Compromiso #{idx + 1}
                        </span>
                        {compItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCompromisoRow(item.id)}
                            className="text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-rose-950/50 transition-all cursor-pointer"
                            title="Eliminar esta fecha"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">Fecha Acordada de Pago (*):</label>
                          <input
                            type="date"
                            value={item.fecha}
                            onChange={e => handleUpdateCompromisoRow(item.id, 'fecha', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold"
                            required
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-amber-300 uppercase block mb-1">Monto Comprometido ($) (*):</label>
                          <input
                            type="number"
                            step="any"
                            value={item.monto}
                            onChange={e => handleUpdateCompromisoRow(item.id, 'monto', e.target.value)}
                            placeholder="Ej: 25000"
                            className="w-full bg-slate-950 border border-amber-700 rounded-lg px-2.5 py-1.5 text-amber-200 font-mono font-bold"
                            required
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Observaciones / Nota del Compromiso:</label>
                          <input
                            type="text"
                            value={item.observaciones}
                            onChange={e => handleUpdateCompromisoRow(item.id, 'observaciones', e.target.value)}
                            placeholder="Ej: Prometió abonar por transferencia antes del mediodía"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCompromisoModalOpen(false)}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold px-4 py-2.5 rounded-xl cursor-pointer border border-slate-800"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black px-6 py-2.5 rounded-xl shadow-lg shadow-amber-950/80 cursor-pointer flex items-center gap-2 transition-all"
                >
                  <BookmarkCheck className="w-4 h-4 text-amber-200" />
                  <span>Guardar Compromiso(s) de Pago</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* DETAIL MODAL FOR COMPROMISO DE PAGO */}
      {selectedCompromisoDetail && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                  Detalle Ficha Compromiso
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  Compromiso #{selectedCompromisoDetail.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCompromisoDetail(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-semibold">Cliente:</span>
                <strong className="text-white">{selectedCompromisoDetail.nombreCliente} (DNI: {selectedCompromisoDetail.dniCliente || 'S/D'})</strong>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-semibold">Finalidad:</span>
                <span className="bg-purple-950 text-purple-300 font-black px-2 py-0.5 rounded border border-purple-800">
                  {selectedCompromisoDetail.finalidad}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-semibold">Mesa de Gestión:</span>
                <span className="bg-slate-900 text-slate-200 font-bold px-2 py-0.5 rounded border border-slate-700">
                  {selectedCompromisoDetail.mesaGestion}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-semibold">Estado Actual:</span>
                <span className={`font-black uppercase px-2 py-0.5 rounded border ${
                  selectedCompromisoDetail.estado === 'REALIZADO'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : selectedCompromisoDetail.estado === 'EN MORA'
                    ? 'bg-rose-950 text-rose-300 border-rose-700'
                    : selectedCompromisoDetail.estado === 'CANCELADO'
                    ? 'bg-slate-900 text-slate-400 border-slate-700'
                    : 'bg-amber-950 text-amber-300 border-amber-700'
                }`}>
                  {selectedCompromisoDetail.estado}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-semibold">Fecha Acordada de Pago:</span>
                <strong className="text-white font-mono text-sm">{selectedCompromisoDetail.fechaCompromiso}</strong>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-semibold">Monto Comprometido:</span>
                <strong className="text-amber-300 font-mono text-base">${selectedCompromisoDetail.montoComprometido.toLocaleString('es-AR')}</strong>
              </div>

              {selectedCompromisoDetail.idOperacion && (
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400 font-semibold">Crédito Asociado:</span>
                  <strong className="text-white font-mono">{selectedCompromisoDetail.idOperacion}</strong>
                </div>
              )}

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-semibold">Registrado Por:</span>
                <span className="text-slate-200">{selectedCompromisoDetail.usuarioRegistro}</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-semibold">Fecha y Hora Registro:</span>
                <span className="text-slate-300">{new Date(selectedCompromisoDetail.fechaHoraRegistro).toLocaleString('es-AR')}</span>
              </div>

              {selectedCompromisoDetail.fechaRealizado && (
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-emerald-400 font-bold">Fecha de Pago Real:</span>
                  <strong className="text-emerald-300 font-mono">{selectedCompromisoDetail.fechaRealizado}</strong>
                </div>
              )}

              {selectedCompromisoDetail.observaciones && (
                <div className="pt-1">
                  <span className="text-slate-400 block font-semibold mb-1">Observaciones:</span>
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 italic text-slate-300">
                    "{selectedCompromisoDetail.observaciones}"
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCompromisoDetail(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-5 py-2 rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN ELIMINAR CLIENTE (ADMINISTRADOR) */}
      {clienteToDelete && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border-2 border-rose-600/90 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400 border-b border-rose-900/80 pb-3">
              <AlertTriangle className="w-7 h-7 shrink-0 text-rose-500 animate-pulse" />
              <div>
                <h3 className="text-base font-black text-white">Eliminación Definitiva de Cliente</h3>
                <span className="text-[10px] text-rose-300 uppercase tracking-widest font-extrabold">Acción Exclusiva de Administrador</span>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="font-semibold">
                ¿Está seguro de que desea <strong className="text-rose-400 underline uppercase">eliminar definitivamente</strong> al siguiente cliente?
              </p>
              
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-white font-bold space-y-1">
                <p className="text-sm text-emerald-300">{clienteToDelete.nombre} {clienteToDelete.apellido || ''}</p>
                <p className="text-slate-400 text-[11px]">DNI: {clienteToDelete.dni || 'Sin DNI'} | Teléfono: {clienteToDelete.telefono || 'Sin teléfono'}</p>
                <p className="text-slate-500 text-[10px] font-mono">ID Registro: {clienteToDelete.id}</p>
              </div>

              <div className="bg-rose-950/50 p-3 rounded-xl border border-rose-800/60 text-rose-200 text-[11px] leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Atención — Diferencia con Cliente Inactivo:</span>
                </p>
                <p>
                  Un cliente <strong>INACTIVO</strong> conserva todo su historial en el sistema. Al <strong>ELIMINAR</strong>, la ficha y sus registros serán removidos por completo de la base de datos de CrediCash.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => setClienteToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onDeleteCliente) {
                    onDeleteCliente(clienteToDelete.id);
                  }
                  if (selectedClienteId === clienteToDelete.id) {
                    setSelectedClienteId(null);
                  }
                  setClienteToDelete(null);
                }}
                className="px-4.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-white" />
                <span>Sí, Eliminar Cliente</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
