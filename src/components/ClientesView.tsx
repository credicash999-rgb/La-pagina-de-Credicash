/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Cliente, Operacion } from '../types';
import { Users, Plus, Search, Edit2, Check, UserPlus, Phone, Shield, FileText, MapPin, Briefcase, Eye, X, Download, Calendar } from 'lucide-react';

interface ClientesViewProps {
  clientes: Cliente[];
  operaciones?: Operacion[];
  onAddCliente: (cliente: Cliente) => void;
  onUpdateCliente: (cliente: Cliente) => void;
  canManage?: boolean;
  verTelefonoCliente?: boolean;
  verDniCliente?: boolean;
  verDireccionCliente?: boolean;
  verIngresosCliente?: boolean;
}

export default function ClientesView({ 
  clientes, 
  operaciones = [],
  onAddCliente, 
  onUpdateCliente,
  canManage = true,
  verTelefonoCliente = true,
  verDniCliente = true,
  verDireccionCliente = true,
  verIngresosCliente = true
}: ClientesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('TODOS');
  const [isAdding, setIsAdding] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [viewingCliente, setViewingCliente] = useState<Cliente | null>(null);

  const getClientCreditsSummary = (clientId: string) => {
    if (!operaciones || operaciones.length === 0) return 'Sin créditos';
    const clientOps = operaciones.filter(o => o.idCliente === clientId);
    if (clientOps.length === 0) return 'Sin créditos';
    
    const counts: Record<string, number> = {};
    clientOps.forEach(o => {
      const freqLabel = o.frecuencia === 'DIARIA' ? 'Diario' : 
                        o.frecuencia === 'SEMANAL' ? 'Semanal' : 
                        o.frecuencia === 'QUINCENAL' ? 'Quincenal' : 'Mensual';
      counts[freqLabel] = (counts[freqLabel] || 0) + 1;
    });
    
    return Object.entries(counts)
      .map(([freq, count]) => `${count} ${freq}`)
      .join(', ');
  };

  // Form states
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [trabajo, setTrabajo] = useState('');
  const [ingresos, setIngresos] = useState(0);
  const [captador, setCaptador] = useState('');
  const [analista, setAnalista] = useState('');
  const [estado, setEstado] = useState<Cliente['estado']>('SOLICITANTE');

  // Extended form states
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState('MASCULINO');
  const [whatsapp, setWhatsapp] = useState('');
  const [telefonoAlternativo, setTelefonoAlternativo] = useState('');
  const [personaReferencia, setPersonaReferencia] = useState('');
  const [telefonoReferencia, setTelefonoReferencia] = useState('');
  const [calle, setCalle] = useState('');
  const [numero, setNumero] = useState('');
  const [barrio, setBarrio] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [provincia, setProvincia] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [lugarTrabajo, setLugarTrabajo] = useState('');
  const [antiguedad, setAntiguedad] = useState('');
  const [aliasCbu, setAliasCbu] = useState('');
  const [banco, setBanco] = useState('');
  const [origen, setOrigen] = useState('FACEBOOK');
  const [observaciones, setObservaciones] = useState('');
  const [docDniFrente, setDocDniFrente] = useState('');
  const [docDniDorso, setDocDniDorso] = useState('');
  const [docComprobante, setDocComprobante] = useState('');
  const [docReciboSueldo, setDocReciboSueldo] = useState('');
  const [docOtros, setDocOtros] = useState('');

  const handleOpenAdd = () => {
    // Generate automatic ID based on max ID
    const nextNum = clientes.reduce((max, c) => {
      const match = c.id.match(/CLI-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0) + 1;
    const generatedId = `CLI-${String(nextNum).padStart(3, '0')}`;

    setEditingCliente(null);
    setNombre('');
    setApellido('');
    setDni('');
    setTelefono('');
    setDireccion('');
    setTrabajo('');
    setIngresos(0);
    setCaptador('');
    setAnalista('');
    setEstado('SOLICITANTE');

    // Reset extended fields
    setFechaNacimiento('');
    setSexo('MASCULINO');
    setWhatsapp('');
    setTelefonoAlternativo('');
    setPersonaReferencia('');
    setTelefonoReferencia('');
    setCalle('');
    setNumero('');
    setBarrio('');
    setCiudad('');
    setProvincia('');
    setCodigoPostal('');
    setLugarTrabajo('');
    setAntiguedad('');
    setAliasCbu('');
    setBanco('');
    setOrigen('FACEBOOK');
    setObservaciones('');
    setDocDniFrente('');
    setDocDniDorso('');
    setDocComprobante('');
    setDocReciboSueldo('');
    setDocOtros('');

    setIsAdding(true);
  };

  const handleOpenEdit = (c: Cliente) => {
    setEditingCliente(c);
    setNombre(c.nombre);
    setApellido(c.apellido);
    setDni(c.dni);
    setTelefono(c.telefono);
    setDireccion(c.direccion);
    setTrabajo(c.trabajo || '');
    setIngresos(c.ingresos || 0);
    setCaptador(c.captador);
    setAnalista(c.analista);
    setEstado(c.estado);

    // Load extended fields
    setFechaNacimiento(c.fechaNacimiento || '');
    setSexo(c.sexo || 'MASCULINO');
    setWhatsapp(c.whatsapp || '');
    setTelefonoAlternativo(c.telefonoAlternativo || '');
    setPersonaReferencia(c.personaReferencia || '');
    setTelefonoReferencia(c.telefonoReferencia || '');
    setCalle(c.calle || '');
    setNumero(c.numero || '');
    setBarrio(c.barrio || '');
    setCiudad(c.ciudad || '');
    setProvincia(c.provincia || '');
    setCodigoPostal(c.codigoPostal || '');
    setLugarTrabajo(c.lugarTrabajo || '');
    setAntiguedad(c.antiguedad || '');
    setAliasCbu(c.aliasCbu || '');
    setBanco(c.banco || '');
    setOrigen(c.origen || 'FACEBOOK');
    setObservaciones(c.observaciones || '');
    setDocDniFrente(c.documentosSimulados?.dniFrente || '');
    setDocDniDorso(c.documentosSimulados?.dniDorso || '');
    setDocComprobante(c.documentosSimulados?.comprobanteDomicilio || '');
    setDocReciboSueldo(c.documentosSimulados?.reciboSueldo || '');
    setDocOtros(c.documentosSimulados?.otros || '');

    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !apellido || !dni) {
      alert('Por favor complete Nombre, Apellido y DNI.');
      return;
    }

    // Determine fallback full address string
    let fullDireccion = direccion;
    if (calle && numero) {
      fullDireccion = `${calle} ${numero}${barrio ? `, Barrio ${barrio}` : ''}${ciudad ? `, ${ciudad}` : ''}${provincia ? `, ${provincia}` : ''}`;
    }

    if (editingCliente) {
      const updated: Cliente = {
        ...editingCliente,
        nombre,
        apellido,
        dni,
        telefono,
        direccion: fullDireccion,
        trabajo,
        ingresos,
        captador,
        analista,
        estado,
        fechaNacimiento,
        sexo,
        whatsapp,
        telefonoAlternativo,
        personaReferencia,
        telefonoReferencia,
        calle,
        numero,
        barrio,
        ciudad,
        provincia,
        codigoPostal,
        lugarTrabajo,
        antiguedad,
        aliasCbu,
        banco,
        origen,
        documentosSimulados: {
          dniFrente: docDniFrente || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
          dniDorso: docDniDorso || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
          comprobanteDomicilio: docComprobante || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
          reciboSueldo: docReciboSueldo || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
          otros: docOtros || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
        },
        observaciones
      };
      onUpdateCliente(updated);
    } else {
      const nextNum = clientes.reduce((max, c) => {
        const match = c.id.match(/CLI-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 0) + 1;
      const generatedId = `CLI-${String(nextNum).padStart(3, '0')}`;

      const nuevo: Cliente = {
        id: generatedId,
        nombre,
        apellido,
        dni,
        telefono,
        direccion: fullDireccion,
        trabajo,
        ingresos,
        captador,
        analista,
        estado,
        fechaRegistro: new Date().toISOString().split('T')[0],
        fechaNacimiento,
        sexo,
        whatsapp,
        telefonoAlternativo,
        personaReferencia,
        telefonoReferencia,
        calle,
        numero,
        barrio,
        ciudad,
        provincia,
        codigoPostal,
        lugarTrabajo,
        antiguedad,
        aliasCbu,
        banco,
        origen,
        documentosSimulados: {
          dniFrente: docDniFrente || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
          dniDorso: docDniDorso || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
          comprobanteDomicilio: docComprobante || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
          reciboSueldo: docReciboSueldo || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
          otros: docOtros || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?auto=format&fit=crop&w=500&q=80',
        },
        observaciones
      };
      onAddCliente(nuevo);
    }
    setIsAdding(false);
    setEditingCliente(null);
  };

  const filteredClientes = clientes.filter((c) => {
    const matchesSearch =
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.dni.includes(searchTerm) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEstado = filterEstado === 'TODOS' || c.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  return (
    <div id="clientes-section" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Gestión de Clientes
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Administre los expedientes, datos personales, laborales y estados crediticios de su cartera de clientes.
          </p>
        </div>
        {canManage && (
          <button
            id="btn-nuevo-cliente"
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold transition-all text-xs shadow-md hover:shadow-none cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            NUEVO CLIENTE
          </button>
        )}
      </div>

      {isAdding ? (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase text-slate-400 tracking-widest">
              {editingCliente ? `Editar Cliente: ${editingCliente.id}` : 'Registrar Nuevo Cliente'}
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-500">
              {editingCliente ? editingCliente.id : 'ID: AUTOMÁTICO'}
            </span>
          </div>

          <div className="space-y-8">
            {/* Sección 1: Datos de Identidad */}
            <div>
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users className="w-4 h-4" />
                1. Datos Personales e Identidad
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Apellido *</label>
                  <input
                    type="text"
                    required
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Apellido del cliente"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">DNI / Documento *</label>
                  <input
                    type="text"
                    required
                    value={dni}
                    onChange={(e) => setDni(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Número de DNI"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sexo</label>
                  <select
                    value={sexo}
                    onChange={(e) => setSexo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="MASCULINO">MASCULINO</option>
                    <option value="FEMENINO">FEMENINO</option>
                    <option value="OTRO">OTRO / NO ESPECIFICA</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sección 2: Contacto y Enlaces */}
            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                2. Canales de Contacto y Referencias
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Teléfono Celular</label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej: +54 9 11 1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">WhatsApp Directo</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej: 5491112345678"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Teléfono Alternativo</label>
                  <input
                    type="text"
                    value={telefonoAlternativo}
                    onChange={(e) => setTelefonoAlternativo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Teléfono fijo o familiar"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Persona de Referencia</label>
                  <input
                    type="text"
                    value={personaReferencia}
                    onChange={(e) => setPersonaReferencia(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Nombre del familiar o amigo"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Teléfono de Referencia</label>
                  <input
                    type="text"
                    value={telefonoReferencia}
                    onChange={(e) => setTelefonoReferencia(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Contacto de la referencia"
                  />
                </div>
              </div>
            </div>

            {/* Sección 3: Domicilio Declarado */}
            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                3. Domicilio Declarado
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Calle / Avenida</label>
                  <input
                    type="text"
                    value={calle}
                    onChange={(e) => setCalle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Nombre de la calle"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Número</label>
                  <input
                    type="text"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej: 1420"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Barrio</label>
                  <input
                    type="text"
                    value={barrio}
                    onChange={(e) => setBarrio(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Nombre de barrio"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ciudad / Localidad</label>
                  <input
                    type="text"
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej: San Miguel"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Provincia / Estado</label>
                  <input
                    type="text"
                    value={provincia}
                    onChange={(e) => setProvincia(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej: Buenos Aires"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Código Postal</label>
                  <input
                    type="text"
                    value={codigoPostal}
                    onChange={(e) => setCodigoPostal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej: C1425"
                  />
                </div>
              </div>
            </div>

            {/* Sección 4: Situación Laboral */}
            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                4. Situación Laboral y Solvencia
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Actividad Laboral</label>
                  <input
                    type="text"
                    value={trabajo}
                    onChange={(e) => setTrabajo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Profesión o puesto"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Empresa / Lugar de Trabajo</label>
                  <input
                    type="text"
                    value={lugarTrabajo}
                    onChange={(e) => setLugarTrabajo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Nombre del empleador"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Antigüedad (Años/Meses)</label>
                  <input
                    type="text"
                    value={antiguedad}
                    onChange={(e) => setAntiguedad(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej: 3 años y 6 meses"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ingresos Mensuales Netos</label>
                  <input
                    type="number"
                    value={ingresos}
                    onChange={(e) => setIngresos(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej: 350000"
                  />
                </div>
              </div>
            </div>

            {/* Sección 5: Datos de Cobro / Bancos */}
            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                5. Cuenta Bancaria / Transferencias
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">CBU / CVU / Alias de Cuenta</label>
                  <input
                    type="text"
                    value={aliasCbu}
                    onChange={(e) => setAliasCbu(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej: 0170098740000001234567 o alias.pago"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Banco o Billetera Virtual</label>
                  <input
                    type="text"
                    value={banco}
                    onChange={(e) => setBanco(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej: Banco Nación, Mercado Pago"
                  />
                </div>
              </div>
            </div>

            {/* Sección 6: Configuración Comercial */}
            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                6. Clasificación Comercial y Operadores
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Captador</label>
                  <input
                    type="text"
                    value={captador}
                    onChange={(e) => setCaptador(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Nombre del captador"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Analista Asignado</label>
                  <input
                    type="text"
                    value={analista}
                    onChange={(e) => setAnalista(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Nombre del analista de crédito"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Estado de Crédito</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as Cliente['estado'])}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="SOLICITANTE">SOLICITANTE (En Evaluación)</option>
                    <option value="ACTIVO">ACTIVO (Sin deudas vencidas)</option>
                    <option value="EN_MORA">EN MORA</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Origen de Captación</label>
                  <select
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm bg-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="FACEBOOK">Facebook / Redes</option>
                    <option value="WHATSAPP">WhatsApp Directo</option>
                    <option value="RECOMENDADO">Recomendado por Cliente</option>
                    <option value="VOLANTE">Volante / Publicidad Física</option>
                    <option value="OTRO">Otro Canal</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sección 7: Legajo Digital */}
            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                7. Legajo Digital (Enlaces de documentos simulados)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">DNI Frente (Enlace de Imagen o PDF)</label>
                  <input
                    type="text"
                    value={docDniFrente}
                    onChange={(e) => setDocDniFrente(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">DNI Dorso (Enlace de Imagen o PDF)</label>
                  <input
                    type="text"
                    value={docDniDorso}
                    onChange={(e) => setDocDniDorso(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Comprobante de Domicilio (Luz, Agua, etc)</label>
                  <input
                    type="text"
                    value={docComprobante}
                    onChange={(e) => setDocComprobante(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Recibo de Sueldo / Comprobante de Ingresos</label>
                  <input
                    type="text"
                    value={docReciboSueldo}
                    onChange={(e) => setDocReciboSueldo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Otros Documentos (Garantías, Contratos, etc)</label>
                  <input
                    type="text"
                    value={docOtros}
                    onChange={(e) => setDocOtros(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {/* Sección 8: Observaciones */}
            <div className="border-t border-slate-100 pt-6">
              <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-4">
                8. Observaciones Adicionales
              </h4>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                placeholder="Escriba comentarios sobre el comportamiento del cliente, avales, etc..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 text-sm font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold transition-all shadow-md hover:shadow-none cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Guardar Cliente
            </button>
          </div>
        </form>
      ) : null}

      {/* List and Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por DNI, Nombre, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {['TODOS', 'SOLICITANTE', 'ACTIVO', 'EN_MORA', 'INACTIVO'].map((est) => (
              <button
                key={est}
                onClick={() => setFilterEstado(est)}
                className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold rounded-lg transition-colors cursor-pointer ${
                  filterEstado === est
                    ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {est}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">ID Cliente</th>
                {verDniCliente && <th className="py-3.5 px-6">DNI</th>}
                <th className="py-3.5 px-6">Cliente</th>
                {(verTelefonoCliente || verDireccionCliente) && (
                  <th className="py-3.5 px-6">
                    {verDireccionCliente ? 'Contacto / Dirección' : 'Contacto'}
                  </th>
                )}
                {verIngresosCliente ? (
                  <th className="py-3.5 px-6">Laboral / Ingresos</th>
                ) : (
                  <th className="py-3.5 px-6">Créditos del Cliente</th>
                )}
                <th className="py-3.5 px-6 text-center">Estado</th>
                <th className="py-3.5 px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-medium">
                    No se encontraron clientes registrados.
                  </td>
                </tr>
              ) : (
                filteredClientes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-slate-800">{c.id}</td>
                    {verDniCliente && (
                      <td className="py-4 px-6 text-slate-700 font-medium">
                        {c.dni}
                      </td>
                    )}
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800">
                        {c.nombre} {c.apellido}
                      </div>
                      <div className="text-xs text-slate-400">Reg: {c.fechaRegistro}</div>
                    </td>
                    {(verTelefonoCliente || verDireccionCliente) && (
                      <td className="py-4 px-6">
                        {verTelefonoCliente && (
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{c.telefono || 'N/A'}</span>
                          </div>
                        )}
                        {verDireccionCliente && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 max-w-[200px] truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span title={c.direccion}>{c.direccion || 'Sin dirección'}</span>
                          </div>
                        )}
                      </td>
                    )}
                    <td className="py-4 px-6">
                      {verIngresosCliente ? (
                        <>
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                            <span>{c.trabajo || 'Sin especificar'}</span>
                          </div>
                          {c.ingresos ? (
                            <div className="text-xs font-semibold text-emerald-600 mt-0.5">
                              ${c.ingresos.toLocaleString('es-ES')} / mes
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100 inline-block">
                          {getClientCreditsSummary(c.id)}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                          c.estado === 'ACTIVO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.estado === 'EN_MORA'
                            ? 'bg-rose-100 text-rose-800'
                            : c.estado === 'SOLICITANTE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {c.estado}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingCliente(c)}
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center cursor-pointer"
                          title="Consultar expediente completo"
                        >
                          <Eye className="w-4.5 h-4.5" />
                        </button>
                        {canManage ? (
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center cursor-pointer"
                            title="Editar expediente"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 font-mono">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EXPEDIENTE COMPLETO MODAL (CONSULTAR EXPEDIENTE) */}
      {viewingCliente && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                  EXPEDIENTE DE CLIENTE
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {viewingCliente.nombre} {viewingCliente.apellido}
                </h3>
              </div>
              <button
                onClick={() => setViewingCliente(null)}
                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-8 text-xs text-slate-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Datos Personales */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    Identidad y Datos Personales
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2">
                    <div>
                      <span className="text-slate-400 block">ID Cliente</span>
                      <strong className="font-mono font-bold text-slate-800">{viewingCliente.id}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">DNI / Documento</span>
                      <strong className="text-slate-800">{viewingCliente.dni}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Nombre Completo</span>
                      <strong className="text-slate-800">{viewingCliente.nombre} {viewingCliente.apellido}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Sexo</span>
                      <strong className="text-slate-800">{viewingCliente.sexo || 'MASCULINO'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Fecha de Nacimiento</span>
                      <strong className="text-slate-800">{viewingCliente.fechaNacimiento || 'No registrada'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Fecha Alta en Sistema</span>
                      <strong className="text-slate-800">{viewingCliente.fechaRegistro}</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Canales de Contacto */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-blue-500" />
                    Canales de Contacto
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2">
                    <div>
                      <span className="text-slate-400 block">Teléfono Celular</span>
                      <strong className="text-slate-800">{viewingCliente.telefono || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">WhatsApp Directo</span>
                      {viewingCliente.whatsapp ? (
                        <a
                          href={`https://wa.me/${viewingCliente.whatsapp}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 font-bold hover:underline flex items-center gap-1"
                        >
                          {viewingCliente.whatsapp}
                        </a>
                      ) : (
                        <strong className="text-slate-800">No especificado</strong>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 block">Teléfono Alternativo</span>
                      <strong className="text-slate-800">{viewingCliente.telefonoAlternativo || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Persona de Referencia</span>
                      <strong className="text-slate-800">{viewingCliente.personaReferencia || 'No registrada'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Teléfono Referencia</span>
                      <strong className="text-slate-800">{viewingCliente.telefonoReferencia || 'No registrado'}</strong>
                    </div>
                  </div>
                </div>

                {/* 3. Domicilio Declarado */}
                {verDireccionCliente ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      Domicilio Declarado
                    </h4>
                    <div className="grid grid-cols-2 gap-y-2">
                      <div className="col-span-2">
                        <span className="text-slate-400 block">Dirección Formateada</span>
                        <strong className="text-slate-800">{viewingCliente.direccion}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Calle</span>
                        <strong className="text-slate-800">{viewingCliente.calle || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Número</span>
                        <strong className="text-slate-800">{viewingCliente.numero || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Barrio</span>
                        <strong className="text-slate-800">{viewingCliente.barrio || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Ciudad / Localidad</span>
                        <strong className="text-slate-800">{viewingCliente.ciudad || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Provincia</span>
                        <strong className="text-slate-800">{viewingCliente.provincia || 'N/A'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Código Postal</span>
                        <strong className="text-slate-800">{viewingCliente.codigoPostal || 'N/A'}</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                    <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-300" />
                      Domicilio Declarado
                    </h4>
                    <span className="text-slate-400 italic font-medium">Información restringida por nivel de acceso.</span>
                  </div>
                )}

                {/* 4. Situación Laboral y Bancaria */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                    Situación Laboral y Cuenta Bancaria
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2">
                    {verIngresosCliente ? (
                      <>
                        <div>
                          <span className="text-slate-400 block">Actividad Laboral</span>
                          <strong className="text-slate-800">{viewingCliente.trabajo || 'Sin especificar'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Lugar de Trabajo</span>
                          <strong className="text-slate-800">{viewingCliente.lugarTrabajo || 'No registrado'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Antigüedad Laboral</span>
                          <strong className="text-slate-800">{viewingCliente.antiguedad || 'No declarada'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Ingreso Mensual Neto</span>
                          <strong className="text-emerald-600 font-bold">
                            {viewingCliente.ingresos ? `$${viewingCliente.ingresos.toLocaleString('es-ES')}` : 'No especificado'}
                          </strong>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2">
                        <span className="text-slate-400 block">Información Laboral / Ingresos</span>
                        <strong className="text-slate-400 italic font-medium">Restringido por nivel de acceso</strong>
                        <div className="mt-3 bg-indigo-50 p-2.5 rounded-lg border border-indigo-100">
                          <span className="text-indigo-800 font-bold block uppercase tracking-wider text-[10px] mb-1">
                            Créditos del Cliente:
                          </span>
                          <strong className="text-indigo-950 font-extrabold text-xs">
                            {getClientCreditsSummary(viewingCliente.id)}
                          </strong>
                        </div>
                      </div>
                    )}
                    <div>
                      <span className="text-slate-400 block">CBU / CVU / Alias</span>
                      <strong className="font-mono text-slate-800 break-all">{viewingCliente.aliasCbu || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Banco o Billetera</span>
                      <strong className="text-slate-800">{viewingCliente.banco || 'N/A'}</strong>
                    </div>
                  </div>
                </div>

                {/* 5. Clasificación Comercial */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                    Clasificación Comercial
                  </h4>
                  <div className="grid grid-cols-2 gap-y-2">
                    <div>
                      <span className="text-slate-400 block">Captador</span>
                      <strong className="text-slate-800">{viewingCliente.captador || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Analista Asignado</span>
                      <strong className="text-slate-800">{viewingCliente.analista || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Origen Captación</span>
                      <strong className="text-slate-800">{viewingCliente.origen || 'FACEBOOK'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Estado Crediticio</span>
                      <span
                        className={`inline-block px-2 py-0.5 mt-0.5 text-[10px] font-bold rounded-full ${
                          viewingCliente.estado === 'ACTIVO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : viewingCliente.estado === 'EN_MORA'
                            ? 'bg-rose-100 text-rose-800'
                            : viewingCliente.estado === 'SOLICITANTE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {viewingCliente.estado}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. Observaciones */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
                    Observaciones Generales
                  </h4>
                  <p className="text-slate-600 bg-white p-2.5 rounded border border-slate-200/60 min-h-[70px] whitespace-pre-wrap">
                    {viewingCliente.observaciones || 'Sin comentarios adicionales.'}
                  </p>
                </div>
              </div>

              {/* 7. Legajo de Documentos Digitales (Fila Completa) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] border-b border-slate-200/60 pb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  Legajo de Documentos Digitales (Expediente Visual)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                  {[
                    { label: 'DNI Frente', key: 'dniFrente', val: viewingCliente.documentosSimulados?.dniFrente },
                    { label: 'DNI Dorso', key: 'dniDorso', val: viewingCliente.documentosSimulados?.dniDorso },
                    { label: 'Comprobante Domicilio', key: 'comprobanteDomicilio', val: viewingCliente.documentosSimulados?.comprobanteDomicilio },
                    { label: 'Recibo Sueldo', key: 'reciboSueldo', val: viewingCliente.documentosSimulados?.reciboSueldo },
                    { label: 'Otros Documentos', key: 'otros', val: viewingCliente.documentosSimulados?.otros }
                  ].map((doc, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200/80 flex flex-col items-center text-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 mb-2">{doc.label}</span>
                      <div className="w-full aspect-[4/3] bg-slate-100 rounded border border-slate-200/80 overflow-hidden relative group">
                        {doc.val ? (
                          <>
                            <img
                              src={doc.val}
                              alt={doc.label}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-slate-900/65 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                              <a
                                href={doc.val}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Ver pantalla completa"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={doc.val}
                                download={`${viewingCliente.id}-${doc.key}`}
                                className="p-1.5 bg-white text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Descargar"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                            <FileText className="w-6 h-6 mb-1" />
                            <span className="text-[9px]">Sin cargar</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button
                onClick={() => setViewingCliente(null)}
                className="px-5 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-bold transition-all text-xs cursor-pointer shadow-md"
              >
                CERRAR EXPEDIENTE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
