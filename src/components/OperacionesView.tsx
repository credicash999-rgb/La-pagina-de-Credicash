/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Cliente, Operacion, Cuota, FrecuenciaPago, Configuracion, UsuarioRol } from '../types';
import { generarPlanCuotas, calcularMesesFinanciados, obtenerProximoDiaHabil } from '../utils/cuotasGenerator';
import { 
  Calculator, User, Briefcase, Calendar, Check, AlertTriangle, 
  HelpCircle, RefreshCw, X, ShieldCheck, DollarSign, Search, FileText
} from 'lucide-react';

interface OperacionesViewProps {
  operaciones: Operacion[];
  clientes: Cliente[];
  cuotas: Cuota[];
  configuracion: Configuracion;
  feriados: string[];
  activeUser: UsuarioRol;
  onAddOperacion: (operacion: Operacion, cuotasGeneradas: Cuota[]) => void;
  onUpdateOperacion: (operacion: Operacion) => void;
  onAddCuotas: (nuevasCuotas: Cuota[]) => void;
}

export default function OperacionesView({
  operaciones,
  clientes,
  cuotas,
  configuracion,
  feriados,
  activeUser,
  onAddOperacion,
  onUpdateOperacion,
  onAddCuotas,
}: OperacionesViewProps) {
  
  // Step 1: Smart Search for Client
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);

  // Step 2: Credit Parameters
  const [fechaOtorgamiento, setFechaOtorgamiento] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [tipoOperacion, setTipoOperacion] = useState<Operacion['tipoOperacion']>('NUEVO');
  const [estadoOperacion, setEstadoOperacion] = useState<Operacion['estado']>('ACTIVA');
  const [capitalEntregado, setCapitalEntregado] = useState<number>(100000);
  const [promocionAplicada, setPromocionAplicada] = useState('');
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState<number>(0);
  const [motivoPromocion, setMotivoPromocion] = useState('');
  const [frecuencia, setFrecuencia] = useState<FrecuenciaPago>('DIARIA');
  const [primerVencimiento, setPrimerVencimiento] = useState('');

  // Automatically computed financial and operation attributes
  const [cantidadCuotas, setCantidadCuotas] = useState<number>(20);
  const [mesesFinanciados, setMesesFinanciados] = useState<number>(1);
  const [tasaMensual, setTasaMensual] = useState<number>(50);
  const [totalFinanciado, setTotalFinanciado] = useState<number>(150000);
  const [valorCuota, setValorCuota] = useState<number>(7500);
  const [capitalPorCuota, setCapitalPorCuota] = useState<number>(5000);
  const [interesPorCuota, setInteresPorCuota] = useState<number>(2500);
  const [ultimoVencimiento, setUltimoVencimiento] = useState<string>('');
  const [posibleFechaRenovacion, setPosibleFechaRenovacion] = useState<string>('');
  const [numeroCredito, setNumeroCredito] = useState<number>(1);

  // Real-time generated installments list (preview)
  const [cuotasPreview, setCuotasPreview] = useState<Cuota[]>([]);

  // Confirmation Modal Trigger
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Active credits warning for Step 1
  const [activeCreditsOfSelected, setActiveCreditsOfSelected] = useState<Operacion[]>([]);

  // 1. Calculate Standard defaults when Frecuencia changes
  useEffect(() => {
    let standardCuotas = 20;
    if (frecuencia === 'DIARIA') standardCuotas = 20;
    else if (frecuencia === 'SEMANAL') standardCuotas = 8;
    else if (frecuencia === 'QUINCENAL') standardCuotas = 4;
    else if (frecuencia === 'MENSUAL') standardCuotas = 4;

    setCantidadCuotas(standardCuotas);
  }, [frecuencia]);

  // 2. Automatically compute Primer Vencimiento for DIARIA frequency
  useEffect(() => {
    if (frecuencia === 'DIARIA') {
      const grantDate = new Date(fechaOtorgamiento + 'T12:00:00');
      const nextDay = new Date(grantDate.getTime() + 24 * 60 * 60 * 1000);
      const calculatedDate = obtenerProximoDiaHabil(nextDay, feriados);
      setPrimerVencimiento(calculatedDate.toISOString().split('T')[0]);
    } else {
      if (!primerVencimiento) {
        const grantDate = new Date(fechaOtorgamiento + 'T12:00:00');
        const defaultNext = new Date(grantDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        setPrimerVencimiento(defaultNext.toISOString().split('T')[0]);
      }
    }
  }, [frecuencia, fechaOtorgamiento, feriados]);

  // 3. Dynamic Real-Time Simulator & Installments Calculator
  useEffect(() => {
    const meses = calcularMesesFinanciados(frecuencia, cantidadCuotas);
    setMesesFinanciados(meses);

    let tasa = 50;
    if (frecuencia === 'DIARIA') tasa = configuracion.interesDiario;
    else if (frecuencia === 'SEMANAL') tasa = configuracion.interesSemanal;
    else if (frecuencia === 'QUINCENAL') tasa = configuracion.interesQuincenal;
    else if (frecuencia === 'MENSUAL') tasa = configuracion.interesMensual;
    setTasaMensual(tasa);

    const interesTotal = capitalEntregado * (tasa / 100) * meses;
    const subtotal = capitalEntregado + interesTotal;
    
    const descuentoMonto = subtotal * (descuentoPorcentaje / 100);
    const total = Math.max(0, parseFloat((subtotal - descuentoMonto).toFixed(2)));
    setTotalFinanciado(total);

    const valorC = parseFloat((total / cantidadCuotas).toFixed(2));
    setValorCuota(valorC);

    const capC = parseFloat((capitalEntregado / cantidadCuotas).toFixed(2));
    setCapitalPorCuota(capC);

    const intC = parseFloat((interesTotal / cantidadCuotas).toFixed(2));
    setInteresPorCuota(intC);

    if (selectedCliente && primerVencimiento) {
      const opIdMock = 'OPE-TEMP';
      const tempOp: Operacion = {
        id: opIdMock,
        fechaOtorgamiento,
        idCliente: selectedCliente.id,
        nombreCliente: `${selectedCliente.nombre} ${selectedCliente.apellido}`,
        estado: estadoOperacion,
        tipoOperacion,
        descripcion: promocionAplicada ? `PROMO: ${promocionAplicada}` : '',
        capitalEntregado,
        promocionAplicada,
        descuentoPorcentaje,
        totalFinanciado: total,
        frecuencia,
        cantidadCuotas,
        mesesFinanciados: meses,
        valorCuota: valorC,
        primerVencimiento,
        ultimoVencimiento: '',
        captador: selectedCliente.captador || '',
        analista: selectedCliente.analista || '',
        ejecutivoAtencion: '',
        cobrador: '',
        capitalRecuperado: 0,
        interesCobrado: 0,
        capitalPendiente: capitalEntregado,
        totalPendiente: total,
        cuotasPagadas: 0,
        cuotasPendientes: cantidadCuotas,
        proximoVencimiento: primerVencimiento,
        ultimoPago: '',
        diasMora: 0,
        nivelMora: 'Sano',
        numeroCredito,
        elegibleRenovacion: false,
        elegibleAmpliacion: false,
        fechaFinalizacion: '',
        motivoCierre: '',
        observaciones: '',
        cuotasGeneradas: true
      };

      try {
        const generated = generarPlanCuotas(tempOp, feriados);
        setCuotasPreview(generated);

        if (generated.length > 0) {
          const lastDate = generated[generated.length - 1].fechaVencimiento;
          setUltimoVencimiento(lastDate);

          const index70 = Math.max(0, Math.floor(cantidadCuotas * 0.7) - 1);
          const renewalDate = generated[index70]?.fechaVencimiento || lastDate;
          setPosibleFechaRenovacion(renewalDate);
        }
      } catch (e) {
        console.error("Error generating simulated installments", e);
      }
    } else {
      setCuotasPreview([]);
      setUltimoVencimiento('');
      setPosibleFechaRenovacion('');
    }
  }, [
    selectedCliente, capitalEntregado, frecuencia, cantidadCuotas, 
    descuentoPorcentaje, primerVencimiento, fechaOtorgamiento, 
    configuracion, estadoOperacion, tipoOperacion, promocionAplicada, numeroCredito
  ]);

  // 4. Update selected client details
  useEffect(() => {
    if (selectedCliente) {
      const clientCredits = operaciones.filter(o => o.idCliente === selectedCliente.id);
      setNumeroCredito(clientCredits.length + 1);
      const activeOnes = clientCredits.filter(o => o.estado === 'ACTIVA');
      setActiveCreditsOfSelected(activeOnes);
    } else {
      setNumeroCredito(1);
      setActiveCreditsOfSelected([]);
    }
  }, [selectedCliente, operaciones]);

  // 5. Smart client filter
  const matchingClients = clientes.filter(c => {
    if (!clientSearchTerm.trim()) return false;
    const term = clientSearchTerm.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(term) ||
      c.apellido.toLowerCase().includes(term) ||
      c.dni.includes(term) ||
      c.telefono.includes(term) ||
      c.id.toLowerCase().includes(term)
    );
  });

  const handleOpenConfirm = () => {
    setValidationError(null);

    if (!selectedCliente) {
      setValidationError('Debe buscar y seleccionar un cliente de la base de datos (Paso 1).');
      return;
    }
    if (capitalEntregado <= 0) {
      setValidationError('El Capital Entregado debe ser mayor que cero.');
      return;
    }
    if (!frecuencia) {
      setValidationError('Debe seleccionar una frecuencia de pago.');
      return;
    }
    if (!fechaOtorgamiento) {
      setValidationError('Debe ingresar la fecha de otorgamiento.');
      return;
    }
    if (!primerVencimiento) {
      setValidationError('Debe declarar o calcular la fecha del primer vencimiento.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleFinalConfirm = () => {
    if (!selectedCliente || cuotasPreview.length === 0) return;

    const nextNum = operaciones.reduce((max, o) => {
      const match = o.id.match(/OPE-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0) + 1;
    const generatedOpId = `OPE-${String(nextNum).padStart(3, '0')}`;

    const finalizedCuotas = cuotasPreview.map(cuo => ({
      ...cuo,
      id: `${generatedOpId}-CUO-${String(cuo.numeroCuota).padStart(2, '0')}`,
      idOperacion: generatedOpId,
      cobrador: selectedCliente.analista || 'Cobrador General'
    }));

    const nuevaOperacion: Operacion = {
      id: generatedOpId,
      fechaOtorgamiento,
      idCliente: selectedCliente.id,
      nombreCliente: `${selectedCliente.nombre} ${selectedCliente.apellido}`,
      estado: estadoOperacion,
      tipoOperacion,
      descripcion: promocionAplicada ? `PROMO: ${promocionAplicada}` : `Crédito ${tipoOperacion}`,
      capitalEntregado,
      promocionAplicada,
      descuentoPorcentaje,
      totalFinanciado,
      frecuencia,
      cantidadCuotas,
      mesesFinanciados,
      valorCuota,
      primerVencimiento,
      ultimoVencimiento,
      captador: selectedCliente.captador || '',
      analista: selectedCliente.analista || '',
      ejecutivoAtencion: selectedCliente.analista || 'Oficina Central',
      cobrador: selectedCliente.analista || 'Cobrador de Campo',
      capitalRecuperado: 0,
      interesCobrado: 0,
      capitalPendiente: capitalEntregado,
      totalPendiente: totalFinanciado,
      cuotasPagadas: 0,
      cuotasPendientes: cantidadCuotas,
      proximoVencimiento: primerVencimiento,
      ultimoPago: '',
      diasMora: 0,
      nivelMora: 'Sano',
      numeroCredito,
      elegibleRenovacion: false,
      elegibleAmpliacion: false,
      fechaFinalizacion: '',
      motivoCierre: '',
      observaciones: motivoPromocion ? `Motivo promo: ${motivoPromocion}` : '',
      cuotasGeneradas: true
    };

    onAddOperacion(nuevaOperacion, finalizedCuotas);
    
    setSelectedCliente(null);
    setClientSearchTerm('');
    setCapitalEntregado(100000);
    setPromocionAplicada('');
    setDescuentoPorcentaje(0);
    setMotivoPromocion('');
    setFrecuencia('DIARIA');
    setShowConfirmModal(false);

    alert(`¡Crédito de alta precisión ${generatedOpId} otorgado y activo!\n\nSe han calendarizado ${cantidadCuotas} cuotas omitiendo domingos y feriados.`);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor habilite las ventanas emergentes para exportar el PDF.');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Convenio de Pago - CrediCash</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 40px; margin: 0; }
            .header { border-bottom: 2px solid #1e803b; padding-bottom: 20px; margin-bottom: 30px; text-align: center; }
            .logo { font-size: 24px; font-weight: bold; color: #0b4b27; }
            .title { font-size: 18px; color: #1e803b; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px; }
            .section { margin-bottom: 25px; }
            .section-title { font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; }
            .field { margin-bottom: 10px; }
            .label { font-size: 11px; color: #64748b; text-transform: uppercase; }
            .value { font-size: 14px; font-weight: bold; color: #0f172a; }
            .highlight-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin-top: 20px; }
            .highlight-grid { display: grid; grid-template-cols: 1fr 1fr 1fr; gap: 10px; text-align: center; }
            .highlight-val { font-size: 22px; font-weight: 900; color: #166534; }
            .signature-area { margin-top: 70px; display: flex; justify-content: space-between; gap: 50px; }
            .signature-line { border-top: 1px dashed #94a3b8; width: 220px; text-align: center; padding-top: 8px; font-size: 11px; color: #64748b; font-weight: bold; }
            .btn-container { text-align: center; margin-top: 40px; }
            .btn-print { background: #1e803b; color: white; border: none; padding: 12px 24px; font-size: 13px; font-weight: bold; border-radius: 8px; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
            @media print {
              .btn-container { display: none; }
              body { padding: 15px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">CrediCash</div>
            <div class="title">Convenio de Liquidación de Crédito</div>
          </div>
          <div class="section">
            <div class="section-title">Información del Cliente</div>
            <div class="grid">
              <div class="field">
                <div class="label">Nombre del Cliente</div>
                <div class="value">${selectedCliente?.nombre} ${selectedCliente?.apellido}</div>
              </div>
              <div class="field">
                <div class="label">Documento de Identidad</div>
                <div class="value">${selectedCliente?.dni}</div>
              </div>
              <div class="field">
                <div class="label">ID de Cliente</div>
                <div class="value">${selectedCliente?.id}</div>
              </div>
              <div class="field">
                <div class="label">Teléfono</div>
                <div class="value">${selectedCliente?.telefono}</div>
              </div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Detalle del Plan de Amortización</div>
            <div class="grid">
              <div class="field">
                <div class="label">Frecuencia de Pago</div>
                <div class="value">${frecuencia}</div>
              </div>
              <div class="field">
                <div class="label">Fecha de Otorgamiento</div>
                <div class="value">${fechaOtorgamiento}</div>
              </div>
              <div class="field">
                <div class="label">Primer Vencimiento</div>
                <div class="value">${primerVencimiento}</div>
              </div>
              <div class="field">
                <div class="label">Último Vencimiento</div>
                <div class="value">${ultimoVencimiento}</div>
              </div>
            </div>
          </div>
          <div class="highlight-box">
            <div class="highlight-grid">
              <div>
                <div class="label" style="color: #166534; font-weight: bold;">Valor de la Cuota</div>
                <div class="highlight-val">$${valorCuota.toLocaleString('es-ES')}</div>
              </div>
              <div>
                <div class="label" style="color: #166534; font-weight: bold;">Cantidad de Cuotas</div>
                <div class="highlight-val">${cantidadCuotas}</div>
              </div>
              <div>
                <div class="label" style="color: #4338ca; font-weight: bold;">Fecha Renovación (70%)</div>
                <div class="highlight-val" style="font-size: 15px; margin-top: 6px; color: #4338ca;">${posibleFechaRenovacion}</div>
              </div>
            </div>
          </div>
          <div class="signature-area">
            <div class="signature-line">Firma del Cliente Titular</div>
            <div class="signature-line">Firma del Operador</div>
          </div>
          <div class="btn-container">
            <button class="btn-print" onclick="window.print();">Imprimir Convenio / Guardar PDF</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div id="operaciones-view-overhaul" className="space-y-6">
      
      {/* Title block */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" />
            Otorgar Créditos
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestione y liquide un nuevo préstamo para un cliente existente. Cuenta con simulador automatizado en tiempo real.
          </p>
        </div>
        <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-100">
          CrediCash Liquidaciones
        </span>
      </div>

      {validationError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs font-semibold">{validationError}</div>
        </div>
      )}

      {/* Main Flow Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Step-by-Step form column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* STEP 1: SELECT CLIENT */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-[#1E803B] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="w-4 h-4" />
              Paso 1 - Seleccionar Cliente Existente
            </h3>

            {!selectedCliente ? (
              <div className="space-y-3">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Buscador Inteligente (Nombre, Apellido, DNI, Teléfono, ID)
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                    placeholder="Escriba para filtrar los clientes..."
                  />
                </div>

                {clientSearchTerm.trim() && (
                  <div className="border border-slate-200 bg-white rounded-xl shadow-lg divide-y divide-slate-100 max-h-[220px] overflow-y-auto animate-fadeIn">
                    {matchingClients.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 font-medium">
                        Ningún cliente coincide con la búsqueda. Recuerde que debe registrar primero al cliente en la pestaña "Nuevo Cliente".
                      </div>
                    ) : (
                      matchingClients.map(c => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCliente(c);
                            setClientSearchTerm('');
                          }}
                          className="p-3 hover:bg-slate-50 flex justify-between items-center cursor-pointer transition-colors"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-800">{c.nombre} {c.apellido}</div>
                            <div className="text-[10px] text-slate-400 font-mono">DNI: {c.dni} · Cel: {c.telefono}</div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">{c.id}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected Client Card */}
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">Expediente Cargado</span>
                    <h4 className="text-sm font-extrabold text-slate-900">{selectedCliente.nombre} {selectedCliente.apellido}</h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-slate-600 font-medium">
                      <div><span className="text-slate-400">DNI:</span> {selectedCliente.dni}</div>
                      <div><span className="text-slate-400">ID Cliente:</span> {selectedCliente.id}</div>
                      <div><span className="text-slate-400">Teléfono:</span> {selectedCliente.telefono}</div>
                      <div><span className="text-slate-400">Estado:</span> <span className="font-bold text-emerald-700">{selectedCliente.estado}</span></div>
                      <div><span className="text-slate-400">Captador:</span> {selectedCliente.captador}</div>
                      <div><span className="text-slate-400">Analista:</span> {selectedCliente.analista}</div>
                      {activeUser?.rolId === 'ADMIN' ? (
                        <div className="col-span-2 flex items-center gap-2 border-t border-emerald-200/40 pt-2 mt-1">
                          <span className="text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">Número de Crédito Actual:</span>
                          <input
                            type="number"
                            min={1}
                            value={numeroCredito}
                            onChange={(e) => setNumeroCredito(Math.max(1, Number(e.target.value)))}
                            className="w-16 px-2 py-0.5 border border-emerald-300 rounded-lg text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[9px] text-slate-400 font-semibold italic">(Manual para Administrador)</span>
                        </div>
                      ) : (
                        <div><span className="text-slate-400">Crédito Anterior:</span> <span className="font-mono text-slate-700">#{numeroCredito > 1 ? `${numeroCredito - 1}` : 'Ninguno'}</span></div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCliente(null)}
                    className="self-start text-[10px] font-bold text-rose-600 hover:text-white bg-white hover:bg-rose-600 border border-rose-200 hover:border-rose-600 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs"
                  >
                    CAMBIAR CLIENTE
                  </button>
                </div>

                {/* Active loans alert */}
                {activeCreditsOfSelected.length > 0 && (() => {
                  const hasMora = activeCreditsOfSelected.some(op => op.diasMora > 0 || op.estado === 'VENCIDA');
                  return (
                    <div className={`p-5 rounded-2xl space-y-4 animate-fadeIn border ${
                      hasMora 
                        ? 'bg-rose-50 border-rose-300 text-rose-950' 
                        : 'bg-amber-50/70 border border-amber-200 text-amber-900'
                    }`}>
                      <div className={`flex items-center gap-2 pb-2 border-b ${
                        hasMora ? 'border-rose-300/50' : 'border-amber-200/50'
                      }`}>
                        <AlertTriangle className={`w-5 h-5 shrink-0 ${hasMora ? 'text-rose-600' : 'text-amber-600'}`} />
                        <div>
                          <span className={`text-xs font-black uppercase tracking-wider block ${hasMora ? 'text-rose-800' : 'text-amber-800'}`}>
                            {hasMora ? '❌ EXPEDIENTE EN MORA: EL CLIENTE REGISTRA DEUDAS VENCIDAS' : '⚠️ EXPEDIENTE ACTIVO: EL CLIENTE POSEE CRÉDITOS VIGENTES'}
                          </span>
                          <span className={`text-[10px] ${hasMora ? 'text-rose-700/90' : 'text-amber-700'}`}>
                            {hasMora 
                              ? '¡REVISAR CON ATENCIÓN! El cliente se encuentra en mora y debe regularizar su situación.' 
                              : 'Analice detalladamente el comportamiento de pago antes de autorizar una nueva liquidación.'
                            }
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {activeCreditsOfSelected.map(op => {
                          const freqLabel = 
                            op.frecuencia === 'DIARIA' ? 'Diario' :
                            op.frecuencia === 'SEMANAL' ? 'Semanal' :
                            op.frecuencia === 'QUINCENAL' ? 'Quincenal' : 'Mensual';

                          const estaEnMora = op.diasMora > 0 || op.estado === 'VENCIDA';
                          const renovacionRequerida = Math.ceil(op.cantidadCuotas * 0.7);
                          const esElegibleRenovacion = op.cuotasPagadas >= renovacionRequerida;

                          return (
                            <div key={op.id} className={`rounded-xl border p-4 text-xs shadow-xs space-y-3 text-slate-700 ${
                              estaEnMora 
                                ? 'bg-rose-100/50 border-rose-300' 
                                : 'bg-white/95 border-amber-200'
                            }`}>
                              <div className={`flex justify-between items-center pb-2 border-b ${estaEnMora ? 'border-rose-200' : 'border-slate-100'}`}>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-[#0B4B27] bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                                    {op.id}
                                  </span>
                                  <span className="text-[10px] font-extrabold uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-0.5 rounded leading-none">
                                    Crédito {freqLabel} (Nº {op.numeroCredito})
                                  </span>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold leading-none border ${
                                  estaEnMora 
                                    ? 'bg-rose-200 text-rose-900 border-rose-300 animate-pulse' 
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}>
                                  {estaEnMora ? `🔴 EN MORA (${op.diasMora} DÍAS)` : '🟢 AL DÍA'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] leading-relaxed">
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Monto Otorgado</span>
                                  <strong className="text-slate-800">${op.totalFinanciado.toLocaleString('es-ES')}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Saldo Pendiente</span>
                                  <strong className="text-rose-600 font-bold">${op.totalPendiente.toLocaleString('es-ES')}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Cuotas Amortizadas</span>
                                  <strong className="text-slate-800">{op.cuotasPagadas} de {op.cantidadCuotas} pagadas</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Fecha Otorgamiento</span>
                                  <strong className="text-slate-600">{op.fechaOtorgamiento}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Próximo Vencimiento</span>
                                  <strong className="text-slate-600 font-mono text-[10px]">{op.proximoVencimiento || 'N/A'}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Renovación (70%)</span>
                                  <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                                    esElegibleRenovacion ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {esElegibleRenovacion ? 'Elegible' : `Faltan ${renovacionRequerida - op.cuotasPagadas} cuotas`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* STEP 2: CREDIT PARAMETERS FORM */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-[#1E803B] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
              <Briefcase className="w-4 h-4" />
              Paso 2 - Parámetros del Crédito a Liquidar
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha de Otorgamiento</label>
                <input
                  type="date"
                  value={fechaOtorgamiento}
                  onChange={(e) => setFechaOtorgamiento(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Operación</label>
                <select
                  value={tipoOperacion}
                  onChange={(e) => setTipoOperacion(e.target.value as Operacion['tipoOperacion'])}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                >
                  <option value="NUEVO">Crédito Nuevo</option>
                  <option value="RENOVACION">Renovación Directa</option>
                  <option value="REESTRUCTURACION">Reestructuración de Saldo</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capital Solicitado / Entregado ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    step="1000"
                    min="1000"
                    value={capitalEntregado}
                    onChange={(e) => setCapitalEntregado(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Frecuencia de Amortización</label>
                <select
                  value={frecuencia}
                  onChange={(e) => setFrecuencia(e.target.value as FrecuenciaPago)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                >
                  <option value="DIARIA">Diario (Lunes a Sábado)</option>
                  <option value="SEMANAL">Semanal (Fijo semanal)</option>
                  <option value="QUINCENAL">Quincenal (Doble mes)</option>
                  <option value="MENSUAL">Mensual (Un pago por mes)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cantidad de Cuotas</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={cantidadCuotas}
                  onChange={(e) => setCantidadCuotas(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primer Vencimiento</label>
                <input
                  type="date"
                  value={primerVencimiento}
                  disabled={frecuencia === 'DIARIA'}
                  onChange={(e) => setPrimerVencimiento(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/15 ${
                    frecuencia === 'DIARIA' ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed' : 'bg-slate-50 border border-slate-200'
                  }`}
                />
              </div>
            </div>

            {/* Discounts / Promotions Sub-Section */}
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre Promoción (Opcional)</label>
                <input
                  type="text"
                  value={promocionAplicada}
                  onChange={(e) => setPromocionAplicada(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold placeholder:font-normal"
                  placeholder="Ej. BlackFriday, SocioOro"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descuento Directo (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={descuentoPorcentaje}
                  onChange={(e) => setDescuentoPorcentaje(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Motivo o Justificación</label>
                <input
                  type="text"
                  value={motivoPromocion}
                  onChange={(e) => setMotivoPromocion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  placeholder="Detalle el motivo comercial..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* SIDE COLUMN: REAL-TIME FINANCIAL SIMULATOR PREVIEW */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg space-y-5 sticky top-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2 border-b border-slate-800 pb-3">
              <RefreshCw className="w-4 h-4 animate-spin-slow text-emerald-400" />
              Simulador Técnico Financiero
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Tasa Pactada ({frecuencia})</span>
                <span className="font-mono text-white font-bold">{tasaMensual}%</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Período Estimado</span>
                <span className="font-mono text-white font-bold">{mesesFinanciados} {mesesFinanciados === 1 ? 'Mes' : 'Meses'}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-400">
                <span>Capital Base</span>
                <span className="font-mono text-white">${capitalEntregado.toLocaleString('es-ES')}</span>
              </div>
              {descuentoPorcentaje > 0 && (
                <div className="flex justify-between items-center text-[11px] text-rose-400">
                  <span>Dcto. Aplicado ({descuentoPorcentaje}%)</span>
                  <span className="font-mono font-bold">-{descuentoPorcentaje}%</span>
                </div>
              )}
              <hr className="border-slate-800" />
              <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-slate-300">Total a Retornar:</span>
                <span className="text-2xl font-black text-emerald-400 font-mono leading-none">${totalFinanciado.toLocaleString('es-ES')}</span>
              </div>
            </div>

            <div className="bg-slate-800/80 rounded-xl p-3.5 space-y-2.5 border border-slate-700/50">
              <div className="flex justify-between text-xs items-center">
                <span className="text-slate-400 font-medium">Valor por Cuota:</span>
                <strong className="text-white text-base font-mono">${valorCuota.toLocaleString('es-ES')}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-700/60 text-[10px] text-slate-400 font-mono">
                <div>Cap/Cuota: <span className="text-slate-200">${capitalPorCuota}</span></div>
                <div>Int/Cuota: <span className="text-slate-200">${interesPorCuota}</span></div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 space-y-2 bg-slate-800/30 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between">
                <span>Último Vencimiento:</span>
                <span className="text-slate-200 font-bold font-mono">{ultimoVencimiento || 'Al seleccionar cliente'}</span>
              </div>
              <div className="flex justify-between">
                <span>Renovación Disponible:</span>
                <span className="text-indigo-400 font-bold font-mono">{posibleFechaRenovacion || 'Al seleccionar cliente'}</span>
              </div>
            </div>

            {selectedCliente ? (
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleOpenConfirm}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl text-xs font-bold tracking-wider uppercase transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Proceder a Liquidación
                </button>
                <button
                  onClick={handleExportPDF}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
                >
                  <FileText className="w-4 h-4" />
                  Imprimir Convenio Fijo
                </button>
              </div>
            ) : (
              <div className="text-center p-3 bg-slate-800/40 rounded-xl border border-dashed border-slate-700 text-xs text-slate-500 font-medium italic">
                Cargue un cliente en el Paso 1 para habilitar el motor de liquidación activa y descargas contractuales.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* STEP 3: LIVE PREVIEW CALENDAR TABLE */}
      {selectedCliente && cuotasPreview.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3 animate-fadeIn">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-emerald-600" />
            Vista Previa de Calendario Automatizado ({cantidadCuotas} Cuotas simuladas)
          </h3>
          <p className="text-[11px] text-slate-400">
            El sistema ha calculado las fechas exactas omitiendo los días domingos y el listado global parametrizado de feriados o asuetos bancarios.
          </p>

          <div className="max-h-[300px] overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-100">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-wider sticky top-0 border-b border-slate-200">
                  <th className="p-3">Nº Cuota</th>
                  <th className="p-3">Fecha Vencimiento</th>
                  <th className="p-3 text-right">Monto Cuota</th>
                  <th className="p-3 text-right">Capital Fijo</th>
                  <th className="p-3 text-right">Interés Fijo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium font-mono">
                {cuotasPreview.map((cuo) => (
                  <tr key={cuo.numeroCuota} className="hover:bg-slate-50/70 transition-colors">
                    <th className="p-3 text-slate-400 font-bold">#{String(cuo.numeroCuota).padStart(2, '0')}</th>
                    <td className="p-3">{cuo.fechaVencimiento}</td>
                    <td className="p-3 text-right text-emerald-700 font-bold">${cuo.montoTotal.toLocaleString('es-ES')}</td>
                    <td className="p-3 text-right text-slate-500">${cuo.montoCapital.toLocaleString('es-ES')}</td>
                    <td className="p-3 text-right text-slate-500">${cuo.montoInteres.toLocaleString('es-ES')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRMATION OVERLAY MODAL */}
      {showConfirmModal && selectedCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Confirmar Otorgamiento de Crédito
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Valide la auditoría antes de impactar los libros contables del sistema.</p>
              </div>
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl space-y-3 text-xs text-slate-700">
              <div className="flex justify-between"><span className="text-slate-400">Beneficiario Titular:</span> <strong className="text-slate-900">{selectedCliente.nombre} {selectedCliente.apellido}</strong></div>
              <div className="flex justify-between"><span className="text-slate-400">DNI / ID Interno:</span> <strong className="font-mono">{selectedCliente.dni} / {selectedCliente.id}</strong></div>
              <div className="flex justify-between"><span className="text-slate-400">Capital Desembolsado:</span> <strong className="text-slate-900">${capitalEntregado.toLocaleString('es-ES')}</strong></div>
              <div className="flex justify-between"><span className="text-slate-400">Esquema / Cuotas:</span> <strong>{frecuencia} / {cantidadCuotas} Cuotas</strong></div>
              <div className="flex justify-between"><span className="text-slate-400">Valor de la Obligación:</span> <strong className="text-emerald-700 font-bold">${valorCuota.toLocaleString('es-ES')}</strong></div>
              <div className="flex justify-between border-t border-slate-200/60 pt-2"><span className="text-slate-400 font-bold">Total Financiado (Deuda total):</span> <strong className="text-slate-900 text-sm font-black">${totalFinanciado.toLocaleString('es-ES')}</strong></div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-2.5 items-start text-[11px] text-amber-900 font-medium">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Esta acción generará automáticamente las **{cantidadCuotas} obligaciones financieras** e indexará el crédito en el dashboard de cobranzas de campo para **{selectedCliente.analista || 'el cobrador asignado'}**.
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold tracking-wide transition-colors"
              >
                CANCELAR REVISIÓN
              </button>
              <button
                onClick={handleFinalConfirm}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold tracking-wide transition-colors shadow-md shadow-emerald-600/15"
              >
                AUTORIZAR Y EFECTUAR
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
