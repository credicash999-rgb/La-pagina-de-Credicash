/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Cliente, Operacion, Cuota, Pago, Configuracion } from '../types';
import { 
  TrendingUp, Users, DollarSign, Percent, AlertTriangle, 
  Calendar, CheckCircle, ArrowUpRight, ArrowDownRight, Award, Target
} from 'lucide-react';

interface DashboardViewProps {
  clientes: Cliente[];
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
  configuracion: Configuracion;
  onNavigateTo: (section: string) => void;
}

export default function DashboardView({
  clientes,
  operaciones,
  cuotas,
  pagos,
  configuracion,
  onNavigateTo,
}: DashboardViewProps) {
  
  // Default to 'estimates' as requested by administrator
  const [subTab, setSubTab] = useState<'kpis' | 'estimates'>('estimates');
  const [estimateFilter, setEstimateFilter] = useState<'activos' | 'inactivos' | 'combinado'>('activos');

  // Map clients for quick lookup
  const clientMap = React.useMemo(() => new Map(clientes.map(c => [c.id, c])), [clientes]);

  // Group operations by month & status segment for Estimaciones Financieras
  const estimacionesPorSegmento = React.useMemo(() => {
    const filterOps = operaciones.filter(op => {
      const client = clientMap.get(op.idCliente);
      const isInactive = op.estado === 'CONGELADA' || client?.estado === 'INACTIVO' || client?.estado === 'CONGELADO';
      
      if (estimateFilter === 'activos') return !isInactive;
      if (estimateFilter === 'inactivos') return isInactive;
      return true; // 'combinado'
    });

    const groups: Record<string, { monthLabel: string, capitalEntregado: number, gananciaEstimada: number, totalFinanciado: number, count: number }> = {};
    
    filterOps.forEach(op => {
      const dateParts = op.fechaOtorgamiento.split('-');
      if (dateParts.length < 2) return;
      const key = `${dateParts[0]}-${dateParts[1]}`; // e.g. "2026-06"
      
      const dateObj = new Date(op.fechaOtorgamiento + 'T12:00:00');
      const monthLabel = dateObj.toLocaleDateString('es-AR', { year: 'numeric', month: 'long' });
      
      const interes = op.totalFinanciado - op.capitalEntregado;
      
      if (!groups[key]) {
        groups[key] = {
          monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          capitalEntregado: 0,
          gananciaEstimada: 0,
          totalFinanciado: 0,
          count: 0
        };
      }
      
      groups[key].capitalEntregado += op.capitalEntregado;
      groups[key].gananciaEstimada += interes;
      groups[key].totalFinanciado += op.totalFinanciado;
      groups[key].count += 1;
    });
    
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, data]) => ({ key, ...data }));
  }, [operaciones, clientMap, estimateFilter]);

  // Segment Summary Totals
  const segmentTotals = React.useMemo(() => {
    const filterOps = operaciones.filter(op => {
      const client = clientMap.get(op.idCliente);
      const isInactive = op.estado === 'CONGELADA' || client?.estado === 'INACTIVO' || client?.estado === 'CONGELADO';
      
      if (estimateFilter === 'activos') return !isInactive;
      if (estimateFilter === 'inactivos') return isInactive;
      return true;
    });

    const totalCap = filterOps.reduce((acc, o) => acc + o.capitalEntregado, 0);
    const totalFin = filterOps.reduce((acc, o) => acc + o.totalFinanciado, 0);
    const totalInt = totalFin - totalCap;
    const countOps = filterOps.length;

    return { totalCap, totalFin, totalInt, countOps };
  }, [operaciones, clientMap, estimateFilter]);

  // 1. KPI Calculations
  const totalClientes = clientes.length;
  const clientesActivos = clientes.filter(c => c.estado === 'ACTIVO').length;
  const clientesMora = clientes.filter(c => c.estado === 'EN_MORA').length;
  const clientesSolicitantes = clientes.filter(c => c.estado === 'SOLICITANTE').length;

  const totalFinanciado = operaciones.reduce((acc, op) => acc + op.totalFinanciado, 0);
  const capitalEntregado = operaciones.reduce((acc, op) => acc + op.capitalEntregado, 0);
  const capitalRecuperado = operaciones.reduce((acc, op) => acc + op.capitalRecuperado, 0);
  const interesTotal = totalFinanciado - capitalEntregado;
  const interesCobrado = operaciones.reduce((acc, op) => acc + op.interesCobrado, 0);
  
  const totalCobrado = pagos.reduce((acc, p) => acc + p.importe, 0);
  const carteraPendienteTotal = operaciones.reduce((acc, op) => acc + op.totalPendiente, 0);

  // Delinquency calculator: Cuotas that are pending and whose vencimiento is older than today
  const hoyStr = new Date().toISOString().split('T')[0];
  const cuotasMora = cuotas.filter(c => c.estado !== 'PAGADA' && c.fechaVencimiento < hoyStr);
  const capitalEnMora = cuotasMora.reduce((acc, c) => acc + c.saldoPendiente, 0);

  // 2. Performance metrics
  const tasaRecuperacion = totalFinanciado > 0 ? (totalCobrado / totalFinanciado) * 100 : 0;
  const tasaMora = totalFinanciado > 0 ? (capitalEnMora / totalFinanciado) * 100 : 0;

  // 3. Frequencies breakdown
  const opsPorFrecuencia = operaciones.reduce((acc, op) => {
    acc[op.frecuencia] = (acc[op.frecuencia] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 4. Latest transactions
  const ultimosPagos = [...pagos]
    .sort((a, b) => b.fechaPago.localeCompare(a.fechaPago))
    .slice(0, 5);

  const proximosVencimientos = cuotas
    .filter(c => c.estado !== 'PAGADA' && c.fechaVencimiento >= hoyStr)
    .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))
    .slice(0, 5);

  // A. Working capital currently in circulation (Dinero que se está trabajando, sin el interés)
  const capitalEnCirculacion = operaciones
    .filter(op => op.estado === 'ACTIVA')
    .reduce((acc, op) => acc + op.capitalPendiente, 0);

  // B. Interest expected to return (Interés que tiene que retornar de operaciones activas)
  const interesEsperadoRetorno = operaciones
    .filter(op => op.estado === 'ACTIVA')
    .reduce((acc, op) => acc + (op.totalPendiente - op.capitalPendiente), 0);

  // C. Expected collections up to today (Lo esperado por vencimiento de cuotas)
  const cuotasHastaHoy = cuotas.filter(c => c.fechaVencimiento <= hoyStr);
  const totalCobrosEsperados = cuotasHastaHoy.reduce((acc, c) => acc + c.valorTotalCuota, 0);

  // D. Real collections collected (Lo real recaudado de lo que están pagando)
  const totalCobrosReales = pagos.reduce((acc, p) => acc + p.importe, 0);

  // E. Expected vs Real ratio
  const brechaCobro = Math.max(0, totalCobrosEsperados - totalCobrosReales);
  const cumplimientoCobroPct = totalCobrosEsperados > 0 ? (totalCobrosReales / totalCobrosEsperados) * 100 : 0;

  // F. Stats by Frequency (Count, total financed, and total capital)
  const statsPorFrecuencia = operaciones.reduce((acc, op) => {
    const f = op.frecuencia;
    if (!acc[f]) {
      acc[f] = { count: 0, totalFinanciado: 0, capitalEntregado: 0 };
    }
    acc[f].count += 1;
    acc[f].totalFinanciado += op.totalFinanciado;
    acc[f].capitalEntregado += op.capitalEntregado;
    return acc;
  }, {} as Record<string, { count: number; totalFinanciado: number; capitalEntregado: number }>);

  // Ensure all frequencies have default values to avoid errors
  ['DIARIA', 'SEMANAL', 'QUINCENAL', 'MENSUAL'].forEach(f => {
    if (!statsPorFrecuencia[f]) {
      statsPorFrecuencia[f] = { count: 0, totalFinanciado: 0, capitalEntregado: 0 };
    }
  });

  // G. Client credit count summary (cada cliente cuántos créditos tiene)
  const clientesCreditosList = clientes.map(c => {
    const clientOps = operaciones.filter(o => o.idCliente === c.id);
    const activeOps = clientOps.filter(o => o.estado === 'ACTIVA');
    const totalFinanciado = clientOps.reduce((sum, o) => sum + o.totalFinanciado, 0);
    return {
      id: c.id,
      nombreCompleto: `${c.nombre} ${c.apellido}`,
      dni: c.dni,
      estado: c.estado,
      totalCreditos: clientOps.length,
      creditosActivos: activeOps.length,
      montoFinanciado: totalFinanciado
    };
  }).filter(item => item.totalCreditos > 0);

  return (
    <div id="dashboard-section" className="space-y-6">
      
      {/* Title & Stats Overview Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-md gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Consola Gerencial & Dashboard
          </h2>
          <p className="text-xs text-emerald-200/90 mt-1">
            Estado financiero general de su cartera de colocaciones, cobranzas y nivel de morosidad en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[10px] uppercase text-emerald-400 font-black tracking-widest">Eficacia de Cobro</span>
            <div className="text-lg font-black text-emerald-300">{tasaRecuperacion.toFixed(1)}%</div>
          </div>
          <div className="text-right border-l border-emerald-800 pl-6">
            <span className="text-[10px] uppercase text-rose-400 font-black tracking-widest">Índice Mora</span>
            <div className="text-lg font-black text-rose-400">{tasaMora.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-emerald-800/80 pb-px">
        <button
          onClick={() => setSubTab('kpis')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            subTab === 'kpis'
              ? 'border-emerald-400 text-emerald-300 font-black'
              : 'border-transparent text-emerald-200/70 hover:text-white'
          }`}
        >
          Consola General
        </button>
        <button
          onClick={() => setSubTab('estimates')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            subTab === 'estimates'
              ? 'border-emerald-400 text-emerald-300 font-black'
              : 'border-transparent text-emerald-200/70 hover:text-white'
          }`}
        >
          Estimaciones Financieras
        </button>
      </div>

      {subTab === 'kpis' ? (
        <>
          {/* Grid Cards KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Colocado total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Colocado</span>
            <h3 className="text-xl font-extrabold text-slate-900">${totalFinanciado.toLocaleString('es-ES')}</h3>
            <p className="text-[10px] text-slate-500">
              Capital entregado: <span className="font-semibold">${capitalEntregado.toLocaleString('es-ES')}</span>
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Recuperado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recuperado</span>
            <h3 className="text-xl font-extrabold text-emerald-600">${totalCobrado.toLocaleString('es-ES')}</h3>
            <p className="text-[10px] text-slate-500">
              Intereses cobrados: <span className="font-semibold text-emerald-600">${interesCobrado.toLocaleString('es-ES')}</span>
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Pendiente */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pendiente de Cobro</span>
            <h3 className="text-xl font-extrabold text-slate-700">${carteraPendienteTotal.toLocaleString('es-ES')}</h3>
            <p className="text-[10px] text-slate-500">
              Total neto en circulación
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg text-slate-600">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* En Mora */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cartera Vencida (Mora)</span>
            <h3 className="text-xl font-extrabold text-rose-600">${capitalEnMora.toLocaleString('es-ES')}</h3>
            <p className="text-[10px] text-rose-500 font-medium">
              {cuotasMora.length} cuotas vencidas
            </p>
          </div>
          <div className="p-3 bg-rose-50 rounded-lg text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Charts & breakdowns using Pure SVGs / HTML */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Capital Colocado vs Recuperado */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Balance de Colocación y Cobro</h4>
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">Total acumulado</span>
          </div>

          <div className="py-8 flex flex-col justify-center space-y-6">
            {/* Financed Capital bar representation */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Capital Financiado Total (Meta)</span>
                <span className="font-black text-slate-800">${totalFinanciado.toLocaleString('es-ES')}</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            {/* Collected Capital bar representation */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600 flex items-center gap-1">
                  Capital Recuperado Cobrado ({tasaRecuperacion.toFixed(1)}%)
                </span>
                <span className="font-black text-emerald-600">${totalCobrado.toLocaleString('es-ES')}</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, tasaRecuperacion)}%` }}
                ></div>
              </div>
            </div>

            {/* Delinquency representation */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-600">Monto Atrasado Actual (Mora)</span>
                <span className="font-black text-rose-600">${capitalEnMora.toLocaleString('es-ES')}</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, tasaMora)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-center text-xs">
            <div>
              <div className="text-slate-400 font-semibold mb-1">Interés Generado</div>
              <div className="font-bold text-blue-600">${interesTotal.toLocaleString('es-ES')}</div>
            </div>
            <div>
              <div className="text-slate-400 font-semibold mb-1">Interés Cobrado</div>
              <div className="font-bold text-emerald-600">${interesCobrado.toLocaleString('es-ES')}</div>
            </div>
            <div>
              <div className="text-slate-400 font-semibold mb-1">Mora Pendiente</div>
              <div className="font-bold text-rose-600">${(interesTotal - interesCobrado).toLocaleString('es-ES')}</div>
            </div>
          </div>
        </div>

        {/* Chart 2: Dynamic Collection Goal Meter (Meta de Cobranza) */}
        {(() => {
          const metaMonto = configuracion.metaCobranzaMonto || 3000000;
          const metaPlazo = configuracion.metaCobranzaPlazo || 'mensual';
          const pctMeta = Math.min(100, Math.max(0, (totalCobrado / metaMonto) * 100));
          const strokeDashoffset = 251.2 - (251.2 * pctMeta) / 100;
          const restante = Math.max(0, metaMonto - totalCobrado);

          return (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-[#1E803B]" />
                  Meta de Cobranza del Total
                </h4>
                <span className="text-[10px] bg-[#E8F5E9] px-2 py-0.5 rounded text-[#1E803B] font-bold uppercase tracking-wider">
                  {metaPlazo}
                </span>
              </div>

              {/* High Polished Radial Progress Gauge */}
              <div className="flex flex-col items-center justify-center py-6">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="64"
                      cy="64"
                      r="40"
                      className="stroke-slate-100"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    {/* Active progress circle */}
                    <circle
                      cx="64"
                      cy="64"
                      r="40"
                      className="stroke-[#1E803B] transition-all duration-700 ease-out"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray="251.2"
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center leading-none">
                    <span className="text-2xl font-black text-slate-800 tracking-tighter">
                      {pctMeta.toFixed(0)}%
                    </span>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Logrado
                    </span>
                  </div>
                </div>

                <div className="text-center mt-3">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                    Cobrado de la Meta
                  </span>
                  <div className="text-lg font-extrabold text-slate-800">
                    ${totalCobrado.toLocaleString('es-ES')}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Meta de Cobro:</span>
                  <span className="font-extrabold text-slate-800">${metaMonto.toLocaleString('es-ES')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Falta para el Objetivo:</span>
                  <span className={`font-extrabold ${restante === 0 ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {restante === 0 ? '¡Meta Cumplida!' : `$${restante.toLocaleString('es-ES')}`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold bg-slate-50 p-2 rounded-xl border border-slate-150/50 mt-1">
                  <span>Plazo: <strong className="text-slate-600 uppercase">{metaPlazo}</strong></span>
                  <button 
                    onClick={() => onNavigateTo('configuracion')} 
                    className="text-[#1E803B] hover:underline hover:text-emerald-700 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    ⚙️ Configurar Meta
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Card 3: Contabilidad y Rentabilidad (Dinero Trabajando, Intereses, Esperado vs Real) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100 flex items-center justify-between">
              <span>Ficha Contable de Capital</span>
              <span className="text-[9px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase">Operativo</span>
            </h4>
            
            <div className="space-y-3.5">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Dinero Trabajando (Capital Circulante)</span>
                <div className="text-lg font-extrabold text-slate-800">${capitalEnCirculacion.toLocaleString('es-ES')}</div>
                <p className="text-[9px] text-slate-400 mt-0.5">Capital entregado neto en la calle (sin intereses)</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Interés por Retornar (Rentabilidad Proyectada)</span>
                <div className="text-lg font-extrabold text-blue-600">${interesEsperadoRetorno.toLocaleString('es-ES')}</div>
                <p className="text-[9px] text-slate-400 mt-0.5">Retorno de ganancias esperado de créditos activos</p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-extrabold block mb-1">Recaudación de Cuotas (Histórica)</span>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-500">Esperado (Vencido + Hoy):</span>
                    <span className="text-slate-800">${totalCobrosEsperados.toLocaleString('es-ES')}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-emerald-600">Real Recaudado:</span>
                    <span className="text-emerald-600 font-extrabold">${totalCobrosReales.toLocaleString('es-ES')}</span>
                  </div>
                  <div className="flex justify-between text-[11px] border-t border-slate-50 pt-1 text-slate-400">
                    <span>Brecha (No Cobrado):</span>
                    <span className="text-rose-600 font-bold">${brechaCobro.toLocaleString('es-ES')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
              <span>Eficacia de Cobro Real:</span>
              <span className="text-emerald-600 font-black">{cumplimientoCobroPct.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, cumplimientoCobroPct)}%` }}
              ></div>
            </div>
          </div>
        </div>

      </div>

      {/* NEW PANEL: Breakdown of Modalities (Frequencies) & Person Credit Counts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Frequencies Details Card */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-3 border-b border-slate-100">
            Modalidades y Frecuencias de Pago (Volumen)
          </h4>
          
          <div className="space-y-3">
            {[
              { id: 'DIARIA', label: 'Diario', color: 'bg-emerald-500' },
              { id: 'SEMANAL', label: 'Semanal', color: 'bg-blue-500' },
              { id: 'QUINCENAL', label: 'Quincenal', color: 'bg-indigo-500' },
              { id: 'MENSUAL', label: 'Mensual', color: 'bg-rose-500' }
            ].map(f => {
              const stat = statsPorFrecuencia[f.id] || { count: 0, totalFinanciado: 0, capitalEntregado: 0 };
              return (
                <div key={f.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/50 flex justify-between items-center text-xs">
                  <div className="space-y-1">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${f.color}`}></span>
                      {f.label}
                    </span>
                    <p className="text-[10px] text-slate-400">Cap. Colocado: ${stat.capitalEntregado.toLocaleString('es-ES')}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-slate-800">${stat.totalFinanciado.toLocaleString('es-ES')}</div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{stat.count} crédito{stat.count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Client Credit Summary Table */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Cantidad de Créditos por Cliente (Personas)
            </h4>
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">
              Total Clientes: {clientesCreditosList.length}
            </span>
          </div>

          <div className="overflow-y-auto max-h-[220px] pr-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">Cliente (Persona)</th>
                  <th className="pb-2 text-center">Créditos Totales</th>
                  <th className="pb-2 text-center">Créditos Activos</th>
                  <th className="pb-2 text-right">Volumen Financiado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-600">
                {clientesCreditosList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 font-medium">
                      No hay clientes con créditos registrados en el sistema.
                    </td>
                  </tr>
                ) : (
                  [...clientesCreditosList]
                    .sort((a, b) => b.totalCreditos - a.totalCreditos)
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5">
                          <div className="font-bold text-slate-800">{item.nombreCompleto}</div>
                          <div className="text-[9px] text-slate-400 font-mono">DNI {item.dni}</div>
                        </td>
                        <td className="py-2.5 text-center font-bold text-slate-700">{item.totalCreditos}</td>
                        <td className="py-2.5 text-center">
                          <span className={`inline-flex px-1.5 py-0.5 rounded-sm text-[10px] font-extrabold ${
                            item.creditosActivos > 0 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.creditosActivos} activo{item.creditosActivos !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-black text-slate-800">${item.montoFinanciado.toLocaleString('es-ES')}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Grid: Upcoming collections vs Latest collected receipts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Upcoming dues (Proximos Vencimientos) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-600" />
              Próximos Vencimientos de Cuotas
            </h3>
            <button 
              onClick={() => onNavigateTo('pagos-whatsapp')} 
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
            >
              Ver Todas
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {proximosVencimientos.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No hay cuotas programadas para vencer pronto.</p>
            ) : (
              proximosVencimientos.map(c => (
                <div key={c.id} className="flex justify-between items-center text-xs p-3 hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400">{c.id}</span>
                    <div className="font-bold text-slate-900">{c.nombreCliente}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Cuota {c.numeroCuota} · Vence: {c.fechaVencimiento}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-blue-600">${c.valorTotalCuota.toLocaleString('es-ES')}</div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-800 rounded-xs mt-1 inline-block uppercase">
                      {c.frecuencia}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Latest payment receipts (Ultimos Recibos) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Últimos Cobros Realizados
            </h3>
            <button 
              onClick={() => onNavigateTo('pagos-whatsapp')} 
              className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
            >
              Ver Todos
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {ultimosPagos.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No se han registrado pagos en esta sesión.</p>
            ) : (
              ultimosPagos.map(p => (
                <div key={p.id} className="flex justify-between items-center text-xs p-3 hover:bg-slate-50 border border-slate-100 rounded-lg transition-colors">
                  <div>
                    <span className="font-mono text-[10px] text-slate-400">{p.id} ({p.idOperacion})</span>
                    <div className="font-bold text-slate-900">{p.nombreCliente}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Cobrador: {p.cobrador || 'N/A'} · {p.fechaPago}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-emerald-600">${p.importe.toLocaleString('es-ES')}</div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-800 rounded-xs mt-1 inline-block uppercase">
                      {p.metodoPago}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  ) : (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Planificación y Estimaciones Financieras
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Análisis de colocación de capital, estimación de ganancias por mes e impacto contable de clientes activos e inactivos.
              </p>
            </div>

            {/* Segment Selector Control */}
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start md:self-center">
              <button
                onClick={() => setEstimateFilter('activos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  estimateFilter === 'activos'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Clientes Activos
              </button>

              <button
                onClick={() => setEstimateFilter('inactivos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  estimateFilter === 'inactivos'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-200"></span>
                Inactivos / Congelados
              </button>

              <button
                onClick={() => setEstimateFilter('combinado')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                  estimateFilter === 'combinado'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-300"></span>
                Total Combinado
              </button>
            </div>
          </div>

          {/* Segment Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {estimateFilter === 'activos' ? 'Capital Entregado Activo' : estimateFilter === 'inactivos' ? 'Capital Paralizado / Standby' : 'Capital Total Desembolsado'}
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  ${segmentTotals.totalCap.toLocaleString('es-AR')}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  {segmentTotals.countOps} crédito{segmentTotals.countOps !== 1 ? 's' : ''} en este segmento
                </p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ganancia Estimada (Interés)</span>
                <h3 className="text-xl font-black text-emerald-600">
                  ${segmentTotals.totalInt.toLocaleString('es-AR')}
                </h3>
                <p className="text-[10px] text-emerald-600 font-bold">
                  Intereses acordados sobre el capital
                </p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {estimateFilter === 'inactivos' ? 'Retorno Potencial de Recuperación' : 'Total Financiado a Cobrar'}
                </span>
                <h3 className="text-xl font-black text-blue-600">
                  ${segmentTotals.totalFin.toLocaleString('es-AR')}
                </h3>
                <p className="text-[10px] text-blue-600 font-bold">
                  {estimateFilter === 'inactivos' ? 'Capital + Ganancia si se recuperan' : 'Capital Líquido + Interés Total'}
                </p>
              </div>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Target className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Monthly Breakdowns */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
              <span>Desglose Mensual por Fecha de Entrega</span>
              <span className="text-[10px] text-slate-400 font-normal">
                Segmento actual: <strong className="uppercase text-slate-700">{estimateFilter}</strong>
              </span>
            </h4>

            {estimacionesPorSegmento.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-xs text-slate-600 font-bold">No hay créditos registrados en el segmento "{estimateFilter}".</p>
                <p className="text-[11px] text-slate-400">
                  {estimateFilter === 'inactivos' 
                    ? 'No se registran créditos inactivos ni congelados por el momento.' 
                    : 'Puede agregar créditos o cambiar de segmento arriba.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {estimacionesPorSegmento.map((item) => (
                  <div key={item.key} className="p-5 bg-slate-50/50 border border-slate-200 rounded-2xl shadow-xs space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-200/60 pb-2.5">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                        {item.monthLabel}
                      </span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full font-extrabold border border-emerald-200/50">
                        {item.count} Crédito{item.count !== 1 ? 's' : ''} registrado{item.count !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Capital Entregado</span>
                        <strong className="text-slate-800 text-sm font-black">${item.capitalEntregado.toLocaleString('es-AR')}</strong>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Ganancia Estimada (Intereses)</span>
                        <strong className="text-emerald-600 text-sm font-black">${item.gananciaEstimada.toLocaleString('es-AR')}</strong>
                      </div>

                      <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Total Financiado (Retorno)</span>
                        <strong className="text-blue-600 text-sm font-black">${item.totalFinanciado.toLocaleString('es-AR')}</strong>
                      </div>
                    </div>

                    {/* Bar indicator */}
                    {(() => {
                      const pctGain = item.totalFinanciado > 0 ? (item.gananciaEstimada / item.totalFinanciado) * 100 : 0;
                      return (
                        <div className="space-y-1.5 pt-1 text-xs">
                          <div className="flex justify-between font-bold text-slate-500">
                            <span>Margen de Rentabilidad del Mes</span>
                            <span className="text-emerald-600">{pctGain.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${pctGain}%` }}></div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
