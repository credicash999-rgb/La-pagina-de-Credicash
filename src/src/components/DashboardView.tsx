import React from 'react';
import { Cliente, Operacion, Cuota, Pago, Configuracion } from '../types';

interface DashboardViewProps {
  clientes: Cliente[];
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
  configuracion: Configuracion;
  onNavigateTo: (tab: string) => void;
}

export default function DashboardView({ clientes, operaciones, pagos, onNavigateTo }: DashboardViewProps) {
  const totalCobrado = pagos.reduce((s, p) => s + p.importe, 0);

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Consola Dashboard</h2>
          <p className="text-xs text-slate-400 mt-1">Resumen general de operaciones y cobros en tiempo real.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-extrabold uppercase">Total Clientes</span>
          <p className="text-3xl font-black text-emerald-400">{clientes.length}</p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-extrabold uppercase">Operaciones Registradas</span>
          <p className="text-3xl font-black text-teal-400">{operaciones.length}</p>
        </div>

        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 font-extrabold uppercase">Recaudación Total</span>
          <p className="text-3xl font-black text-yellow-400">${totalCobrado.toLocaleString('es-AR')}</p>
        </div>
      </div>
    </div>
  );
}
