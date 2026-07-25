import React, { useState } from 'react';
import { Cliente, Operacion, UsuarioRol } from '../types';
import { 
  UserX, Search, DollarSign, Settings, Save, 
  MapPin, Phone, CheckCircle2, UserCheck, AlertTriangle, Filter, Shield
} from 'lucide-react';

interface ClientesInactivosViewProps {
  clientes: Cliente[];
  operaciones: Operacion[];
  activeUserRole: UsuarioRol;
  usuarios: UsuarioRol[];
  onUpdateCliente: (clienteActualizado: Cliente) => void;
}

export default function ClientesInactivosView({
  clientes,
  operaciones,
  activeUserRole,
  usuarios,
  onUpdateCliente
}: ClientesInactivosViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCobrador, setFilterCobrador] = useState<string>('TODOS');
  
  // Modal state to configure custom minimum payment
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [customMinimoInput, setCustomMinimoInput] = useState<string>('');

  // Filter inactive clients (either state INACTIVO or with explicit inactive debt)
  const inactivosList = clientes.filter(c => {
    const isInactiveState = c.estado === 'INACTIVO' || c.estado === 'SUSPENDIDO';
    const clientOps = operaciones.filter(o => o.idCliente === c.id);
    const hasInactiveDebt = (c.montoDeudaInactivo && c.montoDeudaInactivo > 0) || 
      clientOps.some(o => o.estado === 'VENCIDA' || o.estado === 'CONGELADA');
    
    return isInactiveState || hasInactiveDebt;
  });

  const cobradoresList = usuarios.filter(u => u.rolId === 'COBRADOR' || u.rolId === 'ADMIN');

  // Filter by search term and cobrador
  const filteredInactivos = inactivosList.filter(c => {
    const matchesSearch = 
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.dni.includes(searchTerm);

    const matchesCobrador = filterCobrador === 'TODOS' || c.cobradorAsignadoId === filterCobrador;

    return matchesSearch && matchesCobrador;
  });

  // Calculate total debt for an inactive client
  const getClienteDeudaTotal = (c: Cliente): number => {
    if (c.montoDeudaInactivo && c.montoDeudaInactivo > 0) {
      return c.montoDeudaInactivo;
    }
    const clientOps = operaciones.filter(o => o.idCliente === c.id);
    const opDebt = clientOps.reduce((sum, o) => sum + (o.totalPendiente || 0), 0);
    return opDebt > 0 ? opDebt : 150000; // Fallback default inactive debt if zero
  };

  // Calculate minimum exigible amount (configured by admin or default 20%)
  const getClienteMinimoExigible = (c: Cliente): number => {
    if (c.montoMinimoInactivoConfigurado !== undefined && c.montoMinimoInactivoConfigurado > 0) {
      return c.montoMinimoInactivoConfigurado;
    }
    const totalDeuda = getClienteDeudaTotal(c);
    return Math.round(totalDeuda * 0.20); // 20% por defecto
  };

  const handleOpenConfigModal = (cliente: Cliente) => {
    setEditingCliente(cliente);
    const currentMin = getClienteMinimoExigible(cliente);
    setCustomMinimoInput(String(currentMin));
  };

  const handleSaveMinimoExigible = () => {
    if (!editingCliente) return;
    const newMin = parseFloat(customMinimoInput);
    if (isNaN(newMin) || newMin < 0) {
      alert('Por favor ingrese un monto válido mayor o igual a 0.');
      return;
    }

    onUpdateCliente({
      ...editingCliente,
      montoMinimoInactivoConfigurado: newMin
    });

    setEditingCliente(null);
    alert('Monto mínimo exigible actualizado correctamente.');
  };

  const handleReassignCobrador = (cliente: Cliente, cobradorId: string) => {
    const cobradorObj = usuarios.find(u => u.id === cobradorId);
    onUpdateCliente({
      ...cliente,
      cobradorAsignadoId: cobradorId || undefined,
      cobradorAsignadoNombre: cobradorObj ? cobradorObj.nombre : undefined
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-wider mb-1">
            <UserX className="w-4 h-4" />
            <span>Módulo de Gestión Especial</span>
          </div>
          <h2 className="text-2xl font-black text-white">Clientes Inactivos con Deuda</h2>
          <p className="text-slate-400 text-xs mt-1">
            Fichas consolidadas sin cuotas periódicas. Deuda total y configuración de pago mínimo exigible personalizado para cobradores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Inactivos</span>
              <span className="text-lg font-black text-white">{inactivosList.length} cartera</span>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nombre, Apellido o DNI..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={filterCobrador}
            onChange={e => setFilterCobrador(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 font-bold rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value="TODOS">Todos los Cobradores</option>
            {cobradoresList.map(u => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* CLIENT CARDS GRID */}
      {filteredInactivos.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <UserX className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-sm font-bold">No se encontraron clientes inactivos con los filtros aplicados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInactivos.map(cliente => {
            const deudaTotal = getClienteDeudaTotal(cliente);
            const minimoExigible = getClienteMinimoExigible(cliente);
            const esCustom = cliente.montoMinimoInactivoConfigurado !== undefined;

            return (
              <div 
                key={cliente.id}
                className="bg-slate-900 border-2 border-slate-800 hover:border-rose-500/50 rounded-3xl p-5 space-y-4 shadow-xl relative flex flex-col justify-between transition-all"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-rose-400 bg-rose-950/80 px-2.5 py-0.5 rounded-lg border border-rose-800 inline-block mb-1">
                        Cliente Inactivo
                      </span>
                      <h3 className="text-lg font-black text-white leading-snug">
                        {cliente.nombre} {cliente.apellido}
                      </h3>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">DNI: {cliente.dni}</p>
                    </div>

                    {cliente.fotoCasa && (
                      <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-700 overflow-hidden shrink-0">
                        <img src={cliente.fotoCasa} alt="Casa" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-slate-300 font-medium pt-1">
                    <p className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{cliente.direccion || 'Sin dirección registrada'}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{cliente.telefono || 'Sin teléfono'}</span>
                    </p>
                  </div>
                </div>

                {/* Financial Summary Box (No Cuotas) */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-black block">Deuda Total Consolidada</span>
                      <span className="text-lg font-black text-rose-400">${deudaTotal.toLocaleString('es-AR')}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold bg-slate-900 px-2 py-1 rounded-lg">
                      Sin cuotas
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <div>
                      <span className="text-[10px] text-emerald-400 uppercase font-black block flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-400" />
                        Monto Mínimo Exigible:
                      </span>
                      <span className="text-xl font-black text-emerald-300">${minimoExigible.toLocaleString('es-AR')}</span>
                    </div>
                    {esCustom ? (
                      <span className="text-[9px] font-black text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-800">
                        Personalizado por Admin
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md">
                        20% de Deuda
                      </span>
                    )}
                  </div>
                </div>

                {/* Cobrador Assignment & Admin Actions */}
                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold">Cobrador Asignado:</span>
                    <select
                      value={cliente.cobradorAsignadoId || ''}
                      onChange={e => handleReassignCobrador(cliente, e.target.value)}
                      className="bg-slate-950 border border-slate-700 text-slate-200 text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Sin Asignar</option>
                      {cobradoresList.map(u => (
                        <option key={u.id} value={u.id}>{u.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {activeUserRole.rolId === 'ADMIN' && (
                    <button
                      onClick={() => handleOpenConfigModal(cliente)}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-amber-300 font-black text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer border border-amber-500/30 transition-all"
                    >
                      <Settings className="w-3.5 h-3.5 text-amber-400" />
                      <span>Configurar Mínimo Exigible ($)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CONFIGURAR PAGO MINIMO EXIGIBLE POR ADMIN */}
      {editingCliente && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                Configuración de Administración
              </span>
              <h3 className="text-lg font-black text-white">
                Monto Mínimo Exigible para {editingCliente.nombre} {editingCliente.apellido}
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 font-bold">Deuda Total Inactiva:</span>
                <span className="font-black text-rose-400 text-sm">
                  ${getClienteDeudaTotal(editingCliente).toLocaleString('es-AR')}
                </span>
              </div>

              <div>
                <label className="text-xs font-black text-slate-200 block mb-1">
                  Monto Mínimo Exigible en Pesos ($)
                </label>
                <p className="text-[10px] text-slate-400 mb-2">
                  El cobrador en su pantalla verás únicamente este valor en dinero sin porcentajes.
                </p>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-emerald-400 absolute left-3 top-3" />
                  <input
                    type="number"
                    value={customMinimoInput}
                    onChange={e => setCustomMinimoInput(e.target.value)}
                    placeholder="Ej. 30000"
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl pl-9 pr-4 py-2.5 text-white font-black text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    const default20 = Math.round(getClienteDeudaTotal(editingCliente) * 0.20);
                    setCustomMinimoInput(String(default20));
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 px-3 rounded-xl flex-1 cursor-pointer"
                >
                  Restablecer a 20% (${Math.round(getClienteDeudaTotal(editingCliente) * 0.20).toLocaleString('es-AR')})
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingCliente(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMinimoExigible}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Mínimo Exigible</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
