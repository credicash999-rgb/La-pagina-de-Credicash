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
  
  // Modal state to configure inactive debt, initial payment, and custom minimum
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [customDeudaInput, setCustomDeudaInput] = useState<string>('');
  const [customPagoInicialInput, setCustomPagoInicialInput] = useState<string>('');
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
    if (c.montoDeudaInactivo !== undefined && c.montoDeudaInactivo > 0) {
      return c.montoDeudaInactivo;
    }
    const clientOps = operaciones.filter(o => o.idCliente === c.id);
    const opDebt = clientOps.reduce((sum, o) => sum + (o.totalPendiente || 0), 0);
    return opDebt > 0 ? opDebt : 150000; // Fallback initial default if never edited
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
    const currentDeuda = getClienteDeudaTotal(cliente);
    const currentMin = getClienteMinimoExigible(cliente);
    const currentPagoInicial = cliente.montoPagoInicialRefinanciacion || Math.round(currentDeuda * 0.10);

    setCustomDeudaInput(String(currentDeuda));
    setCustomPagoInicialInput(String(currentPagoInicial));
    setCustomMinimoInput(String(currentMin));
  };

  const handleSaveConfigInactivo = () => {
    if (!editingCliente) return;
    const newDeuda = parseFloat(customDeudaInput);
    const newPagoInicial = parseFloat(customPagoInicialInput);
    const newMin = parseFloat(customMinimoInput);

    if (isNaN(newDeuda) || newDeuda < 0) {
      alert('Por favor ingrese un monto de deuda válido mayor o igual a 0.');
      return;
    }

    onUpdateCliente({
      ...editingCliente,
      montoDeudaInactivo: newDeuda,
      montoPagoInicialRefinanciacion: isNaN(newPagoInicial) ? 0 : newPagoInicial,
      montoMinimoInactivoConfigurado: isNaN(newMin) ? Math.round(newDeuda * 0.20) : newMin
    });

    setEditingCliente(null);
    alert('Ficha de cliente inactivo actualizada correctamente.');
  };

  const handleReassignCobrador = (cliente: Cliente, cobradorId: string) => {
    const cobradorObj = usuarios.find(u => u.id === cobradorId);
    const todayStr = new Date().toISOString().split('T')[0];
    
    onUpdateCliente({
      ...cliente,
      cobradorAsignadoId: cobradorId || undefined,
      cobradorAsignadoNombre: cobradorObj ? cobradorObj.nombre : undefined,
      fechaInicioGestionCobro: cobradorId ? (cliente.fechaInicioGestionCobro || todayStr) : undefined
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
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-black block">Deuda Total Consolidada</span>
                      <span className="text-xl font-black text-rose-400">${deudaTotal.toLocaleString('es-AR')}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                      Sin cuotas activas
                    </span>
                  </div>

                  {/* Pago inicial y acuerdo */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[9px] text-amber-400 font-black uppercase block">Pago Inicial Refinanc.</span>
                      <span className="font-black text-amber-200 text-sm">
                        ${(cliente.montoPagoInicialRefinanciacion || Math.round(deudaTotal * 0.10)).toLocaleString('es-AR')}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[9px] text-emerald-400 font-black uppercase block">Mínimo Exigible</span>
                      <span className="font-black text-emerald-300 text-sm">
                        ${minimoExigible.toLocaleString('es-AR')}
                      </span>
                    </div>
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

                  {(activeUserRole.rolId === 'ADMIN' || activeUserRole.rolId === 'SUPERVISOR') && (
                    <button
                      onClick={() => handleOpenConfigModal(cliente)}
                      className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer border border-amber-500/40 transition-all shadow-sm"
                    >
                      <Settings className="w-4 h-4 text-amber-400" />
                      <span>Editar Total Adeudado</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CONFIGURAR DEUDA Y PAGO MINIMO POR ADMIN */}
      {editingCliente && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl relative">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block">
                Configuración de Administración
              </span>
              <h3 className="text-lg font-black text-white">
                Editar Total Adeudado: {editingCliente.nombre} {editingCliente.apellido}
              </h3>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* 1. EDITAR DEUDA TOTAL INACTIVA REAL */}
              <div>
                <label className="text-xs font-black text-slate-200 block mb-1">
                  Editar Total Adeudado / Deuda Real ($)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-rose-400 absolute left-3 top-3" />
                  <input
                    type="number"
                    value={customDeudaInput}
                    onChange={e => {
                      const val = e.target.value;
                      setCustomDeudaInput(val);
                      const num = parseFloat(val);
                      if (!isNaN(num) && num > 0) {
                        setCustomMinimoInput(String(Math.round(num * 0.20)));
                        setCustomPagoInicialInput(String(Math.round(num * 0.10)));
                      }
                    }}
                    placeholder="Ej. 180000"
                    className="w-full bg-slate-950 border border-rose-500/50 rounded-xl pl-9 pr-4 py-2.5 text-white font-black text-sm focus:outline-none focus:border-rose-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Ingrese el saldo adeudado real para este cliente.
                </p>
              </div>

              {/* 2. EDITAR PAGO INICIAL PARA ACUERDO / REFINANCIACION */}
              <div>
                <label className="text-xs font-black text-slate-200 block mb-1">
                  Pago Inicial Sugerido para Acuerdo ($)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-amber-400 absolute left-3 top-3" />
                  <input
                    type="number"
                    value={customPagoInicialInput}
                    onChange={e => setCustomPagoInicialInput(e.target.value)}
                    placeholder="Ej. 15000"
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl pl-9 pr-4 py-2.5 text-white font-black text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* 3. EDITAR MONTO MINIMO EXIGIBLE PARA COBRADOR */}
              <div>
                <label className="text-xs font-black text-slate-200 block mb-1">
                  Monto Mínimo Exigible para Cobrador ($)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-emerald-400 absolute left-3 top-3" />
                  <input
                    type="number"
                    value={customMinimoInput}
                    onChange={e => setCustomMinimoInput(e.target.value)}
                    placeholder="Ej. 30000"
                    className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl pl-9 pr-4 py-2.5 text-white font-black text-sm focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  El cobrador verá este monto mínimo en su pantalla de gestión.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setEditingCliente(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConfigInactivo}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/80 transition-all uppercase tracking-wider"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                <span>Aceptar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
