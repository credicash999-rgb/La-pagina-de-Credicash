/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TransaccionTesoreria } from '../types';
import { 
  DollarSign, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, 
  Plus, Check, Calendar, Activity, ClipboardList 
} from 'lucide-react';

interface TesoreriaViewProps {
  transacciones: TransaccionTesoreria[];
  onAddTransaccion: (trx: TransaccionTesoreria) => void;
}

export default function TesoreriaView({
  transacciones,
  onAddTransaccion,
}: TesoreriaViewProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [tipo, setTipo] = useState<'INGRESO' | 'EGRESO'>('INGRESO');
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState<number>(0);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  // Date Filter Range: day, week, month, 3m, 6m, 1y, or all (Histórico)
  const [dateFilter, setDateFilter] = useState<'all' | 'day' | 'week' | 'month' | '3m' | '6m' | '1y'>('all');

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

  return (
    <div id="tesoreria-section" className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            Flujo de Caja y Tesorería
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Controle de forma centralizada todos los movimientos de capital: colocación de préstamos, cobranzas ingresadas y gastos operativos.
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-all text-xs shadow-md hover:shadow-none cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          AJUSTE / REGISTRO DE CAJA
        </button>
      </div>

      {/* Date Range Selector Bar */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0 animate-pulse" />
          <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Filtrar flujo de caja por periodo:</span>
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
                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Ingresos (Cobros)</span>
            <h3 className="text-xl font-extrabold text-emerald-600">${totalIngresos.toLocaleString('es-ES')}</h3>
            <p className="text-[10px] text-emerald-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Entrada real de efectivo
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        {/* Total Egresos */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Egresos (Préstamos/Gastos)</span>
            <h3 className="text-xl font-extrabold text-rose-600">${totalEgresos.toLocaleString('es-ES')}</h3>
            <p className="text-[10px] text-rose-500 flex items-center gap-1">
              <TrendingDown className="w-3 h-3" /> Capital desembolsado o retirado
            </p>
          </div>
          <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo Disponible en Caja</span>
            <h3 className={`text-xl font-black ${balanceNeto >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
              ${balanceNeto.toLocaleString('es-ES')}
            </h3>
            <p className="text-[10px] text-slate-500">
              Disponibilidad neta operativa
            </p>
          </div>
          <div className={`p-3 rounded-lg ${balanceNeto >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 animate-fadeIn">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
            Registrar Ajuste de Caja
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Tipo de Transacción
              </label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as 'INGRESO' | 'EGRESO')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden"
              >
                <option value="INGRESO">INGRESO (+) (Inyección / Aporte de Capital)</option>
                <option value="EGRESO">EGRESO (-) (Gasto Operativo / Retiro)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Concepto / Descripción
              </label>
              <input
                type="text"
                required
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                placeholder="Ej: Aporte de capital por inversionista principal"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Importe del Ajuste ($)
              </label>
              <input
                type="number"
                min={1}
                required
                value={monto || ''}
                onChange={(e) => setMonto(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1 cursor-pointer shadow-md hover:shadow-none"
            >
              <Check className="w-3.5 h-3.5" />
              Guardar Movimiento
            </button>
          </div>
        </form>
      )}

      {/* Transaction Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Libro Diario de Caja y Transacciones</h3>
          <span className="text-[10px] uppercase text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full font-bold">
            Total Filtrados: {filteredTrxs.length} / {transacciones.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">ID Transacción</th>
                <th className="py-3.5 px-6">Fecha</th>
                <th className="py-3.5 px-6">Tipo</th>
                <th className="py-3.5 px-6">Concepto / Referencia</th>
                <th className="py-3.5 px-6 text-right">Importe ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {filteredTrxs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 font-medium">
                    No hay transacciones registradas en el periodo seleccionado.
                  </td>
                </tr>
              ) : (
                [...filteredTrxs]
                  .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id))
                  .map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-slate-400">{t.id}</td>
                      <td className="py-4 px-6 text-slate-500 font-medium">{t.fecha}</td>
                      <td className="py-4 px-6 text-xs">
                        <span
                          className={`inline-flex px-2 py-0.5 font-extrabold rounded-sm uppercase ${
                            t.tipo === 'INGRESO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {t.tipo}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-800 font-medium">
                        {t.concepto}
                        {t.referenciaId && (
                          <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-sm ml-2">
                            Ref: {t.referenciaId}
                          </span>
                        )}
                      </td>
                      <td className={`py-4 px-6 text-right font-black ${t.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.tipo === 'INGRESO' ? '+' : '-'}${t.monto.toLocaleString('es-ES')}
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
