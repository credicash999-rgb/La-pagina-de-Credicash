import React, { useState } from 'react';
import { Operacion, Cliente, Cuota, Configuracion, UsuarioRol } from '../types';

interface OperacionesViewProps {
  operaciones: Operacion[];
  clientes: Cliente[];
  cuotas: Cuota[];
  configuracion: Configuracion;
  feriados?: string[];
  activeUser: UsuarioRol | null;
  onAddOperacion: (op: Operacion, cuotas: Cuota[]) => void;
  onUpdateOperacion: (op: Operacion) => void;
  onAddCuotas: (cuotas: Cuota[]) => void;
}

export default function OperacionesView({ operaciones, clientes }: OperacionesViewProps) {
  return (
    <div className="space-y-4 font-sans text-slate-100">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <h2 className="text-xl font-black text-white">Créditos Otorgados</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {operaciones.map(op => (
          <div key={op.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
            <h3 className="font-black text-emerald-400 text-sm">Operación #{op.id}</h3>
            <p className="text-xs text-white font-bold">{op.nombreCliente || 'Cliente'}</p>
            <p className="text-xs text-slate-400">Total: ${(op.totalFinanciado || 0).toLocaleString('es-AR')} | Pendiente: ${(op.totalPendiente || 0).toLocaleString('es-AR')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
