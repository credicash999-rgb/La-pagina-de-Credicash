/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TransaccionTesoreria, LiquidacionPersonal, Cliente, Operacion, Cuota, Pago } from '../types';
import { 
  DollarSign, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, 
  Plus, Check, Calendar, Activity, ClipboardList, Wallet, Users, Award, Percent, Tag, ShieldAlert,
  BarChart3, Coins, Briefcase, FileText, ArrowRightLeft
} from 'lucide-react';

interface TesoreriaViewProps {
  transacciones: TransaccionTesoreria[];
  onAddTransaccion: (trx: TransaccionTesoreria) => void;
  liquidaciones?: LiquidacionPersonal[];
  onAddLiquidacion?: (liq: LiquidacionPersonal) => void;
  onUpdateLiquidacion?: (liq: LiquidacionPersonal) => void;
  clientes?: Cliente[];
  operaciones?: Operacion[];
  cuotas?: Cuota[];
  pagos?: Pago[];
}

export default function TesoreriaView({
  transacciones,
  onAddTransaccion,
  liquidaciones = [],
  onAddLiquidacion,
  onUpdateLiquidacion,
  clientes = [],
  operaciones = [],
  cuotas = [],
  pagos = [],
}: TesoreriaViewProps) {
  const [activeTab, setActiveTab] = useState<'flujo' | 'gastos' | 'contabilidad'>('flujo');
  
  // Existing states
  const [isAdding, setIsAdding] = useState(false);
  const [tipo, setTipo] = useState<'INGRESO' | 'EGRESO'>('INGRESO');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState<number>(0);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  // Liquidaciones states
  const [isAddingLiq, setIsAddingLiq] = useState(false);
  const [colaboradorNombre, setColaboradorNombre] = useState('');
  const [rolColaborador, setRolColaborador] = useState('Cobrador de Calle');
  const [periodo, setPeriodo] = useState('');
  const [montoBase, setMontoBase] = useState<number>(0);
  const [comisiones, setComisiones] = useState<number>(0);
  const [premios, setPremios] = useState<number>(0);
  const [descuentos, setDescuentos] = useState<number>(0);
  const [liqEstado, setLiqEstado] = useState<'PAGADA' | 'PENDIENTE'>('PENDIENTE');
  const [medioPago, setMedioPago] = useState<'EFECTIVO' | 'TRANSFERENCIA'>('TRANSFERENCIA');
  const [liqObservaciones, setLiqObservaciones] = useState('');

  // Date Filter Range: day, week, month, 3m, 6m, 1y, or all (Histórico)
  const [dateFilter, setDateFilter] = useState<'all' | 'day' | 'week' | 'month' | '3m' | '6m' | '1y'>('all');
  const [acDateFilter, setAcDateFilter] = useState<'all' | 'day' | 'week' | 'month' | '3m' | '6m' | '1y'>('all');

  // Helper: Filter transactions by date range
  const filterTransactionsByDate = (trxList: TransaccionTesoreria[]) => {
    if (dateFilter === 'all') return trxList;
    
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Ensure end of today
    
    return trxList.filter(t => {
      const trxDate = new Date(t.fecha);
      if (isNaN(trxDate.getTime())) return true; // Fail safe
      
      const diffTime = today.getTime() - trxDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      switch (dateFilter) {
        case 'day':
          return diffDays <= 1;
        case 'week':
          return diffDays <= 7;
        case 'month':
          return diffDays <= 30;
        case '3m':
          return diffDays <= 90;
        case '6m':
          return diffDays <= 180;
        case '1y':
          return diffDays <= 365;
        default:
          return true;
      }
    });
  };

  const filteredTrxs = filterTransactionsByDate(transacciones);

  // Calculations
  const totalIngresos = filteredTrxs
    .filter(t => t.tipo === 'INGRESO')
    .reduce((acc, t) => acc + t.monto, 0);

  const totalEgresos = filteredTrxs
    .filter(t => t.tipo === 'EGRESO')
    .reduce((acc, t) => acc + t.monto, 0);

  const balanceNeto = totalIngresos - totalEgresos;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!concepto || monto <= 0) {
      alert('Por favor complete la descripción y especifique un monto mayor a cero.');
      return;
    }

    const nuevaTrx: TransaccionTesoreria = {
      id: `TRX-${String(Date.now())}`,
      fecha,
      tipo,
      concepto,
      monto,
    };

    onAddTransaccion(nuevaTrx);
    setIsAdding(false);
    setConcepto('');
    setMonto(0);
    alert('¡Transacción de tesorería registrada con éxito!');
  };

  const handleAddLiqSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!colaboradorNombre || !periodo || montoBase < 0) {
      alert('Por favor complete el nombre del colaborador, el periodo y el sueldo base.');
      return;
    }

    const total = montoBase + comisiones + premios - descuentos;

    const nuevaLiq: LiquidacionPersonal = {
      id: `LIQ-${String(Date.now())}`,
      fecha: new Date().toISOString().split('T')[0],
      colaboradorNombre,
      rolColaborador,
      periodo,
      montoBase,
      comisiones,
      premios,
      descuentos,
      montoTotal: total,
      estado: liqEstado,
      medioPago: liqEstado === 'PAGADA' ? medioPago : undefined,
      observaciones: liqObservaciones
    };

    if (onAddLiquidacion) {
      onAddLiquidacion(nuevaLiq);
    }
    
    // Reset Form
    setColaboradorNombre('');
    setPeriodo('');
    setMontoBase(0);
    setComisiones(0);
    setPremios(0);
    setDescuentos(0);
    setLiqObservaciones('');
    setIsAddingLiq(false);
    alert('¡Liquidación de haberes registrada con éxito!');
  };

  const handleMarkAsPaid = (liq: LiquidacionPersonal) => {
    const updated: LiquidacionPersonal = {
      ...liq,
      estado: 'PAGADA',
      fecha: new Date().toISOString().split('T')[0],
      medioPago: 'TRANSFERENCIA'
    };
    if (onUpdateLiquidacion) {
      onUpdateLiquidacion(updated);
      alert('¡Liquidación marcada como PAGADA. Se ha descontado del libro diario de caja!');
    }
  };

  // Liquidaciones calculations
  const totalLiqRegistradas = liquidaciones.reduce((acc, l) => acc + l.montoTotal, 0);
  const totalLiqPagadas = liquidaciones.filter(l => l.estado === 'PAGADA').reduce((acc, l) => acc + l.montoTotal, 0);
  const totalLiqPendientes = liquidaciones.filter(l => l.estado === 'PENDIENTE').reduce((acc, l) => acc + l.montoTotal, 0);

  return (
    <div id="tesoreria-section" className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg backdrop-blur-md">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            Control de Caja y Gastos Operativos
          </h2>
          <p className="text-xs text-emerald-300/80 mt-1">
            Controle de forma centralizada todos los movimientos de capital: libro de caja, transacciones y liquidaciones de personal.
          </p>
        </div>
        {activeTab !== 'contabilidad' && (
          <button
            onClick={() => {
              if (activeTab === 'flujo') {
                setIsAdding(!isAdding);
              } else {
                setIsAddingLiq(!isAddingLiq);
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all text-xs shadow-md cursor-pointer border border-emerald-500/50"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'flujo' ? 'AJUSTE / REGISTRO DE CAJA' : 'REGISTRAR GASTO / LIQUIDACIÓN'}
          </button>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-emerald-800/80">
        <button
          onClick={() => setActiveTab('flujo')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'flujo'
              ? 'border-emerald-400 text-emerald-300 bg-emerald-900/40'
              : 'border-transparent text-emerald-200/70 hover:text-white hover:bg-emerald-900/20'
          }`}
        >
          <Wallet className="w-4 h-4" />
          Libro Diario de Caja
        </button>
        <button
          onClick={() => setActiveTab('gastos')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'gastos'
              ? 'border-emerald-400 text-emerald-300 bg-emerald-900/40'
              : 'border-transparent text-emerald-200/70 hover:text-white hover:bg-emerald-900/20'
          }`}
        >
          <Users className="w-4 h-4" />
          Gastos de la Empresa y Personal
        </button>
        <button
          onClick={() => setActiveTab('contabilidad')}
          className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'contabilidad'
              ? 'border-emerald-400 text-emerald-300 bg-emerald-900/40'
              : 'border-transparent text-emerald-200/70 hover:text-white hover:bg-emerald-900/20'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Informe Contable y Rentabilidad
        </button>
      </div>

      {activeTab === 'flujo' && (
        <>
          {/* Date Range Selector Bar */}
          <div className="bg-emerald-950/90 p-4 rounded-2xl border border-emerald-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
              <span className="text-xs font-extrabold text-emerald-200 uppercase tracking-wider">Filtrar flujo de caja por periodo:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'all', label: 'Histórico Completo' },
                { id: 'day', label: 'Hoy' },
                { id: 'week', label: 'Semanal (7 días)' },
                { id: 'month', label: 'Mensual (30 días)' },
                { id: '3m', label: '3 Meses (90d)' },
                { id: '6m', label: '6 Meses (180d)' },
                { id: '1y', label: 'Anual (1 año)' },
              ].map((range) => (
                <button
                  key={range.id}
                  type="button"
                  onClick={() => setDateFilter(range.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer border ${
                    dateFilter === range.id
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                      : 'bg-slate-900 hover:bg-emerald-900/50 text-emerald-200 border-emerald-800/80'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Ingresos */}
            <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-lg flex items-center justify-between backdrop-blur-md">
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-300/80 uppercase tracking-wider">Total Ingresos (Cobros)</span>
                <h3 className="text-xl font-extrabold text-emerald-400">${totalIngresos.toLocaleString('es-ES')}</h3>
                <p className="text-[10px] text-emerald-300 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" /> Entrada real de efectivo
                </p>
              </div>
              <div className="p-3 bg-emerald-900/60 rounded-xl text-emerald-400 border border-emerald-700/50">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>

            {/* Total Egresos */}
            <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-lg flex items-center justify-between backdrop-blur-md">
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-300/80 uppercase tracking-wider">Total Egresos (Préstamos/Gastos)</span>
                <h3 className="text-xl font-extrabold text-rose-400">${totalEgresos.toLocaleString('es-ES')}</h3>
                <p className="text-[10px] text-rose-300 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3 text-rose-400" /> Capital desembolsado o retirado
                </p>
              </div>
              <div className="p-3 bg-rose-950/60 rounded-xl text-rose-400 border border-rose-800/50">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>

            {/* Balance */}
            <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-lg flex items-center justify-between backdrop-blur-md">
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-300/80 uppercase tracking-wider">Saldo Disponible en Caja</span>
                <h3 className={`text-xl font-black ${balanceNeto >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                  ${balanceNeto.toLocaleString('es-ES')}
                </h3>
                <p className="text-[10px] text-emerald-200/70">
                  Disponibilidad neta operativa
                </p>
              </div>
              <div className={`p-3 rounded-xl border ${balanceNeto >= 0 ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50' : 'bg-rose-950/60 text-rose-400 border-rose-800/50'}`}>
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </div>

          {isAdding && (
            <form onSubmit={handleSubmit} className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg space-y-4 animate-fadeIn backdrop-blur-md">
              <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest border-b border-emerald-800/80 pb-2">
                Registrar Ajuste de Caja
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                    Tipo de Transacción
                  </label>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as 'INGRESO' | 'EGRESO')}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden"
                  >
                    <option value="INGRESO" className="bg-slate-900 text-white">INGRESO (+) (Inyección / Aporte de Capital)</option>
                    <option value="EGRESO" className="bg-slate-900 text-white">EGRESO (-) (Gasto Operativo / Retiro)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                    Concepto / Descripción
                  </label>
                  <input
                    type="text"
                    required
                    value={concepto}
                    onChange={(e) => setConcepto(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white placeholder-emerald-600 focus:outline-hidden"
                    placeholder="Ej: Aporte de capital por inversionista principal"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                    Importe del Ajuste ($)
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={monto || ''}
                    onChange={(e) => setMonto(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm font-bold text-white placeholder-emerald-600 focus:outline-hidden"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-emerald-800 text-emerald-300 rounded-lg text-xs font-semibold hover:bg-emerald-900/40 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1 cursor-pointer shadow-md"
                >
                  <Check className="w-3.5 h-3.5" />
                  Guardar Movimiento
                </button>
              </div>
            </form>
          )}

          {/* Transaction Ledger Table */}
          <div className="bg-emerald-950/90 rounded-2xl border border-emerald-800/80 shadow-lg overflow-hidden backdrop-blur-md">
            <div className="p-5 border-b border-emerald-800/80 bg-emerald-900/30 flex justify-between items-center">
              <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest">Libro Diario de Caja y Transacciones</h3>
              <span className="text-[10px] uppercase text-emerald-300 bg-slate-900 border border-emerald-700/80 px-3 py-1 rounded-full font-bold">
                Total Filtrados: {filteredTrxs.length} / {transacciones.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-900/50 border-b border-emerald-800/80 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    <th className="py-3.5 px-6">ID Transacción</th>
                    <th className="py-3.5 px-6">Fecha</th>
                    <th className="py-3.5 px-6">Tipo</th>
                    <th className="py-3.5 px-6">Concepto / Referencia</th>
                    <th className="py-3.5 px-6 text-right">Importe ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-800/50 text-sm text-emerald-100">
                  {filteredTrxs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-emerald-400 font-medium">
                        No hay transacciones registradas en el periodo seleccionado.
                      </td>
                    </tr>
                  ) : (
                    [...filteredTrxs]
                      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
                      .map((t) => (
                        <tr key={t.id} className="hover:bg-emerald-900/30 transition-colors">
                          <td className="py-4 px-6 font-mono font-bold text-emerald-400">{t.id}</td>
                          <td className="py-4 px-6 text-emerald-200/90 font-medium">{t.fecha}</td>
                          <td className="py-4 px-6 text-xs">
                            <span
                              className={`inline-flex px-2 py-0.5 font-extrabold rounded-sm uppercase ${
                                t.tipo === 'INGRESO'
                                  ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                                  : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                              }`}
                            >
                              {t.tipo}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-white font-medium">
                            {t.concepto}
                            {t.referenciaId && (
                              <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-900/80 border border-emerald-700/60 px-1.5 py-0.5 rounded-sm ml-2">
                                Ref: {t.referenciaId}
                              </span>
                            )}
                          </td>
                          <td className={`py-4 px-6 text-right font-black ${t.tipo === 'INGRESO' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {t.tipo === 'INGRESO' ? '+' : '-'}${t.monto.toLocaleString('es-ES')}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'gastos' && (
        <>
          {/* Stats Cards for Payroll */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-lg flex items-center justify-between backdrop-blur-md">
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-300/80 uppercase tracking-wider">Total Liquidado</span>
                <h3 className="text-xl font-extrabold text-white">${totalLiqRegistradas.toLocaleString('es-ES')}</h3>
                <p className="text-[10px] text-emerald-200/70 flex items-center gap-1">
                  <ClipboardList className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Sueldos, Comisiones y Premios
                </p>
              </div>
              <div className="p-3 bg-emerald-900/60 rounded-xl text-emerald-300 border border-emerald-700/50">
                <ClipboardList className="w-5 h-5" />
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-lg flex items-center justify-between backdrop-blur-md">
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-300/80 uppercase tracking-wider">Pagado / Descontado</span>
                <h3 className="text-xl font-extrabold text-emerald-400">${totalLiqPagadas.toLocaleString('es-ES')}</h3>
                <p className="text-[10px] text-emerald-300 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Egresos conciliados en caja
                </p>
              </div>
              <div className="p-3 bg-emerald-900/60 rounded-xl text-emerald-400 border border-emerald-700/50">
                <Check className="w-5 h-5" />
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-lg flex items-center justify-between backdrop-blur-md">
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-300/80 uppercase tracking-wider">Pendiente de Pago</span>
                <h3 className={`text-xl font-black ${totalLiqPendientes > 0 ? 'text-amber-400' : 'text-emerald-300/70'}`}>{totalLiqPendientes > 0 ? `$${totalLiqPendientes.toLocaleString('es-ES')}` : '$0'}</h3>
                <p className="text-[10px] text-amber-300 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Pendientes de cobro de haberes
                </p>
              </div>
              <div className={`p-3 rounded-xl border ${totalLiqPendientes > 0 ? 'bg-amber-950/60 text-amber-400 border-amber-800/50 animate-pulse' : 'bg-emerald-900/60 text-emerald-400 border-emerald-700/50'}`}>
                <ShieldAlert className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Form adding custom staff payroll / business expenses */}
          {isAddingLiq && (
            <form onSubmit={handleAddLiqSubmit} className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg space-y-4 animate-fadeIn backdrop-blur-md">
              <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest border-b border-emerald-800/80 pb-2">
                Registrar Liquidación de Sueldos y Gastos
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                    Colaborador / Empleado
                  </label>
                  <input
                    type="text"
                    required
                    value={colaboradorNombre}
                    onChange={(e) => setColaboradorNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm font-medium text-white placeholder-emerald-600 focus:outline-hidden"
                    placeholder="Nombre Completo"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                    Rol / Cargo de la Empresa
                  </label>
                  <select
                    value={rolColaborador}
                    onChange={(e) => setRolColaborador(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm font-semibold text-white focus:outline-hidden"
                  >
                    <option value="Cobrador de Calle" className="bg-slate-900 text-white">Cobrador de Calle</option>
                    <option value="Operador WhatsApp" className="bg-slate-900 text-white">Operador WhatsApp</option>
                    <option value="Asesor Telefónico" className="bg-slate-900 text-white">Asesor Telefónico</option>
                    <option value="Administrador" className="bg-slate-900 text-white">Administrador</option>
                    <option value="Gerente" className="bg-slate-900 text-white">Gerente</option>
                    <option value="Insumos / Gastos Gral" className="bg-slate-900 text-white">Insumos / Gastos Gral</option>
                    <option value="Otros Gastos" className="bg-slate-900 text-white">Otros Gastos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                    Período / Mes Correspondiente
                  </label>
                  <input
                    type="text"
                    required
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm font-medium text-white placeholder-emerald-600 focus:outline-hidden"
                    placeholder="Ej: Julio 2026"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                    Sueldo / Gasto Base ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={montoBase || ''}
                    onChange={(e) => setMontoBase(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm font-bold text-white font-mono focus:outline-hidden"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                    Comisiones Adicionales ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={comisiones || ''}
                    onChange={(e) => setComisiones(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm font-bold text-white font-mono focus:outline-hidden"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                    Premios / Incentivos ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={premios || ''}
                    onChange={(e) => setPremios(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm font-bold text-white font-mono focus:outline-hidden"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                    Descuentos / Adelantos ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={descuentos || ''}
                    onChange={(e) => setDescuentos(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm font-bold text-rose-400 font-mono focus:outline-hidden"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                    Estado Inicial de Liquidación
                  </label>
                  <select
                    value={liqEstado}
                    onChange={(e) => setLiqEstado(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm font-semibold text-white focus:outline-hidden"
                  >
                    <option value="PENDIENTE" className="bg-slate-900 text-white">PENDIENTE DE PAGO</option>
                    <option value="PAGADA" className="bg-slate-900 text-white">PAGADA EN EL ACTO</option>
                  </select>
                </div>
                {liqEstado === 'PAGADA' && (
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                      Medio de Pago Empleado
                    </label>
                    <select
                      value={medioPago}
                      onChange={(e) => setMedioPago(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm font-semibold text-white focus:outline-hidden"
                    >
                      <option value="TRANSFERENCIA" className="bg-slate-900 text-white">TRANSFERENCIA BANCARIA</option>
                      <option value="EFECTIVO" className="bg-slate-900 text-white">EFECTIVO DE CAJA</option>
                    </select>
                  </div>
                )}
                <div className={liqEstado === 'PAGADA' ? 'sm:col-span-1' : 'sm:col-span-2'}>
                  <label className="block text-[11px] font-bold text-emerald-300 uppercase tracking-wider mb-1.5">
                    Observaciones / Detalles
                  </label>
                  <input
                    type="text"
                    value={liqObservaciones}
                    onChange={(e) => setLiqObservaciones(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-emerald-700/80 rounded-lg text-sm text-white focus:outline-hidden"
                    placeholder="Ej: Liquidación correspondiente a comisiones del mes con descuento."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddingLiq(false)}
                  className="px-4 py-2 border border-emerald-800 text-emerald-300 rounded-lg text-xs font-semibold hover:bg-emerald-900/40 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1 cursor-pointer shadow-md"
                >
                  <Check className="w-3.5 h-3.5" />
                  Registrar Liquidación
                </button>
              </div>
            </form>
          )}

          {/* Liquidaciones Register List */}
          <div className="bg-emerald-950/90 rounded-2xl border border-emerald-800/80 shadow-lg overflow-hidden backdrop-blur-md">
            <div className="p-5 border-b border-emerald-800/80 bg-emerald-900/30 flex justify-between items-center">
              <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest">Gastos y Haberes Liquidados</h3>
              <span className="text-[10px] uppercase text-emerald-300 bg-slate-900 border border-emerald-700/80 px-3 py-1 rounded-full font-bold">
                Total Registrados: {liquidaciones.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-900/50 border-b border-emerald-800/80 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                    <th className="py-3.5 px-6">ID Gasto</th>
                    <th className="py-3.5 px-6">Colaborador / Rol</th>
                    <th className="py-3.5 px-6">Período</th>
                    <th className="py-3.5 px-6">Detalle del Cálculo</th>
                    <th className="py-3.5 px-6">Estado</th>
                    <th className="py-3.5 px-6 text-right">Monto Total ($)</th>
                    <th className="py-3.5 px-6 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-800/50 text-sm text-emerald-100">
                  {liquidaciones.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-emerald-400 font-medium">
                        No hay gastos de personal ni liquidaciones registradas.
                      </td>
                    </tr>
                  ) : (
                    [...liquidaciones]
                      .sort((a, b) => b.id.localeCompare(a.id))
                      .map((liq) => (
                        <tr key={liq.id} className="hover:bg-emerald-900/30 transition-colors">
                          <td className="py-4 px-6 font-mono font-bold text-emerald-400">{liq.id}</td>
                          <td className="py-4 px-6">
                            <div className="font-extrabold text-white">{liq.colaboradorNombre}</div>
                            <div className="text-[10px] font-bold uppercase text-emerald-300/80 flex items-center gap-1 mt-0.5">
                              <Tag className="w-3 h-3 text-emerald-400 shrink-0" />
                              {liq.rolColaborador}
                            </div>
                          </td>
                          <td className="py-4 px-6 font-semibold text-emerald-200">{liq.periodo}</td>
                          <td className="py-4 px-6 text-xs text-emerald-200/80">
                            <div className="space-y-0.5">
                              <div>Sueldo Base: <span className="font-bold text-white">${liq.montoBase.toLocaleString()}</span></div>
                              {(liq.comisiones > 0 || liq.premios > 0 || liq.descuentos > 0) && (
                                <div className="text-[10px] text-emerald-300/70">
                                  {liq.comisiones > 0 && `+ Com: $${liq.comisiones.toLocaleString()} `}
                                  {liq.premios > 0 && `+ Prem: $${liq.premios.toLocaleString()} `}
                                  {liq.descuentos > 0 && `- Desc: $${liq.descuentos.toLocaleString()}`}
                                </div>
                              )}
                              {liq.observaciones && <div className="text-[10px] italic text-emerald-300/70 line-clamp-1">"{liq.observaciones}"</div>}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-xs">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 font-extrabold rounded-full uppercase ${
                                liq.estado === 'PAGADA'
                                  ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700'
                                  : 'bg-amber-950/80 text-amber-300 border border-amber-800 animate-pulse'
                              }`}
                            >
                              {liq.estado === 'PAGADA' ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  PAGADA
                                </>
                              ) : (
                                <>
                                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
                                  PENDIENTE
                                </>
                              )}
                            </span>
                            {liq.medioPago && (
                              <div className="text-[9px] font-bold text-emerald-300/70 mt-1 uppercase text-left">
                                Vía {liq.medioPago}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right font-black text-white">
                            ${liq.montoTotal.toLocaleString('es-ES')}
                          </td>
                          <td className="py-4 px-6 text-center">
                            {liq.estado === 'PENDIENTE' ? (
                              <button
                                onClick={() => handleMarkAsPaid(liq)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] uppercase rounded-lg transition-all tracking-wider shadow-sm cursor-pointer"
                              >
                                Pagar Sueldo
                              </button>
                            ) : (
                              <span className="text-emerald-300/60 text-xs font-semibold italic">Conciliado</span>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'contabilidad' && (() => {
        // Helper: Filter data by date range
        const isDateInFilter = (dateStr: string, filter: typeof acDateFilter) => {
          if (filter === 'all') return true;
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          const itemDate = new Date(dateStr);
          if (isNaN(itemDate.getTime())) return false;
          const diffTime = today.getTime() - itemDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          switch (filter) {
            case 'day': return diffDays <= 1;
            case 'week': return diffDays <= 7;
            case 'month': return diffDays <= 30;
            case '3m': return diffDays <= 90;
            case '6m': return diffDays <= 180;
            case '1y': return diffDays <= 365;
            default: return true;
          }
        };

        // 1. CARTERA ACTIVA GLOBAL (independent of period)
        const activeOps = operaciones.filter(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA');
        const capitalTrabajando = activeOps.reduce((acc, o) => acc + (o.capitalPendiente ?? (o.capitalEntregado - o.capitalRecuperado)), 0);
        const interesPendienteRetorno = activeOps.reduce((acc, o) => acc + (o.totalPendiente - o.capitalPendiente), 0);
        const totalCarteraEsperado = activeOps.reduce((acc, o) => acc + o.totalPendiente, 0);
        const totalCobradoCartera = activeOps.reduce((acc, o) => acc + (o.capitalRecuperado + o.interesCobrado), 0);

        // 2. PERIOD ANALYSIS
        const opsInPeriod = operaciones.filter(o => isDateInFilter(o.fechaOtorgamiento, acDateFilter));
        const paymentsInPeriod = pagos.filter(p => isDateInFilter(p.fechaPago, acDateFilter));
        const expensesInPeriod = liquidaciones.filter(l => l.estado === 'PAGADA' && isDateInFilter(l.fecha, acDateFilter));
        const cashOutInPeriod = transacciones.filter(t => t.tipo === 'EGRESO' && !t.referenciaId?.startsWith('LIQ-') && isDateInFilter(t.fecha, acDateFilter));

        const periodCapitalEntregado = opsInPeriod.reduce((acc, o) => acc + o.capitalEntregado, 0);
        const periodInteresEsperado = opsInPeriod.reduce((acc, o) => acc + (o.totalFinanciado - o.capitalEntregado), 0);
        const periodTotalFinanciado = opsInPeriod.reduce((acc, o) => acc + o.totalFinanciado, 0);
        const periodCobrosReales = paymentsInPeriod.reduce((acc, p) => acc + p.importe, 0);
        const periodGastosPersonal = expensesInPeriod.reduce((acc, l) => acc + l.montoTotal, 0);
        const periodGastosGrales = cashOutInPeriod.reduce((acc, t) => acc + t.monto, 0);
        const periodGastosTotales = periodGastosPersonal + periodGastosGrales;
        const periodResultadoNeto = periodCobrosReales - periodGastosTotales;

        // 3. ANALYSIS BY MODALITIES (DIARIA, SEMANAL, QUINCENAL, MENSUAL)
        const frequencies: ('DIARIA' | 'SEMANAL' | 'QUINCENAL' | 'MENSUAL')[] = ['DIARIA', 'SEMANAL', 'QUINCENAL', 'MENSUAL'];
        const modalitiesData = frequencies.map(f => {
          const fOps = activeOps.filter(o => o.frecuencia === f);
          const creditosCount = fOps.length;
          const capEntregado = fOps.reduce((acc, o) => acc + o.capitalEntregado, 0);
          const intEsperado = fOps.reduce((acc, o) => acc + (o.totalFinanciado - o.capitalEntregado), 0);
          const cobradoReal = fOps.reduce((acc, o) => acc + (o.capitalRecuperado + o.interesCobrado), 0);
          const totalFin = fOps.reduce((acc, o) => acc + o.totalFinanciado, 0);
          const capPendiente = fOps.reduce((acc, o) => acc + o.capitalPendiente, 0);
          const totPendiente = fOps.reduce((acc, o) => acc + o.totalPendiente, 0);
          const ratioCobranza = totalFin > 0 ? (cobradoReal / totalFin) * 100 : 0;

          return {
            frecuencia: f,
            creditosCount,
            capEntregado,
            intEsperado,
            cobradoReal,
            capPendiente,
            totPendiente,
            ratioCobranza
          };
        });

        // 4. GENERATING ALERTS
        const alertsList: { id: string; type: 'success' | 'warning' | 'danger' | 'info'; title: string; desc: string; extra: string }[] = [];
        
        // A. Upcoming Renewals (elegibleRenovacion or > 75% installments paid on active loan)
        activeOps.forEach(o => {
          const ratio = o.cantidadCuotas > 0 ? o.cuotasPagadas / o.cantidadCuotas : 0;
          if (o.elegibleRenovacion || (ratio >= 0.75 && o.estado === 'ACTIVA')) {
            alertsList.push({
              id: `alert-renov-${o.id}`,
              type: 'success',
              title: 'Elegible para Renovación',
              desc: `El cliente ${o.nombreCliente} ha completado ${o.cuotasPagadas} de ${o.cantidadCuotas} cuotas (${(ratio * 100).toFixed(0)}%).`,
              extra: `Crédito #${o.numeroCredito} | Frecuencia: ${o.frecuencia}`
            });
          }
        });

        // B. Loans Finished without Renewal recently
        operaciones.filter(o => o.estado === 'FINALIZADA').forEach(o => {
          // Check if there are any newer operations for this client
          const newerOpExists = operaciones.some(other => other.idCliente === o.idCliente && other.fechaOtorgamiento > o.fechaOtorgamiento);
          if (!newerOpExists) {
            alertsList.push({
              id: `alert-fin-${o.id}`,
              type: 'info',
              title: 'Crédito Finalizado sin Renovar',
              desc: `El cliente ${o.nombreCliente} terminó de pagar su préstamo #${o.numeroCredito} pero no renovó ni refinanció.`,
              extra: `Recomendable contactar para fidelización.`
            });
          }
        });

        // C. Urgent Critical Mora Alert
        activeOps.filter(o => o.diasMora > 5).forEach(o => {
          alertsList.push({
            id: `alert-mora-${o.id}`,
            type: 'danger',
            title: 'Mora Crítica Detectada',
            desc: `El cliente ${o.nombreCliente} lleva ${o.diasMora} días de atraso en su cuota más antigua.`,
            extra: `Nivel de Mora: ${o.nivelMora || 'Crítico'} | Cobrador: ${o.cobrador}`
          });
        });

        // D. Payments Due Today
        const todayStr = new Date().toISOString().split('T')[0];
        const unpaidDueToday = cuotas.filter(c => c.estado !== 'PAGADA' && c.fechaVencimiento === todayStr);
        if (unpaidDueToday.length > 0) {
          alertsList.push({
            id: 'alert-venc-hoy',
            type: 'warning',
            title: `Vencimientos para Hoy (${unpaidDueToday.length})`,
            desc: `Hay ${unpaidDueToday.length} cuotas que vencen hoy por un total de $${unpaidDueToday.reduce((acc, c) => acc + c.saldoPendiente, 0).toLocaleString('es-ES')}.`,
            extra: 'Coordinar con operadores de WhatsApp para alertar cobros.'
          });
        }

        return (
          <div className="space-y-6 animate-fadeIn">
            {/* Range Selectors */}
            <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Filtrar Período Contable:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'Histórico' },
                  { id: 'day', label: 'Hoy' },
                  { id: 'week', label: '7 Días' },
                  { id: 'month', label: '30 Días' },
                  { id: '3m', label: '3 Meses' },
                  { id: '6m', label: '6 Meses' },
                  { id: '1y', label: '1 Año' },
                ].map((range) => (
                  <button
                    key={range.id}
                    type="button"
                    onClick={() => setAcDateFilter(range.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      acDateFilter === range.id
                        ? 'bg-emerald-600 text-white border border-emerald-400 shadow-xs'
                        : 'bg-slate-900 hover:bg-emerald-900/50 text-emerald-200 border border-emerald-800/80'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Global Portfolio Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest">Estado Global de Cartera Activa (En Calle)</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Card 1 */}
                <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-lg flex items-center justify-between backdrop-blur-md">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider">Capital en Calle (Sin Interés)</span>
                    <h3 className="text-xl font-extrabold text-white">${capitalTrabajando.toLocaleString('es-ES')}</h3>
                    <p className="text-[10px] text-emerald-200/70">Monto puro pendiente de retorno</p>
                  </div>
                  <div className="p-3 bg-emerald-900/60 text-emerald-300 rounded-xl border border-emerald-700/50">
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>

                {/* Card 2 */}
                <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-lg flex items-center justify-between backdrop-blur-md">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider">Interés Esperado Pendiente</span>
                    <h3 className="text-xl font-extrabold text-emerald-400">${interesPendienteRetorno.toLocaleString('es-ES')}</h3>
                    <p className="text-[10px] text-emerald-200/70">Rendimiento que debe regresar</p>
                  </div>
                  <div className="p-3 bg-emerald-900/60 text-emerald-400 rounded-xl border border-emerald-700/50">
                    <Percent className="w-5 h-5" />
                  </div>
                </div>

                {/* Card 3 */}
                <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-lg flex items-center justify-between backdrop-blur-md">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider">Total Cartera Activa (Esperado)</span>
                    <h3 className="text-xl font-extrabold text-white">${totalCarteraEsperado.toLocaleString('es-ES')}</h3>
                    <p className="text-[10px] text-emerald-200/70">Capital + intereses totales a cobrar</p>
                  </div>
                  <div className="p-3 bg-emerald-900/60 text-emerald-300 rounded-xl border border-emerald-700/50">
                    <Coins className="w-5 h-5" />
                  </div>
                </div>

                {/* Card 4 */}
                <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-lg flex items-center justify-between backdrop-blur-md">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider">Cobrado Real sobre esta Cartera</span>
                    <h3 className="text-xl font-extrabold text-emerald-400">${totalCobradoCartera.toLocaleString('es-ES')}</h3>
                    <p className="text-[10px] text-emerald-200/70">Recuperación acumulada total</p>
                  </div>
                  <div className="p-3 bg-emerald-900/60 text-emerald-400 rounded-xl border border-emerald-700/50">
                    <Check className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Income and Expense Sheet of Period */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Income / Expense Sheet Left (2/3) */}
              <div className="lg:col-span-2 bg-emerald-950/90 rounded-2xl border border-emerald-800/80 shadow-lg p-6 space-y-6 backdrop-blur-md">
                <div>
                  <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest border-b border-emerald-800/80 pb-2 flex items-center justify-between">
                    <span>Estado de Resultados y Rentabilidad del Periodo</span>
                    <span className="text-[10px] text-emerald-300 bg-slate-900 border border-emerald-700/80 px-2 py-0.5 rounded-sm font-extrabold uppercase">
                      {acDateFilter === 'all' ? 'HISTÓRICO COMPLETO' : `RANGO: ${acDateFilter}`}
                    </span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Revenue / Ingress block */}
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-emerald-800/80 space-y-3">
                    <h4 className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      INGRESOS RECOBRADOS (A)
                    </h4>
                    <div className="flex justify-between items-center border-b border-emerald-800/80 pb-2">
                      <span className="text-xs font-semibold text-emerald-200">Cobros de Cuotas Realizados</span>
                      <span className="text-sm font-bold text-emerald-400">${periodCobrosReales.toLocaleString('es-ES')}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 text-[11px] text-emerald-300/80">
                      <span>Préstamos Nuevos Otorgados</span>
                      <span>{opsInPeriod.length} créditos</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-emerald-300/80">
                      <span>Interés Esperado de Préstamos</span>
                      <span>${periodInteresEsperado.toLocaleString('es-ES')}</span>
                    </div>
                  </div>

                  {/* Expense block */}
                  <div className="bg-slate-900/80 p-4 rounded-xl border border-emerald-800/80 space-y-3">
                    <h4 className="text-[11px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                      EGRESOS / GASTOS OPERATIVOS (B)
                    </h4>
                    <div className="flex justify-between items-center border-b border-emerald-800/80 pb-2">
                      <span className="text-xs font-semibold text-emerald-200">Gastos y Haberes Pagados</span>
                      <span className="text-sm font-bold text-rose-400">${periodGastosTotales.toLocaleString('es-ES')}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 text-[11px] text-emerald-300/80">
                      <span>Liquidación Personal Pagada</span>
                      <span>${periodGastosPersonal.toLocaleString('es-ES')}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-emerald-300/80">
                      <span>Gastos Grales y Caja Chica</span>
                      <span>${periodGastosGrales.toLocaleString('es-ES')}</span>
                    </div>
                  </div>
                </div>

                {/* Net Profit Summary */}
                <div className={`p-4 rounded-xl flex items-center justify-between border ${
                  periodResultadoNeto >= 0 
                    ? 'bg-emerald-900/40 border-emerald-700 text-emerald-200' 
                    : 'bg-rose-950/40 border-rose-800 text-rose-200'
                }`}>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 block">Flujo de Caja Neto Real en Periodo (A - B)</span>
                    <p className="text-[10px] text-emerald-200/70">Monto total neto remanente en caja para reinversión / retiro</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xl font-black ${periodResultadoNeto >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                      {periodResultadoNeto >= 0 ? '+' : '-'}${Math.abs(periodResultadoNeto).toLocaleString('es-ES')}
                    </span>
                  </div>
                </div>

                {/* Performance explanation */}
                <div className="text-xs text-emerald-200/90 leading-relaxed bg-slate-900/80 p-4 rounded-xl border border-emerald-800/80">
                  <h4 className="font-bold text-emerald-300 mb-1 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    Análisis de Desempeño
                  </h4>
                  Durante el periodo seleccionado, se otorgaron <strong>${periodCapitalEntregado.toLocaleString('es-ES')}</strong> en carácter de préstamos (capital original), con un retorno de interés estimado a futuro de <strong>${periodInteresEsperado.toLocaleString('es-ES')}</strong>. La recaudación real de cobros fue de <strong>${periodCobrosReales.toLocaleString('es-ES')}</strong> frente a un total de egresos operativos de <strong>${periodGastosTotales.toLocaleString('es-ES')}</strong>.
                </div>
              </div>

              {/* Alert System Right (1/3) */}
              <div className="bg-emerald-950/90 rounded-2xl border border-emerald-800/80 shadow-lg p-6 space-y-4 backdrop-blur-md">
                <div className="border-b border-emerald-800/80 pb-2">
                  <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    Alertas Contables y Renovaciones
                  </h3>
                </div>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {alertsList.length === 0 ? (
                    <div className="text-center py-10 text-emerald-400 text-xs font-medium">
                      No hay alertas contables o renovaciones sugeridas en este momento.
                    </div>
                  ) : (
                    alertsList.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3.5 rounded-xl border text-xs leading-relaxed space-y-1.5 transition-all ${
                          alert.type === 'success'
                            ? 'bg-emerald-900/60 border-emerald-700 text-emerald-200'
                            : alert.type === 'danger'
                            ? 'bg-rose-950/60 border-rose-800 text-rose-200'
                            : alert.type === 'warning'
                            ? 'bg-amber-950/60 border-amber-800 text-amber-200'
                            : 'bg-slate-900/80 border-emerald-800 text-emerald-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span className="font-extrabold uppercase text-[10px] tracking-wider flex items-center gap-1 text-white">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              alert.type === 'success' ? 'bg-emerald-400' :
                              alert.type === 'danger' ? 'bg-rose-400' :
                              alert.type === 'warning' ? 'bg-amber-400' : 'bg-emerald-300'
                            }`}></span>
                            {alert.title}
                          </span>
                        </div>
                        <p className="font-semibold text-emerald-100 leading-snug">{alert.desc}</p>
                        <div className="text-[10px] font-bold text-emerald-300/70 uppercase">{alert.extra}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modalities Table */}
            <div className="bg-emerald-950/90 rounded-2xl border border-emerald-800/80 shadow-lg overflow-hidden backdrop-blur-md">
              <div className="p-5 border-b border-emerald-800/80 bg-emerald-900/30 flex justify-between items-center">
                <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-emerald-400" />
                  Rendimiento Desglosado por Modalidades (Sistemas de Préstamos)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-emerald-900/50 border-b border-emerald-800/80 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Modalidad</th>
                      <th className="py-3.5 px-6 text-center">Créditos Activos</th>
                      <th className="py-3.5 px-6 text-right">Capital Otorgado ($)</th>
                      <th className="py-3.5 px-6 text-right">Interés Esperado ($)</th>
                      <th className="py-3.5 px-6 text-right">Cobrado Real ($)</th>
                      <th className="py-3.5 px-6 text-right">Pendiente ($)</th>
                      <th className="py-3.5 px-6 text-center">Eficacia de Cobro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-800/50 text-sm text-emerald-100">
                    {modalitiesData.map((m) => (
                      <tr key={m.frecuencia} className="hover:bg-emerald-900/30 transition-colors">
                        <td className="py-4 px-6 font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            m.frecuencia === 'DIARIA' ? 'bg-amber-400' :
                            m.frecuencia === 'SEMANAL' ? 'bg-emerald-400' :
                            m.frecuencia === 'QUINCENAL' ? 'bg-teal-400' : 'bg-emerald-300'
                          }`}></span>
                          {m.frecuencia === 'DIARIA' ? 'Diario' : 
                           m.frecuencia === 'SEMANAL' ? 'Semanal' : 
                           m.frecuencia === 'QUINCENAL' ? 'Quincenal' : 'Mensual'}
                        </td>
                        <td className="py-4 px-6 text-center font-bold text-emerald-200">{m.creditosCount} créditos</td>
                        <td className="py-4 px-6 text-right font-mono font-bold text-white">${m.capEntregado.toLocaleString('es-ES')}</td>
                        <td className="py-4 px-6 text-right font-mono font-bold text-emerald-300">${m.intEsperado.toLocaleString('es-ES')}</td>
                        <td className="py-4 px-6 text-right font-mono font-bold text-emerald-400">${m.cobradoReal.toLocaleString('es-ES')}</td>
                        <td className="py-4 px-6 text-right font-mono font-bold text-white">${m.totPendiente.toLocaleString('es-ES')}</td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="w-full bg-slate-900 rounded-full h-2 max-w-[120px] overflow-hidden border border-emerald-800/80">
                              <div
                                className={`h-full rounded-full ${
                                  m.ratioCobranza >= 85 ? 'bg-emerald-400' :
                                  m.ratioCobranza >= 60 ? 'bg-teal-400' :
                                  m.ratioCobranza >= 30 ? 'bg-amber-400' : 'bg-rose-500'
                                }`}
                                style={{ width: `${m.ratioCobranza}%` }}
                              ></div>
                            </div>
                            <span className="text-[10px] font-black text-emerald-300">{m.ratioCobranza.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
