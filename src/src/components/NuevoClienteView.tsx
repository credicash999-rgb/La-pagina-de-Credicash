import React, { useState } from 'react';
import { Cliente } from '../types';

interface NuevoClienteViewProps {
  clientes: Cliente[];
  onAddCliente: (cliente: Cliente) => void;
  onNavigateTo: (tab: string) => void;
}

export default function NuevoClienteView({ onAddCliente, onNavigateTo }: NuevoClienteViewProps) {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !apellido.trim()) return;
    const nuevo: Cliente = {
      id: `CLI-${Date.now().toString().slice(-5)}`,
      nombre,
      apellido,
      dni,
      telefono,
      direccion,
      estado: 'ACTIVO',
      fechaRegistro: new Date().toISOString().split('T')[0]
    };
    onAddCliente(nuevo);
    onNavigateTo('clientes');
  };

  return (
    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 max-w-xl mx-auto space-y-4">
      <h2 className="text-xl font-black text-white">Nuevo Cliente (Ficha)</h2>
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className="block text-slate-300 font-bold mb-1">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
            required
          />
        </div>
        <div>
          <label className="block text-slate-300 font-bold mb-1">Apellido</label>
          <input
            type="text"
            value={apellido}
            onChange={e => setApellido(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
            required
          />
        </div>
        <div>
          <label className="block text-slate-300 font-bold mb-1">DNI</label>
          <input
            type="text"
            value={dni}
            onChange={e => setDni(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
          />
        </div>
        <div>
          <label className="block text-slate-300 font-bold mb-1">Teléfono / WhatsApp</label>
          <input
            type="text"
            value={telefono}
            onChange={e => setTelefono(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
          />
        </div>
        <div>
          <label className="block text-slate-300 font-bold mb-1">Dirección</label>
          <input
            type="text"
            value={direccion}
            onChange={e => setDireccion(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl mt-4 cursor-pointer"
        >
          Guardar Ficha
        </button>
      </form>
    </div>
  );
}
