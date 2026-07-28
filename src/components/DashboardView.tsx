/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Cliente, Operacion, Cuota, Pago, Configuracion } from '../types';
import { 
  TrendingUp, Users, DollarSign, Percent, AlertTriangle, 
  Calendar, CheckCircle, ArrowUpRight, ArrowDownRight, Award, Target, Calculator
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

  // Selected Month state for Análisis Contable y Financiero Mensual (default: current month)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const defaultMesStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  
  const [mesAnalisis, setMesAnalisis] = useState<string>(defaultMesStr);

  // Calculation for "Análisis Contable y Financiero Mensual"
  const analisisMensual = React.useMemo(() => {
    const [yStr, mStr] = mesAnalisis.split('-');
    const yearNum = parseInt(yStr, 10) || currentYear;
    const monthNum = parseInt(mStr, 10) || (currentMonth + 1);

    const startDateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const daysInM = new Date(yearNum, monthNum, 0).getDate();
    const endDateStr = `${yearNum}-${String(monthNum).padStart(2, '0')}-${String(daysInM).padStart(2, '0')}`;

    // Filter ONLY active credits
    const opsActivas = operaciones.filter(op => op.estado === 'ACTIVA');

    // 1. Capital Activo Colocado Original: Suma del monto prestado de todos los créditos actualmente activos
    const capitalActivoColocadoOriginal = opsActivas.reduce((acc, op) => {
      const mp = Number(op.capitalEntregado) || Number(op.montoPrestamo) || 0;
      return acc + mp;
    }, 0);

    // Build map for active credits for per-cuota calculation
    const opActivaMap = new Map<string, {
      id: string;
      montoPrestamo: number;
      totalFinanciado: number;
      cantidadCuotas: number;
      capitalPorCuota: number;
      gananciaPorCuota: number;
    }>();

    opsActivas.forEach(op => {
      const mp = Number(op.capitalEntregado) || Number(op.montoPrestamo) || 0;
      const tf = Number(op.totalFinanciado) || Number(op.montoTotalDevolver) || 0;
      const cc = Number(op.cantidadCuotas) || Number(op.cuotasTotales) || 1;
      const cantCuotasValid = cc > 0 ? cc : 1;

      const capitalPorCuota = mp / cantCuotasValid;
      const gananciaPorCuota = Math.max(0, tf - mp) / cantCuotasValid;

      opActivaMap.set(op.id, {
        id: op.id,
        montoPrestamo: mp,
        totalFinanciado: tf,
        cantidadCuotas: cantCuotasValid,
        capitalPorCuota: isNaN(capitalPorCuota) ? 0 : capitalPorCuota,
        gananciaPorCuota: isNaN(gananciaPorCuota) ? 0 : gananciaPorCuota,
      });
    });

    // MEDIDOR 1: Cuotas de créditos activos con vencimiento en el mes en curso
    const cuotasMesActivas = cuotas.filter(c => {
      if (!c || !c.fechaVencimiento) return false;
      if (!opActivaMap.has(c.idOperacion)) return false;
      return c.fechaVencimiento >= startDateStr && c.fechaVencimiento <= endDateStr;
    });

    let retornoCapitalEstimadoMes = 0;
    let gananciaEstimadaMes = 0;

    cuotasMesActivas.forEach(c => {
      const info = opActivaMap.get(c.idOperacion);
      if (info) {
        retornoCapitalEstimadoMes += info.capitalPorCuota || 0;
        gananciaEstimadaMes += info.gananciaPorCuota || 0;
      }
    });

    const totalProyectadoRecaudarMes = retornoCapitalEstimadoMes + gananciaEstimadaMes;

    // MEDIDOR 2:
    // A. Capital Neto Vivo en Calle (No recuperado aún): Suma de (Monto Prestado Original - Capital ya amortizado por cuotas pagadas hasta la fecha)
    let capitalNetoVivoEnCalle = 0;

    opsActivas.forEach(op => {
      const info = opActivaMap.get(op.id);
      if (info) {
        const cuotasPagadasCount = cuotas.filter(c => c.idOperacion === op.id && c.estado === 'PAGADA').length;
        const capitalAmortizado = info.capitalPorCuota * cuotasPagadasCount;
        const capitalVivoOp = Math.max(0, info.montoPrestamo - capitalAmortizado);
        capitalNetoVivoEnCalle += capitalVivoOp;
      }
    });

    // B. Ganancia Pendiente del Mes: Porción de ganancia de las cuotas del mes que aún no han sido cobradas (c.estado !== 'PAGADA')
    const cuotasMesPendientes = cuotasMesActivas.filter(c => c.estado !== 'PAGADA');

    let gananciaPendienteMes = 0;
    let retornoCapitalPendienteMes = 0;

    cuotasMesPendientes.forEach(c => {
      const info = opActivaMap.get(c.idOperacion);
      if (info) {
        gananciaPendienteMes += info.gananciaPorCuota || 0;
        retornoCapitalPendienteMes += info.capitalPorCuota || 0;
      }
    });

    // C. Total Neto Pendiente del Mes = Recuperación de capital vivo restante del mes + ganancia pendiente del mes
    const totalNetoPendienteMes = retornoCapitalPendienteMes + gananciaPendienteMes;

    // Month Label
    const dateObj = new Date(yearNum, monthNum - 1, 1);
    const monthLabel = isNaN(dateObj.getTime())
      ? mesAnalisis
      : dateObj.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    const formattedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

    return {
      mesLabel: formattedMonthLabel,
      startDateStr,
      endDateStr,
      cuotasMesCount: cuotasMesActivas.length,
      cuotasPendientesCount: cuotasMesPendientes.length,
      // Medidor 1
      capitalActivoColocadoOriginal: isNaN(capitalActivoColocadoOriginal) ? 0 : capitalActivoColocadoOriginal,
      retornoCapitalEstimadoMes: isNaN(retornoCapitalEstimadoMes) ? 0 : retornoCapitalEstimadoMes,
      gananciaEstimadaMes: isNaN(gananciaEstimadaMes) ? 0 : gananciaEstimadaMes,
      totalProyectadoRecaudarMes: isNaN(totalProyectadoRecaudarMes) ? 0 : totalProyectadoRecaudarMes,
      // Medidor 2
      capitalNetoVivoEnCalle: isNaN(capitalNetoVivoEnCalle) ? 0 : capitalNetoVivoEnCalle,
      gananciaPendienteMes: isNaN(gananciaPendienteMes) ? 0 : gananciaPendienteMes,
      retornoCapitalPendienteMes: isNaN(retornoCapitalPendienteMes) ? 0 : retornoCapitalPendienteMes,
      totalNetoPendienteMes: isNaN(totalNetoPendienteMes) ? 0 : totalNetoPendienteMes,
    };
  }, [cuotas, operaciones, mesAnalisis, currentYear, currentMonth]);

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
      if (!op || !op.fechaOtorgamiento) return;
      const dateParts = op.fechaOtorgamiento.split('-');
      if (dateParts.length < 2) return;
      const key = `${dateParts[0]}-${dateParts[1]}`; // e.g. "2026-06"
      
      const dateObj = new Date(op.fechaOtorgamiento + 'T12:00:00');
      const monthLabel = isNaN(dateObj.getTime()) ? 'Mes Actual' : dateObj.toLocaleDateString('es-AR', { year: 'numeric', month: 'long' });
      
      const capEntregado = Number(op.capitalEntregado) || Number(op.montoPrestamo) || 0;
      const totalFinan = Number(op.totalFinanciado) || Number(op.montoTotalDevolver) || 0;
      const interes = Math.max(0, totalFinan - capEntregado);
      
      if (!groups[key]) {
        groups[key] = {
          monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          capitalEntregado: 0,
          gananciaEstimada: 0,
          totalFinanciado: 0,
          count: 0
        };
      }
      
      groups[key].capitalEntregado += capEntregado;
      groups[key].gananciaEstimada += interes;
      groups[key].totalFinanciado += totalFinan;
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

    let totalCap = 0;
    let totalFin = 0;
    filterOps.forEach(o => {
      const cap = Number(o.capitalEntregado) || Number(o.montoPrestamo) || 0;
      const fin = Number(o.totalFinanciado) || Number(o.montoTotalDevolver) || 0;
      totalCap += cap;
      totalFin += fin;
    });

    const totalInt = Math.max(0, totalFin - totalCap);
    const countOps = filterOps.length;

    return { 
      totalCap: isNaN(totalCap) ? 0 : totalCap, 
      totalFin: isNaN(totalFin) ? 0 : totalFin, 
      totalInt: isNaN(totalInt) ? 0 : totalInt, 
      countOps 
    };
  }, [operaciones, clientMap, estimateFilter]);

  // 1. KPI Calculations
  const totalClientes = clientes.length;
  const clientesActivos = clientes.filter(c => c.estado === 'ACTIVO').length;
  const clientesMora = clientes.filter(c => c.estado === 'EN_MORA' || c.estado === 'EVASIVO').length;
  const clientesSolicitantes = clientes.filter(c => c.estado === 'SOLICITANTE').length;
  const clientesInactivos = clientes.filter(c => c.estado === 'INACTIVO' || c.estado === 'CONGELADO');

  // Deuda e impacto de clientes inactivos
  const deudaClientesInactivosTotal = clientesInactivos.reduce((sum, c) => {
    if (c.montoDeudaInactivo && c.montoDeudaInactivo > 0) {
      return sum + c.montoDeudaInactivo;
    }
    const clientOps = operaciones.filter(o => o.idCliente === c.id);
    return sum + clientOps.reduce((s, o) => s + (Number(o.totalPendiente) || 0), 0);
  }, 0);

  const pagoInicialRefinanciacionTotal = clientesInactivos.reduce((sum, c) => {
    if (c.montoPagoInicialRefinanciacion && c.montoPagoInicialRefinanciacion > 0) {
      return sum + c.montoPagoInicialRefinanciacion;
    }
    const debt = c.montoDeudaInactivo || 150000;
    return sum + Math.round(debt * 0.3);
  }, 0);

  const totalFinanciado = operaciones.reduce((acc, op) => acc + (Number(op.totalFinanciado) || Number(op.montoTotalDevolver) || 0), 0);
  const capitalEntregado = operaciones
    .filter(op => op.estado === 'ACTIVA' || op.estado === 'VENCIDA')
    .reduce((acc, op) => acc + (Number(op.capitalEntregado) || Number(op.montoPrestamo) || 0), 0);
  const capitalRecuperado = operaciones.reduce((acc, op) => acc + (Number(op.capitalRecuperado) || 0), 0);
  const interesTotal = Math.max(0, totalFinanciado - capitalEntregado);
  const interesCobrado = operaciones.reduce((acc, op) => acc + (Number(op.interesCobrado) || 0), 0);
  
  const totalCobrado = pagos.reduce((acc, p) => acc + (Number(p.importe) || 0), 0);
  const carteraPendienteTotal = operaciones.reduce((acc, op) => acc + (Number(op.totalPendiente) || 0), 0);

  // Delinquency calculator: Cuotas that are pending and whose vencimiento is older than today
  const hoyStr = new Date().toISOString().split('T')[0];
  const cuotasMora = cuotas.filter(c => c.estado !== 'PAGADA' && c.fechaVencimiento < hoyStr);
  const capitalEnMora = cuotasMora.reduce((acc, c) => acc + (Number(c.saldoPendiente) || 0), 0);

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
    .reduce((acc, op) => acc + (Number(op.capitalPendiente) || Number(op.capitalEntregado) || Number(op.montoPrestamo) || 0), 0);

  // B. Interest expected to return (Interés que tiene que retornar de operaciones activas)
  const interesEsperadoRetorno = operaciones
    .filter(op => op.estado === 'ACTIVA')
    .reduce((acc, op) => {
      const totP = Number(op.totalPendiente) || 0;
      const capP = Number(op.capitalPendiente) || 0;
      return acc + Math.max(0, totP - capP);
    }, 0);

  // C. Expected collections up to today (Lo esperado por vencimiento de cuotas)
  const cuotasHastaHoy = cuotas.filter(c => c.fechaVencimiento <= hoyStr);
  const totalCobrosEsperados = cuotasHastaHoy.reduce((acc, c) => acc + (Number(c.valorTotalCuota) || 0), 0);

  // D. Real collections collected (Lo real recaudado de lo que están pagando)
  const totalCobrosReales = pagos.reduce((acc, p) => acc + (Number(p.importe) || 0), 0);

  // E. Expected vs Real ratio
  const brechaCobro = Math.max(0, totalCobrosEsperados - totalCobrosReales);
  const cumplimientoCobroPct = totalCobrosEsperados > 0 ? (totalCobrosReales / totalCobrosEsperados) * 100 : 0;

  // F. Stats by Frequency (Count, total financed, and total capital)
  const statsPorFrecuencia = operaciones.reduce((acc, op) => {
    const f = op.frecuencia || 'DIARIA';
    if (!acc[f]) {
      acc[f] = { count: 0, totalFinanciado: 0, capitalEntregado: 0 };
    }
    acc[f].count += 1;
    acc[f].totalFinanciado += Number(op.totalFinanciado) || Number(op.montoTotalDevolver) || 0;
    acc[f].capitalEntregado += Number(op.capitalEntregado) || Number(op.montoPrestamo) || 0;
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Colocado total */}
        <div className="bg-emerald-950/90 p-4 rounded-2xl border border-emerald-800/80 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Total Colocado</span>
            <h3 className="text-lg font-extrabold text-white">${totalFinanciado.toLocaleString('es-ES')}</h3>
            <p className="text-[9px] text-emerald-200/80">
              Cap. Entregado: <span className="font-semibold text-white">${capitalEntregado.toLocaleString('es-ES')}</span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-900/80 rounded-lg text-emerald-300 border border-emerald-700 shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        {/* Recuperado */}
        <div className="bg-emerald-950/90 p-4 rounded-2xl border border-emerald-800/80 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Recuperado</span>
            <h3 className="text-lg font-extrabold text-emerald-300">${totalCobrado.toLocaleString('es-ES')}</h3>
            <p className="text-[9px] text-emerald-200/80">
              Intereses: <span className="font-semibold text-emerald-300">${interesCobrado.toLocaleString('es-ES')}</span>
            </p>
          </div>
          <div className="p-2.5 bg-emerald-900/80 rounded-lg text-emerald-300 border border-emerald-700 shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>

        {/* Pendiente Activos */}
        <div className="bg-emerald-950/90 p-4 rounded-2xl border border-emerald-800/80 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Pendiente Activos</span>
            <h3 className="text-lg font-extrabold text-white">${carteraPendienteTotal.toLocaleString('es-ES')}</h3>
            <p className="text-[9px] text-emerald-200/80">
              Cartera viva en calle
            </p>
          </div>
          <div className="p-2.5 bg-emerald-900/80 rounded-lg text-emerald-300 border border-emerald-700 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        {/* En Mora */}
        <div className="bg-emerald-950/90 p-4 rounded-2xl border border-rose-800/80 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">Mora Activa</span>
            <h3 className="text-lg font-extrabold text-rose-400">${capitalEnMora.toLocaleString('es-ES')}</h3>
            <p className="text-[9px] text-rose-300 font-medium">
              {cuotasMora.length} cuotas vencidas
            </p>
          </div>
          <div className="p-2.5 bg-rose-950 rounded-lg text-rose-400 border border-rose-800 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        {/* Cartera Inactiva / Congelada */}
        <div className="bg-gradient-to-br from-amber-950/90 to-slate-900 p-4 rounded-2xl border-2 border-amber-500/80 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">Cartera Inactiva ({clientesInactivos.length})</span>
            <h3 className="text-lg font-extrabold text-yellow-300">${deudaClientesInactivosTotal.toLocaleString('es-ES')}</h3>
            <p className="text-[9px] text-amber-200/90 font-bold">
              Pago Inicial Refin: <span className="text-white">${pagoInicialRefinanciacionTotal.toLocaleString('es-ES')}</span>
            </p>
          </div>
          <div className="p-2.5 bg-amber-950 text-amber-300 rounded-lg border border-amber-700 shrink-0">
            <Users className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* Visual Charts & breakdowns using Pure SVGs / HTML */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Capital Colocado vs Recuperado */}
        <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-md flex flex-col justify-between">
          <div className="flex justify-between items-center pb-4 border-b border-emerald-800/60">
            <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-widest">Balance de Colocación y Cobro</h4>
            <span className="text-[10px] bg-emerald-900 text-emerald-200 px-2 py-0.5 rounded font-mono border border-emerald-700">Total acumulado</span>
          </div>

          <div className="py-8 flex flex-col justify-center space-y-6">
            {/* Financed Capital bar representation */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-emerald-200">Capital Financiado Total (Meta)</span>
                <span className="font-black text-white">${totalFinanciado.toLocaleString('es-ES')}</span>
              </div>
              <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-emerald-800">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>

            {/* Collected Capital bar representation */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-emerald-200 flex items-center gap-1">
                  Capital Recuperado Cobrado ({tasaRecuperacion.toFixed(1)}%)
                </span>
                <span className="font-black text-emerald-300">${totalCobrado.toLocaleString('es-ES')}</span>
              </div>
              <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-emerald-800">
                <div 
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, tasaRecuperacion)}%` }}
                ></div>
              </div>
            </div>

            {/* Delinquency representation */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-emerald-200">Monto Atrasado Actual (Mora)</span>
                <span className="font-black text-rose-400">${capitalEnMora.toLocaleString('es-ES')}</span>
              </div>
              <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden border border-emerald-800">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, tasaMora)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-emerald-800/60 text-center text-xs">
            <div>
              <div className="text-emerald-300/80 font-semibold mb-1">Interés Generado</div>
              <div className="font-bold text-white">${interesTotal.toLocaleString('es-ES')}</div>
            </div>
            <div>
              <div className="text-emerald-300/80 font-semibold mb-1">Interés Cobrado</div>
              <div className="font-bold text-emerald-300">${interesCobrado.toLocaleString('es-ES')}</div>
            </div>
            <div>
              <div className="text-emerald-300/80 font-semibold mb-1">Mora Pendiente</div>
              <div className="font-bold text-rose-400">${(interesTotal - interesCobrado).toLocaleString('es-ES')}</div>
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
            <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-md flex flex-col justify-between">
              <div className="flex justify-between items-center pb-4 border-b border-emerald-800/60">
                <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-emerald-400" />
                  Meta de Cobranza del Total
                </h4>
                <span className="text-[10px] bg-emerald-900 px-2 py-0.5 rounded text-emerald-300 font-bold uppercase tracking-wider border border-emerald-700">
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
                      className="stroke-slate-800"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    {/* Active progress circle */}
                    <circle
                      cx="64"
                      cy="64"
                      r="40"
                      className="stroke-emerald-400 transition-all duration-700 ease-out"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray="251.2"
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center leading-none">
                    <span className="text-2xl font-black text-white tracking-tighter">
                      {pctMeta.toFixed(0)}%
                    </span>
                    <span className="block text-[9px] font-bold text-emerald-300/80 uppercase tracking-widest mt-1">
                      Logrado
                    </span>
                  </div>
                </div>

                <div className="text-center mt-3">
                  <span className="text-[10px] text-emerald-300 uppercase tracking-widest font-bold">
                    Cobrado de la Meta
                  </span>
                  <div className="text-lg font-extrabold text-white">
                    ${totalCobrado.toLocaleString('es-ES')}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-emerald-800/60 text-xs">
                <div className="flex justify-between">
                  <span className="text-emerald-200/80 font-semibold">Meta de Cobro:</span>
                  <span className="font-extrabold text-white">${metaMonto.toLocaleString('es-ES')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-200/80 font-semibold">Falta para el Objetivo:</span>
                  <span className={`font-extrabold ${restante === 0 ? 'text-emerald-300' : 'text-white'}`}>
                    {restante === 0 ? '¡Meta Cumplida!' : `$${restante.toLocaleString('es-ES')}`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-emerald-300 font-semibold bg-slate-900 p-2 rounded-xl border border-emerald-800/80 mt-1">
                  <span>Plazo: <strong className="text-white uppercase">{metaPlazo}</strong></span>
                  <button 
                    onClick={() => onNavigateTo('configuracion')} 
                    className="text-emerald-400 hover:underline hover:text-emerald-300 font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    ⚙️ Configurar Meta
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Card 3: Contabilidad y Rentabilidad (Dinero Trabajando, Intereses, Esperado vs Real) */}
        <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-md flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-widest pb-3 border-b border-emerald-800/60 flex items-center justify-between">
              <span>Ficha Contable de Capital</span>
              <span className="text-[9px] bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded font-bold uppercase border border-emerald-700">Operativo</span>
            </h4>
            
            <div className="space-y-3.5">
              <div>
                <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold block">Dinero Trabajando (Capital Circulante)</span>
                <div className="text-lg font-extrabold text-white">${capitalEnCirculacion.toLocaleString('es-ES')}</div>
                <p className="text-[9px] text-emerald-200/70 mt-0.5">Capital entregado neto en la calle (sin intereses)</p>
              </div>

              <div>
                <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold block">Interés por Retornar (Rentabilidad Proyectada)</span>
                <div className="text-lg font-extrabold text-emerald-300">${interesEsperadoRetorno.toLocaleString('es-ES')}</div>
                <p className="text-[9px] text-emerald-200/70 mt-0.5">Retorno de ganancias esperado de créditos activos</p>
              </div>

              <div className="pt-2 border-t border-emerald-800/60">
                <span className="text-[10px] text-emerald-300 uppercase tracking-wider font-extrabold block mb-1">Recaudación de Cuotas (Histórica)</span>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold">
                    <span className="text-emerald-200/80">Esperado (Vencido + Hoy):</span>
                    <span className="text-white">${totalCobrosEsperados.toLocaleString('es-ES')}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-emerald-300">Real Recaudado:</span>
                    <span className="text-emerald-300 font-extrabold">${totalCobrosReales.toLocaleString('es-ES')}</span>
                  </div>
                  <div className="flex justify-between text-[11px] border-t border-emerald-800/40 pt-1 text-emerald-200/70">
                    <span>Brecha (No Cobrado):</span>
                    <span className="text-rose-400 font-bold">${brechaCobro.toLocaleString('es-ES')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-emerald-800/60">
            <div className="flex justify-between items-center text-[10px] text-emerald-300 font-bold">
              <span>Eficacia de Cobro Real:</span>
              <span className="text-emerald-300 font-black">{cumplimientoCobroPct.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full mt-1 overflow-hidden border border-emerald-800">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, cumplimientoCobroPct)}%` }}
              ></div>
            </div>
          </div>
        </div>

      </div>

      {/* NEW PANEL: Breakdown of Modalities (Frequencies) & Person Credit Counts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Frequencies Details Card */}
        <div className="lg:col-span-5 bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-md space-y-4">
          <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-widest pb-3 border-b border-emerald-800/60">
            Modalidades y Frecuencias de Pago (Volumen)
          </h4>
          
          <div className="space-y-3">
            {[
              { id: 'DIARIA', label: 'Diario', color: 'bg-emerald-500' },
              { id: 'SEMANAL', label: 'Semanal', color: 'bg-emerald-400' },
              { id: 'QUINCENAL', label: 'Quincenal', color: 'bg-teal-400' },
              { id: 'MENSUAL', label: 'Mensual', color: 'bg-amber-400' }
            ].map(f => {
              const stat = statsPorFrecuencia[f.id] || { count: 0, totalFinanciado: 0, capitalEntregado: 0 };
              return (
                <div key={f.id} className="p-3 bg-slate-900 rounded-xl border border-emerald-800/80 flex justify-between items-center text-xs">
                  <div className="space-y-1">
                    <span className="font-extrabold text-white flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${f.color}`}></span>
                      {f.label}
                    </span>
                    <p className="text-[10px] text-emerald-200/80">Cap. Colocado: ${stat.capitalEntregado.toLocaleString('es-ES')}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-emerald-300">${stat.totalFinanciado.toLocaleString('es-ES')}</div>
                    <span className="text-[9px] font-bold text-emerald-200/70 uppercase tracking-wider">{stat.count} crédito{stat.count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Client Credit Summary Table */}
        <div className="lg:col-span-7 bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-md space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-emerald-800/60">
            <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-widest">
              Cantidad de Créditos por Cliente (Personas)
            </h4>
            <span className="text-[10px] bg-emerald-900 px-2 py-0.5 rounded text-emerald-300 font-bold border border-emerald-700">
              Total Clientes: {clientesCreditosList.length}
            </span>
          </div>

          <div className="overflow-y-auto max-h-[220px] pr-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-emerald-800/60 text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider">
                  <th className="pb-2">Cliente (Persona)</th>
                  <th className="pb-2 text-center">Créditos Totales</th>
                  <th className="pb-2 text-center">Créditos Activos</th>
                  <th className="pb-2 text-right">Volumen Financiado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-800/40 text-emerald-100">
                {clientesCreditosList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-emerald-300/70 font-medium">
                      No hay clientes con créditos registrados en el sistema.
                    </td>
                  </tr>
                ) : (
                  [...clientesCreditosList]
                    .sort((a, b) => b.totalCreditos - a.totalCreditos)
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-emerald-900/60 transition-colors">
                        <td className="py-2.5">
                          <div className="font-bold text-white">{item.nombreCompleto}</div>
                          <div className="text-[9px] text-emerald-300/80 font-mono">DNI {item.dni}</div>
                        </td>
                        <td className="py-2.5 text-center font-bold text-emerald-200">{item.totalCreditos}</td>
                        <td className="py-2.5 text-center">
                          <span className={`inline-flex px-1.5 py-0.5 rounded-sm text-[10px] font-extrabold ${
                            item.creditosActivos > 0 
                              ? 'bg-emerald-900 text-emerald-300 border border-emerald-700' 
                              : 'bg-slate-900 text-slate-400 border border-slate-700'
                          }`}>
                            {item.creditosActivos} activo{item.creditosActivos !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-black text-white">${item.montoFinanciado.toLocaleString('es-ES')}</td>
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
        <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-md space-y-4">
          <div className="flex justify-between items-center border-b border-emerald-800/60 pb-3">
            <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-amber-400" />
              Próximos Vencimientos de Cuotas
            </h3>
            <button 
              onClick={() => onNavigateTo('pagos-whatsapp')} 
              className="text-xs text-emerald-300 hover:text-white font-bold flex items-center gap-0.5 cursor-pointer"
            >
              Ver Todas
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {proximosVencimientos.length === 0 ? (
              <p className="text-xs text-emerald-200/70 text-center py-6">No hay cuotas programadas para vencer pronto.</p>
            ) : (
              proximosVencimientos.map(c => (
                <div key={c.id} className="flex justify-between items-center text-xs p-3 hover:bg-emerald-900/60 border border-emerald-800/80 bg-slate-900 rounded-lg transition-colors">
                  <div>
                    <span className="font-mono text-[10px] text-emerald-300/70">{c.id}</span>
                    <div className="font-bold text-white">{c.nombreCliente}</div>
                    <div className="text-[10px] text-emerald-200/80 mt-0.5">Cuota {c.numeroCuota} · Vence: {c.fechaVencimiento}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-emerald-300">${c.valorTotalCuota.toLocaleString('es-ES')}</div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-900 text-emerald-300 border border-emerald-700 rounded-xs mt-1 inline-block uppercase">
                      {c.frecuencia}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Latest payment receipts (Ultimos Recibos) */}
        <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-md space-y-4">
          <div className="flex justify-between items-center border-b border-emerald-800/60 pb-3">
            <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Últimos Cobros Realizados
            </h3>
            <button 
              onClick={() => onNavigateTo('pagos-whatsapp')} 
              className="text-xs text-emerald-300 hover:text-white font-bold flex items-center gap-0.5 cursor-pointer"
            >
              Ver Todos
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {ultimosPagos.length === 0 ? (
              <p className="text-xs text-emerald-200/70 text-center py-6">No se han registrado pagos en esta sesión.</p>
            ) : (
              ultimosPagos.map(p => (
                <div key={p.id} className="flex justify-between items-center text-xs p-3 hover:bg-emerald-900/60 border border-emerald-800/80 bg-slate-900 rounded-lg transition-colors">
                  <div>
                    <span className="font-mono text-[10px] text-emerald-300/70">{p.id} ({p.idOperacion})</span>
                    <div className="font-bold text-white">{p.nombreCliente}</div>
                    <div className="text-[10px] text-emerald-200/80 mt-0.5">Cobrador: {p.cobrador || 'N/A'} · {p.fechaPago}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-emerald-300">${p.importe.toLocaleString('es-ES')}</div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-900 text-emerald-300 border border-emerald-700 rounded-xs mt-1 inline-block uppercase">
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
    <div className="space-y-6">
      {/* MÓDULO: ANÁLISIS CONTABLE Y FINANCIERO MENSUAL */}
      
      {/* MEDIDOR 1: Proyección y Flujo de Fondos del Mes Actual */}
      <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-md space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-emerald-800/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Medidor 1: Proyección y Flujo de Fondos ({analisisMensual.mesLabel})
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-900/90 text-emerald-300 border border-emerald-700 rounded-md">
                Capital vs. Interés
              </span>
            </div>
            <p className="text-xs text-emerald-200/80 mt-1">
              Desglose de retorno de capital y ganancia por cuotas de créditos activos con vencimiento en el mes auditado.
            </p>
          </div>

          {/* Selector de Mes Opcional */}
          <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-emerald-800/80 shrink-0">
            <label className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider">Período Auditado:</label>
            <input
              type="month"
              value={mesAnalisis}
              onChange={(e) => setMesAnalisis(e.target.value)}
              className="bg-emerald-950 border border-emerald-800 rounded-lg p-1.5 text-xs text-white font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setMesAnalisis(defaultMesStr)}
              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              Mes Actual
            </button>
          </div>
        </div>

        {/* Tarjetas del Medidor 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 p-4 rounded-xl border border-emerald-800/80 space-y-1">
            <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider block">
              Capital Activo Colocado Original
            </span>
            <div className="text-2xl font-black text-white">
              ${analisisMensual.capitalActivoColocadoOriginal.toLocaleString('es-AR')}
            </div>
            <p className="text-[10px] text-emerald-200/70 font-medium">
              Suma de monto prestado en créditos activos
            </p>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-emerald-800/80 space-y-1">
            <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider block">
              Retorno de Capital Estimado del Mes
            </span>
            <div className="text-xl font-extrabold text-emerald-200">
              ${analisisMensual.retornoCapitalEstimadoMes.toLocaleString('es-AR')}
            </div>
            <p className="text-[10px] text-emerald-200/70 font-medium">
              Amortización principal de cuotas del mes
            </p>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-emerald-800/80 space-y-1">
            <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider block">
              Ganancia Estimada del Mes
            </span>
            <div className="text-2xl font-black text-emerald-300">
              ${analisisMensual.gananciaEstimadaMes.toLocaleString('es-AR')}
            </div>
            <p className="text-[10px] text-emerald-400 font-bold">
              Intereses proyectados a retornar en el mes
            </p>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-emerald-800/80 space-y-1">
            <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider block">
              Total Proyectado a Recaudar
            </span>
            <div className="text-xl font-extrabold text-white">
              ${analisisMensual.totalProyectadoRecaudarMes.toLocaleString('es-AR')}
            </div>
            <p className="text-[10px] text-emerald-200/70 font-medium">
              Retorno de Capital + Ganancia ({analisisMensual.cuotasMesCount} cuotas)
            </p>
          </div>
        </div>
      </div>

      {/* MEDIDOR 2: Capital Vivo Trabajándose y Retorno Neto */}
      <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-md space-y-5">
        <div className="flex items-center justify-between border-b border-emerald-800/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Medidor 2: Capital Vivo Trabajándose y Retorno Neto
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-emerald-900/90 text-emerald-300 border border-emerald-700 rounded-md">
                Neto Pendiente
              </span>
            </div>
            <p className="text-xs text-emerald-200/80 mt-1">
              Monitoreo de capital vivo circulante no amortizado y ganancias pendientes por cobrar.
            </p>
          </div>
        </div>

        {/* Tarjetas del Medidor 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 p-4 rounded-xl border border-emerald-800/80 space-y-1">
            <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider block">
              Capital Neto Vivo en Calle (No recuperado aún)
            </span>
            <div className="text-2xl font-black text-white">
              ${analisisMensual.capitalNetoVivoEnCalle.toLocaleString('es-AR')}
            </div>
            <p className="text-[10px] text-emerald-200/70 font-medium">
              Monto prestado original - Amortización por cuotas ya pagadas
            </p>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-emerald-800/80 space-y-1">
            <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider block">
              Ganancia Pendiente del Mes
            </span>
            <div className="text-2xl font-black text-emerald-300">
              ${analisisMensual.gananciaPendienteMes.toLocaleString('es-AR')}
            </div>
            <p className="text-[10px] text-emerald-400 font-bold">
              Intereses del mes pendientes de cobro ({analisisMensual.cuotasPendientesCount} cuotas sin pagar)
            </p>
          </div>

          <div className="bg-slate-900 p-4 rounded-xl border border-emerald-800/80 space-y-1">
            <span className="text-[10px] font-extrabold text-emerald-300 uppercase tracking-wider block">
              Total Neto Pendiente del Mes
            </span>
            <div className="text-2xl font-black text-white">
              ${analisisMensual.totalNetoPendienteMes.toLocaleString('es-AR')}
            </div>
            <p className="text-[10px] text-emerald-200/70 font-medium">
              Recuperación de capital restante del mes + ganancia pendiente
            </p>
          </div>
        </div>
      </div>

      <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-md space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-800/60 pb-4">
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Planificación y Estimaciones Financieras
              </h3>
              <p className="text-xs text-emerald-200/80 mt-1">
                Análisis de colocación de capital, estimación de ganancias por mes e impacto contable de clientes activos e inactivos.
              </p>
            </div>

            {/* Segment Selector Control */}
            <div className="flex bg-slate-900 p-1 rounded-xl shrink-0 self-start md:self-center border border-emerald-800/80">
              <button
                onClick={() => setEstimateFilter('activos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  estimateFilter === 'activos'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-200/80 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
                Clientes Activos
              </button>

              <button
                onClick={() => setEstimateFilter('inactivos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  estimateFilter === 'inactivos'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-emerald-200/80 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-300"></span>
                Inactivos / Congelados
              </button>

              <button
                onClick={() => setEstimateFilter('combinado')}
                className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer ${
                  estimateFilter === 'combinado'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-200/80 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-teal-300"></span>
                Total Combinado
              </button>
            </div>
          </div>

          {/* Segment Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 p-4 rounded-xl border border-emerald-800/80 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                  {estimateFilter === 'activos' ? 'Capital Entregado Activo' : estimateFilter === 'inactivos' ? 'Capital Paralizado / Standby' : 'Capital Total Desembolsado'}
                </span>
                <h3 className="text-xl font-black text-white">
                  ${segmentTotals.totalCap.toLocaleString('es-AR')}
                </h3>
                <p className="text-[10px] text-emerald-200/80 font-medium">
                  {segmentTotals.countOps} crédito{segmentTotals.countOps !== 1 ? 's' : ''} en este segmento
                </p>
              </div>
              <div className="p-3 bg-emerald-950 text-emerald-300 rounded-xl border border-emerald-800">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-emerald-800/80 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Ganancia Estimada (Interés)</span>
                <h3 className="text-xl font-black text-emerald-300">
                  ${segmentTotals.totalInt.toLocaleString('es-AR')}
                </h3>
                <p className="text-[10px] text-emerald-400 font-bold">
                  Intereses acordados sobre el capital
                </p>
              </div>
              <div className="p-3 bg-emerald-950 text-emerald-300 rounded-xl border border-emerald-800">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-emerald-800/80 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                  {estimateFilter === 'inactivos' ? 'Retorno Potencial de Recuperación' : 'Total Financiado a Cobrar'}
                </span>
                <h3 className="text-xl font-black text-white">
                  ${segmentTotals.totalFin.toLocaleString('es-AR')}
                </h3>
                <p className="text-[10px] text-emerald-300 font-bold">
                  {estimateFilter === 'inactivos' ? 'Capital + Ganancia si se recuperan' : 'Capital Líquido + Interés Total'}
                </p>
              </div>
              <div className="p-3 bg-emerald-950 text-emerald-300 rounded-xl border border-emerald-800">
                <Target className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Monthly Breakdowns */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-widest flex items-center justify-between">
              <span>Desglose Mensual por Fecha de Entrega</span>
              <span className="text-[10px] text-emerald-200/80 font-normal">
                Segmento actual: <strong className="uppercase text-white">{estimateFilter}</strong>
              </span>
            </h4>

            {estimacionesPorSegmento.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-dashed border-emerald-800/80 rounded-2xl space-y-2">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-xs text-white font-bold">No hay créditos registrados en el segmento "{estimateFilter}".</p>
                <p className="text-[11px] text-emerald-200/70">
                  {estimateFilter === 'inactivos' 
                    ? 'No se registran créditos inactivos ni congelados por el momento.' 
                    : 'Puede agregar créditos o cambiar de segmento arriba.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {estimacionesPorSegmento.map((item) => (
                  <div key={item.key} className="p-5 bg-slate-900 border border-emerald-800/80 rounded-2xl shadow-xs space-y-4">
                    <div className="flex justify-between items-center border-b border-emerald-800/60 pb-2.5">
                      <span className="text-xs font-black text-white uppercase tracking-wide">
                        {item.monthLabel}
                      </span>
                      <span className="text-[10px] bg-emerald-900 text-emerald-300 px-2.5 py-0.5 rounded-full font-extrabold border border-emerald-700">
                        {item.count} Crédito{item.count !== 1 ? 's' : ''} registrado{item.count !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-emerald-100">
                      <div className="bg-emerald-950/80 p-3.5 rounded-xl border border-emerald-800">
                        <span className="text-emerald-300/80 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Capital Entregado</span>
                        <strong className="text-white text-sm font-black">${item.capitalEntregado.toLocaleString('es-AR')}</strong>
                      </div>

                      <div className="bg-emerald-950/80 p-3.5 rounded-xl border border-emerald-800">
                        <span className="text-emerald-300/80 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Ganancia Estimada (Intereses)</span>
                        <strong className="text-emerald-300 text-sm font-black">${item.gananciaEstimada.toLocaleString('es-AR')}</strong>
                      </div>

                      <div className="bg-emerald-950/80 p-3.5 rounded-xl border border-emerald-800">
                        <span className="text-emerald-300/80 block text-[9px] uppercase font-bold tracking-wider mb-0.5">Total Financiado (Retorno)</span>
                        <strong className="text-white text-sm font-black">${item.totalFinanciado.toLocaleString('es-AR')}</strong>
                      </div>
                    </div>

                    {/* Bar indicator */}
                    {(() => {
                      const pctGain = item.totalFinanciado > 0 ? (item.gananciaEstimada / item.totalFinanciado) * 100 : 0;
                      return (
                        <div className="space-y-1.5 pt-1 text-xs">
                          <div className="flex justify-between font-bold text-emerald-200/80">
                            <span>Margen de Rentabilidad del Mes</span>
                            <span className="text-emerald-300">{pctGain.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-emerald-950 h-2 rounded-full overflow-hidden border border-emerald-800">
                            <div className="bg-emerald-400 h-full rounded-full transition-all" style={{ width: `${pctGain}%` }}></div>
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
      </div>
    )}
  </div>
);
}
