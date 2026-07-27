import React, { useState } from 'react';
import { Cliente, Operacion, UsuarioRol } from '../types';

interface ClientesViewProps {
  clientes: Cliente[];
  operaciones: Operacion[];
  usuarios?: UsuarioRol[];
  onAddCliente: (cliente: Cliente) => void;
  onUpdateCliente: (cliente: Cliente) => void;
  canManage?: boolean;
  isAdmin?: boolean;
  verTelefonoCliente?: boolean;
  verDniCliente?: boolean;
  verDireccionCliente?: boolean;
  verIngresosCliente?: boolean;
}

export default function ClientesView({ clientes }: ClientesViewProps) {
  const [search, setSearch] = useState('');

  const filtered = clientes.filter(c => 
    `${c.nombre} ${c.apellido}`.toLowerCase().includes(search.toLowerCase()) ||
    (c.dni && c.dni.includes(search))
  );

  return (
    <div className="space-y-4 font-sans text-slate-100">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <h2 className="text-xl font-black text-white mb-3">Buscar Clientes</h2>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre o DNI..."
          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-bold text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
            <h3 className="font-black text-white text-base">{c.nombre} {c.apellido}</h3>
            <p className="text-xs text-slate-400">DNI: {c.dni || 'Sin DNI'} • Tel: {c.telefono || 'Sin Tel'}</p>
            <p className="text-xs text-slate-300">Dirección: {c.direccion || 'N/A'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
