import React, { useState, useEffect } from 'react';
import { Cliente, Operacion, UsuarioRol, Configuracion, Cuota, FrecuenciaPago } from '../types';
import { 
  UserX, Search, DollarSign, Settings, Save, 
  MapPin, Phone, CheckCircle2, UserCheck, AlertTriangle, Filter, Shield,
  Calculator, Calendar, PlusCircle, FileText, RefreshCw, X, Briefcase
} from 'lucide-react';
import { generarPlanCuotas, calcularMesesFinanciados, obtenerProximoDiaHabil } from '../utils/cuotasGenerator';

interface ClientesInactivosViewProps {
  clientes: Cliente[];
  operaciones: Operacion[];
  activeUserRole: UsuarioRol;
  usuarios: UsuarioRol[];
  configuracion?: Configuracion;
  feriados?: (string | any)[];
  onUpdateCliente: (clienteActualizado: Cliente) => void;
  onAddOperacion?: (operacion: Operacion, cuotasGeneradas: Cuota[]) => void;
}

export default function ClientesInactivosView({
  clientes = [],
  operaciones = [],
  activeUserRole,
  usuarios = [],
  configuracion,
  feriados = [],
  onUpdateCliente,
  onAddOperacion
}: ClientesInactivosViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCobrador, setFilterCobrador] = useState<string>('TODOS');
  
  // Modal state to configure inactive debt, initial payment, and custom minimum
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [customDeudaInput, setCustomDeudaInput] = useState<string>('');
  const [customPagoInicialInput, setCustomPagoInicialInput] = useState<string>('');
  const [customMinimoInput, setCustomMinimoInput] = useState<string>('');

  // Modal state for Credit Generator (Simulador y Liquidación de Crédito)
  const [generatingCreditCliente, setGeneratingCreditCliente] = useState<Cliente | null>(null);
  const [creditoFecha, setCreditoFecha] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [creditoTipo, setCreditoTipo] = useState<Operacion['tipoOperacion']>('REFINANCIACION');
  const [creditoCapital, setCreditoCapital] = useState<number>(100000);
  const [creditoFrecuencia, setCreditoFrecuencia] = useState<FrecuenciaPago>('DIARIA');
  const [creditoCuotas, setCreditoCuotas] = useState<number>(20);
  const [creditoPrimerVenc, setCreditoPrimerVenc] = useState<string>('');
  const [creditoCobrador, setCreditoCobrador] = useState<string>('');
  const [creditoPromo, setCreditoPromo] = useState<string>('');
  const [creditoDescuento, setCreditoDescuento] = useState<number>(0);
  const [creditoObservaciones, setCreditoObservaciones] = useState<string>('');

  // Auto-adjust standard cuotas count when frequency changes in generator
  useEffect(() => {
    let std = 20;
    if (creditoFrecuencia === 'DIARIA') std = 20;
    else if (creditoFrecuencia === 'SEMANAL') std = 8;
    else if (creditoFrecuencia === 'QUINCENAL') std = 4;
    else if (creditoFrecuencia === 'MENSUAL') std = 4;
    setCreditoCuotas(std);
  }, [creditoFrecuencia]);

  // Auto-calculate primer vencimiento date
  useEffect(() => {
    if (!creditoFecha) return;
    try {
      const grantDate = new Date(creditoFecha + 'T12:00:00');
      if (isNaN(grantDate.getTime())) return;

      const safeFeriados = Array.isArray(feriados) ? feriados : [];

      if (creditoFrecuencia === 'DIARIA') {
        const nextDay = new Date(grantDate.getTime() + 24 * 60 * 60 * 1000);
        const calculated = obtenerProximoDiaHabil(nextDay, safeFeriados);
        if (calculated && !isNaN(calculated.getTime())) {
          setCreditoPrimerVenc(calculated.toISOString().split('T')[0]);
        }
      } else if (creditoFrecuencia === 'SEMANAL') {
        const nextDay = new Date(grantDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        setCreditoPrimerVenc(nextDay.toISOString().split('T')[0]);
      } else if (creditoFrecuencia === 'QUINCENAL') {
        const nextDay = new Date(grantDate.getTime() + 15 * 24 * 60 * 60 * 1000);
        setCreditoPrimerVenc(nextDay.toISOString().split('T')[0]);
      } else if (creditoFrecuencia === 'MENSUAL') {
        const nextDay = new Date(grantDate.getFullYear(), grantDate.getMonth() + 1, grantDate.getDate(), 12, 0, 0);
        setCreditoPrimerVenc(nextDay.toISOString().split('T')[0]);
      }
    } catch (e) {
      console.error('Error calculando primer vencimiento:', e);
    }
  }, [creditoFrecuencia, creditoFecha, feriados]);

  // Safe client list
  const safeClientes = Array.isArray(clientes) ? clientes : [];
  const safeOperaciones = Array.isArray(operaciones) ? operaciones : [];
  const safeUsuarios = Array.isArray(usuarios) ? usuarios : [];

  // Filter inactive clients (either state INACTIVO or with explicit inactive debt)
  const inactivosList = safeClientes.filter(c => {
    if (!c) return false;
    const isInactiveState = c.estado === 'INACTIVO' || c.estado === 'SUSPENDIDO';
    const clientOps = safeOperaciones.filter(o => o && o.idCliente === c.id);
    const hasInactiveDebt = (c.montoDeudaInactivo && c.montoDeudaInactivo > 0) || 
      clientOps.some(o => o.estado === 'VENCIDA' || o.estado === 'CONGELADA');
    
    return isInactiveState || hasInactiveDebt;
  });

  const cobradoresList = safeUsuarios.filter(u => u && (u.rolId === 'COBRADOR' || u.rolId === 'ADMIN'));

  // Filter by search term and cobrador
  const filteredInactivos = inactivosList.filter(c => {
    if (!c) return false;
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch = 
      (c.nombre || '').toLowerCase().includes(term) ||
      (c.apellido || '').toLowerCase().includes(term) ||
      (c.dni || '').includes(term);

    const matchesCobrador = filterCobrador === 'TODOS' || c.cobradorAsignadoId === filterCobrador;

    return matchesSearch && matchesCobrador;
  });

  // Calculate total debt for an inactive client
  const getClienteDeudaTotal = (c: Cliente): number => {
    if (!c) return 0;
    if (c.montoDeudaInactivo !== undefined && c.montoDeudaInactivo > 0) {
      return c.montoDeudaInactivo;
    }
    const clientOps = safeOperaciones.filter(o => o && o.idCliente === c.id);
    const opDebt = clientOps.reduce((sum, o) => sum + (o.totalPendiente || 0), 0);
    return opDebt > 0 ? opDebt : 150000; // Fallback initial default if never edited
  };

  // Calculate minimum exigible amount (configured by admin or default 20%)
  const getClienteMinimoExigible = (c: Cliente): number => {
    if (!c) return 0;
    if (c.montoMinimoInactivoConfigurado !== undefined && c.montoMinimoInactivoConfigurado > 0) {
      return c.montoMinimoInactivoConfigurado;
    }
    const totalDeuda = getClienteDeudaTotal(c);
    return Math.round(totalDeuda * 0.20); // 20% por defecto
  };

  const handleOpenConfigModal = (cliente: Cliente) => {
    setEditingCliente(cliente);
    const currentDeuda = getClienteDeudaTotal(cliente);
    const currentMin = getClienteMinimoExigible(cliente);
    const currentPagoInicial = cliente.montoPagoInicialRefinanciacion || Math.round(currentDeuda * 0.10);

    setCustomDeudaInput(String(currentDeuda));
    setCustomPagoInicialInput(String(currentPagoInicial));
    setCustomMinimoInput(String(currentMin));
  };

  const handleSaveConfigInactivo = () => {
    if (!editingCliente) return;
    const newDeuda = parseFloat(customDeudaInput);
    const newPagoInicial = parseFloat(customPagoInicialInput);
    const newMin = parseFloat(customMinimoInput);

    if (isNaN(newDeuda) || newDeuda < 0) {
      alert('Por favor ingrese un monto de deuda válido mayor o igual a 0.');
      return;
    }

    onUpdateCliente({
      ...editingCliente,
      montoDeudaInactivo: newDeuda,
      montoPagoInicialRefinanciacion: isNaN(newPagoInicial) ? 0 : newPagoInicial,
      montoMinimoInactivoConfigurado: isNaN(newMin) ? Math.round(newDeuda * 0.20) : newMin
    });

    setEditingCliente(null);
    alert('Ficha de cliente inactivo actualizada correctamente.');
  };

  const handleReassignCobrador = (cliente: Cliente, cobradorId: string) => {
    const cobradorObj = safeUsuarios.find(u => u && u.id === cobradorId);
    const todayStr = new Date().toISOString().split('T')[0];
    
    onUpdateCliente({
      ...cliente,
      cobradorAsignadoId: cobradorId || undefined,
      cobradorAsignadoNombre: cobradorObj ? cobradorObj.nombre : undefined,
      fechaInicioGestionCobro: cobradorId ? (cliente.fechaInicioGestionCobro || todayStr) : undefined
    });
  };

  // Open Credit Generator Modal initialized for selected inactive client
  const handleOpenGenerarCredito = (cliente: Cliente) => {
    setGeneratingCreditCliente(cliente);
    const totalDeuda = getClienteDeudaTotal(cliente);
    const pagoInicial = cliente.montoPagoInicialRefinanciacion || 0;
    const capitalSugerido = totalDeuda > pagoInicial ? (totalDeuda - pagoInicial) : totalDeuda;

    const todayStr = new Date().toISOString().split('T')[0];
    setCreditoFecha(todayStr);
    setCreditoTipo('REFINANCIACION');
    setCreditoCapital(capitalSugerido > 0 ? capitalSugerido : 100000);
    setCreditoFrecuencia('DIARIA');
    setCreditoCuotas(20);

    try {
      const grantDate = new Date(todayStr + 'T12:00:00');
      const nextDay = new Date(grantDate.getTime() + 24 * 60 * 60 * 1000);
      const calculatedFirst = obtenerProximoDiaHabil(nextDay, feriados);
      setCreditoPrimerVenc(calculatedFirst.toISOString().split('T')[0]);
    } catch (e) {
      setCreditoPrimerVenc(todayStr);
    }

    setCreditoCobrador(cliente.cobradorAsignadoNombre || activeUserRole?.nombre || 'Cobrador General');
    setCreditoPromo('');
    setCreditoDescuento(0);
    setCreditoObservaciones(
      pagoInicial > 0 
        ? `Refinanciación de cliente inactivo con abono inicial previo de $${pagoInicial.toLocaleString('es-AR')}.` 
        : `Refinanciación de deuda consolidada de cliente inactivo.`
    );
  };

  // Compute financial values for generator modal
  const mesesFinanciados = calcularMesesFinanciados(creditoFrecuencia, creditoCuotas);
  let tasaMensual = 50;
  if (configuracion) {
    if (creditoFrecuencia === 'DIARIA') tasaMensual = configuracion.interesDiario;
    else if (creditoFrecuencia === 'SEMANAL') tasaMensual = configuracion.interesSemanal;
    else if (creditoFrecuencia === 'QUINCENAL') tasaMensual = configuracion.interesQuincenal;
    else if (creditoFrecuencia === 'MENSUAL') tasaMensual = configuracion.interesMensual;
  }

  const interesTotal = creditoCapital * (tasaMensual / 100) * mesesFinanciados;
  const subtotal = creditoCapital + interesTotal;
  const descuentoMonto = subtotal * (creditoDescuento / 100);
  const totalFinanciado = Math.max(0, parseFloat((subtotal - descuentoMonto).toFixed(2)));
  const valorCuota = creditoCuotas > 0 ? parseFloat((totalFinanciado / creditoCuotas).toFixed(2)) : 0;

  let cuotasPreview: Cuota[] = [];
  if (generatingCreditCliente && creditoPrimerVenc && creditoCuotas > 0) {
    const tempOp: Operacion = {
      id: 'OPE-TEMP',
      fechaOtorgamiento: creditoFecha,
      idCliente: generatingCreditCliente.id,
      nombreCliente: `${generatingCreditCliente.nombre || ''} ${generatingCreditCliente.apellido || ''}`.trim(),
      estado: 'ACTIVA',
      tipoOperacion: creditoTipo,
      descripcion: `Crédito ${creditoTipo}`,
      capitalEntregado: creditoCapital,
      promocionAplicada: creditoPromo,
      descuentoPorcentaje: creditoDescuento,
      totalFinanciado,
      frecuencia: creditoFrecuencia,
      cantidadCuotas: creditoCuotas,
      mesesFinanciados,
      valorCuota,
      primerVencimiento: creditoPrimerVenc,
      ultimoVencimiento: '',
      captador: generatingCreditCliente.captador || '',
      analista: generatingCreditCliente.analista || '',
      ejecutivoAtencion: activeUserRole?.nombre || 'Sistema',
      cobrador: creditoCobrador || 'Cobrador General',
      capitalRecuperado: 0,
      interesCobrado: 0,
      capitalPendiente: creditoCapital,
      totalPendiente: totalFinanciado,
      cuotasPagadas: 0,
      cuotasPendientes: creditoCuotas,
      proximoVencimiento: creditoPrimerVenc,
      ultimoPago: '',
      diasMora: 0,
      nivelMora: 'Sano',
      numeroCredito: safeOperaciones.filter(o => o && o.idCliente === generatingCreditCliente.id).length + 1,
      elegibleRenovacion: false,
      elegibleAmpliacion: false,
      fechaFinalizacion: '',
      motivoCierre: '',
      observaciones: creditoObservaciones,
      cuotasGeneradas: true
    };
    try {
      cuotasPreview = generarPlanCuotas(tempOp, feriados);
    } catch (e) {
      console.error('Error generando preview de cuotas', e);
      cuotasPreview = [];
    }
  }

  const handleConfirmGenerarCredito = () => {
    if (!generatingCreditCliente || !onAddOperacion) return;
    if (creditoCapital <= 0) {
      alert('Por favor ingrese un Capital Entregado mayor a 0.');
      return;
    }
    if (creditoCuotas <= 0) {
      alert('Por favor ingrese una Cantidad de Cuotas mayor a 0.');
      return;
    }
    if (!creditoPrimerVenc) {
      alert('Debe establecer la fecha del Primer Vencimiento.');
      return;
    }

    try {
      // Safe next operation ID generation
      const nextNum = safeOperaciones.reduce((max, o) => {
        if (o && o.id && typeof o.id === 'string') {
          const match = o.id.match(/OPE-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            return !isNaN(num) && num > max ? num : max;
          }
        }
        return max;
      }, 0) + 1;

      const generatedOpId = `OPE-${String(nextNum).padStart(3, '0')}`;
      const numCredito = safeOperaciones.filter(o => o && o.idCliente === generatingCreditCliente.id).length + 1;

      const finalizedCuotas = (cuotasPreview || []).map(cuo => ({
        ...cuo,
        id: `${generatedOpId}-CUO-${String(cuo.numeroCuota).padStart(2, '0')}`,
        idOperacion: generatedOpId,
        cobrador: creditoCobrador || generatingCreditCliente.cobradorAsignadoNombre || 'Cobrador General'
      }));

      const ultimoVenc = finalizedCuotas.length > 0 ? finalizedCuotas[finalizedCuotas.length - 1].fechaVencimiento : '';

      const nuevaOp: Operacion = {
        id: generatedOpId,
        fechaOtorgamiento: creditoFecha,
        idCliente: generatingCreditCliente.id,
        nombreCliente: `${generatingCreditCliente.nombre || ''} ${generatingCreditCliente.apellido || ''}`.trim(),
        estado: 'ACTIVA',
        tipoOperacion: creditoTipo,
        descripcion: creditoPromo ? `PROMO: ${creditoPromo}` : `Crédito ${creditoTipo} ${creditoFrecuencia}`,
        capitalEntregado: creditoCapital,
        promocionAplicada: creditoPromo,
        descuentoPorcentaje: creditoDescuento,
        totalFinanciado,
        frecuencia: creditoFrecuencia,
        cantidadCuotas: creditoCuotas,
        mesesFinanciados,
        valorCuota,
        primerVencimiento: creditoPrimerVenc,
        ultimoVencimiento: ultimoVenc,
        captador: generatingCreditCliente.captador || activeUserRole?.nombre || 'Sistema',
        analista: generatingCreditCliente.analista || activeUserRole?.nombre || 'Sistema',
        ejecutivoAtencion: activeUserRole?.nombre || 'Sistema',
        cobrador: creditoCobrador || generatingCreditCliente.cobradorAsignadoNombre || 'Cobrador General',
        capitalRecuperado: 0,
        interesCobrado: 0,
        capitalPendiente: creditoCapital,
        totalPendiente: totalFinanciado,
        cuotasPagadas: 0,
        cuotasPendientes: creditoCuotas,
        proximoVencimiento: creditoPrimerVenc,
        ultimoPago: '',
        diasMora: 0,
        nivelMora: 'Sano',
        numeroCredito: numCredito,
        elegibleRenovacion: false,
        elegibleAmpliacion: false,
        fechaFinalizacion: '',
        motivoCierre: '',
        observaciones: creditoObservaciones,
        cuotasGeneradas: true
      };

      onAddOperacion(nuevaOp, finalizedCuotas);

      const targetClient = generatingCreditCliente;
      const clientName = `${targetClient.nombre || ''} ${targetClient.apellido || ''}`.trim();

      // Update client: clear inactive debt and set to ACTIVO
      onUpdateCliente({
        ...targetClient,
        estado: 'ACTIVO',
        montoDeudaInactivo: 0,
        montoPagoInicialRefinanciacion: 0
      });

      // Clear modal state first to avoid holding rendering state open during browser alert dialog
      setGeneratingCreditCliente(null);

      setTimeout(() => {
        alert(`🎉 ¡Crédito ${generatedOpId} por $${totalFinanciado.toLocaleString('es-AR')} otorgado con éxito!\n\nCliente: ${clientName}\nPlan: ${creditoCuotas} cuotas de $${valorCuota.toLocaleString('es-AR')}\nEl cliente ha pasado automáticamente a estado ACTIVO.`);
      }, 50);
    } catch (err) {
      console.error('Error al generar crédito de refinanciación:', err);
      alert('Ocurrió un error al procesar el otorgamiento del crédito. Intente nuevamente.');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-wider mb-1">
            <UserX className="w-4 h-4" />
            <span>Módulo de Gestión Especial</span>
          </div>
          <h2 className="text-2xl font-black text-white">Clientes Inactivos con Deuda</h2>
          <p className="text-slate-400 text-xs mt-1">
            Fichas consolidadas sin cuotas periódicas. Deuda total, refinanciaciones y generación directa de nuevos créditos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Inactivos</span>
              <span className="text-lg font-black text-white">{inactivosList.length} cartera</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nombre, Apellido o DNI..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filterCobrador}
            onChange={e => setFilterCobrador(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value="TODOS">Todos los Cobradores</option>
            {cobradoresList.map(u => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* CLIENT CARDS GRID */}
      {filteredInactivos.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <UserX className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm font-bold">No se encontraron clientes inactivos con los filtros aplicados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInactivos.map(cliente => {
            const deudaTotal = getClienteDeudaTotal(cliente);
            const minimoExigible = getClienteMinimoExigible(cliente);

            return (
              <div 
                key={cliente.id}
                className="bg-slate-900 border-2 border-slate-800 hover:border-rose-500/50 rounded-3xl p-5 space-y-4 shadow-xl relative flex flex-col justify-between transition-all"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-rose-400 bg-rose-950/80 px-2.5 py-0.5 rounded-lg border border-rose-800 inline-block mb-1">
                        Cliente Inactivo
                      </span>
                      <h3 className="text-lg font-black text-white leading-snug">
                        {cliente.nombre} {cliente.apellido}
                      </h3>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">DNI: {cliente.dni}</p>
                    </div>

                    {cliente.fotoCasa && (
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden shrink-0">
                        <img src={cliente.fotoCasa} alt="Casa" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-slate-300 font-medium pt-1">
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{cliente.direccion || 'Sin dirección registrada'}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{cliente.telefono || 'Sin teléfono'}</span>
                    </p>
                  </div>
                </div>

                {/* Financial Summary Box (No Cuotas) */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-black block">Deuda Total Consolidada</span>
                      <span className="text-xl font-black text-rose-400">${deudaTotal.toLocaleString('es-AR')}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                      Sin cuotas activas
                    </span>
                  </div>

                  {/* Pago inicial y acuerdo */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[9px] text-amber-400 font-black uppercase block">Pago Inicial Refinanc.</span>
                      <span className="font-black text-amber-200 text-sm">
                        ${(cliente.montoPagoInicialRefinanciacion || Math.round(deudaTotal * 0.10)).toLocaleString('es-AR')}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[9px] text-emerald-400 font-black uppercase block">Mínimo Exigible</span>
                      <span className="font-black text-emerald-300 text-sm">
                        ${minimoExigible.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cobrador Assignment & Actions */}
                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold">Cobrador Asignado:</span>
                    <select
                      value={cliente.cobradorAsignadoId || ''}
                      onChange={e => handleReassignCobrador(cliente, e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Sin Asignar</option>
                      {cobradoresList.map(u => (
                        <option key={u.id} value={u.id}>{u.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* Primary Action: Generar Crédito */}
                  <button
                    type="button"
                    onClick={() => handleOpenGenerarCredito(cliente)}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer border border-emerald-400 transition-all shadow-md shadow-emerald-950/60 uppercase tracking-wider"
                  >
                    <Calculator className="w-4 h-4 stroke-[2.5]" />
                    <span>Generar Crédito Refinanciación</span>
                  </button>

                  {(activeUserRole?.rolId === 'ADMIN' || activeUserRole?.rolId === 'SUPERVISOR') && (
                    <button
                      type="button"
                      onClick={() => handleOpenConfigModal(cliente)}
                      className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-black text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer border border-amber-500/40 transition-all shadow-sm"
                    >
                      <Settings className="w-3.5 h-3.5 text-amber-400" />
                      <span>Editar Total Adeudado</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CONFIGURAR DEUDA Y PAGO MINIMO POR ADMIN */}
      {editingCliente && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                Configuración de Administración
              </span>
              <h3 className="text-lg font-black text-white">
                Editar Total Adeudado: {editingCliente.nombre} {editingCliente.apellido}
              </h3>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* 1. EDITAR DEUDA TOTAL INACTIVA REAL */}
              <div>
                <label className="text-xs font-black text-slate-200 block mb-1">
                  Editar Total Adeudado / Deuda Real ($)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-rose-400 absolute left-3 top-3" />
                  <input
                    type="number"
                    value={customDeudaInput}
                    onChange={e => {
                      const val = e.target.value;
                      setCustomDeudaInput(val);
                      const num = parseFloat(val);
                      if (!isNaN(num) && num > 0) {
                        setCustomMinimoInput(String(Math.round(num * 0.20)));
                        setCustomPagoInicialInput(String(Math.round(num * 0.10)));
                      }
                    }}
                    placeholder="Ej. 180000"
                    className="w-full bg-slate-950 border border-rose-500/50 rounded-xl pl-9 pr-4 py-2.5 text-white font-black text-sm focus:outline-none focus:border-rose-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Ingrese el saldo adeudado real para este cliente.
                </p>
              </div>

              {/* 2. EDITAR PAGO INICIAL PARA ACUERDO / REFINANCIACION */}
              <div>
                <label className="text-xs font-black text-slate-200 block mb-1">
                  Pago Inicial Sugerido para Acuerdo ($)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
                  <input
                    type="number"
                    value={customPagoInicialInput}
                    onChange={e => setCustomPagoInicialInput(e.target.value)}
                    placeholder="Ej. 15000"
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl pl-9 pr-4 py-2.5 text-white font-black text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* 3. EDITAR MONTO MINIMO EXIGIBLE PARA COBRADOR */}
              <div>
                <label className="text-xs font-black text-slate-200 block mb-1">
                  Monto Mínimo Exigible para Cobrador ($)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-emerald-400 absolute left-3 top-3" />
                  <input
                    type="number"
                    value={customMinimoInput}
                    onChange={e => setCustomMinimoInput(e.target.value)}
                    placeholder="Ej. 30000"
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl pl-9 pr-4 py-2.5 text-white font-black text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  El cobrador verá este monto mínimo en su pantalla de gestión.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingCliente(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveConfigInactivo}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/80 transition-all uppercase tracking-wider"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                <span>Aceptar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GENERAR CREDITO DE REFINANCIACION */}
      {generatingCreditCliente && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-emerald-950 border-2 border-emerald-500/80 rounded-3xl p-6 max-w-4xl w-full space-y-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-emerald-800/80 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider bg-emerald-900/80 border border-emerald-700 px-2.5 py-0.5 rounded-md inline-block mb-1">
                  Módulo de Liquidación & Otorgamiento
                </span>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-400" />
                  Generar Crédito de Refinanciación
                </h3>
                <p className="text-xs text-emerald-300/80 mt-1 font-medium">
                  Cliente: <strong className="text-white">{generatingCreditCliente.nombre} {generatingCreditCliente.apellido}</strong> · DNI: <span className="font-mono">{generatingCreditCliente.dni}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setGeneratingCreditCliente(null)}
                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer border border-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Credit Parameters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/90 p-5 rounded-2xl border border-emerald-800/80">
              <div>
                <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                  Fecha de Otorgamiento
                </label>
                <input
                  type="date"
                  value={creditoFecha}
                  onChange={e => setCreditoFecha(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-emerald-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                  Tipo de Operación
                </label>
                <select
                  value={creditoTipo}
                  onChange={e => setCreditoTipo(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-emerald-800 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="REFINANCIACION">REFINANCIACIÓN</option>
                  <option value="NUEVO">CRÉDITO NUEVO</option>
                  <option value="RENOVACION">RENOVACIÓN</option>
                  <option value="AMPLIACION">AMPLIACIÓN</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                  Capital a Financiar ($) *
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min={1}
                    step={500}
                    value={creditoCapital}
                    onChange={e => setCreditoCapital(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-950 border border-emerald-800 rounded-xl text-xs font-extrabold text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                  Frecuencia de Amortización
                </label>
                <select
                  value={creditoFrecuencia}
                  onChange={e => setCreditoFrecuencia(e.target.value as FrecuenciaPago)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-emerald-800 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="DIARIA">DIARIO (No Domingos, No Feriados)</option>
                  <option value="SEMANAL">SEMANAL</option>
                  <option value="QUINCENAL">QUINCENAL</option>
                  <option value="MENSUAL">MENSUAL</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                  Cantidad de Cuotas *
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={creditoCuotas}
                  onChange={e => setCreditoCuotas(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-emerald-800 rounded-xl text-xs font-extrabold text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                  Primer Vencimiento
                </label>
                <input
                  type="date"
                  disabled={creditoFrecuencia === 'DIARIA'}
                  value={creditoPrimerVenc}
                  onChange={e => setCreditoPrimerVenc(e.target.value)}
                  className={`w-full px-3.5 py-2 border rounded-xl text-xs font-bold text-white focus:outline-none ${
                    creditoFrecuencia === 'DIARIA' 
                      ? 'bg-slate-950 border-emerald-900/80 text-emerald-400/70 cursor-not-allowed' 
                      : 'bg-slate-950 border-emerald-800 focus:border-emerald-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                  Cobrador Asignado
                </label>
                <select
                  value={creditoCobrador}
                  onChange={e => setCreditoCobrador(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-emerald-800 rounded-xl text-xs font-bold text-white focus:outline-none cursor-pointer"
                >
                  <option value="">Cobrador General</option>
                  {cobradoresList.map(u => (
                    <option key={u.id} value={u.nombre}>{u.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                  Promoción Aplicada (Opcional)
                </label>
                <input
                  type="text"
                  value={creditoPromo}
                  onChange={e => setCreditoPromo(e.target.value)}
                  placeholder="Ej. Refinanciación Especial"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-emerald-800 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                  Descuento (%) (Opcional)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={creditoDescuento}
                  onChange={e => setCreditoDescuento(Math.max(0, Math.min(100, Number(e.target.value))))}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-emerald-800 rounded-xl text-xs text-white focus:outline-none font-mono"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-1">
                  Observaciones Internas
                </label>
                <input
                  type="text"
                  value={creditoObservaciones}
                  onChange={e => setCreditoObservaciones(e.target.value)}
                  placeholder="Detalles sobre el acuerdo de refinanciación..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-emerald-800 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Financial Summary Calculation Banner */}
            <div className="bg-slate-900 border-2 border-emerald-500/60 p-5 rounded-2xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 block mb-0.5">Capital Entregado</span>
                <span className="text-lg font-black text-white font-mono">${creditoCapital.toLocaleString('es-AR')}</span>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 block mb-0.5">Total Financiado</span>
                <span className="text-lg font-black text-emerald-300 font-mono">${totalFinanciado.toLocaleString('es-AR')}</span>
              </div>

              <div className="bg-emerald-900/60 border border-emerald-600/80 rounded-xl p-2.5 shadow-inner col-span-2 sm:col-span-1">
                <span className="text-[10px] font-black uppercase text-emerald-200 block mb-0.5">Valor por Cuota</span>
                <span className="text-xl font-black text-emerald-100 font-mono">${valorCuota.toLocaleString('es-AR')}</span>
              </div>

              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400 block mb-0.5">Cuotas / Frecuencia</span>
                <span className="text-base font-black text-white">{creditoCuotas} cuotas ({creditoFrecuencia})</span>
              </div>
            </div>

            {/* Installments Schedule Preview Table */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-black uppercase text-emerald-300 tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>Plan de Cuotas Generado ({cuotasPreview.length} fechas)</span>
                </h4>
                {cuotasPreview.length > 0 && (
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    Fin: {cuotasPreview[cuotasPreview.length - 1].fechaVencimiento}
                  </span>
                )}
              </div>

              <div className="bg-slate-950 rounded-2xl border border-emerald-800/80 overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300 border-collapse">
                  <thead className="bg-slate-900 text-[10px] uppercase font-black text-emerald-400 sticky top-0 border-b border-emerald-800">
                    <tr>
                      <th className="p-2.5">Nº</th>
                      <th className="p-2.5">Vencimiento</th>
                      <th className="p-2.5 text-right">Valor Cuota</th>
                      <th className="p-2.5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {cuotasPreview.map(cuo => (
                      <tr key={cuo.numeroCuota} className="hover:bg-slate-900/50">
                        <td className="p-2.5 font-bold text-white">Cuota #{cuo.numeroCuota}</td>
                        <td className="p-2.5 font-mono text-emerald-300">{cuo.fechaVencimiento}</td>
                        <td className="p-2.5 text-right font-black text-white font-mono">${(cuo.valorTotalCuota || (cuo as any).monto || 0).toLocaleString('es-AR')}</td>
                        <td className="p-2.5 text-center">
                          <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-[9px] font-bold">
                            PENDIENTE
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-emerald-800/80">
              <button
                type="button"
                onClick={() => setGeneratingCreditCliente(null)}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs px-5 py-3 rounded-xl cursor-pointer border border-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmGenerarCredito}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-6 py-3 rounded-xl flex items-center gap-2 cursor-pointer shadow-xl shadow-emerald-950/80 transition-all uppercase tracking-wider border border-emerald-400"
              >
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>Confirmar y Otorgar Crédito</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
