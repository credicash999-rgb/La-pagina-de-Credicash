import React, { useState } from 'react';
import { Operacion, Cuota, Pago, Cliente, UsuarioRol, Configuracion, TransaccionTesoreria } from '../types';
import { Search, DollarSign, Calendar, CheckCircle2, AlertTriangle, Shield, User, Filter } from 'lucide-react';

interface PagosViewProps {
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
  clientes: Cliente[];
  usuarios?: UsuarioRol[];
  activeUser: UsuarioRol | null;
  configuracion: Configuracion;
  onAddPago: (pago: Pago, updatedCuotas: Cuota[], updatedOperacion: Operacion, tesoreriaTrx: TransaccionTesoreria) => void;
  onReorganizePago?: (pagoId: string, newModalidad: any, newMetodoPago?: any, newFechaPago?: string, newImporte?: number, newObservaciones?: string) => void;
  onDeletePago?: (pagoId: string) => void;
  canAddPago?: boolean;
  mode?: 'WHATSAPP' | 'TELEFONO' | 'ADMIN';
  allowAllDates?: boolean; // When true, removes date restrictions so ALL loans of the searched client appear
}

export default function PagosView({
  operaciones,
  cuotas,
  pagos,
  clientes,
  activeUser,
  onAddPago,
  allowAllDates = false
}: PagosViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [selectedOperacion, setSelectedOperacion] = useState<Operacion | null>(null);
  
  const [montoPago, setMontoPago] = useState<string>('');
  const [medioPago, setMedioPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO'>('EFECTIVO');
  const [observaciones, setObservaciones] = useState<string>('');
  const [pagoConfirmadoMsg, setPagoConfirmadoMsg] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter clients by search term
  const filteredClientes = clientes.filter(c => {
    if (!searchTerm.trim()) return false;
    const term = searchTerm.toLowerCase();
    const fullName = `${c.nombre} ${c.apellido}`.toLowerCase();
    return fullName.includes(term) || (c.dni && c.dni.includes(term)) || c.id.toLowerCase().includes(term);
  });

  // Get loans for selected client.
  // CRITICAL REQUIREMENT: When allowAllDates is true (or in Admin Ingresar Pagos mode),
  // show ALL loans of the client regardless of date/antiquity!
  const clientOperaciones = selectedCliente ? operaciones.filter(o => {
    if (o.idCliente !== selectedCliente.id) return false;
    if (allowAllDates) return true; // NO DATE OR ANTIQUITY RESTRICTION! Shows all credits!
    return o.estado === 'ACTIVA' || o.estado === 'VENCIDA';
  }) : [];

  const handleConfirmarPago = () => {
    if (!selectedCliente || !selectedOperacion) return;
    const monto = parseFloat(montoPago);
    if (isNaN(monto) || monto <= 0) {
      alert('Por favor ingrese un monto válido');
      return;
    }

    const newPago: Pago = {
      id: `PAG-${Date.now().toString().slice(-6)}`,
      idOperacion: selectedOperacion.id,
      idCliente: selectedCliente.id,
      nombreCliente: `${selectedCliente.nombre} ${selectedCliente.apellido}`,
      fechaPago: todayStr,
      horaPago: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      importe: monto,
      cobrador: activeUser?.nombre || 'Administrador',
      metodoPago: medioPago,
      observaciones: observaciones || (allowAllDates ? 'Ingresado por Administrador (Sin restricción de fecha)' : 'Pago registrado')
    };

    const opCuotas = cuotas.filter(c => c.idOperacion === selectedOperacion.id);
    let rem = monto;
    const updatedCuotas = opCuotas.map(c => {
      if (c.estado === 'PAGADA' || rem <= 0) return c;
      if (rem >= c.saldoPendiente) {
        rem -= c.saldoPendiente;
        return { ...c, estado: 'PAGADA' as const, saldoPendiente: 0, importePagado: c.valorTotalCuota, fechaPago: todayStr };
      } else {
        const paidThis = rem;
        rem = 0;
        return { ...c, estado: 'PAGO_PARCIAL' as const, saldoPendiente: c.saldoPendiente - paidThis, importePagado: c.importePagado + paidThis, fechaPago: todayStr };
      }
    });

    const pagadasNow = updatedCuotas.filter(c => c.estado === 'PAGADA').length;

    const updatedOp: Operacion = {
      ...selectedOperacion,
      capitalRecuperado: selectedOperacion.capitalRecuperado + monto,
      totalPendiente: Math.max(0, selectedOperacion.totalPendiente - monto),
      cuotasPagadas: pagadasNow,
      cuotasPendientes: Math.max(0, selectedOperacion.cuotasTotales - pagadasNow),
      ultimoPago: todayStr
    };

    const tesoreriaTrx: TransaccionTesoreria = {
      id: `TRX-${Date.now().toString().slice(-6)}`,
      fecha: todayStr,
      tipo: 'INGRESO',
      concepto: `Pago Ingresado (${allowAllDates ? 'Módulo Administrador' : 'Gestión'}) - ${selectedCliente.nombre} ${selectedCliente.apellido}`,
      monto: monto,
      referenciaId: newPago.id
    };

    onAddPago(newPago, updatedCuotas, updatedOp, tesoreriaTrx);

    setPagoConfirmadoMsg(`✅ Pago de $${monto.toLocaleString('es-AR')} registrado exitosamente para ${selectedCliente.nombre} ${selectedCliente.apellido}.`);
    setTimeout(() => setPagoConfirmadoMsg(null), 4000);

    setMontoPago('');
    setObservaciones('');
    setSelectedOperacion(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 text-slate-100 font-sans pb-12">
      {/* Header Banner */}
      <div className={`p-6 rounded-3xl border-2 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        allowAllDates 
          ? 'bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-amber-500/80' 
          : 'bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-emerald-500/80'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-slate-950 font-black shadow-lg ${
            allowAllDates ? 'bg-amber-400' : 'bg-emerald-400'
          }`}>
            {allowAllDates ? <Shield className="w-8 h-8" /> : <DollarSign className="w-8 h-8 stroke-[3]" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white">
                {allowAllDates ? 'INGRESAR PAGOS (Solo Administrador)' : 'Ingresar Pagos de Créditos'}
              </h2>
              {allowAllDates && (
                <span className="bg-amber-500 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-md">
                  Sin Restricción de Fechas
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {allowAllDates 
                ? 'Acceso exclusivo de Administrador: Escriba el nombre del cliente para ver TODOS sus créditos y registrarle pagos sin importar la antigüedad.' 
                : 'Seleccione o busque un cliente para cargar su abono de cuotas.'}
            </p>
          </div>
        </div>
      </div>

      {pagoConfirmadoMsg && (
        <div className="bg-emerald-950 border-2 border-emerald-400 text-emerald-200 font-bold p-4 rounded-2xl flex items-center gap-3 animate-pulse">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <span>{pagoConfirmadoMsg}</span>
        </div>
      )}

      {/* Search Client Bar */}
      <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4 shadow-lg">
        <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
          <Search className="w-4 h-4 text-amber-400" />
          <span>1. Escriba el Nombre del Cliente (Mapeo Completo)</span>
        </label>

        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setSelectedCliente(null);
              setSelectedOperacion(null);
            }}
            placeholder="Escriba nombre, apellido o DNI del cliente..."
            className="w-full bg-slate-950 border-2 border-slate-700 hover:border-amber-500 focus:border-amber-400 rounded-2xl px-4 py-3 text-white font-bold text-sm focus:outline-none transition-all pl-11"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
        </div>

        {/* Client Search Dropdown Results */}
        {searchTerm.trim() !== '' && !selectedCliente && (
          <div className="bg-slate-950 border-2 border-slate-700 rounded-2xl p-2 space-y-1.5 max-h-60 overflow-y-auto">
            {filteredClientes.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3 font-semibold">
                No se encontraron clientes coincidentes con "{searchTerm}".
              </p>
            ) : (
              filteredClientes.map(cli => (
                <div
                  key={cli.id}
                  onClick={() => setSelectedCliente(cli)}
                  className="p-3 bg-slate-900 hover:bg-amber-950/60 hover:border-amber-500/60 border border-slate-800 rounded-xl cursor-pointer flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-amber-400" />
                    <div>
                      <span className="font-black text-white text-sm block">{cli.nombre} {cli.apellido}</span>
                      <span className="text-[11px] text-slate-400 font-bold">DNI: {cli.dni || 'Sin DNI'} | Estado: {cli.estado}</span>
                    </div>
                  </div>
                  <span className="text-xs bg-amber-500 text-slate-950 font-black px-3 py-1 rounded-lg">
                    Seleccionar
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected Client Credits Section */}
      {selectedCliente && (
        <div className="bg-slate-900 p-6 rounded-3xl border-2 border-amber-500/60 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">Cliente Seleccionado</span>
              <h3 className="text-2xl font-black text-white">{selectedCliente.nombre} {selectedCliente.apellido}</h3>
              <p className="text-xs text-slate-300 font-bold mt-0.5">DNI: {selectedCliente.dni || 'N/A'} • {selectedCliente.direccion}</p>
            </div>
            <button
              onClick={() => {
                setSelectedCliente(null);
                setSelectedOperacion(null);
              }}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 font-bold"
            >
              Cambiar Cliente
            </button>
          </div>

          {/* List of ALL Credits (without date restriction) */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span>
                {allowAllDates 
                  ? `Todos los Créditos de ${selectedCliente.nombre} (Histórico Completo - Sin límite de antigüedad)` 
                  : `Créditos Activos de ${selectedCliente.nombre}`}
              </span>
            </h4>

            {clientOperaciones.length === 0 ? (
              <div className="bg-slate-950 p-6 rounded-2xl text-center text-slate-400 text-xs border border-slate-800">
                Este cliente no tiene operaciones registradas.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clientOperaciones.map(op => (
                  <div
                    key={op.id}
                    onClick={() => setSelectedOperacion(op)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedOperacion?.id === op.id
                        ? 'bg-amber-950/40 border-amber-400 ring-2 ring-amber-400/30'
                        : 'bg-slate-950 border-slate-800 hover:border-amber-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-black text-amber-400">Operación #{op.id}</span>
                        <h5 className="font-extrabold text-white text-sm mt-0.5">{op.descripcion || 'Crédito Personal'}</h5>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase border ${
                        op.estado === 'ACTIVA' ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {op.estado}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Total Financiado</span>
                        <span className="font-black text-white">${(op.totalFinanciado || 0).toLocaleString('es-AR')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">Saldo Pendiente</span>
                        <span className="font-black text-amber-300">${(op.totalPendiente || 0).toLocaleString('es-AR')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Input Form */}
          {selectedOperacion && (
            <div className="bg-slate-950 p-5 rounded-2xl border-2 border-emerald-500/80 space-y-4 mt-4 shadow-xl">
              <h4 className="text-sm font-black text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>Ingresar Pago para Operación #{selectedOperacion.id}</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Monto a Ingresar ($ ARS)</label>
                  <input
                    type="number"
                    value={montoPago}
                    onChange={e => setMontoPago(e.target.value)}
                    placeholder="Ej. 7500"
                    className="w-full bg-slate-900 border-2 border-emerald-500 rounded-xl px-4 py-3 text-white font-black text-base focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Medio de Pago</label>
                  <select
                    value={medioPago}
                    onChange={e => setMedioPago(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none"
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TRANSFERENCIA">Transferencia Bancaria / MP</option>
                    <option value="DEPOSITO">Depósito</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Observaciones</label>
                <input
                  type="text"
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  placeholder="Comentarios adicionales del pago..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-none"
                />
              </div>

              <button
                onClick={handleConfirmarPago}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all uppercase tracking-wider"
              >
                <CheckCircle2 className="w-5 h-5 stroke-[3]" />
                <span>Confirmar e Ingresar Pago ($)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
