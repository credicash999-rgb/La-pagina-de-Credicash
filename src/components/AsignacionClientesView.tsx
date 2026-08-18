/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Cliente, UsuarioRol, Operacion } from '../types';
import { 
  Users, UserPlus, Search, Check, RefreshCw, X, Filter, 
  Smartphone, PhoneCall, MapPin, CheckCircle2, AlertCircle,
  UserCheck, ShieldCheck, ArrowRight, UserX, HelpCircle, Layers
} from 'lucide-react';

interface AsignacionClientesViewProps {
  clientes: Cliente[];
  usuarios: UsuarioRol[];
  operaciones?: Operacion[];
  activeUser: UsuarioRol | null;
  onUpdateCliente: (cliente: Cliente) => void;
  onBatchUpdateClientes?: (clientes: Cliente[]) => void;
  onNavigateTo?: (tab: string) => void;
}

export default function AsignacionClientesView({
  clientes = [],
  usuarios = [],
  operaciones = [],
  activeUser,
  onUpdateCliente,
  onBatchUpdateClientes,
  onNavigateTo
}: AsignacionClientesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<
    'TODOS' | 'SIN_DIARIA' | 'SIN_TELEFONIA' | 'SIN_DOMICILIARIA' | 'SIN_NINGUNA' | 'ASIGNADOS'
  >('TODOS');
  const [filterOperatorId, setFilterOperatorId] = useState<string>('TODOS');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');

  // Batch Selection
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  // Batch Assignment Inputs
  const [batchDiariaId, setBatchDiariaId] = useState<string>('');
  const [batchTelefoniaId, setBatchTelefoniaId] = useState<string>('');
  const [batchDomiciliariaId, setBatchDomiciliariaId] = useState<string>('');

  // Active Operators List
  const operadoresDiarios = useMemo(() => {
    return usuarios.filter(u => 
      u.rolId === 'OPERADOR' || 
      u.rolId === 'GESTOR_DIARIO' || 
      u.rolId.toLowerCase().includes('operador') ||
      u.rolId === 'ADMIN' ||
      u.rolId === 'SUPERADMIN'
    );
  }, [usuarios]);

  const operadoresTelefonicos = useMemo(() => {
    return usuarios.filter(u => 
      u.rolId === 'OPERADOR' || 
      u.rolId === 'GESTOR_TELEFONICO' || 
      u.rolId === 'TELEFONO' || 
      u.rolId.toLowerCase().includes('telef') || 
      u.rolId === 'ADMIN' ||
      u.rolId === 'SUPERADMIN'
    );
  }, [usuarios]);

  const cobradoresDomiciliarios = useMemo(() => {
    return usuarios.filter(u => 
      u.rolId === 'COBRADOR' || 
      u.rolId === 'GESTOR_DOMICILIARIO' || 
      u.rolId.toLowerCase().includes('cobrador') ||
      u.rolId === 'ADMIN' ||
      u.rolId === 'SUPERADMIN'
    );
  }, [usuarios]);

  // Workload summary per user
  const operatorStats = useMemo(() => {
    return usuarios.map(u => {
      const diariaCount = clientes.filter(c => c.operadorAsignadoId === u.id || (c.operadorAsignadoNombre && c.operadorAsignadoNombre.toLowerCase() === u.nombre.toLowerCase())).length;
      const telCount = clientes.filter(c => c.operadorTelefonicoId === u.id || (c.operadorTelefonicoNombre && c.operadorTelefonicoNombre.toLowerCase() === u.nombre.toLowerCase())).length;
      const cobradorCount = clientes.filter(c => c.cobradorAsignadoId === u.id || (c.cobradorAsignadoNombre && c.cobradorAsignadoNombre.toLowerCase() === u.nombre.toLowerCase())).length;
      return {
        user: u,
        diariaCount,
        telCount,
        cobradorCount,
        total: diariaCount + telCount + cobradorCount
      };
    });
  }, [usuarios, clientes]);

  // Filtered Clients List
  const filteredClientes = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return clientes.filter(c => {
      const fullName = `${c.nombre || ''} ${c.apellido || ''}`.toLowerCase();
      const dni = (c.dni || '').toLowerCase();
      const id = (c.id || '').toLowerCase();
      const address = (c.direccion || c.calle || '').toLowerCase();
      const tel = (c.telefono || '').toLowerCase();

      const matchesSearch = !term || 
        fullName.includes(term) || 
        dni.includes(term) || 
        id.includes(term) || 
        address.includes(term) || 
        tel.includes(term);

      if (!matchesSearch) return false;

      if (filterEstado !== 'TODOS' && c.estado !== filterEstado) return false;

      const hasDiaria = !!(c.operadorAsignadoId || c.operadorAsignadoNombre);
      const hasTelefonia = !!(c.operadorTelefonicoId || c.operadorTelefonicoNombre);
      const hasDomiciliaria = !!(c.cobradorAsignadoId || c.cobradorAsignadoNombre);

      if (filterType === 'SIN_DIARIA' && hasDiaria) return false;
      if (filterType === 'SIN_TELEFONIA' && hasTelefonia) return false;
      if (filterType === 'SIN_DOMICILIARIA' && hasDomiciliaria) return false;
      if (filterType === 'SIN_NINGUNA' && (hasDiaria || hasTelefonia || hasDomiciliaria)) return false;
      if (filterType === 'ASIGNADOS' && (!hasDiaria && !hasTelefonia && !hasDomiciliaria)) return false;

      if (filterOperatorId !== 'TODOS') {
        const matchesOp = 
          c.operadorAsignadoId === filterOperatorId ||
          c.operadorTelefonicoId === filterOperatorId ||
          c.cobradorAsignadoId === filterOperatorId;
        if (!matchesOp) return false;
      }

      return true;
    });
  }, [clientes, searchTerm, filterType, filterOperatorId, filterEstado]);

  // Select all or none
  const handleToggleSelectAll = () => {
    if (selectedClientIds.length === filteredClientes.length) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(filteredClientes.map(c => c.id));
    }
  };

  const handleToggleSelectClient = (id: string) => {
    if (selectedClientIds.includes(id)) {
      setSelectedClientIds(selectedClientIds.filter(x => x !== id));
    } else {
      setSelectedClientIds([...selectedClientIds, id]);
    }
  };

  // Apply Batch Assignment
  const handleApplyBatch = () => {
    if (selectedClientIds.length === 0) {
      alert('⚠️ Por favor seleccione al menos un cliente para asignar.');
      return;
    }

    if (!batchDiariaId && !batchTelefoniaId && !batchDomiciliariaId) {
      alert('⚠️ Seleccione al menos un operador (Gestión Diaria, Telefonía o Cobro Domiciliario) para aplicar a los clientes seleccionados.');
      return;
    }

    const diariaUser = usuarios.find(u => u.id === batchDiariaId);
    const telUser = usuarios.find(u => u.id === batchTelefoniaId);
    const domUser = usuarios.find(u => u.id === batchDomiciliariaId);

    const updatedList: Cliente[] = [];

    selectedClientIds.forEach(id => {
      const client = clientes.find(c => c.id === id);
      if (!client) return;

      const updatedClient: Cliente = { ...client };

      if (batchDiariaId !== '') {
        if (batchDiariaId === 'DESASIGNAR') {
          updatedClient.operadorAsignadoId = '';
          updatedClient.operadorAsignadoNombre = '';
        } else if (diariaUser) {
          updatedClient.operadorAsignadoId = diariaUser.id;
          updatedClient.operadorAsignadoNombre = diariaUser.nombre;
        }
      }

      if (batchTelefoniaId !== '') {
        if (batchTelefoniaId === 'DESASIGNAR') {
          updatedClient.operadorTelefonicoId = '';
          updatedClient.operadorTelefonicoNombre = '';
        } else if (telUser) {
          updatedClient.operadorTelefonicoId = telUser.id;
          updatedClient.operadorTelefonicoNombre = telUser.nombre;
        }
      }

      if (batchDomiciliariaId !== '') {
        if (batchDomiciliariaId === 'DESASIGNAR') {
          updatedClient.cobradorAsignadoId = '';
          updatedClient.cobradorAsignadoNombre = '';
        } else if (domUser) {
          updatedClient.cobradorAsignadoId = domUser.id;
          updatedClient.cobradorAsignadoNombre = domUser.nombre;
        }
      }

      updatedList.push(updatedClient);
      onUpdateCliente(updatedClient);
    });

    if (onBatchUpdateClientes && updatedList.length > 0) {
      onBatchUpdateClientes(updatedList);
    }

    alert(`✅ ¡Se han actualizado exitosamente las asignaciones de ${selectedClientIds.length} cliente(s)!`);
    setSelectedClientIds([]);
    setBatchDiariaId('');
    setBatchTelefoniaId('');
    setBatchDomiciliariaId('');
  };

  // Single client update
  const handleSingleAssign = (
    client: Cliente, 
    type: 'DIARIA' | 'TELEFONIA' | 'DOMICILIARIA', 
    userId: string
  ) => {
    const user = usuarios.find(u => u.id === userId);
    const updated: Cliente = { ...client };

    if (type === 'DIARIA') {
      updated.operadorAsignadoId = user ? user.id : '';
      updated.operadorAsignadoNombre = user ? user.nombre : '';
    } else if (type === 'TELEFONIA') {
      updated.operadorTelefonicoId = user ? user.id : '';
      updated.operadorTelefonicoNombre = user ? user.nombre : '';
    } else if (type === 'DOMICILIARIA') {
      updated.cobradorAsignadoId = user ? user.id : '';
      updated.cobradorAsignadoNombre = user ? user.nombre : '';
    }

    onUpdateCliente(updated);
  };

  // Automatic equitable distribution
  const handleDistribuirEquitativamente = (type: 'DIARIA' | 'TELEFONIA' | 'DOMICILIARIA') => {
    const unassigned = clientes.filter(c => {
      if (type === 'DIARIA') return !c.operadorAsignadoId && !c.operadorAsignadoNombre;
      if (type === 'TELEFONIA') return !c.operadorTelefonicoId && !c.operadorTelefonicoNombre;
      if (type === 'DOMICILIARIA') return !c.cobradorAsignadoId && !c.cobradorAsignadoNombre;
      return false;
    });

    const targetOperators = type === 'DIARIA' 
      ? operadoresDiarios 
      : type === 'TELEFONIA' 
        ? operadoresTelefonicos 
        : cobradoresDomiciliarios;

    if (unassigned.length === 0) {
      alert('ℹ️ No hay clientes sin asignar en este módulo.');
      return;
    }

    if (targetOperators.length === 0) {
      alert('⚠️ No hay operadores registrados con ese rol para distribuir cartera.');
      return;
    }

    const typeLabel = type === 'DIARIA' ? 'Gestión Diaria' : type === 'TELEFONIA' ? 'Telefonía' : 'Cobro Domiciliario';

    if (!confirm(`¿Desea distribuir equitativamente ${unassigned.length} cliente(s) sin asignar de ${typeLabel} entre ${targetOperators.length} operador(es)?`)) {
      return;
    }

    const updatedList: Cliente[] = [];

    unassigned.forEach((cli, idx) => {
      const op = targetOperators[idx % targetOperators.length];
      const updated: Cliente = { ...cli };
      if (type === 'DIARIA') {
        updated.operadorAsignadoId = op.id;
        updated.operadorAsignadoNombre = op.nombre;
      } else if (type === 'TELEFONIA') {
        updated.operadorTelefonicoId = op.id;
        updated.operadorTelefonicoNombre = op.nombre;
      } else if (type === 'DOMICILIARIA') {
        updated.cobradorAsignadoId = op.id;
        updated.cobradorAsignadoNombre = op.nombre;
      }
      updatedList.push(updated);
      onUpdateCliente(updated);
    });

    if (onBatchUpdateClientes && updatedList.length > 0) {
      onBatchUpdateClientes(updatedList);
    }

    alert(`🎉 ¡Se distribuyeron ${unassigned.length} clientes equitativamente en ${typeLabel}!`);
  };

  const totalAsignadosDiaria = clientes.filter(c => c.operadorAsignadoId || c.operadorAsignadoNombre).length;
  const totalAsignadosTel = clientes.filter(c => c.operadorTelefonicoId || c.operadorTelefonicoNombre).length;
  const totalAsignadosCobrador = clientes.filter(c => c.cobradorAsignadoId || c.cobradorAsignadoNombre).length;

  return (
    <div id="modulo-asignacion-clientes" className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 p-6 rounded-3xl border border-emerald-700/60 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-400/10 via-transparent to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black tracking-widest text-emerald-300 uppercase px-2 py-0.5 bg-emerald-900/80 rounded-md border border-emerald-600/40">
                Consola de Administración
              </span>
              <span className="text-[10px] font-bold text-teal-300">
                Control y Rotación de Cartera
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <UserPlus className="w-6 h-6 text-emerald-400" />
              Asignación de Clientes y Cartera Operativa
            </h2>
            <p className="text-xs text-emerald-200/90 mt-1 max-w-2xl">
              Asigne cada cliente a su <strong>Operador de Gestión Diaria</strong> (para su agenda de WhatsApp), <strong>Operador de Telefonía</strong> y <strong>Cobrador Domiciliario</strong>. Una vez asignados, los clientes aparecerán de forma inmediata y exclusiva en la pantalla del operador correspondiente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleDistribuirEquitativamente('DIARIA')}
              className="px-3.5 py-2 bg-emerald-700/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer flex items-center gap-1.5 border border-emerald-500/50"
              title="Reparte los clientes sin gestión diaria equitativamente entre los operadores"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
              <span>Auto-Distribuir Diaria</span>
            </button>

            <button
              onClick={() => handleDistribuirEquitativamente('DOMICILIARIA')}
              className="px-3.5 py-2 bg-teal-700/90 hover:bg-teal-600 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer flex items-center gap-1.5 border border-teal-500/50"
              title="Reparte los clientes sin cobrador equitativamente entre los cobradores"
            >
              <MapPin className="w-3.5 h-3.5 text-teal-300" />
              <span>Auto-Distribuir Cobradores</span>
            </button>
          </div>
        </div>

        {/* Global Progress Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 relative z-10">
          <div className="bg-emerald-900/60 backdrop-blur-xs p-3.5 rounded-2xl border border-emerald-700/50 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-300 uppercase tracking-wider">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gestión Diaria (WhatsApp)</span>
              </div>
              <div className="text-xl font-black text-white">
                {totalAsignadosDiaria} <span className="text-xs font-bold text-emerald-300/80">/ {clientes.length}</span>
              </div>
            </div>
            <span className="text-xs font-black px-2 py-1 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300">
              {clientes.length > 0 ? Math.round((totalAsignadosDiaria / clientes.length) * 100) : 0}%
            </span>
          </div>

          <div className="bg-emerald-900/60 backdrop-blur-xs p-3.5 rounded-2xl border border-emerald-700/50 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-300 uppercase tracking-wider">
                <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
                <span>Gestión Telefónica</span>
              </div>
              <div className="text-xl font-black text-white">
                {totalAsignadosTel} <span className="text-xs font-bold text-emerald-300/80">/ {clientes.length}</span>
              </div>
            </div>
            <span className="text-xs font-black px-2 py-1 rounded-lg bg-emerald-950 border border-emerald-800 text-amber-300">
              {clientes.length > 0 ? Math.round((totalAsignadosTel / clientes.length) * 100) : 0}%
            </span>
          </div>

          <div className="bg-emerald-900/60 backdrop-blur-xs p-3.5 rounded-2xl border border-emerald-700/50 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-black text-teal-300 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span>Cobro Domiciliario (Calle)</span>
              </div>
              <div className="text-xl font-black text-white">
                {totalAsignadosCobrador} <span className="text-xs font-bold text-emerald-300/80">/ {clientes.length}</span>
              </div>
            </div>
            <span className="text-xs font-black px-2 py-1 rounded-lg bg-emerald-950 border border-emerald-800 text-teal-300">
              {clientes.length > 0 ? Math.round((totalAsignadosCobrador / clientes.length) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Operator Workload Cards */}
      <div className="bg-emerald-950/90 p-5 rounded-3xl border border-emerald-800/80 shadow-md space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            Cargas de Trabajo Actual por Operador ({usuarios.length} Usuarios)
          </h3>
          <span className="text-[10px] text-emerald-400 font-bold">Haga clic en un operador para filtrar sus clientes</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div
            onClick={() => setFilterOperatorId('TODOS')}
            className={`p-3 rounded-2xl border transition-all cursor-pointer text-center space-y-1 ${
              filterOperatorId === 'TODOS'
                ? 'bg-emerald-800 border-emerald-400 text-white ring-2 ring-emerald-400/40 shadow-sm'
                : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800 text-slate-300'
            }`}
          >
            <span className="text-xs font-black block">Todos los Operadores</span>
            <span className="text-[10px] text-emerald-300 font-bold block">{clientes.length} Clientes Totales</span>
          </div>

          {operatorStats.map(({ user, diariaCount, telCount, cobradorCount, total }) => {
            const isSelected = filterOperatorId === user.id;
            return (
              <div
                key={user.id}
                onClick={() => setFilterOperatorId(isSelected ? 'TODOS' : user.id)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                  isSelected
                    ? 'bg-emerald-800 border-emerald-400 text-white ring-2 ring-emerald-400/40 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-white truncate block">{user.nombre}</span>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
                    {user.rolId}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[9px] font-bold text-slate-400 pt-0.5">
                  <div title="Gestión Diaria" className="text-center bg-emerald-950/60 rounded px-1 py-0.5 text-emerald-300">
                    D: {diariaCount}
                  </div>
                  <div title="Gestión Telefónica" className="text-center bg-amber-950/60 rounded px-1 py-0.5 text-amber-300">
                    T: {telCount}
                  </div>
                  <div title="Cobro Domiciliario" className="text-center bg-teal-950/60 rounded px-1 py-0.5 text-teal-300">
                    C: {cobradorCount}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Batch Actions Toolbar */}
      {selectedClientIds.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 p-5 rounded-3xl border-2 border-emerald-400 shadow-2xl space-y-4 animate-scaleUp">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-emerald-700/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-800 text-white rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <h4 className="text-sm font-black text-white">
                  Asignación Masiva para {selectedClientIds.length} Cliente(s) Seleccionado(s)
                </h4>
                <p className="text-[11px] text-emerald-200 font-medium">
                  Seleccione los operadores que desea fijar o desasignar y pulse "Aplicar Asignación".
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedClientIds([])}
              className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border border-slate-700"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancelar Selección</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Diaria */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>1. Operador Gestión Diaria:</span>
              </label>
              <select
                value={batchDiariaId}
                onChange={(e) => setBatchDiariaId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-emerald-600 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-300"
              >
                <option value="">-- No modificar Diaria --</option>
                <option value="DESASIGNAR">❌ Desasignar (Dejar Sin Operador)</option>
                {operadoresDiarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre} ({u.rolId})</option>
                ))}
              </select>
            </div>

            {/* Telefonia */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
                <span>2. Operador Telefonía:</span>
              </label>
              <select
                value={batchTelefoniaId}
                onChange={(e) => setBatchTelefoniaId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-emerald-600 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-300"
              >
                <option value="">-- No modificar Telefonía --</option>
                <option value="DESASIGNAR">❌ Desasignar (Dejar Sin Telefonía)</option>
                {operadoresTelefonicos.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre} ({u.rolId})</option>
                ))}
              </select>
            </div>

            {/* Domiciliaria */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-teal-200 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                <span>3. Cobrador Domiciliario:</span>
              </label>
              <select
                value={batchDomiciliariaId}
                onChange={(e) => setBatchDomiciliariaId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-emerald-600 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-300"
              >
                <option value="">-- No modificar Cobrador --</option>
                <option value="DESASIGNAR">❌ Desasignar (Dejar Sin Cobrador)</option>
                {cobradoresDomiciliarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre} ({u.rolId})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={handleApplyBatch}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar Asignación a los {selectedClientIds.length} Clientes</span>
            </button>
          </div>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="bg-emerald-950/90 p-5 rounded-3xl border border-emerald-800/80 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar cliente por Nombre, Apellido, DNI, Domicilio o ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 text-white placeholder-emerald-300/60 border border-emerald-700 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
            {/* Filter by Status Assignment */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-900 text-white border border-emerald-700 rounded-xl text-xs font-black focus:outline-none focus:border-emerald-400"
            >
              <option value="TODOS">Todos los Estados de Asignación</option>
              <option value="SIN_DIARIA">🔴 Sin Operador de Gestión Diaria</option>
              <option value="SIN_TELEFONIA">🟠 Sin Operador de Telefonía</option>
              <option value="SIN_DOMICILIARIA">🔵 Sin Cobrador Domiciliario</option>
              <option value="SIN_NINGUNA">⚠️ Sin Ninguna Asignación</option>
              <option value="ASIGNADOS">✅ Con Alguna Asignación</option>
            </select>

            {/* Filter by Client Credit Status */}
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-3 py-2.5 bg-slate-900 text-white border border-emerald-700 rounded-xl text-xs font-black focus:outline-none focus:border-emerald-400"
            >
              <option value="TODOS">Todos los Estados Crediticios</option>
              <option value="ACTIVO">ACTIVOS</option>
              <option value="EN_MORA">EN MORA</option>
              <option value="SOLICITANTE">SOLICITANTES</option>
              <option value="INACTIVO">INACTIVOS</option>
            </select>
          </div>
        </div>

        {/* Selection Count Bar */}
        <div className="flex justify-between items-center text-xs text-emerald-200/80 font-bold border-t border-emerald-800/80 pt-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleSelectAll}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-emerald-300 rounded-lg text-xs font-extrabold border border-emerald-700/80 transition-all cursor-pointer"
            >
              {selectedClientIds.length === filteredClientes.length && filteredClientes.length > 0
                ? 'Deseleccionar Todos'
                : `Seleccionar Todos (${filteredClientes.length})`}
            </button>
            <span>
              Mostrando <strong className="text-white">{filteredClientes.length}</strong> de <strong className="text-white">{clientes.length}</strong> clientes
            </span>
          </div>

          {selectedClientIds.length > 0 && (
            <span className="text-emerald-300 font-extrabold">
              {selectedClientIds.length} seleccionado(s)
            </span>
          )}
        </div>
      </div>

      {/* Main Table of Clients & Direct Assignment Dropdowns */}
      <div className="bg-emerald-950/90 rounded-3xl border border-emerald-800/80 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/90 text-[11px] font-black uppercase text-emerald-300 tracking-wider border-b border-emerald-800">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredClientes.length > 0 && selectedClientIds.length === filteredClientes.length}
                    onChange={handleToggleSelectAll}
                    className="rounded text-emerald-500 h-4 w-4 accent-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="p-4">Cliente / Identificación</th>
                <th className="p-4">Domicilio & Teléfono</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 min-w-[200px]">
                  <div className="flex items-center gap-1.5 text-emerald-300">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Gestión Diaria (WhatsApp)</span>
                  </div>
                </th>
                <th className="p-4 min-w-[200px]">
                  <div className="flex items-center gap-1.5 text-amber-300">
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Gestión Telefónica</span>
                  </div>
                </th>
                <th className="p-4 min-w-[200px]">
                  <div className="flex items-center gap-1.5 text-teal-300">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Cobro Domiciliario (Calle)</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-900/60 text-xs">
              {filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <UserX className="w-8 h-8 text-emerald-600/50 mx-auto mb-2" />
                    <p className="font-bold text-sm text-emerald-200">No se encontraron clientes con los filtros aplicados.</p>
                    <p className="text-xs text-slate-400 mt-1">Pruebe modificando el término de búsqueda o los selectores superiores.</p>
                  </td>
                </tr>
              ) : (
                filteredClientes.map((cliente) => {
                  const isChecked = selectedClientIds.includes(cliente.id);
                  const fullAddress = cliente.direccion || cliente.calle || 'Sin domicilio registrado';

                  return (
                    <tr 
                      key={cliente.id} 
                      className={`transition-colors hover:bg-emerald-900/40 ${
                        isChecked ? 'bg-emerald-900/50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectClient(cliente.id)}
                          className="rounded text-emerald-500 h-4 w-4 accent-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Cliente Info */}
                      <td className="p-4">
                        <div className="font-extrabold text-white text-sm">
                          {cliente.nombre} {cliente.apellido}
                        </div>
                        <div className="text-[11px] text-emerald-300 font-mono flex items-center gap-2 mt-0.5">
                          <span>DNI: {cliente.dni || 'S/DNI'}</span>
                          <span>•</span>
                          <span className="text-slate-400">ID: {cliente.id}</span>
                        </div>
                      </td>

                      {/* Address & Tel */}
                      <td className="p-4">
                        <div className="text-slate-200 font-medium truncate max-w-xs" title={fullAddress}>
                          {fullAddress}
                        </div>
                        <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                          Tel: {cliente.telefono || cliente.whatsapp || 'Sin teléfono'}
                        </div>
                      </td>

                      {/* Estado Badge */}
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                          cliente.estado === 'ACTIVO' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          cliente.estado === 'EN_MORA' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                          cliente.estado === 'INACTIVO' ? 'bg-slate-900 text-slate-400 border border-slate-700' :
                          'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}>
                          {cliente.estado}
                        </span>
                      </td>

                      {/* Dropdown Gestión Diaria */}
                      <td className="p-4">
                        <select
                          value={cliente.operadorAsignadoId || ''}
                          onChange={(e) => handleSingleAssign(cliente, 'DIARIA', e.target.value)}
                          className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border focus:outline-none ${
                            cliente.operadorAsignadoId
                              ? 'bg-slate-900 text-emerald-300 border-emerald-600/80 font-extrabold'
                              : 'bg-rose-950/40 text-rose-300 border-rose-800/80'
                          }`}
                        >
                          <option value="">🔴 Sin Asignar (Diaria)</option>
                          {operadoresDiarios.map(u => (
                            <option key={u.id} value={u.id}>{u.nombre}</option>
                          ))}
                        </select>
                      </td>

                      {/* Dropdown Gestión Telefónica */}
                      <td className="p-4">
                        <select
                          value={cliente.operadorTelefonicoId || ''}
                          onChange={(e) => handleSingleAssign(cliente, 'TELEFONIA', e.target.value)}
                          className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border focus:outline-none ${
                            cliente.operadorTelefonicoId
                              ? 'bg-slate-900 text-amber-300 border-amber-600/80 font-extrabold'
                              : 'bg-slate-900/60 text-slate-400 border-slate-700'
                          }`}
                        >
                          <option value="">⚪ Sin Asignar (Telefonía)</option>
                          {operadoresTelefonicos.map(u => (
                            <option key={u.id} value={u.id}>{u.nombre}</option>
                          ))}
                        </select>
                      </td>

                      {/* Dropdown Cobro Domiciliario */}
                      <td className="p-4">
                        <select
                          value={cliente.cobradorAsignadoId || ''}
                          onChange={(e) => handleSingleAssign(cliente, 'DOMICILIARIA', e.target.value)}
                          className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border focus:outline-none ${
                            cliente.cobradorAsignadoId
                              ? 'bg-slate-900 text-teal-300 border-teal-600/80 font-extrabold'
                              : 'bg-slate-900/60 text-slate-400 border-slate-700'
                          }`}
                        >
                          <option value="">⚪ Sin Asignar (Cobrador)</option>
                          {cobradoresDomiciliarios.map(u => (
                            <option key={u.id} value={u.id}>{u.nombre}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
