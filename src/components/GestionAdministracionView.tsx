import React, { useState } from 'react';
import { 
  Cliente, Operacion, Cuota, Pago, UsuarioRol, 
  TransaccionTesoreria, Configuracion 
} from '../types';
import { sortCuotasByPaymentPriority, generarPlanCuotas } from '../utils/cuotasGenerator';
import { exportDailyRoutePDF } from '../utils/pdfExportRoute';
import { 
  Users, Search, DollarSign, Calendar, FileText, 
  CheckCircle2, AlertTriangle, UserCheck, ShieldCheck, 
  Printer, ArrowRight, UserPlus, Phone, MapPin, 
  ChevronRight, Filter, RefreshCw
} from 'lucide-react';

interface GestionAdministracionViewProps {
  clientes: Cliente[];
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
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
  onUpdateOperacion?: (operacion: Operacion) => void;
}

export default function GestionAdministracionView({
  clientes,
  operaciones,
  cuotas,
  pagos,
  usuarios = [],
  activeUser,
  configuracion,
  onAddPago,
  onUpdateCliente,
  onUpdateOperacion
}: GestionAdministracionViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<'TODOS' | 'ACTIVOS' | 'INACTIVOS'>('TODOS');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);

  // Modal / Form state for payment
  const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
  const [selectedOperacionId, setSelectedOperacionId] = useState<string>('');
  const [tipoPago, setTipoPago] = useState<'REGULAR' | 'PARCIAL' | 'ADELANTADO'>('REGULAR');
  const [fechaPagoInput, setFechaPagoInput] = useState<string>('');
  const [montoIngresado, setMontoIngresado] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO'>('EFECTIVO');
  const [canalCobro, setCanalCobro] = useState<string>('ADMINISTRACION');
  const [cobradorComisionId, setCobradorComisionId] = useState<string>('');
  const [observacionesPago, setObservacionesPago] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

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

    if (filterEstado === 'ACTIVOS') return c.estado === 'ACTIVO';
    if (filterEstado === 'INACTIVOS') return c.estado === 'INACTIVO';
    return true;
  });

  const selectedCliente = clientes.find(c => c.id === selectedClienteId) || null;

  // Selected client loans & cuotas
  const clientOperations = selectedCliente 
    ? operaciones.filter(o => o.idCliente === selectedCliente.id && o.estado !== 'FINALIZADA' && o.estado !== 'REFINANCIADA')
    : [];

  const allClientOperations = selectedCliente
    ? operaciones.filter(o => o.idCliente === selectedCliente.id)
    : [];

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

  // Handle PDF Export
  const handleExportPDF = () => {
    if (!selectedCliente) return;

    const cobradorName = selectedCliente.cobradorAsignadoNombre || activeUser?.nombre || 'Administración';
    exportDailyRoutePDF(
      cobradorName,
      todayStr,
      [selectedCliente],
      operaciones,
      cuotas,
      totalDeudaCuotas,
      0,
      'N/A'
    );
  };

  // Open Payment Modal for selected client
  const handleOpenPagoModal = (opId?: string) => {
    if (!selectedCliente) return;

    const opToSelect = opId || (clientOperations.length > 0 ? clientOperations[0].id : 'DEUDA_INACTIVO');
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
    setMetodoPago('EFECTIVO');
    setCanalCobro('ADMINISTRACION');
    setCobradorComisionId(selectedCliente.cobradorAsignadoNombre || activeUser?.nombre || '');
    setObservacionesPago('Cobro extraordinario / Pago refinanciación registrado desde Gestión Administración');
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

    const effectiveFechaPago = fechaPagoInput || todayStr;
    const assignedStaffName = cobradorComisionId || selectedCliente.cobradorAsignadoNombre || activeUser?.nombre || 'Administración';
    const newPagoId = `PAG-${String(Date.now())}`;

    // A. DIRECT PAYMENT FOR INACTIVE CLIENT / REFINANCING INITIAL PAYMENT (No active loan)
    if (selectedOperacionId === 'DEUDA_INACTIVO' || !operaciones.find(o => o.id === selectedOperacionId)) {
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
        metodoPago: metodoPago,
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
      return;
    }

    // B. PAYMENT FOR EXISTING ACTIVE OPERATION
    const targetOp = operaciones.find(o => o.id === selectedOperacionId)!;

    // Get current unpaid cuotas for operation
    let opCuotas = cuotas.filter(cu => cu.idOperacion === targetOp.id);
    if (opCuotas.length === 0) {
      opCuotas = generarPlanCuotas(targetOp, []);
    }

    const pendingOpCuotas = opCuotas.filter(cu => cu.estado !== 'PAGADA');
    const sortedPending = sortCuotasByPaymentPriority(pendingOpCuotas, effectiveFechaPago);

    if (sortedPending.length === 0 && tipoPago !== 'ADELANTADO') {
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
      metodoPago: metodoPago,
      cobrador: assignedStaffName,
      observaciones: `[${canalCobro}] ${observacionesPago}`.trim(),
    };

    // Apply payment to cuotas (waterfall distribution)
    let remainingMonto = montoNum;
    const updatedCuotasList: Cuota[] = [];

    // Clone cuotas list to update
    const mutableCuotas = opCuotas.map(c => ({ ...c }));

    for (const c of mutableCuotas) {
      if (remainingMonto <= 0) break;
      if (c.estado === 'PAGADA') continue;

      const saldoActual = c.saldoPendiente > 0 ? c.saldoPendiente : c.valorTotalCuota;
      if (remainingMonto >= saldoActual) {
        // Fully pay this cuota
        remainingMonto -= saldoActual;
        c.estado = 'PAGADA';
        c.importePagado = (c.importePagado || 0) + saldoActual;
        c.saldoPendiente = 0;
        c.fechaPago = effectiveFechaPago;
        c.diasAtraso = effectiveFechaPago <= c.fechaVencimiento ? 0 : Math.max(0, Math.floor((new Date(effectiveFechaPago).getTime() - new Date(c.fechaVencimiento).getTime()) / (1000 * 60 * 60 * 24)));
        updatedCuotasList.push(c);
      } else {
        // Partial pay this cuota
        c.estado = 'PAGO_PARCIAL';
        c.importePagado = (c.importePagado || 0) + remainingMonto;
        c.saldoPendiente = saldoActual - remainingMonto;
        c.fechaPago = effectiveFechaPago;
        updatedCuotasList.push(c);
      }
    }

    // Update Operation total balance
    const newCuotasPagadas = mutableCuotas.filter(c => c.estado === 'PAGADA').length;
    const isFullyPaid = newCuotasPagadas >= targetOp.cantidadCuotas;

    const updatedOperacion: Operacion = {
      ...targetOp,
      cuotasPagadas: newCuotasPagadas,
      ultimoPago: effectiveFechaPago,
      estado: isFullyPaid ? 'FINALIZADA' : targetOp.estado,
      capitalRecuperado: (targetOp.capitalRecuperado || 0) + (montoNum * 0.7),
      interesCobrado: (targetOp.interesCobrado || 0) + (montoNum * 0.3),
    };

    // Treasury income transaction
    const tesoreriaTrx: TransaccionTesoreria = {
      id: `TRX-${String(Date.now())}`,
      fecha: effectiveFechaPago,
      tipo: 'INGRESO',
      concepto: `Cobro Extraordinario Admin [${canalCobro}] - ${selectedCliente.nombre} (Crédito ${targetOp.id})`,
      monto: montoNum,
      referenciaId: newPagoId,
    };

    // Trigger state handler
    onAddPago(nuevoPago, updatedCuotasList, updatedOperacion, tesoreriaTrx);

    // If client was inactive or had debt, update client state if needed
    if (selectedCliente.estado === 'INACTIVO' || (selectedCliente.montoDeudaInactivo && selectedCliente.montoDeudaInactivo > 0) || (selectedCliente.montoPagoInicialRefinanciacion && selectedCliente.montoPagoInicialRefinanciacion > 0)) {
      const currentDeuda = selectedCliente.montoDeudaInactivo !== undefined && selectedCliente.montoDeudaInactivo > 0
        ? selectedCliente.montoDeudaInactivo
        : 150000;
      const currentPagoInicial = selectedCliente.montoPagoInicialRefinanciacion !== undefined && selectedCliente.montoPagoInicialRefinanciacion > 0
        ? selectedCliente.montoPagoInicialRefinanciacion
        : Math.round(currentDeuda * 0.10);

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

                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md border shrink-0 ${
                        isInactive
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      }`}>
                        {cliente.estado}
                      </span>
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportPDF}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black border border-slate-700 shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                      title="Exportar Plan de Cuotas y Estado de Cuenta a PDF"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      <span>Exportar PDF</span>
                    </button>

                    <button
                      onClick={() => handleOpenPagoModal()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black border border-emerald-400 shadow-md flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <DollarSign className="w-4 h-4 text-emerald-200" />
                      <span>Registrar Cobro Admin</span>
                    </button>
                  </div>
                </div>

                {/* Client Quick Contact Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Domicilio</span>
                    <span className="font-semibold text-white truncate block">{selectedCliente.direccion || selectedCliente.calle || 'No registrado'}</span>
                  </div>

                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Teléfono / WhatsApp</span>
                    <span className="font-semibold text-white truncate block">{selectedCliente.telefono || 'Sin teléfono'}</span>
                  </div>

                  <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Cobrador Asignado</span>
                    <span className="font-semibold text-emerald-300 truncate block">{selectedCliente.cobradorAsignadoNombre || 'Sin asignar'}</span>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-gradient-to-r from-emerald-950 to-slate-950 p-3 rounded-xl border border-emerald-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black text-emerald-300 uppercase block">Deuda Total Activa (Cuotas)</span>
                      <span className="text-lg font-black text-white">${totalDeudaCuotas.toLocaleString('es-AR')}</span>
                    </div>
                    <span className="text-xs font-bold bg-emerald-900/80 text-emerald-300 px-2 py-1 rounded border border-emerald-700">
                      {unpaidCuotas.length} cuotas pend.
                    </span>
                  </div>

                  {(selectedCliente.estado === 'INACTIVO' || (selectedCliente.montoDeudaInactivo && selectedCliente.montoDeudaInactivo > 0)) && (
                    <div className="bg-gradient-to-r from-amber-950 to-slate-950 p-3 rounded-xl border border-amber-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-black text-amber-300 uppercase block">Pago Inicial Refinanciación</span>
                        <span className="text-lg font-black text-yellow-300">
                          ${(selectedCliente.montoPagoInicialRefinanciacion || Math.round((selectedCliente.montoDeudaInactivo || 150000) * 0.3)).toLocaleString('es-AR')}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-900/80 text-amber-300 px-2 py-1 rounded border border-amber-700">
                        INACTIVO
                      </span>
                    </div>
                  )}
                </div>

              </div>

              {/* LOAN OPERATIONS BREAKDOWN */}
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    Historial y Estado de Créditos ({allClientOperations.length})
                  </h3>
                  <span className="text-xs text-slate-400">
                    Inspección detallada de cuotas
                  </span>
                </div>

                {allClientOperations.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-950/60 rounded-xl border border-slate-800">
                    Este cliente no posee créditos registrados actualmente.
                  </div>
                ) : (
                  allClientOperations.map(op => {
                    let opCuotasList = cuotas.filter(cu => cu.idOperacion === op.id);
                    if (opCuotasList.length === 0) {
                      opCuotasList = generarPlanCuotas(op, []);
                    }

                    const pagadasCount = opCuotasList.filter(c => c.estado === 'PAGADA').length;

                    return (
                      <div key={op.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                        
                        {/* Operation Summary Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-white text-sm">Crédito N° {op.id}</span>
                              <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ${
                                op.estado === 'FINALIZADA'
                                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                                  : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              }`}>
                                {op.estado}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              Otorgado: {op.fechaOtorgamiento} | Frecuencia: <strong>{op.frecuencia}</strong> | Total Financiado: <strong>${(op.totalFinanciado || 0).toLocaleString('es-AR')}</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-300">
                              {pagadasCount} / {op.cantidadCuotas} cuotas
                            </span>
                            {op.estado !== 'FINALIZADA' && (
                              <button
                                onClick={() => handleOpenPagoModal(op.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold border border-emerald-500 transition-all cursor-pointer"
                              >
                                Cobrar este Crédito
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Cuotas List Grid */}
                        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                          {opCuotasList.map(cuota => {
                            const isPagada = cuota.estado === 'PAGADA';
                            const isOverdue = !isPagada && (cuota.estado === 'VENCIDA' || cuota.fechaVencimiento < todayStr);
                            const isParcial = cuota.estado === 'PAGO_PARCIAL';

                            let badgeStyle = 'bg-amber-950 text-amber-300 border-amber-800';
                            let badgeText = 'PENDIENTE';

                            if (isPagada) {
                              badgeStyle = 'bg-emerald-950 text-emerald-300 border-emerald-800';
                              badgeText = 'PAGADA';
                            } else if (isOverdue) {
                              badgeStyle = 'bg-rose-950 text-rose-300 border-rose-800 font-black';
                              badgeText = 'EN MORA';
                            } else if (isParcial) {
                              badgeStyle = 'bg-amber-950 text-yellow-300 border-amber-800';
                              badgeText = 'PAGO PARCIAL';
                            }

                            return (
                              <div key={cuota.id} className="p-2 bg-slate-900/80 rounded-lg flex items-center justify-between text-xs border border-slate-800/60">
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-white w-20">Cuota N° {cuota.numeroCuota}</span>
                                  <span className="text-slate-400 text-[11px]">Venc.: {cuota.fechaVencimiento}</span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="font-extrabold text-white">
                                    ${(cuota.saldoPendiente > 0 ? cuota.saldoPendiente : cuota.valorTotalCuota || 0).toLocaleString('es-AR')}
                                  </span>

                                  <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ${badgeStyle}`}>
                                    {badgeText}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                      </div>
                    );
                  })
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

    </div>
  );
}
