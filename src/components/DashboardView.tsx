/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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

  return (
    <div id="dashboard-section" className="space-y-6">
      
      {/* Title & Stats Overview Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Consola Gerencial & Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Estado financiero general de su cartera de colocaciones, cobranzas y nivel de morosidad en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Eficacia de Cobro</span>
            <div className="text-lg font-black text-emerald-600">{tasaRecuperacion.toFixed(1)}%</div>
          </div>
          <div className="text-right border-l border-slate-100 pl-6">
            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Índice Mora</span>
            <div className="text-lg font-black text-rose-600">{tasaMora.toFixed(1)}%</div>
          </div>
        </div>
      </div>

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

        {/* Breakdown of Client States & Frequencies */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest pb-4 border-b border-slate-100">
              Distribución de Clientes
            </h4>
            
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                  Activos (Sanos)
                </span>
                <span className="font-bold text-slate-800">{clientesActivos} ({totalClientes > 0 ? ((clientesActivos / totalClientes) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
                  En Mora
                </span>
                <span className="font-bold text-slate-800">{clientesMora} ({totalClientes > 0 ? ((clientesMora / totalClientes) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                  Solicitantes (En Estudio)
                </span>
                <span className="font-bold text-slate-800">{clientesSolicitantes} ({totalClientes > 0 ? ((clientesSolicitantes / totalClientes) * 100).toFixed(0) : 0}%)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Frecuencias de Créditos</h5>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold">DIARIA</div>
                <div className="font-black text-slate-800 text-sm mt-0.5">{opsPorFrecuencia['DIARIA'] || 0}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold">SEMANAL</div>
                <div className="font-black text-slate-800 text-sm mt-0.5">{opsPorFrecuencia['SEMANAL'] || 0}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold">QUINCENAL</div>
                <div className="font-black text-slate-800 text-sm mt-0.5">{opsPorFrecuencia['QUINCENAL'] || 0}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                <div className="text-[10px] text-slate-400 font-bold">MENSUAL</div>
                <div className="font-black text-slate-800 text-sm mt-0.5">{opsPorFrecuencia['MENSUAL'] || 0}</div>
              </div>
            </div>
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
              onClick={() => onNavigateTo('pagos')} 
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
              onClick={() => onNavigateTo('pagos')} 
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
    </div>
  );
}
