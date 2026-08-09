/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Cliente, Operacion, Cuota, Pago, UsuarioRol, TransaccionTesoreria } from '../types';
import { generarPlanCuotas, normalizeDateToISO, sortCuotasByPaymentPriority } from '../utils/cuotasGenerator';
import { 
  Users, Search, Calendar, DollarSign, Edit2, Trash2, CheckCircle2, 
  X, Phone, MapPin, CreditCard, Shield, AlertTriangle, Eye, ArrowRight,
  Clock, Check, RefreshCw, FileText, UserX
} from 'lucide-react';

interface ClientesTodosViewProps {
  clientes: Cliente[];
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
  usuarios?: UsuarioRol[];
  activeUser?: UsuarioRol | null;
  onAddPago?: (pago: Pago, updatedCuotas: Cuota[], updatedOperacion: Operacion, tesoreriaTrx: TransaccionTesoreria) => void;
  onUpdateOperacion?: (operacion: Operacion, cuotasActualizadas?: Cuota[]) => void;
  onDeleteOperacion?: (idOperacion: string) => void;
  onUpdateCliente?: (cliente: Cliente) => void;
}

export default function ClientesTodosView({
  clientes,
  operaciones = [],
  cuotas = [],
  pagos = [],
  usuarios = [],
  activeUser = null,
  onAddPago,
  onUpdateOperacion,
  onDeleteOperacion,
  onUpdateCliente
}: ClientesTodosViewProps) {
  // Main Subtabs for Clientes (Todos)
  const [activeFrequencyTab, setActiveFrequencyTab] = useState<'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'INACTIVOS'>('DIARIO');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selected client for Viewing Ficha / Cuotas
  const [selectedClientFicha, setSelectedClientFicha] = useState<Cliente | null>(null);

  // Payment Entry Modal state
  const [pagoModalCliente, setPagoModalCliente] = useState<Cliente | null>(null);
  const [selectedOpId, setSelectedOpId] = useState<string>('');
  const [pagoMonto, setPagoMonto] = useState<string>('');
  const [pagoMedio, setPagoMedio] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO'>('EFECTIVO');
  const [pagoFecha, setPagoFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [pagoCobrador, setPagoCobrador] = useState<string>(activeUser?.nombre || 'Administrador');
  const [pagoObservaciones, setPagoObservaciones] = useState<string>('');

  // Loan Edit Modal state
  const [editingLoan, setEditingLoan] = useState<Operacion | null>(null);
  const [editMontoPrestamo, setEditMontoPrestamo] = useState<string>('');
  const [editMontoTotal, setEditMontoTotal] = useState<string>('');
  const [editValorCuota, setEditValorCuota] = useState<string>('');
  const [editCantidadCuotas, setEditCantidadCuotas] = useState<string>('');
  const [editFrecuencia, setEditFrecuencia] = useState<'DIARIO' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL'>('DIARIO');
  const [editEstado, setEditEstado] = useState<'ACTIVA' | 'FINALIZADA' | 'VENCIDA' | 'CONGELADA'>('ACTIVA');

  // Delete Loan Confirmation state
  const [deletingLoanId, setDeletingLoanId] = useState<string | null>(null);

  // Helper to describe credits for a client
  const getClientCreditDescription = (client: Cliente): string => {
    const cOps = operaciones.filter(o => o.idCliente === client.id);
    const activeOps = cOps.filter(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA');

    if (client.estado === 'INACTIVO' || activeOps.length === 0) {
      if (client.estado === 'INACTIVO' || client.esClienteInactivoRefinanciacion) {
        return '1 Crédito Inactivo (Refinanciación Pendiente)';
      }
      const finalizadasCount = cOps.filter(o => o.estado === 'FINALIZADA').length;
      if (finalizadasCount > 0) {
        return `${finalizadasCount} Crédito(s) Finalizado(s)`;
      }
      return 'Sin créditos registrados';
    }

    const diarios = activeOps.filter(o => (o.frecuencia || '').toUpperCase().includes('DIAR')).length;
    const semanales = activeOps.filter(o => (o.frecuencia || '').toUpperCase().includes('SEMAN')).length;
    const mensuales = activeOps.filter(o => {
      const freq = (o.frecuencia || '').toUpperCase();
      return freq.includes('MENSUAL') || freq.includes('QUINCEN');
    }).length;

    const parts: string[] = [];
    if (diarios > 0) parts.push(`${diarios} Diario${diarios > 1 ? 's' : ''}`);
    if (semanales > 0) parts.push(`${semanales} Semanal${semanales > 1 ? 's' : ''}`);
    if (mensuales > 0) parts.push(`${mensuales} Mensual${mensuales > 1 ? 's' : ''}`);

    if (parts.length > 0) {
      return parts.join(' + ');
    }

    return `${activeOps.length} Crédito(s) Activo(s)`;
  };

  // Helper to check if a client belongs to a frequency tab
  const filterClientByTab = (client: Cliente, tab: 'DIARIO' | 'SEMANAL' | 'MENSUAL' | 'INACTIVOS'): boolean => {
    const cOps = operaciones.filter(o => o.idCliente === client.id);
    const activeOps = cOps.filter(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA');

    const isInactiveClient = 
      client.estado === 'INACTIVO' || 
      client.esClienteInactivoRefinanciacion === true ||
      activeOps.length === 0 || 
      (cOps.length > 0 && cOps.every(o => o.estado === 'FINALIZADA' || o.estado === 'REFINANCIADA'));

    if (tab === 'INACTIVOS') {
      return isInactiveClient;
    }

    // Inactive clients must ONLY appear in INACTIVOS tab
    if (isInactiveClient) {
      return false;
    }

    if (tab === 'DIARIO') {
      return activeOps.some(o => (o.frecuencia || '').toUpperCase().includes('DIAR'));
    }

    if (tab === 'SEMANAL') {
      return activeOps.some(o => (o.frecuencia || '').toUpperCase().includes('SEMAN'));
    }

    if (tab === 'MENSUAL') {
      return activeOps.some(o => {
        const freq = (o.frecuencia || '').toUpperCase();
        return freq.includes('MENSUAL') || freq.includes('QUINCEN');
      });
    }

    return false;
  };

  // Counts for badge indicators
  const diarioCount = clientes.filter(c => filterClientByTab(c, 'DIARIO')).length;
  const semanalCount = clientes.filter(c => filterClientByTab(c, 'SEMANAL')).length;
  const mensualCount = clientes.filter(c => filterClientByTab(c, 'MENSUAL')).length;
  const inactivosCount = clientes.filter(c => filterClientByTab(c, 'INACTIVOS')).length;

  // Filtered clients list
  const filteredClients = clientes
    .filter(c => filterClientByTab(c, activeFrequencyTab))
    .filter(c => {
      if (!searchTerm || !searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      const nombre = (c.nombre || '').toLowerCase();
      const apellido = (c.apellido || '').toLowerCase();
      const dni = (c.dni || '');
      const telefono = (c.telefono || '');
      const direccion = (c.direccion || `${c.calle || ''} ${c.numero || ''}`).toLowerCase();
      return (
        nombre.includes(term) ||
        apellido.includes(term) ||
        dni.includes(term) ||
        telefono.includes(term) ||
        direccion.includes(term)
      );
    });

  // Handlers for Loan Modification
  const handleOpenEditLoan = (loan: Operacion) => {
    setEditingLoan(loan);
    setEditMontoPrestamo(String(loan.capitalEntregado || (loan as any).montoPrestamo || 0));
    setEditMontoTotal(String(loan.totalFinanciado || (loan as any).montoTotalDevolver || 0));
    setEditValorCuota(String(loan.valorCuota || 0));
    setEditCantidadCuotas(String(loan.cantidadCuotas || (loan as any).cuotasTotales || 0));
    setEditFrecuencia((loan.frecuencia as any) || 'DIARIO');
    setEditEstado((loan.estado as any) || 'ACTIVA');
  };

  const handleSaveEditedLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoan || !onUpdateOperacion) return;

    const capitalEntregado = parseFloat(editMontoPrestamo) || 0;
    const totalFinanciado = parseFloat(editMontoTotal) || 0;
    const valorCuota = parseFloat(editValorCuota) || 0;
    const cantidadCuotas = parseInt(editCantidadCuotas, 10) || 1;

    const updatedLoan: Operacion = {
      ...editingLoan,
      capitalEntregado,
      montoPrestamo: capitalEntregado,
      totalFinanciado,
      montoTotalDevolver: totalFinanciado,
      valorCuota,
      cantidadCuotas,
      cuotasTotales: cantidadCuotas,
      cuotasPendientes: Math.max(0, cantidadCuotas - (editingLoan.cuotasPagadas || 0)),
      frecuencia: editFrecuencia as any,
      estado: editEstado as any,
      totalPendiente: Math.max(0, totalFinanciado - (editingLoan.capitalRecuperado || 0)),
    };

    onUpdateOperacion(updatedLoan);
    setEditingLoan(null);
  };

  // Handler for Loan Deletion
  const handleConfirmDeleteLoan = () => {
    if (!deletingLoanId || !onDeleteOperacion) return;
    onDeleteOperacion(deletingLoanId);
    setDeletingLoanId(null);
  };

  // Handlers for Payment Registration
  const handleOpenPagoModal = (client: Cliente, opId?: string) => {
    setPagoModalCliente(client);
    const clientOps = operaciones.filter(o => o.idCliente === client.id && o.estado !== 'FINALIZADA');
    if (opId) {
      setSelectedOpId(opId);
    } else if (clientOps.length > 0) {
      setSelectedOpId(clientOps[0].id);
    }
    setPagoMonto('');
    setPagoFecha(new Date().toISOString().split('T')[0]);
    setPagoCobrador(activeUser?.nombre || 'Administrador');
  };

  const handleConfirmarPago = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pagoModalCliente || !onAddPago) return;

    const monto = parseFloat(pagoMonto);
    if (isNaN(monto) || monto <= 0) {
      alert('Ingrese un monto de pago válido.');
      return;
    }

    const opToUse = operaciones.find(o => o.id === selectedOpId) || operaciones.find(o => o.idCliente === pagoModalCliente.id);
    if (!opToUse) {
      alert('No se encontró la operación para registrar el pago.');
      return;
    }

    const opCuotas = cuotas.filter(c => c.idOperacion === opToUse.id);
    const cuotasToProcess = sortCuotasByPaymentPriority(opCuotas, pagoFecha);
    
    // Allocate payment across pending cuotas
    let remPago = monto;
    const affectedCuotaNums: number[] = [];
    const cuotaUpdatesMap = new Map<string, Cuota>();

    cuotasToProcess.forEach(c => {
      if (c.estado === 'PAGADA' || remPago <= 0) {
        if (!cuotaUpdatesMap.has(c.id)) cuotaUpdatesMap.set(c.id, c);
        return;
      }

      const cCopy = { ...c };
      affectedCuotaNums.push(cCopy.numeroCuota);

      if (remPago >= cCopy.saldoPendiente) {
        remPago -= cCopy.saldoPendiente;
        cCopy.importePagado = cCopy.valorTotalCuota;
        cCopy.saldoPendiente = 0;
        cCopy.estado = 'PAGADA';
        cCopy.fechaPago = normalizeDateToISO(pagoFecha);
        cCopy.cobrador = pagoCobrador;
      } else {
        const paidThis = remPago;
        remPago = 0;
        cCopy.importePagado = parseFloat((cCopy.importePagado + paidThis).toFixed(2));
        cCopy.saldoPendiente = parseFloat((cCopy.saldoPendiente - paidThis).toFixed(2));
        cCopy.estado = 'PAGO_PARCIAL';
        cCopy.fechaPago = normalizeDateToISO(pagoFecha);
        cCopy.cobrador = pagoCobrador;
      }
      cuotaUpdatesMap.set(cCopy.id, cCopy);
    });

    const updatedCuotas = opCuotas.map(c => cuotaUpdatesMap.get(c.id) || c);
    const pagadasNow = updatedCuotas.filter(c => c.estado === 'PAGADA').length;

    const newPago: Pago = {
      id: `PAGO-${Date.now()}`,
      idOperacion: opToUse.id,
      idCliente: pagoModalCliente.id,
      nombreCliente: `${pagoModalCliente.nombre} ${pagoModalCliente.apellido}`,
      importe: monto,
      fechaPago: normalizeDateToISO(pagoFecha),
      horaPago: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      cobrador: pagoCobrador,
      metodoPago: (pagoMedio as any) || 'EFECTIVO',
      observaciones: pagoObservaciones || 'Pago registrado desde Clientes (todos)',
      cuotasAfectadas: affectedCuotaNums.length > 0 ? `Cuotas N° ${affectedCuotaNums.join(', ')}` : `Cuota ${opToUse.cuotasPagadas + 1}`
    };

    const updatedOperacion: Operacion = {
      ...opToUse,
      capitalRecuperado: (opToUse.capitalRecuperado || 0) + monto,
      totalPendiente: Math.max(0, (opToUse.totalPendiente || (opToUse as any).montoTotalDevolver || 0) - monto),
      cuotasPagadas: pagadasNow,
      cuotasPendientes: Math.max(0, opToUse.cantidadCuotas - pagadasNow),
      ultimoPago: pagoFecha
    };

    const tesoreriaTrx: TransaccionTesoreria = {
      id: `TRX-${Date.now()}`,
      fecha: pagoFecha,
      tipo: 'INGRESO',
      concepto: `Cobro Administración - Cliente ${pagoModalCliente.nombre} ${pagoModalCliente.apellido}`,
      monto: monto,
      referenciaId: newPago.id
    };

    onAddPago(newPago, updatedCuotas, updatedOperacion, tesoreriaTrx);

    if (pagoModalCliente.estado === 'INACTIVO' && onUpdateCliente) {
      onUpdateCliente({
        ...pagoModalCliente,
        estado: 'ACTIVO',
        esClienteInactivoRefinanciacion: false
      });
    }

    setPagoModalCliente(null);
    setPagoMonto('');
    setPagoObservaciones('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-6 rounded-3xl border border-emerald-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/40">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Clientes (todos)
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Panel Administrador
              </span>
            </h2>
            <p className="text-xs text-emerald-200/80 mt-1">
              Directorio completo segmentado por modalidad de crédito (Diario, Semanal, Mensual, Inactivos).
            </p>
          </div>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nombre, DNI, Tel o Dirección..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-emerald-800 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
      </div>

      {/* SUBTABS DE NAVEGACIÓN (4 PESTAÑAS SOLICITADAS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Pestaña 1: Crédito Diario */}
        <button
          type="button"
          onClick={() => setActiveFrequencyTab('DIARIO')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative overflow-hidden ${
            activeFrequencyTab === 'DIARIO'
              ? 'bg-gradient-to-br from-emerald-900 to-slate-900 border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg'
              : 'bg-slate-900/80 border-slate-800 hover:border-emerald-800/80 hover:bg-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Crédito Diario
            </span>
            <span className="px-2 py-0.5 text-xs font-black rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              {diarioCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-medium">Clientes con cobro diario activo</p>
        </button>

        {/* Pestaña 2: Crédito Semanal */}
        <button
          type="button"
          onClick={() => setActiveFrequencyTab('SEMANAL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative overflow-hidden ${
            activeFrequencyTab === 'SEMANAL'
              ? 'bg-gradient-to-br from-teal-900 to-slate-900 border-teal-400 ring-2 ring-teal-500/40 shadow-lg'
              : 'bg-slate-900/80 border-slate-800 hover:border-teal-800/80 hover:bg-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-teal-300" />
              Crédito Semanal
            </span>
            <span className="px-2 py-0.5 text-xs font-black rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/40">
              {semanalCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-medium">Clientes con cobro semanal activo</p>
        </button>

        {/* Pestaña 3: Crédito Mensual */}
        <button
          type="button"
          onClick={() => setActiveFrequencyTab('MENSUAL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative overflow-hidden ${
            activeFrequencyTab === 'MENSUAL'
              ? 'bg-gradient-to-br from-indigo-950 to-slate-900 border-indigo-400 ring-2 ring-indigo-500/40 shadow-lg'
              : 'bg-slate-900/80 border-slate-800 hover:border-indigo-800/80 hover:bg-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-indigo-300" />
              Crédito Mensual
            </span>
            <span className="px-2 py-0.5 text-xs font-black rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              {mensualCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-medium">Clientes con cobro mensual o quincenal</p>
        </button>

        {/* Pestaña 4: Créditos Inactivos */}
        <button
          type="button"
          onClick={() => setActiveFrequencyTab('INACTIVOS')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative overflow-hidden ${
            activeFrequencyTab === 'INACTIVOS'
              ? 'bg-gradient-to-br from-rose-950 to-slate-900 border-rose-400 ring-2 ring-rose-500/40 shadow-lg'
              : 'bg-slate-900/80 border-slate-800 hover:border-rose-800/80 hover:bg-slate-800/80'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <UserX className="w-4 h-4 text-rose-400" />
              Créditos Inactivos
            </span>
            <span className="px-2 py-0.5 text-xs font-black rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40">
              {inactivosCount}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 font-medium">Clientes inactivos / refinanciación</p>
        </button>
      </div>

      {/* CLIENT LIST TABLE / GRID */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
          <span className="text-xs font-black uppercase text-emerald-400 tracking-wider">
            Listado de Clientes ({filteredClients.length})
          </span>
          <span className="text-[11px] text-slate-400 font-semibold">
            Haga clic en la ficha de un cliente para ver sus cuotas, ingresar pago o modificar crédito
          </span>
        </div>

        {filteredClients.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
            <p className="text-sm font-bold text-slate-300">No se encontraron clientes en esta categoría.</p>
            <p className="text-xs text-slate-500">Pruebe seleccionando otra pestaña de frecuencia o cambiando el filtro de búsqueda.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {filteredClients.map(client => {
              const creditDesc = getClientCreditDescription(client);
              const clientOps = operaciones.filter(o => o.idCliente === client.id);
              const activeOps = clientOps.filter(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA');
              
              const totalDeuda = activeOps.reduce((sum, o) => {
                const opCuotas = cuotas.filter(c => c.idOperacion === o.id && c.estado !== 'PAGADA');
                if (opCuotas.length > 0) {
                  return sum + opCuotas.reduce((cSum, c) => cSum + (Number(c.saldoPendiente) || Number(c.valorTotalCuota) || Number(o.valorCuota) || 0), 0);
                }
                const cuotasRestantes = Math.max(0, (o.cantidadCuotas || (o as any).cuotasTotales || 1) - (o.cuotasPagadas || 0));
                return sum + (cuotasRestantes * (Number(o.valorCuota) || 0));
              }, 0);

              return (
                <div 
                  key={client.id}
                  className="p-4 hover:bg-slate-800/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer group"
                  onClick={() => setSelectedClientFicha(client)}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-base shrink-0 shadow-md group-hover:scale-105 transition-transform">
                      {client.nombre && client.nombre.trim() ? client.nombre.trim()[0].toUpperCase() : 'C'}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold text-white group-hover:text-emerald-300 transition-colors">
                          {client.nombre} {client.apellido}
                        </h3>
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800">
                          {creditDesc}
                        </span>
                        {client.estado === 'INACTIVO' && (
                          <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-rose-950 text-rose-300 border border-rose-800">
                            INACTIVO
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        {client.dni && (
                          <span className="flex items-center gap-1">
                            <strong>DNI:</strong> {client.dni}
                          </span>
                        )}
                        {client.telefono && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-400" />
                            {client.telefono}
                          </span>
                        )}
                        {(client.direccion || client.calle) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-teal-400" />
                            {client.direccion || `${client.calle || ''} ${client.numero || ''}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Quick Action Box */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Deuda Total Activa
                      </span>
                      <span className="text-sm font-black text-emerald-300">
                        ${totalDeuda.toLocaleString('es-AR')}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClientFicha(client);
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Ver Ficha y Cuotas</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: FICHA DEL CLIENTE Y GESTIÓN DE CUOTAS                            */}
      {/* ========================================================================= */}
      {selectedClientFicha && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-b border-emerald-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-lg">
                  {selectedClientFicha.nombre ? selectedClientFicha.nombre[0].toUpperCase() : 'C'}
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    Ficha del Cliente: {selectedClientFicha.nombre} {selectedClientFicha.apellido}
                  </h3>
                  <p className="text-xs text-emerald-300/80">
                    Resumen de créditos: <strong className="text-white">{getClientCreditDescription(selectedClientFicha)}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedClientFicha(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Client Data Summary */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DNI</span>
                  <span className="text-white font-bold">{selectedClientFicha.dni || 'Sin especificar'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Teléfono / WhatsApp</span>
                  <span className="text-emerald-300 font-bold">{selectedClientFicha.telefono || selectedClientFicha.whatsapp || 'Sin especificar'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Dirección</span>
                  <span className="text-white font-bold">{selectedClientFicha.direccion || `${selectedClientFicha.calle || ''} ${selectedClientFicha.numero || ''}`}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cobrador Asignado</span>
                  <span className="text-teal-300 font-bold">{selectedClientFicha.cobradorAsignadoNombre || 'Sin asignar'}</span>
                </div>
              </div>

              {/* Action Bar for Client */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-emerald-950/60 p-3 rounded-2xl border border-emerald-800/80">
                <span className="text-xs font-black uppercase text-emerald-300">
                  Acciones Rápidas para este Cliente:
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenPagoModal(selectedClientFicha)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl flex items-center gap-2 shadow-md cursor-pointer transition-all uppercase tracking-wider"
                >
                  <DollarSign className="w-4 h-4 text-yellow-300" />
                  <span>Ingresar Pago (Cobrar)</span>
                </button>
              </div>

              {/* Operations and Cuotas List */}
              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                  Créditos u Operaciones del Cliente
                </h4>

                {operaciones.filter(o => o.idCliente === selectedClientFicha.id).length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800">
                    <p className="text-xs font-bold text-slate-300">Este cliente no posee créditos cargados actualmente.</p>
                  </div>
                ) : (
                  operaciones.filter(o => o.idCliente === selectedClientFicha.id).map(loan => {
                    let loanCuotas = cuotas.filter(c => c.idOperacion === loan.id).sort((a,b) => a.numeroCuota - b.numeroCuota);
                    if (loanCuotas.length === 0) {
                      loanCuotas = generarPlanCuotas(loan, []);
                    }

                    const pendingCuotas = loanCuotas.filter(c => c.estado !== 'PAGADA');
                    const saldoPendienteReal = pendingCuotas.reduce((sum, c) => sum + (c.saldoPendiente > 0 ? c.saldoPendiente : c.valorTotalCuota || loan.valorCuota || 0), 0);
                    const cuotasPagadasCount = loanCuotas.filter(c => c.estado === 'PAGADA').length;

                    return (
                      <div key={loan.id} className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                        {/* Loan Summary */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-white">Crédito ID: {loan.id}</span>
                              <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md border ${
                                loan.estado === 'ACTIVA' 
                                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                  : loan.estado === 'VENCIDA'
                                  ? 'bg-rose-950 text-rose-300 border-rose-800'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}>
                                {loan.estado}
                              </span>
                              <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-md bg-teal-950 text-teal-300 border border-teal-800">
                                {loan.frecuencia}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              Monto Prestado: <strong className="text-white">${(loan.capitalEntregado || (loan as any).montoPrestamo || 0).toLocaleString('es-AR')}</strong> | Total Financiado Original: <strong className="text-slate-300">${(loan.totalFinanciado || (loan as any).montoTotalDevolver || 0).toLocaleString('es-AR')}</strong> | Cuotas Pagadas: <strong className="text-emerald-300">{cuotasPagadasCount} / {loan.cantidadCuotas || (loan as any).cuotasTotales}</strong> | Saldo Pendiente Actual: <strong className="text-yellow-400 font-extrabold">${saldoPendienteReal.toLocaleString('es-AR')}</strong> (Valor Cuota: <strong className="text-white">${(loan.valorCuota || 0).toLocaleString('es-AR')}</strong>)
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditLoan(loan)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 hover:text-white font-bold text-xs rounded-lg border border-teal-500/40 flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Modificar Crédito</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeletingLoanId(loan.id)}
                              className="px-3 py-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold text-xs rounded-lg border border-rose-800 flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </div>

                        {/* Cuotas List */}
                        <div className="space-y-2">
                          <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block">
                            Listado de Cuotas de este Crédito:
                          </span>

                          <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/80 bg-slate-900/60">
                            {loanCuotas.length === 0 ? (
                              <div className="p-3 text-center text-xs text-slate-500">
                                No hay detalle de cuotas individuales para este crédito.
                              </div>
                            ) : (
                              loanCuotas.map(cuota => {
                                const todayStr = new Date().toISOString().split('T')[0];
                                const isPagada = cuota.estado === 'PAGADA';
                                const isOverdue = !isPagada && (cuota.estado === 'VENCIDA' || cuota.fechaVencimiento < todayStr);
                                const isParcial = cuota.estado === 'PAGO_PARCIAL';

                                let badgeColor = 'bg-amber-950 text-amber-400 border-amber-800';
                                let badgeLabel = 'PENDIENTE';

                                if (isPagada) {
                                  badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-700';
                                  badgeLabel = 'PAGADA';
                                } else if (isOverdue) {
                                  badgeColor = 'bg-rose-950 text-rose-300 border-rose-700 font-bold';
                                  badgeLabel = 'EN MORA';
                                } else if (isParcial) {
                                  badgeColor = 'bg-amber-950 text-amber-300 border-amber-700';
                                  badgeLabel = 'PAGO PARCIAL';
                                }

                                return (
                                  <div key={cuota.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-800/40 transition-colors">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-white w-20">Cuota N° {cuota.numeroCuota}</span>
                                      <span className="text-slate-400">Vencimiento: {cuota.fechaVencimiento}</span>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <span className="font-extrabold text-white">
                                        ${((cuota as any).montoCuota || cuota.valorTotalCuota || 0).toLocaleString('es-AR')}
                                      </span>

                                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-md border ${badgeColor}`}>
                                        {badgeLabel}
                                      </span>

                                      {cuota.saldoPendiente > 0 && cuota.saldoPendiente < (cuota.valorTotalCuota || 0) && (
                                        <span className="text-[11px] text-amber-300 font-bold">
                                          Resta: ${cuota.saldoPendiente.toLocaleString('es-AR')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedClientFicha(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INGRESAR PAGO (COBRAR)                                            */}
      {/* ========================================================================= */}
      {pagoModalCliente && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-emerald-500 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-base">
                <DollarSign className="w-6 h-6 text-yellow-400" />
                <span>Ingresar Pago: {pagoModalCliente.nombre} {pagoModalCliente.apellido}</span>
              </div>
              <button
                onClick={() => setPagoModalCliente(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmarPago} className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-300 block mb-1">
                  Monto Cobrado ($ ARS)
                </label>
                <input
                  type="number"
                  step="any"
                  value={pagoMonto}
                  onChange={(e) => setPagoMonto(e.target.value)}
                  placeholder="Ej: 5000"
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-emerald-800 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-300 block mb-1">
                    Medio de Pago
                  </label>
                  <select
                    value={pagoMedio}
                    onChange={(e) => setPagoMedio(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold cursor-pointer"
                  >
                    <option value="EFECTIVO">💵 Efectivo</option>
                    <option value="TRANSFERENCIA">💳 Transferencia</option>
                    <option value="DEPOSITO">🏦 Depósito</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-300 block mb-1">
                    Fecha de Pago
                  </label>
                  <input
                    type="date"
                    value={pagoFecha}
                    onChange={(e) => setPagoFecha(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-300 block mb-1">
                  Observaciones / Nota
                </label>
                <input
                  type="text"
                  value={pagoObservaciones}
                  onChange={(e) => setPagoObservaciones(e.target.value)}
                  placeholder="Ej: Pago parcial / adelantado"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPagoModalCliente(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg cursor-pointer transition-all uppercase tracking-wider"
                >
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: MODIFICAR CRÉDITO                                                 */}
      {/* ========================================================================= */}
      {editingLoan && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-teal-500 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-teal-300 font-black text-base">
                <Edit2 className="w-5 h-5 text-teal-400" />
                <span>Modificar Crédito ID: {editingLoan.id}</span>
              </div>
              <button
                onClick={() => setEditingLoan(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedLoan} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-300 block mb-1">
                    Capital Entregado ($)
                  </label>
                  <input
                    type="number"
                    value={editMontoPrestamo}
                    onChange={(e) => setEditMontoPrestamo(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-300 block mb-1">
                    Total Financiado ($)
                  </label>
                  <input
                    type="number"
                    value={editMontoTotal}
                    onChange={(e) => setEditMontoTotal(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-300 block mb-1">
                    Valor Cuota ($)
                  </label>
                  <input
                    type="number"
                    value={editValorCuota}
                    onChange={(e) => setEditValorCuota(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-300 block mb-1">
                    Cantidad Cuotas
                  </label>
                  <input
                    type="number"
                    value={editCantidadCuotas}
                    onChange={(e) => setEditCantidadCuotas(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-300 block mb-1">
                    Frecuencia
                  </label>
                  <select
                    value={editFrecuencia}
                    onChange={(e) => setEditFrecuencia(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold cursor-pointer"
                  >
                    <option value="DIARIO">DIARIO</option>
                    <option value="SEMANAL">SEMANAL</option>
                    <option value="QUINCENAL">QUINCENAL</option>
                    <option value="MENSUAL">MENSUAL</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-300 block mb-1">
                    Estado del Crédito
                  </label>
                  <select
                    value={editEstado}
                    onChange={(e) => setEditEstado(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold cursor-pointer"
                  >
                    <option value="ACTIVA">ACTIVA</option>
                    <option value="VENCIDA">VENCIDA</option>
                    <option value="FINALIZADA">FINALIZADA</option>
                    <option value="CONGELADA">CONGELADA</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingLoan(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-black text-xs rounded-xl shadow-lg cursor-pointer transition-all uppercase tracking-wider"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ELIMINAR CRÉDITO CONFIRMATION                                    */}
      {/* ========================================================================= */}
      {deletingLoanId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400 font-black text-base">
              <AlertTriangle className="w-6 h-6" />
              <span>Confirmar Eliminación de Crédito</span>
            </div>

            <p className="text-xs text-slate-300">
              ¿Está seguro de que desea eliminar el crédito <strong>{deletingLoanId}</strong>? Esta acción borrará la operación y sus cuotas asociadas.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingLoanId(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteLoan}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg cursor-pointer transition-all uppercase tracking-wider"
              >
                Eliminar Crédito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
