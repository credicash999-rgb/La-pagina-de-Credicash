/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Cliente } from '../types';
import { 
  UserPlus, User, Phone, MapPin, Briefcase, CreditCard, Shield, 
  FileText, Check, AlertTriangle, Upload, X, HelpCircle, Calendar, Mail
} from 'lucide-react';

function formatDNI(value: string): string {
  const clean = value.replace(/\D/g, '').slice(0, 8);
  if (clean.length < 4) return clean;
  if (clean.length === 4) {
    return `${clean.slice(0, 1)}.${clean.slice(1)}`;
  }
  if (clean.length === 5) {
    return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  }
  if (clean.length === 6) {
    return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  }
  if (clean.length === 7) {
    return `${clean.slice(0, 1)}.${clean.slice(1, 4)}.${clean.slice(4)}`;
  }
  if (clean.length === 8) {
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  }
  return clean;
}

interface NuevoClienteViewProps {
  clientes: Cliente[];
  onAddCliente: (cliente: Cliente) => void;
  onNavigateTo: (tab: string) => void;
}

export default function NuevoClienteView({ 
  clientes, 
  onAddCliente,
  onNavigateTo
}: NuevoClienteViewProps) {
  // Personal Info State
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [edad, setEdad] = useState<number | ''>('');
  const [sexo, setSexo] = useState('MASCULINO');

  // Contact Info State
  const [telefonoPrefijo, setTelefonoPrefijo] = useState('+54 9 11');
  const [telefonoNro, setTelefonoNro] = useState('');
  const [whatsappPrefijo, setWhatsappPrefijo] = useState('+54 9 11');
  const [whatsappNro, setWhatsappNro] = useState('');
  const [telefonoAlternativoPrefijo, setTelefonoAlternativoPrefijo] = useState('+54 9 11');
  const [telefonoAlternativoNro, setTelefonoAlternativoNro] = useState('');
  const [personaReferencia, setPersonaReferencia] = useState('');
  const [telefonoReferenciaPrefijo, setTelefonoReferenciaPrefijo] = useState('+54 9 11');
  const [telefonoReferenciaNro, setTelefonoReferenciaNro] = useState('');
  const [email, setEmail] = useState('');

  // Address State
  const [calle, setCalle] = useState('');
  const [numero, setNumero] = useState('');
  const [barrio, setBarrio] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [provincia, setProvincia] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');

  // Laboral Info State
  const [actividad, setActividad] = useState('');
  const [lugarTrabajo, setLugarTrabajo] = useState('');
  const [antiguedad, setAntiguedad] = useState('');
  const [ingresos, setIngresos] = useState<number | ''>('');

  // Financial Info State
  const [aliasCbu, setAliasCbu] = useState('');
  const [banco, setBanco] = useState('');

  // Commercial Info State
  const [captador, setCaptador] = useState('');
  const [analista, setAnalista] = useState('');
  const [estadoCliente, setEstadoCliente] = useState<'PROSPECTO' | 'ACTIVO' | 'SUSPENDIDO' | 'INACTIVO'>('PROSPECTO');
  const [origen, setOrigen] = useState('FACEBOOK');

  // Documentation Files State (Simulated)
  const [docDniFrente, setDocDniFrente] = useState<string>('');
  const [docDniDorso, setDocDniDorso] = useState<string>('');
  const [docComprobante, setDocComprobante] = useState<string>('');
  const [docReciboSueldo, setDocReciboSueldo] = useState<string>('');
  const [docOtros, setDocOtros] = useState<string>('');

  // Form Utilities State
  const [observaciones, setObservaciones] = useState('');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [phoneWarning, setPhoneWarning] = useState<string | null>(null);
  const [completarLuego, setCompletarLuego] = useState(false);
  const [dragOverField, setDragOverField] = useState<string | null>(null);

  // Refs for real file uploads
  const fileDniFrenteRef = useRef<HTMLInputElement>(null);
  const fileDniDorsoRef = useRef<HTMLInputElement>(null);
  const fileComprobanteRef = useRef<HTMLInputElement>(null);
  const fileReciboSueldoRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      handleSimulateUpload(field, file.name);
    }
  };

  const handleDragOver = (e: React.DragEvent, field: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverField(field);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverField(null);
  };

  const handleDrop = (e: React.DragEvent, field: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverField(null);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleSimulateUpload(field, file.name);
    }
  };

  // Auto-calculate age from date of birth
  useEffect(() => {
    if (!fechaNacimiento) {
      setEdad('');
      return;
    }
    const birthDate = new Date(fechaNacimiento);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    setEdad(calculatedAge >= 0 ? calculatedAge : 0);
  }, [fechaNacimiento]);

  // Handle DNI and Telephone validation dynamically on blur
  const validateOnTheFly = () => {
    setValidationError(null);
    setPhoneWarning(null);

    if (!dni) return;

    // Check if DNI already exists
    const dniExists = clientes.some(c => c.dni.replace(/\D/g, '') === dni.replace(/\D/g, ''));
    if (dniExists) {
      setValidationError(`Error: Ya existe un cliente registrado con el DNI ${dni}. Por favor verifique el número.`);
      return;
    }

    if (!telefonoNro.trim()) return;

    const fullPhone = `${telefonoPrefijo} ${telefonoNro}`.trim();
    // Check if Telephone already exists
    const phoneExists = clientes.some(c => c.telefono.replace(/\D/g, '') === fullPhone.replace(/\D/g, ''));
    if (phoneExists) {
      setPhoneWarning(`Advertencia: El teléfono celular ${fullPhone} ya está asociado a otro cliente. Esto podría ser un cliente duplicado.`);
    }
  };

  const handleSimulateUpload = (field: string, filename: string) => {
    if (field === 'frente') setDocDniFrente(filename);
    else if (field === 'dorso') setDocDniDorso(filename);
    else if (field === 'domicilio') setDocComprobante(filename);
    else if (field === 'recibo') setDocReciboSueldo(filename);
    else if (field === 'otros') setDocOtros(filename);
  };

  const handleRemoveFile = (field: string) => {
    if (field === 'frente') setDocDniFrente('');
    else if (field === 'dorso') setDocDniDorso('');
    else if (field === 'domicilio') setDocComprobante('');
    else if (field === 'recibo') setDocReciboSueldo('');
    else if (field === 'otros') setDocOtros('');
  };

  const handleOpenSummary = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setPhoneWarning(null);

    // 1. Hard validations
    if (!nombre.trim() || !apellido.trim() || !dni.trim()) {
      setValidationError('Los campos Nombre, Apellido y DNI son obligatorios.');
      return;
    }

    const dniClean = dni.replace(/\D/g, '');
    const dniExists = clientes.some(c => c.dni.replace(/\D/g, '') === dniClean);
    if (dniExists) {
      setValidationError(`Error crítico: Ya existe un expediente con el DNI ${dni}. No se permite crear duplicados.`);
      return;
    }

    if (!telefonoNro.trim()) {
      setValidationError('El Teléfono Celular es requerido para la ficha de contacto.');
      return;
    }

    if (!calle.trim() || !numero.trim() || !barrio.trim() || !ciudad.trim() || !provincia.trim()) {
      setValidationError('Los campos de Domicilio (Calle, Número, Barrio, Ciudad, Provincia) son requeridos.');
      return;
    }

    if (!captador.trim() || !analista.trim()) {
      setValidationError('Los campos comerciales de Captador y Analista de Crédito son requeridos.');
      return;
    }

    if (!completarLuego && (!docDniFrente || !docDniDorso || !docComprobante)) {
      setValidationError('Debe adjuntar la documentación mínima obligatoria: DNI Frente, DNI Dorso y Comprobante de Domicilio, o tilde la opción "Completar documentación luego".');
      return;
    }

    // 2. Warning checks
    const fullPhone = `${telefonoPrefijo} ${telefonoNro}`.trim();
    const phoneClean = fullPhone.replace(/\D/g, '');
    const phoneExists = clientes.some(c => c.telefono.replace(/\D/g, '') === phoneClean);
    if (phoneExists) {
      setPhoneWarning(`Advertencia: El número de teléfono celular ya está asignado a otro cliente.`);
    }

    setShowSummaryModal(true);
  };

  const handleConfirmCreate = () => {
    // Generate next CLI-XXX ID
    const nextNum = clientes.reduce((max, c) => {
      const match = c.id.match(/CLI-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0) + 1;
    const generatedId = `CLI-${String(nextNum).padStart(3, '0')}`;

    const formattedDireccion = `${calle} ${numero}, Bº ${barrio}, ${ciudad}, ${provincia}`;
    const telefonoFull = `${telefonoPrefijo} ${telefonoNro}`.trim();
    const whatsappFull = whatsappNro ? `${whatsappPrefijo} ${whatsappNro}`.trim() : telefonoFull;
    const telefonoAlternativoFull = telefonoAlternativoNro ? `${telefonoAlternativoPrefijo} ${telefonoAlternativoNro}`.trim() : '';
    const telefonoReferenciaFull = telefonoReferenciaNro ? `${telefonoReferenciaPrefijo} ${telefonoReferenciaNro}`.trim() : '';

    const nuevoCliente: Cliente = {
      id: generatedId,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni: dni.trim(),
      telefono: telefonoFull,
      direccion: formattedDireccion,
      trabajo: actividad.trim() || 'Sin especificar',
      ingresos: Number(ingresos) || 0,
      captador: captador.trim(),
      analista: analista.trim(),
      estado: estadoCliente as any,
      fechaRegistro: new Date().toISOString().split('T')[0],
      
      // Extended fields
      fechaNacimiento,
      sexo,
      whatsapp: whatsappFull,
      email: email.trim(),
      telefonoAlternativo: telefonoAlternativoFull,
      personaReferencia: personaReferencia.trim(),
      telefonoReferencia: telefonoReferenciaFull,
      calle: calle.trim(),
      numero: numero.trim(),
      barrio: barrio.trim(),
      ciudad: ciudad.trim(),
      provincia: provincia.trim(),
      codigoPostal: codigoPostal.trim(),
      lugarTrabajo: lugarTrabajo.trim(),
      antiguedad: antiguedad.trim(),
      aliasCbu: aliasCbu.trim(),
      banco: banco.trim(),
      origen,
      documentosSimulados: {
        dniFrente: docDniFrente,
        dniDorso: docDniDorso,
        comprobanteDomicilio: docComprobante,
        reciboSueldo: docReciboSueldo,
        otros: docOtros
      },
      observaciones: observaciones.trim()
    };

    onAddCliente(nuevoCliente);
    setShowSummaryModal(false);

    // Prompt user on success and redirect
    alert(`¡Ficha de Cliente ${generatedId} creada con éxito!\n\nEl expediente completo ha sido almacenado en la Base de Datos.`);
    onNavigateTo('clientes');
  };

  return (
    <div id="nuevo-cliente-view" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-900 rounded-xl border border-emerald-800/80 text-emerald-400">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Ficha Única de Nuevo Cliente</h2>
            <p className="text-xs text-emerald-200/70 mt-1">
              Complete la información exhaustiva requerida para dar de alta un nuevo expediente de cliente. No genera créditos ni cobros automáticos.
            </p>
          </div>
        </div>
      </div>

      {/* Validation Panel */}
      {validationError && (
        <div className="bg-rose-950/90 border border-rose-800 text-rose-200 p-4 rounded-xl flex items-start gap-3 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold">{validationError}</div>
        </div>
      )}

      {phoneWarning && (
        <div className="bg-amber-950/90 border border-amber-800 text-amber-200 p-4 rounded-xl flex items-start gap-3 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold">{phoneWarning}</div>
        </div>
      )}

      <form onSubmit={handleOpenSummary} className="space-y-6">
        
        {/* SECTION 1: Personal Info */}
        <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg space-y-4 backdrop-blur-md">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-emerald-800/80">
            <User className="w-4 h-4 text-emerald-400" />
            1. Información Personal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                onBlur={validateOnTheFly}
                className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white placeholder-emerald-800"
                placeholder="Nombres completos"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Apellido *</label>
              <input
                type="text"
                required
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                onBlur={validateOnTheFly}
                className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white placeholder-emerald-800"
                placeholder="Apellidos completos"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">DNI / Cédula *</label>
              <input
                type="text"
                required
                value={dni}
                onChange={(e) => setDni(formatDNI(e.target.value))}
                onBlur={validateOnTheFly}
                className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white font-mono placeholder-emerald-800"
                placeholder="Número de documento"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-400" />
                Fecha de Nacimiento
              </label>
              <input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all text-white font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Edad (Auto-calculada)</label>
              <input
                type="text"
                disabled
                value={edad !== '' ? `${edad} años` : 'Ingrese fecha de nacimiento'}
                className="w-full px-3.5 py-2 bg-slate-950 border border-emerald-800/80 rounded-xl text-sm text-emerald-400/80 font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Sexo</label>
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all text-white font-semibold cursor-pointer"
              >
                <option value="MASCULINO" className="bg-slate-900 text-white">MASCULINO</option>
                <option value="FEMENINO" className="bg-slate-900 text-white">FEMENINO</option>
                <option value="OTRO" className="bg-slate-900 text-white">OTRO / NO ESPECIFICA</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: Contact Info */}
        <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg space-y-4 backdrop-blur-md">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-emerald-800/80">
            <Phone className="w-4 h-4 text-emerald-400" />
            2. Información de Contacto y Enlaces
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Teléfono Celular */}
            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1.5">Teléfono Celular *</label>
              <div className="flex rounded-xl border border-emerald-800/80 bg-slate-900 focus-within:border-emerald-400 transition-all overflow-hidden">
                <select
                  value={telefonoPrefijo}
                  onChange={(e) => setTelefonoPrefijo(e.target.value)}
                  className="bg-slate-900 border-r border-emerald-800/80 px-2 py-2 text-xs font-bold text-emerald-300 focus:outline-hidden cursor-pointer shrink-0"
                >
                  <option value="+54 9 11" className="bg-slate-900 text-white">+54 9 11 (BsAs)</option>
                  <option value="+54 9 351" className="bg-slate-900 text-white">+54 9 351 (Cba)</option>
                  <option value="+54 9 341" className="bg-slate-900 text-white">+54 9 341 (Ros)</option>
                  <option value="+54 9 261" className="bg-slate-900 text-white">+54 9 261 (Mza)</option>
                  <option value="+54 9 381" className="bg-slate-900 text-white">+54 9 381 (Tuc)</option>
                  <option value="+54 9 342" className="bg-slate-900 text-white">+54 9 342 (S.Fe)</option>
                  <option value="+54 9 379" className="bg-slate-900 text-white">+54 9 379 (Corr)</option>
                  <option value="+54 9 387" className="bg-slate-900 text-white">+54 9 387 (Salta)</option>
                  <option value="+54 9 299" className="bg-slate-900 text-white">+54 9 299 (Nqn)</option>
                  <option value="+54 9 223" className="bg-slate-900 text-white">+54 9 223 (Mdp)</option>
                  <option value="+54 9" className="bg-slate-900 text-white">+54 9 (Otro)</option>
                  <option value="+1" className="bg-slate-900 text-white">+1 (USA)</option>
                  <option value="" className="bg-slate-900 text-white">Sin prefijo</option>
                </select>
                <input
                  type="tel"
                  required
                  value={telefonoNro}
                  onChange={(e) => setTelefonoNro(e.target.value)}
                  onBlur={validateOnTheFly}
                  className="w-full px-3 py-2 bg-transparent text-sm focus:outline-hidden font-semibold text-white placeholder-emerald-800"
                  placeholder="Número sin 0 ni 15"
                />
              </div>
            </div>

            {/* WhatsApp */}
            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1.5">WhatsApp</label>
              <div className="flex rounded-xl border border-emerald-800/80 bg-slate-900 focus-within:border-emerald-400 transition-all overflow-hidden">
                <select
                  value={whatsappPrefijo}
                  onChange={(e) => setWhatsappPrefijo(e.target.value)}
                  className="bg-slate-900 border-r border-emerald-800/80 px-2 py-2 text-xs font-bold text-emerald-300 focus:outline-hidden cursor-pointer shrink-0"
                >
                  <option value="+54 9 11" className="bg-slate-900 text-white">+54 9 11 (BsAs)</option>
                  <option value="+54 9 351" className="bg-slate-900 text-white">+54 9 351 (Cba)</option>
                  <option value="+54 9 341" className="bg-slate-900 text-white">+54 9 341 (Ros)</option>
                  <option value="+54 9 261" className="bg-slate-900 text-white">+54 9 261 (Mza)</option>
                  <option value="+54 9 381" className="bg-slate-900 text-white">+54 9 381 (Tuc)</option>
                  <option value="+54 9 342" className="bg-slate-900 text-white">+54 9 342 (S.Fe)</option>
                  <option value="+54 9 379" className="bg-slate-900 text-white">+54 9 379 (Corr)</option>
                  <option value="+54 9 387" className="bg-slate-900 text-white">+54 9 387 (Salta)</option>
                  <option value="+54 9 299" className="bg-slate-900 text-white">+54 9 299 (Nqn)</option>
                  <option value="+54 9 223" className="bg-slate-900 text-white">+54 9 223 (Mdp)</option>
                  <option value="+54 9" className="bg-slate-900 text-white">+54 9 (Otro)</option>
                  <option value="+1" className="bg-slate-900 text-white">+1 (USA)</option>
                  <option value="" className="bg-slate-900 text-white">Sin prefijo</option>
                </select>
                <input
                  type="tel"
                  value={whatsappNro}
                  onChange={(e) => setWhatsappNro(e.target.value)}
                  className="w-full px-3 py-2 bg-transparent text-sm focus:outline-hidden font-semibold text-white placeholder-emerald-800"
                  placeholder="Si difiere del celular"
                />
              </div>
            </div>

            {/* Teléfono Alternativo */}
            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1.5">Teléfono Alternativo (Opcional)</label>
              <div className="flex rounded-xl border border-emerald-800/80 bg-slate-900 focus-within:border-emerald-400 transition-all overflow-hidden">
                <select
                  value={telefonoAlternativoPrefijo}
                  onChange={(e) => setTelefonoAlternativoPrefijo(e.target.value)}
                  className="bg-slate-900 border-r border-emerald-800/80 px-2 py-2 text-xs font-bold text-emerald-300 focus:outline-hidden cursor-pointer shrink-0"
                >
                  <option value="+54 9 11" className="bg-slate-900 text-white">+54 9 11 (BsAs)</option>
                  <option value="+54 9 351" className="bg-slate-900 text-white">+54 9 351 (Cba)</option>
                  <option value="+54 9 341" className="bg-slate-900 text-white">+54 9 341 (Ros)</option>
                  <option value="+54 9 261" className="bg-slate-900 text-white">+54 9 261 (Mza)</option>
                  <option value="+54 9 381" className="bg-slate-900 text-white">+54 9 381 (Tuc)</option>
                  <option value="+54 9 342" className="bg-slate-900 text-white">+54 9 342 (S.Fe)</option>
                  <option value="+54 9 379" className="bg-slate-900 text-white">+54 9 379 (Corr)</option>
                  <option value="+54 9 387" className="bg-slate-900 text-white">+54 9 387 (Salta)</option>
                  <option value="+54 9 299" className="bg-slate-900 text-white">+54 9 299 (Nqn)</option>
                  <option value="+54 9 223" className="bg-slate-900 text-white">+54 9 223 (Mdp)</option>
                  <option value="+54 9" className="bg-slate-900 text-white">+54 9 (Otro)</option>
                  <option value="+1" className="bg-slate-900 text-white">+1 (USA)</option>
                  <option value="" className="bg-slate-900 text-white">Sin prefijo</option>
                </select>
                <input
                  type="tel"
                  value={telefonoAlternativoNro}
                  onChange={(e) => setTelefonoAlternativoNro(e.target.value)}
                  className="w-full px-3 py-2 bg-transparent text-sm focus:outline-hidden font-semibold text-white placeholder-emerald-800"
                  placeholder="Fijo u otro celular"
                />
              </div>
            </div>

            {/* Correo Electrónico */}
            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1.5">Correo Electrónico (Email)</label>
              <div className="flex rounded-xl border border-emerald-800/80 bg-slate-900 focus-within:border-emerald-400 transition-all overflow-hidden items-center px-3.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0 mr-2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full py-2 bg-transparent text-sm focus:outline-hidden font-semibold text-white placeholder-emerald-800"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>

            {/* Persona de Referencia */}
            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1.5">Persona de Referencia</label>
              <input
                type="text"
                value={personaReferencia}
                onChange={(e) => setPersonaReferencia(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white placeholder-emerald-800"
                placeholder="Nombre de familiar o amigo"
              />
            </div>

            {/* Teléfono de Referencia */}
            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1.5">Teléfono de Referencia</label>
              <div className="flex rounded-xl border border-emerald-800/80 bg-slate-900 focus-within:border-emerald-400 transition-all overflow-hidden">
                <select
                  value={telefonoReferenciaPrefijo}
                  onChange={(e) => setTelefonoReferenciaPrefijo(e.target.value)}
                  className="bg-slate-900 border-r border-emerald-800/80 px-2 py-2 text-xs font-bold text-emerald-300 focus:outline-hidden cursor-pointer shrink-0"
                >
                  <option value="+54 9 11" className="bg-slate-900 text-white">+54 9 11 (BsAs)</option>
                  <option value="+54 9 351" className="bg-slate-900 text-white">+54 9 351 (Cba)</option>
                  <option value="+54 9 341" className="bg-slate-900 text-white">+54 9 341 (Ros)</option>
                  <option value="+54 9 261" className="bg-slate-900 text-white">+54 9 261 (Mza)</option>
                  <option value="+54 9 381" className="bg-slate-900 text-white">+54 9 381 (Tuc)</option>
                  <option value="+54 9 342" className="bg-slate-900 text-white">+54 9 342 (S.Fe)</option>
                  <option value="+54 9 379" className="bg-slate-900 text-white">+54 9 379 (Corr)</option>
                  <option value="+54 9 387" className="bg-slate-900 text-white">+54 9 387 (Salta)</option>
                  <option value="+54 9 299" className="bg-slate-900 text-white">+54 9 299 (Nqn)</option>
                  <option value="+54 9 223" className="bg-slate-900 text-white">+54 9 223 (Mdp)</option>
                  <option value="+54 9" className="bg-slate-900 text-white">+54 9 (Otro)</option>
                  <option value="+1" className="bg-slate-900 text-white">+1 (USA)</option>
                  <option value="" className="bg-slate-900 text-white">Sin prefijo</option>
                </select>
                <input
                  type="tel"
                  value={telefonoReferenciaNro}
                  onChange={(e) => setTelefonoReferenciaNro(e.target.value)}
                  className="w-full px-3 py-2 bg-transparent text-sm focus:outline-hidden font-semibold text-white placeholder-emerald-800"
                  placeholder="Contacto del referente"
                />
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 3: Address */}
        <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg space-y-4 backdrop-blur-md">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-emerald-800/80">
            <MapPin className="w-4 h-4 text-emerald-400" />
            3. Domicilio Declarado
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Calle *</label>
              <input
                type="text"
                required
                value={calle}
                onChange={(e) => setCalle(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white placeholder-emerald-800"
                placeholder="Nombre de la calle"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Número *</label>
              <input
                type="text"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white font-mono placeholder-emerald-800"
                placeholder="Nº de altura"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Barrio *</label>
              <input
                type="text"
                required
                value={barrio}
                onChange={(e) => setBarrio(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white placeholder-emerald-800"
                placeholder="Barrio / Complejo"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Ciudad *</label>
              <input
                type="text"
                required
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white placeholder-emerald-800"
                placeholder="Localidad o cabecera"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Provincia *</label>
              <input
                type="text"
                required
                value={provincia}
                onChange={(e) => setProvincia(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white placeholder-emerald-800"
                placeholder="Provincia / Estado"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Código Postal</label>
              <input
                type="text"
                value={codigoPostal}
                onChange={(e) => setCodigoPostal(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white font-mono placeholder-emerald-800"
                placeholder="C.P."
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Laboral & Financial */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg space-y-4 backdrop-blur-md">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-emerald-800/80">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              4. Situación Laboral
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Actividad / Profesión</label>
                <input
                  type="text"
                  value={actividad}
                  onChange={(e) => setActividad(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white placeholder-emerald-800"
                  placeholder="Ej: Empleado, Autónomo"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Lugar de Trabajo</label>
                <input
                  type="text"
                  value={lugarTrabajo}
                  onChange={(e) => setLugarTrabajo(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white placeholder-emerald-800"
                  placeholder="Empresa o negocio"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Antigüedad</label>
                <input
                  type="text"
                  value={antiguedad}
                  onChange={(e) => setAntiguedad(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white placeholder-emerald-800"
                  placeholder="Ej: 2 años"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Ingreso Mensual ($)</label>
                <input
                  type="number"
                  value={ingresos}
                  onChange={(e) => setIngresos(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white placeholder-emerald-800"
                  placeholder="Ingreso promedio estimado"
                />
              </div>
            </div>
          </div>

          <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg space-y-4 backdrop-blur-md">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-emerald-800/80">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              5. Información Financiera
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">CBU / CVU / Alias de Cobro</label>
                <input
                  type="text"
                  value={aliasCbu}
                  onChange={(e) => setAliasCbu(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white font-mono placeholder-emerald-800"
                  placeholder="Clave virtual de transferencia bancaria"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Banco / Entidad Emisora</label>
                <input
                  type="text"
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white placeholder-emerald-800"
                  placeholder="Ej: Banco Galicia, Mercado Pago, etc."
                />
              </div>
            </div>
          </div>

        </div>

        {/* SECTION 5: Commercial Info */}
        <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg space-y-4 backdrop-blur-md">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-emerald-800/80">
            <Shield className="w-4 h-4 text-emerald-400" />
            6. Clasificación Comercial y Origen
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Captador Asignado *</label>
              <input
                type="text"
                required
                value={captador}
                onChange={(e) => setCaptador(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white placeholder-emerald-800"
                placeholder="Persona que captó el cliente"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Analista Asignado *</label>
              <input
                type="text"
                required
                value={analista}
                onChange={(e) => setAnalista(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-semibold text-white placeholder-emerald-800"
                placeholder="Operador que analiza crédito"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Estado de Alta Inicial</label>
              <select
                value={estadoCliente}
                onChange={(e) => setEstadoCliente(e.target.value as any)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all text-white font-semibold cursor-pointer"
              >
                <option value="PROSPECTO" className="bg-slate-900 text-white">PROSPECTO (En evaluación)</option>
                <option value="ACTIVO" className="bg-slate-900 text-white">ACTIVO (Pre-aprobado)</option>
                <option value="SUSPENDIDO" className="bg-slate-900 text-white">SUSPENDIDO (No califica)</option>
                <option value="INACTIVO" className="bg-slate-900 text-white">INACTIVO</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-emerald-300/80 uppercase tracking-wider mb-1">Origen de Captación</label>
              <select
                value={origen}
                onChange={(e) => setOrigen(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all text-white font-semibold cursor-pointer"
              >
                <option value="FACEBOOK" className="bg-slate-900 text-white">FACEBOOK</option>
                <option value="INSTAGRAM" className="bg-slate-900 text-white">INSTAGRAM</option>
                <option value="WHATSAPP" className="bg-slate-900 text-white">WHATSAPP</option>
                <option value="REFERIDO" className="bg-slate-900 text-white">REFERIDO POR TERCEROS</option>
                <option value="PAGINA_WEB" className="bg-slate-900 text-white">PÁGINA WEB OFICIAL</option>
                <option value="PRESENCIAL" className="bg-slate-900 text-white">ATENCIÓN PRESENCIAL</option>
                <option value="OTRO" className="bg-slate-900 text-white">OTRO MEDIO</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 6: Documentation (Interactive upload & Drag & Drop) */}
        <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg space-y-4 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-emerald-800/80">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              7. Legajo y Documentación Respaldatoria (Mínimo requerido)
            </h3>
            
            {/* COMPLETAR LUEGO TOGGLE */}
            <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-emerald-800/80 hover:border-amber-500 rounded-lg cursor-pointer transition-colors text-amber-300">
              <input
                type="checkbox"
                checked={completarLuego}
                onChange={(e) => setCompletarLuego(e.target.checked)}
                className="w-4 h-4 text-emerald-500 rounded border-emerald-800 focus:ring-emerald-500/20 cursor-pointer"
              />
              <span className="text-[11px] font-bold uppercase tracking-wider">Completar luego por Administrador</span>
            </label>
          </div>
          
          <p className="text-[11px] text-emerald-200/70 leading-relaxed">
            Haga clic en cualquiera de los bloques para seleccionar un archivo desde su computadora/dispositivo, o arrastre y suelte el archivo directamente en el área sombreada.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            
            {/* DNI FRENTE */}
            <div 
              className={`p-5 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer relative min-h-[140px] ${
                docDniFrente 
                  ? 'border-emerald-500 bg-emerald-900/60 text-emerald-200' 
                  : dragOverField === 'frente'
                    ? 'border-emerald-400 bg-slate-900 text-emerald-300 scale-[1.02]'
                    : 'border-emerald-800/80 bg-slate-900/80 hover:border-emerald-500 hover:bg-slate-900 text-emerald-300'
              }`}
              onClick={() => fileDniFrenteRef.current?.click()}
              onDragOver={(e) => handleDragOver(e, 'frente')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'frente')}
            >
              <input 
                type="file" 
                ref={fileDniFrenteRef} 
                className="hidden" 
                accept="image/*,application/pdf"
                onChange={(e) => handleFileChange(e, 'frente')}
              />
              <Upload className={`w-5 h-5 ${docDniFrente ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <div className="text-xs font-bold text-white">DNI Frente *</div>
              {docDniFrente ? (
                <div className="flex items-center gap-1.5 mt-1 bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] max-w-full border border-emerald-700">
                  <span className="truncate max-w-[100px]">{docDniFrente}</span>
                  <button type="button" className="text-rose-400 hover:text-rose-300 font-bold p-0.5" onClick={(e) => { e.stopPropagation(); handleRemoveFile('frente'); }}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-[10px] text-emerald-300/60">Clic o arrastrar archivo</span>
              )}
            </div>

            {/* DNI DORSO */}
            <div 
              className={`p-5 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer relative min-h-[140px] ${
                docDniDorso 
                  ? 'border-emerald-500 bg-emerald-900/60 text-emerald-200' 
                  : dragOverField === 'dorso'
                    ? 'border-emerald-400 bg-slate-900 text-emerald-300 scale-[1.02]'
                    : 'border-emerald-800/80 bg-slate-900/80 hover:border-emerald-500 hover:bg-slate-900 text-emerald-300'
              }`}
              onClick={() => fileDniDorsoRef.current?.click()}
              onDragOver={(e) => handleDragOver(e, 'dorso')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'dorso')}
            >
              <input 
                type="file" 
                ref={fileDniDorsoRef} 
                className="hidden" 
                accept="image/*,application/pdf"
                onChange={(e) => handleFileChange(e, 'dorso')}
              />
              <Upload className={`w-5 h-5 ${docDniDorso ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <div className="text-xs font-bold text-white">DNI Dorso *</div>
              {docDniDorso ? (
                <div className="flex items-center gap-1.5 mt-1 bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] max-w-full border border-emerald-700">
                  <span className="truncate max-w-[100px]">{docDniDorso}</span>
                  <button type="button" className="text-rose-400 hover:text-rose-300 font-bold p-0.5" onClick={(e) => { e.stopPropagation(); handleRemoveFile('dorso'); }}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-[10px] text-emerald-300/60">Clic o arrastrar archivo</span>
              )}
            </div>

            {/* COMPROBANTE DOMICILIO */}
            <div 
              className={`p-5 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer relative min-h-[140px] ${
                docComprobante 
                  ? 'border-emerald-500 bg-emerald-900/60 text-emerald-200' 
                  : dragOverField === 'domicilio'
                    ? 'border-emerald-400 bg-slate-900 text-emerald-300 scale-[1.02]'
                    : 'border-emerald-800/80 bg-slate-900/80 hover:border-emerald-500 hover:bg-slate-900 text-emerald-300'
              }`}
              onClick={() => fileComprobanteRef.current?.click()}
              onDragOver={(e) => handleDragOver(e, 'domicilio')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'domicilio')}
            >
              <input 
                type="file" 
                ref={fileComprobanteRef} 
                className="hidden" 
                accept="image/*,application/pdf"
                onChange={(e) => handleFileChange(e, 'domicilio')}
              />
              <Upload className={`w-5 h-5 ${docComprobante ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <div className="text-xs font-bold text-white">Comprobante Domicilio *</div>
              {docComprobante ? (
                <div className="flex items-center gap-1.5 mt-1 bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] max-w-full border border-emerald-700">
                  <span className="truncate max-w-[100px]">{docComprobante}</span>
                  <button type="button" className="text-rose-400 hover:text-rose-300 font-bold p-0.5" onClick={(e) => { e.stopPropagation(); handleRemoveFile('domicilio'); }}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-[10px] text-emerald-300/60">Clic o arrastrar archivo</span>
              )}
            </div>

            {/* RECIBO DE SUELDO */}
            <div 
              className={`p-5 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer relative min-h-[140px] ${
                docReciboSueldo 
                  ? 'border-emerald-500 bg-emerald-900/60 text-emerald-200' 
                  : dragOverField === 'recibo'
                    ? 'border-emerald-400 bg-slate-900 text-emerald-300 scale-[1.02]'
                    : 'border-emerald-800/80 bg-slate-900/80 hover:border-emerald-500 hover:bg-slate-900 text-emerald-300'
              }`}
              onClick={() => fileReciboSueldoRef.current?.click()}
              onDragOver={(e) => handleDragOver(e, 'recibo')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'recibo')}
            >
              <input 
                type="file" 
                ref={fileReciboSueldoRef} 
                className="hidden" 
                accept="image/*,application/pdf"
                onChange={(e) => handleFileChange(e, 'recibo')}
              />
              <Upload className={`w-5 h-5 ${docReciboSueldo ? 'text-emerald-400' : 'text-emerald-500'}`} />
              <div className="text-xs font-bold text-white">Recibo de Sueldo</div>
              {docReciboSueldo ? (
                <div className="flex items-center gap-1.5 mt-1 bg-emerald-950 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] max-w-full border border-emerald-700">
                  <span className="truncate max-w-[100px]">{docReciboSueldo}</span>
                  <button type="button" className="text-rose-400 hover:text-rose-300 font-bold p-0.5" onClick={(e) => { e.stopPropagation(); handleRemoveFile('recibo'); }}>
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <span className="text-[10px] text-emerald-300/60">Opcional (Clic o arrastrar)</span>
              )}
            </div>

          </div>
        </div>

        {/* SECTION 7: Observations */}
        <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-lg space-y-4 backdrop-blur-md">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-emerald-800/80">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            8. Observaciones Adicionales
          </h3>
          <div>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full p-4 bg-slate-900 border border-emerald-800/80 rounded-xl text-sm focus:outline-hidden focus:border-emerald-400 transition-all font-medium text-white placeholder-emerald-800"
              rows={3}
              placeholder="Escriba comentarios, referencias, deudas con otras entidades o particularidades del perfil..."
            />
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigateTo('clientes')}
            className="px-6 py-3 border border-emerald-800/80 hover:bg-slate-900 text-emerald-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
          >
            Volver a la Lista
          </button>
          <button
            type="submit"
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md hover:shadow-none flex items-center gap-2 cursor-pointer border border-emerald-500/30"
          >
            <UserPlus className="w-4.5 h-4.5" />
            Crear Cliente
          </button>
        </div>

      </form>

      {/* FINAL CONFIRMATION OVERLAY MODAL */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-emerald-950 rounded-2xl border border-emerald-800/80 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 text-white">
            
            <div className="flex justify-between items-start border-b border-emerald-800/80 pb-4">
              <div>
                <h4 className="text-base font-extrabold text-white">Resumen y Validación de Ficha de Cliente</h4>
                <p className="text-[11px] text-emerald-200/70 mt-0.5">Revise meticulosamente el legajo antes de guardarlo de forma definitiva.</p>
              </div>
              <button 
                onClick={() => setShowSummaryModal(false)}
                className="text-emerald-400 hover:text-white p-1 bg-slate-900 rounded-lg cursor-pointer border border-emerald-800/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4 bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Nombre y Apellido</span>
                  <span className="font-extrabold text-white text-sm">{nombre} {apellido}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">DNI de Identidad</span>
                  <span className="font-mono font-extrabold text-white text-sm">{dni}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Fecha de Nacimiento / Edad</span>
                  <span className="font-bold text-emerald-200">{fechaNacimiento || 'No declarada'} ({edad !== '' ? `${edad} años` : 'N/A'})</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Sexo</span>
                  <span className="font-bold text-emerald-200">{sexo}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Celular / WhatsApp</span>
                  <span className="font-bold text-white">
                    {telefonoPrefijo} {telefonoNro} {whatsappNro ? `(WhatsApp: ${whatsappPrefijo} ${whatsappNro})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Dirección Unificada</span>
                  <span className="font-bold text-emerald-200">{calle} {numero}, Bº {barrio}, {ciudad}, {provincia}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Actividad e Ingresos</span>
                  <span className="font-bold text-white">{actividad || 'Sin especificar'} ({ingresos ? `$${ingresos.toLocaleString('es-ES')}` : 'Sin ingresos declarados'})</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Alias / CBU y Banco</span>
                  <span className="font-mono font-bold text-emerald-200">{aliasCbu || 'N/A'} ({banco || 'N/A'})</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-900/90 p-4 rounded-xl border border-emerald-800/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Asignación Comercial</span>
                  <span className="font-bold text-white">Captador: {captador} | Analista: {analista}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Estado Inicial / Origen</span>
                  <span className="font-bold text-emerald-400">{estadoCliente} / {origen}</span>
                </div>
              </div>

              {/* Documentation check */}
              <div className={`p-4 rounded-xl space-y-2 ${completarLuego ? 'bg-amber-950/80 border border-amber-800 text-amber-200' : 'bg-slate-900/90 border border-emerald-800/80 text-emerald-200'}`}>
                <span className={`text-[10px] uppercase font-bold block ${completarLuego ? 'text-amber-400' : 'text-emerald-400'}`}>Legajo Digital Cargado</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[10px]">
                  <div className="flex items-center gap-1.5">
                    {docDniFrente ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-bold"><Check className="w-3.5 h-3.5" /> DNI Frente</span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400 font-medium"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> DNI Frente (Pendiente)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {docDniDorso ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-bold"><Check className="w-3.5 h-3.5" /> DNI Dorso</span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400 font-medium"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> DNI Dorso (Pendiente)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {docComprobante ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-bold"><Check className="w-3.5 h-3.5" /> Comp. Domicilio</span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-400 font-medium"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Comp. Domicilio (Pendiente)</span>
                    )}
                  </div>
                  {docReciboSueldo && (
                    <div className="flex items-center gap-1 text-emerald-400 font-bold">
                      <Check className="w-3.5 h-3.5" /> Recibo de Sueldo
                    </div>
                  )}
                  {docOtros && (
                    <div className="flex items-center gap-1 text-emerald-400 font-bold">
                      <Check className="w-3.5 h-3.5" /> Otros Documentos
                    </div>
                  )}
                </div>
              </div>

              {/* Automated stats indicators */}
              <div className="p-4 bg-slate-900/90 border border-emerald-800/80 rounded-xl space-y-1.5 text-emerald-200 leading-relaxed">
                <span className="text-[10px] uppercase font-bold block text-emerald-400">Campos Computados Automáticamente al Confirmar:</span>
                <ul className="list-disc pl-4 space-y-1 text-[10px] font-medium text-emerald-300">
                  <li>ID de Cliente único y progresivo</li>
                  <li>Fecha de Alta (Establecida a hoy)</li>
                  <li>Número de Créditos = 0</li>
                  <li>Saldos Financieros Pendientes y Cobrados = $0</li>
                  <li>Elegible para Crédito = Sí</li>
                </ul>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-emerald-800/80">
              <button
                type="button"
                onClick={() => setShowSummaryModal(false)}
                className="px-5 py-2.5 border border-emerald-800/80 text-emerald-300 rounded-xl font-bold hover:bg-slate-900 transition-colors text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmCreate}
                className="px-6 py-2.5 bg-emerald-600 text-white font-extrabold rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-1 text-xs uppercase tracking-wider cursor-pointer border border-emerald-500/30"
              >
                <Check className="w-4 h-4" />
                Confirmar y Crear Cliente
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
