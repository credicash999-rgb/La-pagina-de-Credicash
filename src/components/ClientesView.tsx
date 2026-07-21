/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Cliente, Operacion } from '../types';
import { 
  Users, Plus, Search, Edit2, Check, UserPlus, Phone, Shield, FileText, MapPin, 
  Briefcase, Eye, X, Download, Calendar, ArrowLeft, AlertTriangle, Info, 
  Printer, ArrowRight, RefreshCw, ChevronRight
} from 'lucide-react';
import { jsPDF } from 'jspdf';

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
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);

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
    const fullName = `${c.nombre} ${c.apellido}`.toLowerCase();
    const reverseFullName = `${c.apellido} ${c.nombre}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase().trim();

    const matchesSearch =
      c.nombre.toLowerCase().includes(searchLower) ||
      c.apellido.toLowerCase().includes(searchLower) ||
      c.dni.includes(searchLower) ||
      c.id.toLowerCase().includes(searchLower) ||
      fullName.includes(searchLower) ||
      reverseFullName.includes(searchLower);

    const matchesEstado = filterEstado === 'TODOS' || c.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  const handleExportPDF = (client: Cliente) => {
    const clientLoans = operaciones.filter(o => o.idCliente === client.id);
    const sortedLoans = [...clientLoans].sort((a, b) => b.fechaOtorgamiento.localeCompare(a.fechaOtorgamiento));
    const activeLoan = sortedLoans.find(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA');
    const presentLoan = activeLoan || sortedLoans[0];
    
    const doc = new jsPDF();
    
    // Header band (Deep Blue or Emerald)
    doc.setFillColor(30, 41, 59); // Slate-800
    doc.rect(0, 0, 210, 38, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("CREDI-CASH", 15, 16);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Sistema Integral de Créditos y Cobranzas", 15, 23);
    doc.setFontSize(8.5);
    doc.text(`Reporte emitido el: ${new Date().toLocaleDateString('es-AR')} - ${new Date().toLocaleTimeString('es-AR')}`, 15, 30);
    
    // Decorative bar
    doc.setFillColor(16, 185, 129); // Emerald-500
    doc.rect(0, 38, 210, 3, 'F');
    
    // Client Info Card
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("1. EXPEDIENTE PERSONAL DEL CLIENTE", 15, 52);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 54, 195, 54);
    
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    
    // Left column client info
    doc.text(`Nombre Completo: ${client.nombre} ${client.apellido}`, 15, 62);
    doc.text(`DNI / Documento: ${client.dni}`, 15, 68);
    doc.text(`Telefono Celular: ${client.telefono || 'N/A'}`, 15, 74);
    doc.text(`WhatsApp: ${client.whatsapp || 'N/A'}`, 15, 80);
    doc.text(`Domicilio Declarado: ${client.direccion || 'N/A'}`, 15, 86);
    
    // Right column client info
    doc.text(`ID Cliente: ${client.id}`, 115, 62);
    doc.text(`Estado Crediticio: ${client.estado}`, 115, 68);
    doc.text(`Alta en Sistema: ${client.fechaRegistro}`, 115, 74);
    doc.text(`Trabajo / Actividad: ${client.trabajo || 'N/A'}`, 115, 80);
    doc.text(`Ingresos Declarados: $${client.ingresos?.toLocaleString('es-AR') || '0'}`, 115, 86);
    
    let currentY = 98;
    
    // Present Loan Section
    if (presentLoan) {
      doc.setFillColor(248, 250, 252); // Slate-50 background
      doc.rect(15, currentY, 180, 56, 'F');
      
      // Border around slate box
      doc.setDrawColor(203, 213, 225);
      doc.rect(15, currentY, 180, 56, 'S');
      
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`2. CREDITO PRINCIPAL SELECCIONADO / MAS RECIENTE`, 20, currentY + 8);
      
      // Draw status tag
      const isFin = presentLoan.estado === 'FINALIZADA';
      doc.setFillColor(isFin ? 16 : 245, isFin ? 185 : 158, isFin ? 129 : 11); // Green vs Amber
      doc.rect(150, currentY + 3, 38, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(`ESTADO: ${presentLoan.estado}`, 153, currentY + 7.2);
      
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      // Left side details
      doc.text(`ID Operacion: ${presentLoan.id}`, 20, currentY + 18);
      doc.text(`Fecha Otorgamiento: ${presentLoan.fechaOtorgamiento}`, 20, currentY + 24);
      doc.text(`Capital Entregado: $${presentLoan.capitalEntregado.toLocaleString('es-AR')}`, 20, currentY + 30);
      doc.text(`Total Financiado: $${presentLoan.totalFinanciado.toLocaleString('es-AR')}`, 20, currentY + 36);
      doc.text(`Valor de Cuota: $${presentLoan.valorCuota.toLocaleString('es-AR')} (${presentLoan.frecuencia})`, 20, currentY + 42);
      doc.text(`Plan de Financiacion: ${presentLoan.cantidadCuotas} cuotas`, 20, currentY + 48);
      
      // Right side details
      doc.text(`Cuotas Pagadas: ${presentLoan.cuotasPagadas} de ${presentLoan.cantidadCuotas}`, 115, currentY + 18);
      doc.text(`Capital Recuperado: $${presentLoan.capitalRecuperado.toLocaleString('es-AR')}`, 115, currentY + 24);
      doc.text(`Saldo Total Pendiente: $${presentLoan.totalPendiente.toLocaleString('es-AR')}`, 115, currentY + 30);
      doc.text(`Proximo Vencimiento: ${presentLoan.proximoVencimiento || 'N/A'}`, 115, currentY + 36);
      doc.text(`Dias de Mora: ${presentLoan.diasMora} dias (${presentLoan.nivelMora || 'Sin Mora'})`, 115, currentY + 42);
      doc.text(`Cobrador Asignado: ${presentLoan.cobrador || 'No asignado'}`, 115, currentY + 48);
      
      currentY += 66;
    } else {
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "italic");
      doc.text("Este cliente no registra creditos en el sistema.", 15, currentY);
      currentY += 15;
    }
    
    // All credit history
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("3. HISTORIAL COMPLETO DE CREDITOS Y SIMULTANEOS", 15, currentY);
    doc.setDrawColor(226, 232, 240);
    doc.line(15, currentY + 2, 195, currentY + 2);
    
    currentY += 8;
    
    // Draw table headers
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(15, currentY, 180, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    
    doc.text("ID Credito", 18, currentY + 5.5);
    doc.text("Fecha", 45, currentY + 5.5);
    doc.text("Capital", 75, currentY + 5.5);
    doc.text("Total Finan.", 105, currentY + 5.5);
    doc.text("Cuotas", 145, currentY + 5.5);
    doc.text("Estado", 172, currentY + 5.5);
    
    currentY += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);
    
    if (sortedLoans.length === 0) {
      doc.text("Sin historial registrado.", 20, currentY + 6);
      currentY += 12;
    } else {
      sortedLoans.forEach((loan) => {
        if (currentY > 260) {
          doc.addPage();
          currentY = 20;
          
          // Reprint header for next page
          doc.setFillColor(241, 245, 249);
          doc.rect(15, currentY, 180, 8, 'F');
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          doc.text("ID Credito", 18, currentY + 5.5);
          doc.text("Fecha", 45, currentY + 5.5);
          doc.text("Capital", 75, currentY + 5.5);
          doc.text("Total Finan.", 105, currentY + 5.5);
          doc.text("Cuotas", 145, currentY + 5.5);
          doc.text("Estado", 172, currentY + 5.5);
          currentY += 8;
          doc.setFont("helvetica", "normal");
          doc.setTextColor(30, 41, 59);
        }
        
        doc.text(loan.id, 18, currentY + 5.5);
        doc.text(loan.fechaOtorgamiento, 45, currentY + 5.5);
        doc.text(`$${loan.capitalEntregado.toLocaleString('es-AR')}`, 75, currentY + 5.5);
        doc.text(`$${loan.totalFinanciado.toLocaleString('es-AR')}`, 105, currentY + 5.5);
        doc.text(`${loan.cuotasPagadas} / ${loan.cantidadCuotas} (${loan.frecuencia.toLowerCase()})`, 145, currentY + 5.5);
        doc.text(loan.estado, 172, currentY + 5.5);
        
        currentY += 8;
      });
    }
    
    // Draw footer note
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 275, 195, 275);
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Documento oficial para uso interno y envio a clientes. CREDI-CASH, Todos los derechos reservados.", 15, 281);
    
    doc.save(`Creditos_CrediCash_${client.dni}_${client.apellido}.pdf`);
  };

  return (
    <div id="clientes-section" className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
            <span className="flex items-center gap-2 font-extrabold">
              <Users className="w-5 h-5 text-blue-600" />
              Búsqueda de Cliente
            </span>
            <span className="text-xs font-semibold text-slate-400"> (Últimos Créditos Activos)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Consulte de forma ágil el expediente del cliente, su último crédito (activo o inactivo) y el historial completo de créditos simultáneos.
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

      {/* List and Search - Centered Search Focus */}
      {!selectedClient ? (
        <div className="flex flex-col items-center justify-center min-h-[480px] bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="w-full max-w-xl text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-800">Búsqueda Unificada de Legajos</h3>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                Ingrese el DNI o nombre del cliente para auditar su legajo digital, consultar su último crédito activo/presente, analizar historial de mora o exportar reportes en PDF.
              </p>
            </div>
            
            <div className="relative pt-2">
              <Search className="absolute left-4 top-5.5 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Ingrese DNI o Nombre para buscar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/40 focus:bg-white border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-[#1E803B] focus:ring-4 focus:ring-emerald-50 transition-all text-center placeholder-slate-400 font-medium"
                autoFocus
              />
            </div>

            {/* Display Search Results dynamically as they type */}
            {searchTerm.trim() !== '' && (
              <div className="border border-slate-150 rounded-xl overflow-hidden bg-white shadow-lg divide-y divide-slate-100 text-left mt-4 max-h-[300px] overflow-y-auto">
                {filteredClientes.length === 0 ? (
                  <div className="p-5 text-center text-xs text-slate-400 font-medium flex flex-col items-center gap-1">
                    <Info className="w-4 h-4 text-slate-300" />
                    No se encontraron clientes registrados con ese nombre o DNI.
                  </div>
                ) : (
                  filteredClientes.map((c) => {
                    const clientOps = operaciones.filter(o => o.idCliente === c.id);
                    const activeOp = clientOps.find(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA');
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(c);
                        }}
                        className="w-full p-3.5 hover:bg-slate-50/80 flex items-center justify-between text-xs text-slate-600 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center font-extrabold text-xs font-mono">
                            {c.nombre[0]}{c.apellido[0]}
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="font-bold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors flex items-center gap-2">
                              {c.nombre} {c.apellido}
                              {(!c.documentosSimulados?.dniFrente || !c.documentosSimulados?.dniDorso || !c.documentosSimulados?.comprobanteDomicilio || c.documentosSimulados?.dniFrente.includes('unsplash.com') || c.documentosSimulados?.dniDorso.includes('unsplash.com') || c.documentosSimulados?.comprobanteDomicilio.includes('unsplash.com')) && (
                                <span className="inline-flex px-1 rounded text-[8px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                  Legajo Pte.
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              DNI: {c.dni} • ID: {c.id} • {clientOps.length} crédito(s)
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              c.estado === 'ACTIVO' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : c.estado === 'EN_MORA'
                                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                : 'bg-slate-50 text-slate-600 border border-slate-100'
                            }`}>
                              {c.estado}
                            </span>
                            {activeOp && (
                              <div className="text-[9px] text-[#1E803B] font-extrabold mt-1">
                                {activeOp.id} - ${activeOp.valorCuota.toLocaleString('es-AR')}/C
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Selected Client Details Screen */
        <div className="space-y-6 animate-fadeIn">
          {/* Action Header bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <button
              onClick={() => {
                setSelectedClient(null);
                setSearchTerm('');
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a buscar
            </button>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {canManage && (
                <button
                  onClick={() => handleOpenEdit(selectedClient)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar expediente
                </button>
              )}
              <button
                onClick={() => handleExportPDF(selectedClient)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors cursor-pointer shadow-md flex-1 sm:flex-none justify-center"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar PDF de Cliente
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* COLUMN 1: Client Personal Profile / Ficha */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm">
                  {selectedClient.id}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-none">
                    {selectedClient.nombre} {selectedClient.apellido}
                  </h3>
                  <span className={`inline-block px-2 py-0.5 mt-1.5 rounded-full text-[9px] font-bold ${
                    selectedClient.estado === 'ACTIVO' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                      : selectedClient.estado === 'EN_MORA'
                      ? 'bg-rose-50 text-rose-700 border border-rose-100'
                      : 'bg-slate-50 text-slate-600 border border-slate-100'
                  }`}>
                    {selectedClient.estado}
                  </span>
                </div>
              </div>

              {/* General Information list */}
              <div className="space-y-3.5 text-xs text-slate-600">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">DNI</span>
                    <strong className="text-slate-800 font-mono text-[13px]">{selectedClient.dni}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Alta Registro</span>
                    <strong className="text-slate-800">{selectedClient.fechaRegistro}</strong>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Teléfono Celular</span>
                  <strong className="text-slate-800 text-[13px]">{selectedClient.telefono || 'No registrado'}</strong>
                </div>

                {selectedClient.whatsapp && (
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">WhatsApp Directo</span>
                    <a
                      href={`https://wa.me/${selectedClient.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 font-bold hover:underline flex items-center gap-1 mt-0.5 text-xs"
                    >
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      {selectedClient.whatsapp} (Enviar mensaje)
                    </a>
                  </div>
                )}

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Dirección Formateada</span>
                  <strong className="text-slate-800 block mt-0.5 leading-relaxed">{selectedClient.direccion || 'No especificada'}</strong>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Actividad</span>
                    <strong className="text-slate-800 truncate block">{selectedClient.trabajo || 'No especificado'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Ingresos Netos</span>
                    <strong className="text-slate-800 block text-[13px]">${selectedClient.ingresos?.toLocaleString('es-AR') || '0'}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider mb-2">Legajo Digital Cargado</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-50 border border-slate-100">
                      {selectedClient.documentosSimulados?.dniFrente && !selectedClient.documentosSimulados?.dniFrente.includes('unsplash.com') ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">✔ DNI Frente</span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1">❌ Frente (Falta)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-50 border border-slate-100">
                      {selectedClient.documentosSimulados?.dniDorso && !selectedClient.documentosSimulados?.dniDorso.includes('unsplash.com') ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">✔ DNI Dorso</span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1">❌ Dorso (Falta)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-50 border border-slate-100 col-span-2">
                      {selectedClient.documentosSimulados?.comprobanteDomicilio && !selectedClient.documentosSimulados?.comprobanteDomicilio.includes('unsplash.com') ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">✔ Comprobante de Domicilio</span>
                      ) : (
                        <span className="text-amber-600 flex items-center gap-1">❌ Comp. Domicilio (Falta)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2 & 3: Credit Present / History */}
            <div className="lg:col-span-2 space-y-6">
              {/* Present Loan Block */}
              {(() => {
                const clientLoans = operaciones.filter(o => o.idCliente === selectedClient.id);
                const sortedLoans = [...clientLoans].sort((a, b) => b.fechaOtorgamiento.localeCompare(a.fechaOtorgamiento));
                const activeLoan = sortedLoans.find(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA');
                const presentLoan = activeLoan || sortedLoans[0];

                if (!presentLoan) {
                  return (
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center space-y-3 flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center">
                        <FileText className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">Sin Créditos Activos</h3>
                      <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                        Este cliente no tiene operaciones de crédito en el sistema en este momento. Puede registrar un crédito desde la Consola de Otorgamiento.
                      </p>
                    </div>
                  );
                }

                const progressPct = Math.round((presentLoan.cuotasPagadas / presentLoan.cantidadCuotas) * 100) || 0;

                return (
                  <div className={`p-6 rounded-2xl border bg-white shadow-sm space-y-5 relative overflow-hidden ${
                    presentLoan.estado === 'ACTIVA' 
                      ? 'border-emerald-200' 
                      : presentLoan.estado === 'VENCIDA'
                      ? 'border-rose-200'
                      : 'border-slate-200'
                  }`}>
                    {/* Decorative state accent */}
                    <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                      presentLoan.estado === 'ACTIVA' 
                        ? 'bg-emerald-500' 
                        : presentLoan.estado === 'VENCIDA'
                        ? 'bg-rose-500'
                        : 'bg-slate-400'
                    }`} />

                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div>
                        <span className="text-[10px] font-extrabold text-[#1E803B] uppercase tracking-wider block">
                          ÚLTIMO CRÉDITO ACTIVO / PRESENTADO
                        </span>
                        <h4 className="text-lg font-black text-slate-900 mt-1">
                          Ref: {presentLoan.id} <span className="text-xs font-mono font-medium text-slate-400">({presentLoan.tipoOperacion})</span>
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg ${
                          presentLoan.estado === 'ACTIVA'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : presentLoan.estado === 'VENCIDA'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {presentLoan.estado}
                        </span>
                      </div>
                    </div>

                    {/* Summary metrics grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-600 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Entregado</span>
                        <strong className="text-slate-800 text-sm font-bold">${presentLoan.capitalEntregado.toLocaleString('es-AR')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Total Financiado</span>
                        <strong className="text-slate-800 text-sm font-bold">${presentLoan.totalFinanciado.toLocaleString('es-AR')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Valor Cuota</span>
                        <strong className="text-slate-800 text-sm font-bold">${presentLoan.valorCuota.toLocaleString('es-AR')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold tracking-wider">Frecuencia</span>
                        <strong className="text-slate-800 text-xs font-bold uppercase">{presentLoan.frecuencia}</strong>
                      </div>
                    </div>

                    {/* Progress Bar of installments */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-slate-500">
                        <span className="font-medium">Amortización de Cuotas</span>
                        <span className="font-bold text-slate-800">{presentLoan.cuotasPagadas} de {presentLoan.cantidadCuotas} pagadas ({progressPct}%)</span>
                      </div>
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 p-0.5">
                        <div 
                          className="h-full rounded-full transition-all duration-500 bg-emerald-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Status & Mora Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                      <div className="space-y-1.5">
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-400">Capital Recuperado:</span>
                          <strong className="text-emerald-700 font-bold">${presentLoan.capitalRecuperado.toLocaleString('es-AR')}</strong>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-400">Total Pendiente:</span>
                          <strong className="text-rose-600 font-bold">${presentLoan.totalPendiente.toLocaleString('es-AR')}</strong>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-400">Próximo Vencimiento:</span>
                          <strong className="text-slate-800">{presentLoan.proximoVencimiento || 'N/A'}</strong>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-400">Días de Mora:</span>
                          <strong className={`font-bold ${presentLoan.diasMora > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                            {presentLoan.diasMora} días
                          </strong>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-400">Riesgo / Nivel Mora:</span>
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            presentLoan.diasMora > 0 ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-50 text-slate-500 border border-slate-200/50'
                          }`}>
                            {presentLoan.nivelMora || 'Sin Mora'}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-400">Cobrador Asignado:</span>
                          <strong className="text-slate-800">{presentLoan.cobrador || 'No asignado'}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Complete History Timeline and Simultaneous Credits */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  Historial Integral de Créditos del Cliente
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-4">Ref Crédito</th>
                        <th className="py-2.5 px-4">Otorgamiento</th>
                        <th className="py-2.5 px-4">Capital</th>
                        <th className="py-2.5 px-4">Total Finan.</th>
                        <th className="py-2.5 px-4">Frecuencia</th>
                        <th className="py-2.5 px-4 text-center">Cuotas</th>
                        <th className="py-2.5 px-4 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      {(() => {
                        const clientLoans = operaciones.filter(o => o.idCliente === selectedClient.id);
                        const sortedLoans = [...clientLoans].sort((a, b) => b.fechaOtorgamiento.localeCompare(a.fechaOtorgamiento));

                        if (sortedLoans.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="py-6 text-center text-slate-400 font-medium">
                                No registra operaciones de crédito históricas.
                              </td>
                            </tr>
                          );
                        }

                        return sortedLoans.map((loan) => (
                          <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-bold font-mono text-slate-900">{loan.id}</td>
                            <td className="py-3 px-4 text-slate-500">{loan.fechaOtorgamiento}</td>
                            <td className="py-3 px-4 font-semibold text-slate-700">${loan.capitalEntregado.toLocaleString('es-AR')}</td>
                            <td className="py-3 px-4 font-semibold text-slate-700">${loan.totalFinanciado.toLocaleString('es-AR')}</td>
                            <td className="py-3 px-4 text-slate-500 uppercase tracking-wide text-[10px]">{loan.frecuencia}</td>
                            <td className="py-3 px-4 text-center font-bold text-slate-800">
                              {loan.cuotasPagadas} / {loan.cantidadCuotas}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                loan.estado === 'ACTIVA' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : loan.estado === 'FINALIZADA'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}>
                                {loan.estado}
                              </span>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
