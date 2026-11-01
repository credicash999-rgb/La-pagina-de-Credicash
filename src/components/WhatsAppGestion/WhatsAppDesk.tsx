/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Cliente,
  Operacion,
  Cuota,
  Pago,
  Configuracion,
  Feriado,
  CompromisoPago,
  UsuarioRol,
  TransaccionTesoreria,
  FrecuenciaPago
} from '../../types';
import {
  consolidarDeudaOperacion,
  generarReporteMoraWhatsApp,
  obtenerNombreAnonimizado
} from '../../utils/moraCalculator';
import {
  sortCuotasByPaymentPriority,
  parseDateToTimestamp
} from '../../utils/cuotasGenerator';
import {
  MessageCircle,
  Send,
  Search,
  ShieldCheck,
  Eye,
  EyeOff,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Lock,
  FileText,
  RefreshCw,
  Phone,
  User,
  Copy,
  Check,
  Share2,
  CreditCard,
  Filter,
  Sparkles,
  ChevronRight,
  Info,
  X,
  SendHorizontal,
  Building,
  ClipboardList,
  MapPin,
  ExternalLink
} from 'lucide-react';

interface WhatsAppMessage {
  id: string;
  sender: 'OPERADOR' | 'CLIENTE' | 'SISTEMA_AUDITORIA';
  texto: string;
  hora: string;
  fecha: string;
  esNotaInterna?: boolean;
  esReciboOficial?: boolean;
  montoRecibo?: number;
  cuotasAfectadas?: string;
  saldoRestante?: number;
}

interface WhatsAppDeskProps {
  clientes: Cliente[];
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
  compromisosPago: CompromisoPago[];
  usuarios?: UsuarioRol[];
  activeUser: UsuarioRol | null;
  configuracion: Configuracion;
  feriados?: Feriado[];
  isAdmin: boolean;
  simularVistaOperador?: boolean;
  onToggleSimularOperador?: (simular: boolean) => void;
  onAddPago: (
    pago: Pago,
    updatedCuotasList: Cuota[],
    updatedOperacion: Operacion,
    tesoreriaTrx: TransaccionTesoreria
  ) => void;
  onAddCompromisoPago: (compromiso: CompromisoPago) => void;
  onUpdateCliente?: (cliente: Cliente) => void;
  onUpdateOperacion?: (operacion: Operacion) => void;
  onNavigateTo?: (tab: string) => void;
}

const CHAT_STORAGE_PREFIX = 'credicash_wa_chat_';

export const WhatsAppDesk: React.FC<WhatsAppDeskProps> = ({
  clientes,
  operaciones,
  cuotas,
  pagos,
  compromisosPago,
  usuarios = [],
  activeUser,
  configuracion,
  feriados = [],
  isAdmin,
  simularVistaOperador = false,
  onToggleSimularOperador,
  onAddPago,
  onAddCompromisoPago,
  onUpdateCliente,
  onUpdateOperacion,
  onNavigateTo
}) => {
  // Mode effective state: if user is admin and NOT in simulated operator mode
  const modoSuperAdminReal = isAdmin && !simularVistaOperador;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'VENCEN_HOY' | 'EN_MORA' | 'AL_DIA' | 'COMPROMISOS'>('TODOS');
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);

  // Selected operation ID for the client (allows toggling between Diario, Semanal, etc.)
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);

  // Active view pane in center/right on mobile or tabs: 'CHAT' | 'FICHA'
  const [mobileActivePane, setMobileActivePane] = useState<'CHAT' | 'FICHA'>('CHAT');

  // Action state (the EXACT previous actions from PagosView)
  const [activeAction, setActiveAction] = useState<'pago' | 'pago_parcial' | 'pago_adelantado' | 'no_pago' | 'promesa' | 'observaciones' | null>(null);
  const [prepaymentMode, setPrepaymentMode] = useState<'FINAL_ATRAS' | 'CONSECUTIVO_INMEDIATO'>('CONSECUTIVO_INMEDIATO');
  const [importeCobrado, setImporteCobrado] = useState<string>('');
  const [medioPago, setMedioPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO'>('TRANSFERENCIA');
  const [fechaPago, setFechaPago] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [observacionesInput, setObservacionesInput] = useState<string>('');
  const [promesaFecha, setPromesaFecha] = useState<string>('');
  const [esCobroEnCalle, setEsCobroEnCalle] = useState<boolean>(false);
  const [selectedCobradorId, setSelectedCobradorId] = useState<string>('');
  const [includeTotalInPDF, setIncludeTotalInPDF] = useState<boolean>(false);

  // Double confirmation modal state for payment registrations
  const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState<boolean>(false);

  // Modal for Debt & Mora consolidation
  const [showMoraModal, setShowMoraModal] = useState(false);

  // Chat conversation state
  const [chatMessages, setChatMessages] = useState<WhatsAppMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isNotaInternaMode, setIsNotaInternaMode] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Feedback notifications / toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedText(label);
    showToast(`Copiado al portapapeles: ${label}`);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Enriched clients calculation
  const enrichedClients = useMemo(() => {
    return clientes.map(c => {
      const clientOps = operaciones.filter(o => o.idCliente === c.id);
      const activeOp = clientOps.find(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA') || clientOps[0] || null;

      if (!activeOp) {
        return {
          cliente: c,
          activeOp: null,
          clientOps: [],
          estado: 'AL_DIA' as const,
          estadoLabel: 'Sin Crédito Activo',
          badgeColor: 'bg-slate-800 text-slate-300 border border-slate-700',
          diasMora: 0,
          moraTotal: 0,
          saldoTotal: 0
        };
      }

      const consolidacion = consolidarDeudaOperacion(activeOp, cuotas, configuracion, feriados, todayStr);
      const diasMora = consolidacion.maxDiasAtraso;
      const moraTotal = consolidacion.totalMoraAcumulada;
      const saldoTotal = consolidacion.totalConsolidado;

      const opCuotas = cuotas.filter(cu => cu.idOperacion === activeOp.id && cu.estado !== 'PAGADA');
      const proximaCuota = opCuotas.sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))[0] || null;

      const tieneCompromiso = compromisosPago.some(
        cp => cp.idCliente === c.id && cp.estado === 'PENDIENTE' && cp.fechaCompromiso >= todayStr
      );

      let estado: 'EN_MORA' | 'VENCE_HOY' | 'AL_DIA' | 'COMPROMISO' = 'AL_DIA';
      let estadoLabel = 'Al Día';
      let badgeColor = 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40';

      if (tieneCompromiso) {
        estado = 'COMPROMISO';
        estadoLabel = 'Compromiso Pactado';
        badgeColor = 'bg-sky-950 text-sky-300 border border-sky-600/50';
      } else if (diasMora > 0 || (proximaCuota && proximaCuota.fechaVencimiento < todayStr)) {
        estado = 'EN_MORA';
        estadoLabel = `En Mora (${diasMora}d)`;
        badgeColor = 'bg-rose-950 text-rose-300 border border-rose-600/50';
      } else if (proximaCuota && proximaCuota.fechaVencimiento === todayStr) {
        estado = 'VENCE_HOY';
        estadoLabel = 'Vence Hoy';
        badgeColor = 'bg-amber-950 text-amber-300 border border-amber-600/50';
      }

      return {
        cliente: c,
        activeOp,
        clientOps,
        estado,
        estadoLabel,
        badgeColor,
        diasMora,
        moraTotal,
        saldoTotal,
        consolidacion
      };
    });
  }, [clientes, operaciones, cuotas, compromisosPago, configuracion, feriados, todayStr]);

  // Filter clients based on search & filter tabs
  const filteredClients = useMemo(() => {
    return enrichedClients.filter(item => {
      const { cliente, activeOp, estado } = item;
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch =
        !q ||
        cliente.nombre.toLowerCase().includes(q) ||
        (cliente.apellido || '').toLowerCase().includes(q) ||
        cliente.id.toLowerCase().includes(q) ||
        (cliente.aliasAnonimo || '').toLowerCase().includes(q) ||
        (cliente.telefono || '').includes(q) ||
        (activeOp && activeOp.id.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filtroEstado === 'TODOS') return true;
      if (filtroEstado === 'VENCEN_HOY') return estado === 'VENCE_HOY';
      if (filtroEstado === 'EN_MORA') return estado === 'EN_MORA';
      if (filtroEstado === 'AL_DIA') return estado === 'AL_DIA';
      if (filtroEstado === 'COMPROMISOS') return estado === 'COMPROMISO';

      return true;
    });
  }, [enrichedClients, searchQuery, filtroEstado]);

  // Auto-select first client
  useEffect(() => {
    if (!selectedClienteId && filteredClients.length > 0) {
      setSelectedClienteId(filteredClients[0].cliente.id);
    }
  }, [filteredClients, selectedClienteId]);

  // Currently selected client and summary
  const currentSelection = useMemo(() => {
    if (!selectedClienteId) return null;
    return enrichedClients.find(i => i.cliente.id === selectedClienteId) || null;
  }, [selectedClienteId, enrichedClients]);

  // Current client operations list
  const currentClientOps = useMemo(() => {
    if (!currentSelection) return [];
    return operaciones.filter(o => o.idCliente === currentSelection.cliente.id);
  }, [currentSelection, operaciones]);

  // Currently active selected operation (diario, semanal, etc.)
  const selectedOp = useMemo<Operacion | null>(() => {
    if (!currentClientOps || currentClientOps.length === 0) return null;
    if (selectedOpId) {
      const found = currentClientOps.find(o => o.id === selectedOpId);
      if (found) return found;
    }
    return currentClientOps.find(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA') || currentClientOps[0] || null;
  }, [currentClientOps, selectedOpId]);

  // When client changes, reset selected operation and action
  useEffect(() => {
    if (currentClientOps.length > 0) {
      const active = currentClientOps.find(o => o.estado === 'ACTIVA' || o.estado === 'VENCIDA') || currentClientOps[0];
      setSelectedOpId(active.id);
    } else {
      setSelectedOpId(null);
    }
    setActiveAction(null);
    setShowPaymentConfirmModal(false);
  }, [selectedClienteId]);

  // Chat message loading & persistence
  useEffect(() => {
    if (!selectedClienteId) return;

    const storageKey = `${CHAT_STORAGE_PREFIX}${selectedClienteId}`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        setChatMessages(JSON.parse(stored));
        return;
      } catch (e) {
        console.error('Error reading chat messages from storage', e);
      }
    }

    const cItem = currentSelection;
    if (!cItem) return;

    const clientName = modoSuperAdminReal ? cItem.cliente.nombre : obtenerNombreAnonimizado(cItem.cliente);
    const cbu = configuracion.cbuOficial || '0170099220000049281729';
    const alias = configuracion.aliasOficial || 'FINANCIERA.COBROS.OFICIAL';

    const defaultSeed: WhatsAppMessage[] = [
      {
        id: `MSG-INIT-1-${Date.now()}`,
        sender: 'OPERADOR',
        texto: `Hola ${clientName}, te escribimos de CrediCash Cobranzas Oficial. Recordá que podés abonar tus cuotas por transferencia oficial a nuestro Alias: ${alias} o CBU: ${cbu}. ¡Estamos para ayudarte!`,
        hora: '09:15',
        fecha: todayStr,
      }
    ];

    if (cItem.estado === 'EN_MORA') {
      defaultSeed.push({
        id: `MSG-INIT-2-${Date.now()}`,
        sender: 'CLIENTE',
        texto: 'Hola, disculpen la demora, tuve un problema con la acreditación de mi sueldo. ¿Cuánto sería el total para cancelar hoy?',
        hora: '10:40',
        fecha: todayStr,
      });
      defaultSeed.push({
        id: `MSG-INIT-3-${Date.now()}`,
        sender: 'SISTEMA_AUDITORIA',
        texto: `🔒 NOTA INTERNA DE AUDITORÍA: Cliente en mora (${cItem.diasMora} días). Consultó saldo. Por política, exija comprobante bancario antes de imputar el pago.`,
        hora: '10:41',
        fecha: todayStr,
        esNotaInterna: true
      });
    } else if (cItem.estado === 'VENCE_HOY') {
      defaultSeed.push({
        id: `MSG-INIT-2-${Date.now()}`,
        sender: 'OPERADOR',
        texto: `Hola ${clientName}, te recordamos que hoy vence la cuota de tu crédito ${selectedOp?.id || ''}. Monto: $${(selectedOp?.valorCuota || 0).toLocaleString('es-AR')}.`,
        hora: '11:05',
        fecha: todayStr,
      });
      defaultSeed.push({
        id: `MSG-INIT-3-${Date.now()}`,
        sender: 'CLIENTE',
        texto: 'Hola! Sí, ya tengo el dinero listo, después de las 14 hs les hago la transferencia y les paso el comprobante por acá.',
        hora: '11:22',
        fecha: todayStr,
      });
    } else {
      defaultSeed.push({
        id: `MSG-INIT-2-${Date.now()}`,
        sender: 'CLIENTE',
        texto: 'Buen día! ¿Cuántas cuotas me quedan para terminar de pagar y renovar mi crédito?',
        hora: '10:15',
        fecha: todayStr,
      });
    }

    setChatMessages(defaultSeed);
    localStorage.setItem(storageKey, JSON.stringify(defaultSeed));
  }, [selectedClienteId, selectedOpId, modoSuperAdminReal, todayStr, configuracion]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const persistMessages = (msgs: WhatsAppMessage[]) => {
    if (!selectedClienteId) return;
    setChatMessages(msgs);
    localStorage.setItem(`${CHAT_STORAGE_PREFIX}${selectedClienteId}`, JSON.stringify(msgs));
  };

  // Send message
  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedClienteId) return;

    const time = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const newMsg: WhatsAppMessage = {
      id: `MSG-${Date.now()}`,
      sender: isNotaInternaMode ? 'SISTEMA_AUDITORIA' : 'OPERADOR',
      texto: inputText.trim(),
      hora: time,
      fecha: todayStr,
      esNotaInterna: isNotaInternaMode
    };

    const updated = [...chatMessages, newMsg];
    persistMessages(updated);
    setInputText('');
    setIsNotaInternaMode(false);
  };

  // Quick insertion templates
  const handleApplyTemplate = (templateType: 'RECORDATORIO' | 'MORA' | 'CBU' | 'RENOVACION' | 'COMPROMISO') => {
    if (!currentSelection) return;
    const { cliente, consolidacion, diasMora } = currentSelection;
    const clientName = modoSuperAdminReal ? cliente.nombre : obtenerNombreAnonimizado(cliente);
    const cbu = configuracion.cbuOficial || '0170099220000049281729';
    const alias = configuracion.aliasOficial || 'FINANCIERA.COBROS.OFICIAL';

    let text = '';
    if (templateType === 'RECORDATORIO') {
      const cuotaNum = selectedOp ? selectedOp.cuotasPagadas + 1 : 1;
      const monto = selectedOp ? selectedOp.valorCuota : 0;
      text = `Hola ${clientName}, te recordamos desde CrediCash que hoy vence tu cuota #${cuotaNum} de $${monto.toLocaleString('es-AR')}.\n\nPodés transferir a:\n• Alias: ${alias}\n• CBU: ${cbu}\n\nPor favor, envianos el comprobante por acá una vez realizado. ¡Muchas gracias!`;
    } else if (templateType === 'MORA') {
      const moraAcumulada = consolidacion?.totalMoraAcumulada || 0;
      const total = consolidacion?.totalConsolidado || 0;
      text = `⚠️ *AVISO IMPORTANTE DE MORA - CREDICASH*\nEstimado/a ${clientName}, su crédito ${selectedOp?.id} registra ${diasMora} días hábiles de atraso.\n\n• Capital pendiente: $${(consolidacion?.totalCapitalImpago || 0).toLocaleString('es-AR')}\n• Interés de mora acumulado: $${moraAcumulada.toLocaleString('es-AR')}\n• *Total a liquidar:* $${total.toLocaleString('es-AR')}\n\nEvite recargos adicionales transfiriendo hoy a:\nAlias: ${alias}\nCBU: ${cbu}\n\nEnvíe el comprobante a la brevedad.`;
    } else if (templateType === 'CBU') {
      text = `🏛️ *DATOS OFICIALES PARA TRANSFERENCIA (CREDICASH)*\n• Titular: CrediCash Cobranzas Oficial\n• CBU: *${cbu}*\n• Alias: *${alias}*\n\nUna vez efectuada la transferencia, responda este mensaje adjuntando el comprobante para acreditar su pago en el sistema de inmediato.`;
    } else if (templateType === 'RENOVACION') {
      const cuotasRestantes = selectedOp ? selectedOp.cantidadCuotas - selectedOp.cuotasPagadas : 0;
      text = `⭐ *ESTADO DE CRÉDITO Y RENOVACIÓN - CREDICASH*\nHola ${clientName}, tu estado de cuenta es excelente. Te restan solo ${cuotasRestantes} cuotas para finalizar tu préstamo ${selectedOp?.id}.\n\nAl completar el saldo pendiente o cancelar anticipadamente, tu perfil califica automáticamente para una ampliación de capital con tasa preferencial. ¿Querés que simulemos tu nuevo cupo?`;
    } else if (templateType === 'COMPROMISO') {
      text = `🤝 *CONFIRMACIÓN DE COMPROMISO DE PAGO*\nHola ${clientName}, registramos en nuestro sistema tu compromiso de pago para el día acordado. Esperamos tu comprobante en esa fecha para mantener tu cuenta regularizada.`;
    }

    setInputText(text);
  };

  // Trigger form submit (validates and opens secondary confirmation modal)
  const handleActionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOp) return;

    if (activeAction === 'pago' || activeAction === 'pago_parcial' || activeAction === 'pago_adelantado') {
      const valor = parseFloat(importeCobrado);
      if (isNaN(valor) || valor <= 0) {
        alert('Por favor ingrese un importe válido mayor a cero.');
        return;
      }
      if (valor > selectedOp.totalPendiente) {
        if (!confirm(`El monto cobrado ($${valor.toLocaleString('es-AR')}) supera la deuda total pendiente ($${selectedOp.totalPendiente.toLocaleString('es-AR')}). ¿Desea continuar de todas formas?`)) {
          return;
        }
      }
      setShowPaymentConfirmModal(true);
      return;
    }

    if (activeAction === 'no_pago') {
      const loggedInUserName = activeUser?.nombre || 'Operador WhatsApp';
      const logMsg = `[REGISTRO NO PAGO - ${todayStr} por ${loggedInUserName}]: Cliente contactado. Motivo: ${observacionesInput || 'No especificado'}`;
      const updatedOp = { ...selectedOp, observaciones: selectedOp.observaciones ? `${selectedOp.observaciones}\n${logMsg}` : logMsg };

      const nuevoPago: Pago = {
        id: `LOG-NP-${Date.now().toString().slice(-4)}`,
        idOperacion: selectedOp.id,
        idCliente: selectedOp.idCliente,
        nombreCliente: selectedOp.nombreCliente,
        fechaPago: todayStr,
        horaPago: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        importe: 0,
        cobrador: loggedInUserName,
        metodoPago: 'EFECTIVO',
        modalidad: 'PAGO_REGULAR',
        cuotasAfectadas: 'Sin cuotas (Registro de no pago)',
        observaciones: logMsg,
      };

      const trxTesoreria: TransaccionTesoreria = {
        id: `TRX-${Date.now()}`,
        fecha: todayStr,
        tipo: 'INGRESO',
        concepto: `Intento de Cobranza (Sin Pago) - Crédito N° ${selectedOp.id}`,
        monto: 0,
        referenciaId: nuevoPago.id,
      };

      onAddPago(nuevoPago, [], updatedOp, trxTesoreria);

      const auditMsg: WhatsAppMessage = {
        id: `AUDIT-NP-${Date.now()}`,
        sender: 'SISTEMA_AUDITORIA',
        texto: `❌ REGISTRO DE NO PAGO: Cliente contactado. Motivo: ${observacionesInput || 'Sin especificar'}. Registrado por ${loggedInUserName}.`,
        hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        fecha: todayStr,
        esNotaInterna: true
      };

      persistMessages([...chatMessages, auditMsg]);
      setActiveAction(null);
      setObservacionesInput('');
      showToast('Registro de No Pago guardado en historial');
      return;
    }

    if (activeAction === 'promesa') {
      if (!promesaFecha) {
        alert('Por favor seleccione la fecha comprometida de pago.');
        return;
      }

      const loggedInUserName = activeUser?.nombre || 'Operador WhatsApp';
      const logMsg = `[PROMESA DE PAGO - Creada el ${todayStr} por ${loggedInUserName}]: Prometió abonar el día ${promesaFecha}. Detalle: ${observacionesInput}`;
      const updatedOp = { ...selectedOp, observaciones: selectedOp.observaciones ? `${selectedOp.observaciones}\n${logMsg}` : logMsg };

      const nuevoCompromiso: CompromisoPago = {
        id: `CP-${Date.now()}`,
        idCliente: selectedOp.idCliente,
        nombreCliente: selectedOp.nombreCliente,
        dniCliente: currentSelection?.cliente.dni || '',
        idOperacion: selectedOp.id,
        fechaCompromiso: promesaFecha,
        montoComprometido: selectedOp.valorCuota,
        finalidad: 'REFINANCIACION',
        mesaGestion: 'GESTION DIARIA',
        estado: 'PENDIENTE',
        observaciones: logMsg,
        usuarioRegistro: loggedInUserName,
        fechaHoraRegistro: new Date().toISOString()
      };

      onAddCompromisoPago(nuevoCompromiso);

      const clientDisplayName = modoSuperAdminReal ? currentSelection?.cliente.nombre : obtenerNombreAnonimizado(currentSelection?.cliente || { id: selectedOp.idCliente, nombre: selectedOp.nombreCliente } as any);
      const confirmMessageText = `🤝 *COMPROMISO DE PAGO AGENDADO*\nHola ${clientDisplayName}, dejamos agendado en el sistema tu compromiso para abonar el día *${promesaFecha}*.\n\nPor favor, apenas realices la transferencia envianos el comprobante por acá para mantener tu cuenta al día. ¡Muchas gracias!`;

      const chatConfirmMsg: WhatsAppMessage = {
        id: `CP-MSG-${Date.now()}`,
        sender: 'OPERADOR',
        texto: confirmMessageText,
        hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        fecha: todayStr
      };

      const auditNoteMsg: WhatsAppMessage = {
        id: `CP-AUDIT-${Date.now()}`,
        sender: 'SISTEMA_AUDITORIA',
        texto: `🔒 NOTA DE AUDITORÍA: Compromiso agendado para el ${promesaFecha}. ${observacionesInput || ''}. Operador: ${loggedInUserName}.`,
        hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        fecha: todayStr,
        esNotaInterna: true
      };

      persistMessages([...chatMessages, chatConfirmMsg, auditNoteMsg]);
      setActiveAction(null);
      setPromesaFecha('');
      setObservacionesInput('');
      showToast(`Compromiso agendado para el ${promesaFecha}`);
      return;
    }

    if (activeAction === 'observaciones') {
      const loggedInUserName = activeUser?.nombre || 'Operador WhatsApp';
      const logMsg = `[OBSERVACIÓN - ${todayStr} por ${loggedInUserName}]: ${observacionesInput}`;
      const updatedOp = { ...selectedOp, observaciones: selectedOp.observaciones ? `${selectedOp.observaciones}\n${logMsg}` : logMsg };

      const auditMsg: WhatsAppMessage = {
        id: `AUDIT-OBS-${Date.now()}`,
        sender: 'SISTEMA_AUDITORIA',
        texto: `🔒 OBSERVACIÓN DE GESTIÓN: ${observacionesInput}. Operador: ${loggedInUserName}.`,
        hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        fecha: todayStr,
        esNotaInterna: true
      };

      persistMessages([...chatMessages, auditMsg]);
      if (onUpdateOperacion) onUpdateOperacion(updatedOp);
      setActiveAction(null);
      setObservacionesInput('');
      showToast('Observación guardada en auditoría');
    }
  };

  // CONFIRM AND EXECUTE PAYMENT REGISTRATION (Exact accounting logic from PagosView)
  const handleConfirmActionExecution = () => {
    if (!selectedOp) return;

    const valorCobrado = parseFloat(importeCobrado);
    const effectiveFecha = fechaPago || todayStr;
    const loggedInUserName = activeUser?.nombre || 'Operador WhatsApp';

    let modality: 'PAGO_REGULAR' | 'PAGO_PARCIAL' | 'PAGO_ADELANTADO_OPCION_A' | 'PAGO_ADELANTADO_OPCION_B' = 'PAGO_REGULAR';
    if (activeAction === 'pago_parcial') {
      modality = 'PAGO_PARCIAL';
    } else if (activeAction === 'pago_adelantado') {
      modality = prepaymentMode === 'FINAL_ATRAS' ? 'PAGO_ADELANTADO_OPCION_A' : 'PAGO_ADELANTADO_OPCION_B';
    }

    const targetOpIdStr = String(selectedOp.id).trim();
    const opCuotas = cuotas.filter(c => String(c.idOperacion).trim() === targetOpIdStr);
    const cuotasSorted = sortCuotasByPaymentPriority(opCuotas, effectiveFecha, modality);

    let remainingPayment = valorCobrado;
    const affectedCuotaNumbers: number[] = [];
    const updatedCuotas: Cuota[] = [];

    for (const c of cuotasSorted) {
      if (c.estado === 'PAGADA' || remainingPayment <= 0) continue;

      const cuotaCurrentBalance = c.saldoPendiente !== undefined ? c.saldoPendiente : c.valorTotalCuota;

      if (remainingPayment >= cuotaCurrentBalance) {
        remainingPayment -= cuotaCurrentBalance;
        affectedCuotaNumbers.push(c.numeroCuota);
        updatedCuotas.push({
          ...c,
          estado: 'PAGADA',
          saldoPendiente: 0,
          fechaPago: effectiveFecha,
          importePagado: c.valorTotalCuota
        });
      } else {
        const newBalance = Math.max(0, cuotaCurrentBalance - remainingPayment);
        remainingPayment = 0;
        affectedCuotaNumbers.push(c.numeroCuota);
        updatedCuotas.push({
          ...c,
          estado: 'PAGO_PARCIAL',
          saldoPendiente: newBalance,
          fechaPago: effectiveFecha,
          importePagado: (c.valorTotalCuota - newBalance)
        });
      }
    }

    // Merge updated cuotas with all cuotas of operation
    const allUpdatedCuotas = opCuotas.map(c => {
      const match = updatedCuotas.find(uc => uc.id === c.id);
      return match || c;
    });

    const isFullyPaid = allUpdatedCuotas.every(c => c.estado === 'PAGADA');
    const totalPagadoSum = (selectedOp.totalCobrado || 0) + valorCobrado;
    const totalPendienteNew = Math.max(0, (selectedOp.totalPendiente || selectedOp.montoTotal) - valorCobrado);
    const cuotasPagadasCount = allUpdatedCuotas.filter(c => c.estado === 'PAGADA').length;
    const cuotasPendientesCount = allUpdatedCuotas.filter(c => c.estado !== 'PAGADA').length;

    const nextPendingCuota = allUpdatedCuotas
      .filter(c => c.estado !== 'PAGADA')
      .sort((a, b) => a.fechaVencimiento.localeCompare(b.fechaVencimiento))[0];

    const paymentMsg = `[PAGO REGISTRADO - ${effectiveFecha}]: Abonó $${valorCobrado.toLocaleString('es-ES')} (${medioPago} - ${modality}). Cobrado por: ${loggedInUserName}. Cuotas: ${affectedCuotaNumbers.join(', ')}.`;
    const updatedObservaciones = selectedOp.observaciones ? `${selectedOp.observaciones}\n${paymentMsg}` : paymentMsg;

    const updatedOp: Operacion = {
      ...selectedOp,
      totalCobrado: totalPagadoSum,
      totalPendiente: totalPendienteNew,
      cuotasPagadas: cuotasPagadasCount,
      cuotasPendientes: cuotasPendientesCount,
      estado: isFullyPaid ? 'FINALIZADA' : selectedOp.estado,
      proximoVencimiento: nextPendingCuota ? nextPendingCuota.fechaVencimiento : effectiveFecha,
      diasMora: isFullyPaid ? 0 : selectedOp.diasMora,
      observaciones: updatedObservaciones
    };

    const formattedTime = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const cuotasAfectadasText = affectedCuotaNumbers.length > 0
      ? `Cuotas N° ${affectedCuotaNumbers.sort((a, b) => a - b).join(', ')}`
      : 'Sin cuotas';

    const cobradorSeleccionado = esCobroEnCalle && selectedCobradorId
      ? (usuarios.find(u => u.id === selectedCobradorId)?.nombre || loggedInUserName)
      : loggedInUserName;

    // Create system payment record
    const nuevoPago: Pago = {
      id: `PAG-${Date.now().toString().slice(-6)}`,
      idOperacion: selectedOp.id,
      idCliente: selectedOp.idCliente,
      nombreCliente: selectedOp.nombreCliente,
      fechaPago: effectiveFecha,
      horaPago: formattedTime,
      importe: valorCobrado,
      cobrador: cobradorSeleccionado,
      metodoPago: medioPago,
      modalidad: modality,
      cuotasAfectadas: cuotasAfectadasText,
      observaciones: esCobroEnCalle
        ? `[Cobro en Calle por ${cobradorSeleccionado} - Comisión Aplicable] ${observacionesInput}`
        : observacionesInput,
    };

    // Create Treasury record
    const trxTesoreria: TransaccionTesoreria = {
      id: `TRX-${Date.now()}`,
      fecha: effectiveFecha,
      tipo: 'INGRESO',
      concepto: `Cobranza de Crédito N° ${selectedOp.id} - ${selectedOp.nombreCliente} (${medioPago} - ${modality})`,
      monto: valorCobrado,
      referenciaId: nuevoPago.id,
    };

    // Fire update to main system state
    onAddPago(nuevoPago, updatedCuotas, updatedOp, trxTesoreria);

    // AUTOMATICALLY SHOOT OFFICIAL WHATSAPP RECEIPT IN CHAT FEED
    const clientDisplayName = modoSuperAdminReal
      ? currentSelection?.cliente.nombre
      : obtenerNombreAnonimizado(currentSelection?.cliente || { id: selectedOp.idCliente, nombre: selectedOp.nombreCliente } as any);

    const receiptText = `🧾 *COMPROBANTE OFICIAL DE PAGO - CREDICASH*
Estimado/a *${clientDisplayName}*, confirmamos la acreditación de su pago en el sistema:

✅ *Importe acreditado:* $${valorCobrado.toLocaleString('es-AR')}
📋 *Crédito:* ${selectedOp.id} (${selectedOp.frecuencia})
📌 *Imputación:* ${cuotasAfectadasText}
💳 *Medio de pago:* ${medioPago}
📅 *Fecha y hora:* ${effectiveFecha} - ${formattedTime}
📊 *Nuevo saldo restante:* $${totalPendienteNew.toLocaleString('es-AR')}
${isFullyPaid ? '\n🎉 *¡FELICITACIONES! Su crédito ha sido completamente CANCELADO. Ya califica para su renovación inmediata.*' : `🗓️ *Próximo vencimiento:* ${updatedOp.proximoVencimiento}`}

_Operador: ${loggedInUserName} | Sistema Maestro CrediCash_`;

    const receiptMessage: WhatsAppMessage = {
      id: `RECEIPT-${Date.now()}`,
      sender: 'OPERADOR',
      texto: receiptText,
      hora: formattedTime,
      fecha: todayStr,
      esReciboOficial: true,
      montoRecibo: valorCobrado,
      cuotasAfectadas: cuotasAfectadasText,
      saldoRestante: totalPendienteNew
    };

    const auditNoteMessage: WhatsAppMessage = {
      id: `AUDIT-${Date.now()}`,
      sender: 'SISTEMA_AUDITORIA',
      texto: `🔒 NOTA DE AUDITORÍA: Cobro asentado contablemente por $${valorCobrado.toLocaleString('es-AR')} (${medioPago} - ${modality}). Saldo anterior: $${selectedOp.totalPendiente.toLocaleString('es-AR')} -> Nuevo saldo: $${totalPendienteNew.toLocaleString('es-AR')}. Imputado por ${loggedInUserName}.`,
      hora: formattedTime,
      fecha: todayStr,
      esNotaInterna: true
    };

    persistMessages([...chatMessages, receiptMessage, auditNoteMessage]);

    // Dispatch webhook to CRM server
    triggerCrmWebhook(selectedOp.idCliente, 'acreditacion_pago', valorCobrado, nuevoPago.id);

    // Clean up
    setShowPaymentConfirmModal(false);
    setActiveAction(null);
    setImporteCobrado('');
    setObservacionesInput('');
    showToast(`✅ Pago de $${valorCobrado.toLocaleString('es-AR')} registrado con éxito e insertado en WhatsApp`);
  };

  // SEND WEBHOOK TO CRM
  const triggerCrmWebhook = async (clienteId: string, tipo: string = 'acreditacion_pago', monto?: number, referencia?: string) => {
    setIsSendingWebhook(true);
    const targetUrl = configuracion.crmWebhookUrl || '/api/enviar-mensaje-oficial';

    try {
      await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId,
          tipo,
          monto,
          referencia,
          operador: activeUser?.nombre || 'Operador Central',
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      console.warn('Webhook dispatch caught:', e);
    } finally {
      setIsSendingWebhook(false);
    }
  };

  // Export Amortization Schedule to PDF (Exact implementation from PagosView)
  const handleExportPDF = (op: Operacion, includeTotalSaldo: boolean = false) => {
    const opCuotas = cuotas.filter(c => c.idOperacion === op.id).sort((a, b) => a.numeroCuota - b.numeroCuota);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor permita las ventanas emergentes para descargar el PDF.');
      return;
    }

    const htmlContent = `
      <html>
      <head>
        <title>Estado de Cuenta y Cronograma - ${op.nombreCliente}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; margin: 0; background-color: #fff; }
          .header-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
          .brand-name { font-size: 24px; font-weight: 800; color: #0B4B27; text-transform: uppercase; }
          .doc-title { text-align: right; font-size: 14px; color: #64748b; font-weight: 600; }
          .divider { height: 2px; background: #e2e8f0; margin: 15px 0; }
          .table-cuotas { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
          .table-cuotas th { background: #0B4B27; color: #fff; padding: 10px; text-align: left; }
          .table-cuotas td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          .badge-pagada { color: #166534; font-weight: 700; }
          .badge-vencida { color: #991b1b; font-weight: 700; }
          .badge-pendiente { color: #475569; font-weight: 600; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td>
              <div class="brand-name">CrediCash</div>
              <div style="font-size: 12px; color: #64748b;">Sistema Maestro de Microcréditos</div>
            </td>
            <td class="doc-title">
              <div>ESTADO DE CUENTA Y AMORTIZACIÓN</div>
              <div style="font-size: 11px; margin-top: 4px;">Fecha de emisión: ${todayStr}</div>
            </td>
          </tr>
        </table>
        <div class="divider"></div>
        <div style="margin-bottom: 20px;">
          <strong>Cliente:</strong> ${modoSuperAdminReal ? op.nombreCliente : obtenerNombreAnonimizado(currentSelection?.cliente || { id: op.idCliente, nombre: op.nombreCliente } as any)}<br/>
          <strong>Préstamo ID:</strong> ${op.id} (${op.frecuencia})<br/>
          <strong>Monto Total:</strong> $${(op.totalFinanciado || op.capitalEntregado).toLocaleString('es-AR')}<br/>
          <strong>Saldo Pendiente:</strong> $${op.totalPendiente.toLocaleString('es-AR')}
        </div>
        <table class="table-cuotas">
          <thead>
            <tr>
              <th># Cuota</th>
              <th>Fecha Vencimiento</th>
              <th>Valor Cuota</th>
              <th>Saldo Pendiente</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${opCuotas.map(c => `
              <tr>
                <td>Cuota ${c.numeroCuota}</td>
                <td>${c.fechaVencimiento}</td>
                <td>$${c.valorTotalCuota.toLocaleString('es-AR')}</td>
                <td>$${(c.saldoPendiente || 0).toLocaleString('es-AR')}</td>
                <td class="${c.estado === 'PAGADA' ? 'badge-pagada' : c.fechaVencimiento < todayStr ? 'badge-vencida' : 'badge-pendiente'}">
                  ${c.estado}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Mora calculation breakdown
  const moraConsolidacion = useMemo(() => {
    if (!selectedOp) return null;
    return consolidarDeudaOperacion(selectedOp, cuotas, configuracion, feriados, todayStr);
  }, [selectedOp, cuotas, configuracion, feriados, todayStr]);

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)] bg-[#0b141a] text-slate-100 font-sans select-none overflow-hidden border border-slate-800 rounded-xl shadow-2xl">
      {/* DESK HEADER WITH SUPERADMIN SIMULATION TOGGLE */}
      <div className="h-14 bg-[#111b21] border-b border-[#222d34] flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center text-slate-950 shadow-md">
            <MessageCircle className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm tracking-wide text-slate-100">
                Gestión WhatsApp Web Empresarial
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#005c4b] text-[#25d366] border border-[#00a884]/40">
                DESCENTRALIZADO
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Operador activo:{' '}
              <strong className="text-emerald-400">{activeUser?.nombre || 'Operador Remoto'}</strong>{' '}
              ({simularVistaOperador ? 'OPERADOR SIMULADO' : activeUser?.rolId || 'OPERADOR'})
            </p>
          </div>
        </div>

        {/* Superadmin View Switcher */}
        <div className="flex items-center gap-2.5">
          {isAdmin && (
            <div className="flex items-center gap-2 bg-[#202c33] px-2.5 py-1 rounded-lg border border-[#2a3942]">
              <span className="text-[11px] font-semibold text-slate-300">Modo de Vista:</span>
              <button
                onClick={() => {
                  if (onToggleSimularOperador) {
                    onToggleSimularOperador(!simularVistaOperador);
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  modoSuperAdminReal
                    ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/50 shadow-sm'
                    : 'bg-[#00a884] text-slate-950 font-bold'
                }`}
                title={
                  modoSuperAdminReal
                    ? 'Viendo datos reales completos como Superadministrador'
                    : 'Simulando vista protegida/anónima del Operador de WhatsApp (Dashboard oculto)'
                }
              >
                {modoSuperAdminReal ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>🛡️ Superadmin (Datos Reales)</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>👁️ Operador (Datos Protegidos)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Toggle between Chat and Ficha on mobile */}
          <div className="flex lg:hidden bg-[#202c33] p-0.5 rounded-lg border border-[#2a3942]">
            <button
              onClick={() => setMobileActivePane('CHAT')}
              className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer ${
                mobileActivePane === 'CHAT' ? 'bg-[#00a884] text-slate-950' : 'text-slate-300'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setMobileActivePane('FICHA')}
              className={`px-2.5 py-1 text-xs font-bold rounded cursor-pointer ${
                mobileActivePane === 'FICHA' ? 'bg-emerald-600 text-white' : 'text-slate-300'
              }`}
            >
              Ficha
            </button>
          </div>

          {/* Toggle right Ficha panel on desktop */}
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              showRightPanel
                ? 'bg-emerald-700 text-white border-emerald-500'
                : 'bg-[#202c33] text-slate-300 border-[#2a3942] hover:text-white'
            }`}
            title="Mostrar / Ocultar Ficha del Cliente"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-300" />
            <span>Ficha del Cliente</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER: 3 COLUMNS */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLUMN 1: CLIENT LIST (LEFT) */}
        <div className="w-72 md:w-80 bg-[#111b21] border-r border-[#222d34] flex flex-col shrink-0">
          {/* Search box */}
          <div className="p-2.5 border-b border-[#222d34] bg-[#111b21]">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar cliente, alias o código..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#202c33] text-slate-100 placeholder-slate-400 pl-9 pr-8 py-2 rounded-lg text-xs focus:outline-hidden focus:ring-1 focus:ring-[#00a884] border border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-1 text-[11px] font-semibold no-scrollbar">
              <button
                onClick={() => setFiltroEstado('TODOS')}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                  filtroEstado === 'TODOS'
                    ? 'bg-[#00a884] text-slate-950 font-bold'
                    : 'bg-[#202c33] text-slate-300 hover:bg-[#2a3942]'
                }`}
              >
                Todos ({enrichedClients.length})
              </button>
              <button
                onClick={() => setFiltroEstado('VENCEN_HOY')}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                  filtroEstado === 'VENCEN_HOY'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-[#202c33] text-amber-300 hover:bg-[#2a3942]'
                }`}
              >
                Vencen Hoy
              </button>
              <button
                onClick={() => setFiltroEstado('EN_MORA')}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                  filtroEstado === 'EN_MORA'
                    ? 'bg-rose-600 text-white font-bold'
                    : 'bg-[#202c33] text-rose-300 hover:bg-[#2a3942]'
                }`}
              >
                En Mora
              </button>
              <button
                onClick={() => setFiltroEstado('COMPROMISOS')}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                  filtroEstado === 'COMPROMISOS'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'bg-[#202c33] text-sky-300 hover:bg-[#2a3942]'
                }`}
              >
                Compromisos
              </button>
            </div>
          </div>

          {/* List of contacts */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#222d34]/60">
            {filteredClients.map(item => {
              const { cliente, activeOp, estado, estadoLabel, badgeColor, saldoTotal } = item;
              const isSelected = selectedClienteId === cliente.id;
              const displayName = modoSuperAdminReal
                ? `${cliente.nombre} ${cliente.apellido || ''}`.trim()
                : obtenerNombreAnonimizado(cliente);

              return (
                <button
                  key={cliente.id}
                  onClick={() => setSelectedClienteId(cliente.id)}
                  className={`w-full text-left p-3 flex items-start gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#2a3942] border-l-4 border-[#00a884]'
                      : 'hover:bg-[#202c33] bg-[#111b21]'
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-800 to-teal-900 border border-emerald-600/40 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                      {displayName.slice(0, 2).toUpperCase()}
                    </div>
                    {estado === 'EN_MORA' && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 border-2 border-[#111b21] rounded-full" />
                    )}
                    {estado === 'VENCE_HOY' && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 border-2 border-[#111b21] rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100 truncate">
                        {displayName}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1 shrink-0">
                        {activeOp ? `Cuota ${activeOp.cuotasPagadas + 1}/${activeOp.cantidadCuotas}` : 'Sin op.'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] text-slate-400 truncate">
                        {activeOp ? `${activeOp.id} • $${saldoTotal.toLocaleString('es-AR')}` : 'Histórico'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${badgeColor}`}>
                        {estadoLabel}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: CENTER WHATSAPP CHAT */}
        <div
          className={`flex-1 bg-[#0b141a] flex-col min-w-0 relative ${
            mobileActivePane === 'CHAT' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {currentSelection ? (
            <>
              {/* CHAT HEADER WITH LOAN SELECTOR AND ACTION BUTTONS */}
              <div className="bg-[#202c33] border-b border-[#2a3942] px-4 py-2 flex flex-col gap-2 shrink-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-800 border border-emerald-600/40 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(modoSuperAdminReal
                        ? currentSelection.cliente.nombre
                        : obtenerNombreAnonimizado(currentSelection.cliente)
                      ).slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-100 truncate">
                          {modoSuperAdminReal
                            ? `${currentSelection.cliente.nombre} ${currentSelection.cliente.apellido || ''}`.trim()
                            : obtenerNombreAnonimizado(currentSelection.cliente)}
                        </h3>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#111b21] text-emerald-400 border border-[#2a3942]">
                          {currentSelection.cliente.id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        {modoSuperAdminReal ? (
                          <span>📞 {currentSelection.cliente.telefono || 'Sin teléfono'}</span>
                        ) : (
                          <span className="text-slate-400">🔒 Teléfono protegido</span>
                        )}
                        {selectedOp && <span>• Préstamo: {selectedOp.id}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Header Fast Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveAction('pago');
                        if (selectedOp) setImporteCobrado(selectedOp.valorCuota.toString());
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00a884] hover:bg-[#008f72] text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all active:scale-95"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Ingresar Pago</span>
                    </button>

                    <button
                      onClick={() => setShowMoraModal(true)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-amber-300 border border-amber-600/40 text-xs font-bold cursor-pointer transition-all"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Mora</span>
                    </button>
                  </div>
                </div>

                {/* LOAN SELECTOR BAR (DIARIO, SEMANAL, ETC.) - AS REQUESTED */}
                {currentClientOps.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-[#2a3942]/70 no-scrollbar">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-emerald-400" />
                      Créditos del Cliente:
                    </span>
                    {currentClientOps.map(op => {
                      const isOpSelected = selectedOp?.id === op.id;
                      return (
                        <button
                          key={op.id}
                          onClick={() => {
                            setSelectedOpId(op.id);
                            setActiveAction(null);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                            isOpSelected
                              ? 'bg-emerald-600 text-white border border-emerald-400 shadow-xs ring-1 ring-emerald-400/40'
                              : 'bg-[#111b21] text-slate-300 hover:bg-[#202c33] border border-[#2a3942]'
                          }`}
                        >
                          <span>{op.id}</span>
                          <span className="text-[10px] opacity-80">({op.frecuencia})</span>
                          <span className="font-mono text-[10px] text-emerald-300">
                            ${op.totalPendiente.toLocaleString('es-AR')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ACTION FORM AREA (EXACT ACTION BUTTONS & FORM FROM PREVIOUS PAGOS VIEW) */}
              {selectedOp && (
                <div className="bg-[#111b21] border-b border-[#222d34] p-3 space-y-2.5 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5" />
                      Acciones de Cobranza ({selectedOp.id} - Cuota: ${selectedOp.valorCuota.toLocaleString('es-AR')})
                    </span>
                    {activeAction && (
                      <button
                        onClick={() => setActiveAction(null)}
                        className="text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        Cancelar Acción ✕
                      </button>
                    )}
                  </div>

                  {/* The 5 authorized action buttons */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAction('pago');
                        setImporteCobrado(selectedOp.valorCuota.toString());
                        setObservacionesInput('');
                      }}
                      className={`p-2 rounded-lg text-[10px] font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border text-center ${
                        activeAction === 'pago'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                          : 'bg-[#202c33] hover:bg-[#2a3942] text-emerald-300 border-[#2a3942]'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Registrar Pago
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveAction('pago_parcial');
                        setImporteCobrado('');
                        setObservacionesInput('');
                      }}
                      className={`p-2 rounded-lg text-[10px] font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border text-center ${
                        activeAction === 'pago_parcial'
                          ? 'bg-blue-500 text-white border-blue-400 shadow-xs'
                          : 'bg-[#202c33] hover:bg-[#2a3942] text-blue-300 border-[#2a3942]'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 shrink-0" />
                      Pago Parcial
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveAction('pago_adelantado');
                        setImporteCobrado((selectedOp.valorCuota * 2).toString());
                        setObservacionesInput('');
                        setPrepaymentMode('CONSECUTIVO_INMEDIATO');
                      }}
                      className={`p-2 rounded-lg text-[10px] font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border text-center ${
                        activeAction === 'pago_adelantado'
                          ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-xs'
                          : 'bg-[#202c33] hover:bg-[#2a3942] text-teal-300 border-[#2a3942]'
                      }`}
                    >
                      <Calendar className="w-4 h-4 shrink-0" />
                      Pago Adelantado
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveAction('no_pago');
                        setObservacionesInput('');
                      }}
                      className={`p-2 rounded-lg text-[10px] font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border text-center ${
                        activeAction === 'no_pago'
                          ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                          : 'bg-[#202c33] hover:bg-[#2a3942] text-rose-300 border-[#2a3942]'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      Reg. No Pago
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveAction('promesa');
                        setPromesaFecha('');
                        setObservacionesInput('');
                      }}
                      className={`p-2 rounded-lg text-[10px] font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border text-center ${
                        activeAction === 'promesa'
                          ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-xs'
                          : 'bg-[#202c33] hover:bg-[#2a3942] text-sky-300 border-[#2a3942]'
                      }`}
                    >
                      <Clock className="w-4 h-4 shrink-0" />
                      Promesa
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveAction('observaciones');
                        setObservacionesInput('');
                      }}
                      className={`p-2 rounded-lg text-[10px] font-black transition-all flex flex-col items-center justify-center gap-1 cursor-pointer border text-center ${
                        activeAction === 'observaciones'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                          : 'bg-[#202c33] hover:bg-[#2a3942] text-amber-300 border-[#2a3942]'
                      }`}
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      Observación
                    </button>
                  </div>

                  {/* ACTIVE ACTION FORM (EXACT INPUTS AND PREPAYMENT MODE SELECTION) */}
                  {activeAction && (
                    <form onSubmit={handleActionSubmit} className="bg-[#202c33] p-3 rounded-xl border border-[#2a3942] space-y-3">
                      {(activeAction === 'pago' || activeAction === 'pago_parcial' || activeAction === 'pago_adelantado') && (
                        <div className="space-y-2.5">
                          {/* PREPAYMENT MODES: OPCION A / OPCION B */}
                          {activeAction === 'pago_adelantado' && (
                            <div className="bg-[#111b21] p-3 rounded-xl border border-teal-500/40 space-y-2">
                              <span className="text-[10px] font-black text-teal-300 uppercase tracking-wider block">
                                Modalidad de Pago por Adelantado:
                              </span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <label
                                  onClick={() => setPrepaymentMode('CONSECUTIVO_INMEDIATO')}
                                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2 ${
                                    prepaymentMode === 'CONSECUTIVO_INMEDIATO'
                                      ? 'bg-teal-950 border-teal-400 ring-1 ring-teal-400'
                                      : 'bg-[#202c33] border-[#2a3942]'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="prepaymentModeDesk"
                                    checked={prepaymentMode === 'CONSECUTIVO_INMEDIATO'}
                                    onChange={() => setPrepaymentMode('CONSECUTIVO_INMEDIATO')}
                                    className="mt-0.5 text-teal-400"
                                  />
                                  <div>
                                    <strong className="text-white text-xs block">
                                      Opción B: Cuota del Día + Consecutivas ⭐
                                    </strong>
                                    <p className="text-[10px] text-teal-200/80 leading-tight mt-0.5">
                                      Abona la cuota de hoy + las siguientes consecutivas. El cliente queda al día.
                                    </p>
                                  </div>
                                </label>

                                <label
                                  onClick={() => setPrepaymentMode('FINAL_ATRAS')}
                                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2 ${
                                    prepaymentMode === 'FINAL_ATRAS'
                                      ? 'bg-teal-950 border-teal-400 ring-1 ring-teal-400'
                                      : 'bg-[#202c33] border-[#2a3942]'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="prepaymentModeDesk"
                                    checked={prepaymentMode === 'FINAL_ATRAS'}
                                    onChange={() => setPrepaymentMode('FINAL_ATRAS')}
                                    className="mt-0.5 text-teal-400"
                                  />
                                  <div>
                                    <strong className="text-white text-xs block">
                                      Opción A: Desde el Final hacia Atrás
                                    </strong>
                                    <p className="text-[10px] text-teal-200/80 leading-tight mt-0.5">
                                      Cancela las últimas cuotas del contrato, reduciendo el plazo final.
                                    </p>
                                  </div>
                                </label>
                              </div>
                            </div>
                          )}

                          {/* Monto Cobrado with quick chips */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[10px] font-bold text-slate-300 uppercase">
                                Monto Cobrado ($)
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setImporteCobrado(selectedOp.valorCuota.toString())}
                                  className="text-[10px] bg-[#111b21] hover:bg-[#00a884] hover:text-slate-950 text-emerald-300 px-2 py-0.5 rounded cursor-pointer border border-[#2a3942]"
                                >
                                  1 Cuota (${selectedOp.valorCuota.toLocaleString('es-AR')})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setImporteCobrado(selectedOp.totalPendiente.toString())}
                                  className="text-[10px] bg-[#111b21] hover:bg-[#00a884] hover:text-slate-950 text-emerald-300 px-2 py-0.5 rounded cursor-pointer border border-[#2a3942]"
                                >
                                  Total (${selectedOp.totalPendiente.toLocaleString('es-AR')})
                                </button>
                              </div>
                            </div>
                            <input
                              type="number"
                              required
                              value={importeCobrado}
                              onChange={e => setImporteCobrado(e.target.value)}
                              placeholder="Ej: 15000"
                              className="w-full px-3 py-2 bg-[#111b21] text-white border border-[#2a3942] rounded-lg text-sm font-mono font-bold focus:ring-1 focus:ring-[#00a884] focus:outline-hidden"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">
                                Medio de Pago
                              </label>
                              <select
                                value={medioPago}
                                onChange={e => setMedioPago(e.target.value as any)}
                                className="w-full px-2.5 py-1.5 bg-[#111b21] text-white border border-[#2a3942] rounded-lg text-xs font-bold"
                              >
                                <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                                <option value="EFECTIVO">EFECTIVO</option>
                                <option value="DEPOSITO">DEPÓSITO</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">
                                Fecha de Cobro
                              </label>
                              <input
                                type="date"
                                required
                                value={fechaPago}
                                onChange={e => setFechaPago(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-[#111b21] text-white border border-[#2a3942] rounded-lg text-xs font-mono font-bold"
                              />
                            </div>
                          </div>

                          {/* Checkbox Cobrador en Calle */}
                          <div className="bg-[#111b21] p-2 rounded-lg border border-[#2a3942] space-y-1.5">
                            <label className="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={esCobroEnCalle}
                                onChange={e => setEsCobroEnCalle(e.target.checked)}
                                className="w-3.5 h-3.5 text-emerald-500 rounded accent-emerald-500"
                              />
                              <span>🏍️ Cobrado por Cobrador en Calle (Genera Comisión)</span>
                            </label>
                            {esCobroEnCalle && (
                              <select
                                value={selectedCobradorId}
                                onChange={e => setSelectedCobradorId(e.target.value)}
                                className="w-full px-2 py-1 bg-slate-950 text-white border border-emerald-600 rounded text-xs"
                              >
                                <option value="">-- Seleccionar Cobrador --</option>
                                {usuarios.map(u => (
                                  <option key={u.id} value={u.id}>
                                    👤 {u.nombre} ({u.rolId})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      )}

                      {activeAction === 'promesa' && (
                        <div>
                          <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">
                            Fecha Programada de Pago
                          </label>
                          <input
                            type="date"
                            required
                            min={todayStr}
                            value={promesaFecha}
                            onChange={e => setPromesaFecha(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-[#111b21] text-white border border-[#2a3942] rounded-lg text-xs font-mono font-bold"
                          />
                        </div>
                      )}

                      <div>
                        <label className="text-[10px] font-bold text-slate-300 uppercase block mb-1">
                          Observaciones / Detalle
                        </label>
                        <textarea
                          rows={2}
                          value={observacionesInput}
                          onChange={e => setObservacionesInput(e.target.value)}
                          placeholder="Ej: Cliente transfirió desde MercadoPago comprobante #827192"
                          className="w-full px-2.5 py-1.5 bg-[#111b21] text-white border border-[#2a3942] rounded-lg text-xs resize-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-[#00a884] hover:bg-[#008f72] text-slate-950 font-black rounded-lg text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all"
                      >
                        Confirmar y Procesar Operación
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* CHAT MESSAGES STREAM */}
              <div
                className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a]"
                style={{
                  backgroundImage: `radial-gradient(#1f2c34 1px, transparent 1px)`,
                  backgroundSize: '24px 24px'
                }}
              >
                <div className="flex justify-center my-2">
                  <div className="bg-[#182229] border border-[#222d34] text-slate-400 text-[11px] px-3 py-1 rounded-lg text-center max-w-md shadow-xs">
                    🔒 Mensajería de Cobranzas integrada con el motor contable CrediCash.
                  </div>
                </div>

                {chatMessages.map(msg => {
                  if (msg.esNotaInterna) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <div className="max-w-lg w-full bg-amber-950/70 border border-amber-700/60 text-amber-200 text-xs p-3 rounded-xl shadow-md">
                          <div className="flex items-center gap-1.5 font-bold mb-1 text-amber-400 text-[11px]">
                            <Lock className="w-3 h-3" />
                            <span>NOTA INTERNA DE AUDITORÍA (No visible para el cliente)</span>
                          </div>
                          <p className="whitespace-pre-line leading-relaxed">{msg.texto}</p>
                          <div className="text-[10px] text-amber-400/80 text-right mt-1 font-mono">
                            {msg.fecha} • {msg.hora}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const isOperador = msg.sender === 'OPERADOR';

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOperador ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] md:max-w-[65%] rounded-2xl p-3 shadow-md relative ${
                          isOperador
                            ? 'bg-[#005c4b] text-white rounded-tr-xs'
                            : 'bg-[#202c33] text-slate-100 rounded-tl-xs'
                        } ${msg.esReciboOficial ? 'border-2 border-[#00a884] ring-2 ring-[#00a884]/20' : ''}`}
                      >
                        {msg.esReciboOficial && (
                          <div className="flex items-center gap-1 text-[11px] font-black text-[#25d366] bg-[#004a3c] px-2 py-0.5 rounded-md mb-2 w-fit">
                            <Sparkles className="w-3 h-3" />
                            <span>RECIBO OFICIAL ASENTADO EN CAJA</span>
                          </div>
                        )}

                        <p className="text-xs md:text-sm whitespace-pre-line leading-relaxed select-text font-sans">
                          {msg.texto}
                        </p>

                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-300/80">
                          <span>{msg.hora}</span>
                          {isOperador && (
                            <Check className="w-3.5 h-3.5 text-sky-400 inline" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* QUICK RESPONSE TEMPLATES BAR */}
              <div className="bg-[#111b21] border-t border-[#222d34] px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#00a884]" />
                  Plantillas:
                </span>
                <button
                  onClick={() => handleApplyTemplate('RECORDATORIO')}
                  className="px-2.5 py-1 rounded-md bg-[#202c33] hover:bg-[#2a3942] text-[11px] text-amber-300 border border-amber-600/30 whitespace-nowrap cursor-pointer transition-all"
                >
                  📅 Recordatorio Hoy
                </button>
                <button
                  onClick={() => handleApplyTemplate('MORA')}
                  className="px-2.5 py-1 rounded-md bg-[#202c33] hover:bg-[#2a3942] text-[11px] text-rose-300 border border-rose-600/30 whitespace-nowrap cursor-pointer transition-all"
                >
                  ⚠️ Aviso de Mora (+50%)
                </button>
                <button
                  onClick={() => handleApplyTemplate('CBU')}
                  className="px-2.5 py-1 rounded-md bg-[#202c33] hover:bg-[#2a3942] text-[11px] text-teal-300 border border-teal-600/30 whitespace-nowrap cursor-pointer transition-all"
                >
                  🏦 CBU / Alias Oficial
                </button>
                <button
                  onClick={() => handleApplyTemplate('RENOVACION')}
                  className="px-2.5 py-1 rounded-md bg-[#202c33] hover:bg-[#2a3942] text-[11px] text-emerald-300 border border-emerald-600/30 whitespace-nowrap cursor-pointer transition-all"
                >
                  ⭐ Renovación
                </button>
                <button
                  onClick={() => handleApplyTemplate('COMPROMISO')}
                  className="px-2.5 py-1 rounded-md bg-[#202c33] hover:bg-[#2a3942] text-[11px] text-sky-300 border border-sky-600/30 whitespace-nowrap cursor-pointer transition-all"
                >
                  🤝 Confirmar Compromiso
                </button>
              </div>

              {/* CHAT INPUT BAR */}
              <div className="bg-[#202c33] border-t border-[#2a3942] p-2.5 flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsNotaInternaMode(!isNotaInternaMode)}
                  className={`p-2 rounded-lg border transition-all cursor-pointer ${
                    isNotaInternaMode
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-[#111b21] text-slate-400 border-[#2a3942] hover:text-amber-400'
                  }`}
                  title={isNotaInternaMode ? 'Modo Nota Interna activado' : 'Activar Modo Nota Interna'}
                >
                  <Lock className="w-4 h-4" />
                </button>

                <div className="flex-1 relative">
                  <textarea
                    rows={1}
                    placeholder={
                      isNotaInternaMode
                        ? 'Escribir nota interna de auditoría (no se envía al cliente)...'
                        : 'Escribir mensaje para el cliente por WhatsApp...'
                    }
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className={`w-full py-2 px-3 rounded-lg text-xs md:text-sm resize-none focus:outline-hidden border transition-all ${
                      isNotaInternaMode
                        ? 'bg-amber-950/40 text-amber-200 border-amber-600/60 placeholder-amber-400/60 focus:ring-1 focus:ring-amber-500'
                        : 'bg-[#2a3942] text-slate-100 border-transparent placeholder-slate-400 focus:ring-1 focus:ring-[#00a884]'
                    }`}
                  />
                </div>

                <button
                  onClick={handleSendMessage}
                  disabled={!inputText.trim()}
                  className={`p-2.5 rounded-full transition-all cursor-pointer shadow-md ${
                    isNotaInternaMode
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : 'bg-[#00a884] text-slate-950 hover:bg-[#008f72] disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                  title={isNotaInternaMode ? 'Guardar Nota Interna' : 'Enviar Mensaje'}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-full bg-[#111b21] flex items-center justify-center mb-4 text-[#00a884]">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-200">
                Seleccione un cliente para abrir la estación de WhatsApp
              </h3>
            </div>
          )}
        </div>

        {/* COLUMN 3: RIGHT PANEL - THE EXACT PREVIOUS "FICHA DEL CLIENTE" FROM PAGOS VIEW */}
        {(showRightPanel || mobileActivePane === 'FICHA') && currentSelection && (
          <div
            className={`w-full lg:w-96 bg-[#111b21] border-l border-[#222d34] flex-col shrink-0 overflow-y-auto p-4 space-y-4 ${
              mobileActivePane === 'FICHA' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {/* Header info */}
            <div className="flex items-center justify-between pb-2 border-b border-[#222d34]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h4 className="font-extrabold text-xs text-slate-200 uppercase tracking-wider">
                  Ficha de Resumen del Cliente
                </h4>
              </div>
              <button
                onClick={() => {
                  setShowRightPanel(false);
                  setMobileActivePane('CHAT');
                }}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* THE EXACT #0B4B27 GREEN FICHA CARD FROM PAGOS VIEW */}
            {selectedOp ? (
              <div className="bg-[#0B4B27] text-emerald-50 p-4.5 rounded-2xl border border-emerald-800 shadow-xl space-y-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 translate-x-4 -translate-y-4 pointer-events-none">
                  <DollarSign className="w-36 h-36" />
                </div>

                <div className="border-b border-white/10 pb-2.5">
                  <span className="text-[10px] font-bold tracking-widest text-emerald-300 uppercase block mb-1">
                    Ficha de Resumen Rápido
                  </span>
                  <h3 className="text-base font-extrabold text-white tracking-tight">
                    {modoSuperAdminReal
                      ? `${currentSelection.cliente.nombre} ${currentSelection.cliente.apellido || ''}`.trim()
                      : obtenerNombreAnonimizado(currentSelection.cliente)}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-emerald-200/90 font-mono">
                      Crédito Nro: {selectedOp.id}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-200 border border-emerald-600">
                      {selectedOp.frecuencia}
                    </span>
                  </div>
                </div>

                {/* Instant answer grid (answers all questions from the previous version) */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">
                      Estado Crédito
                    </span>
                    <strong className="text-white font-bold uppercase">
                      {selectedOp.estado} ({selectedOp.diasMora > 0 ? 'Mora' : 'Al Día'})
                    </strong>
                  </div>

                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">
                      Valor Cuota
                    </span>
                    <strong className="text-white font-bold">
                      ${selectedOp.valorCuota.toLocaleString('es-ES')}
                    </strong>
                  </div>

                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">
                      Cuotas Totales
                    </span>
                    <strong className="text-white font-bold font-mono">
                      {selectedOp.cantidadCuotas} ({selectedOp.frecuencia.toLowerCase()})
                    </strong>
                  </div>

                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">
                      Cuotas Pagadas
                    </span>
                    <strong className="text-emerald-300 font-bold font-mono">
                      {selectedOp.cuotasPagadas} pagadas
                    </strong>
                  </div>

                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">
                      Cuotas Pendientes
                    </span>
                    <strong className="text-amber-300 font-bold font-mono">
                      {selectedOp.cuotasPendientes} restantes
                    </strong>
                  </div>

                  <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">
                      Saldo Pendiente
                    </span>
                    <strong className="text-white font-bold font-mono">
                      ${selectedOp.totalPendiente.toLocaleString('es-ES')}
                    </strong>
                  </div>

                  {/* 3-line debt breakdown (Mora + Cuota de hoy + Monto para estar al día) */}
                  {(() => {
                    const overdueCuotas = cuotas.filter(
                      c => c.idOperacion === selectedOp.id && c.estado !== 'PAGADA' && c.fechaVencimiento < todayStr
                    );
                    const countOverdue = overdueCuotas.length;
                    const sumOverdue = overdueCuotas.reduce((sum, c) => sum + (c.saldoPendiente || c.valorTotalCuota), 0);

                    const dueTodayCuotas = cuotas.filter(
                      c => c.idOperacion === selectedOp.id && c.estado !== 'PAGADA' && c.fechaVencimiento === todayStr
                    );
                    const countToday = dueTodayCuotas.length;
                    const sumToday = dueTodayCuotas.reduce((sum, c) => sum + (c.saldoPendiente || c.valorTotalCuota), 0);

                    const exigTotal = sumOverdue + sumToday;

                    return (
                      <div className="bg-rose-950/70 p-3 rounded-xl border border-rose-500/40 col-span-2 space-y-1.5">
                        <span className="text-[9px] uppercase tracking-widest text-rose-300 font-black block">
                          📊 Desglose para Estar al Día
                        </span>
                        <div className="text-[11px] space-y-1 text-slate-100 font-medium">
                          <div className="flex justify-between items-center">
                            <span className="text-rose-200">Cuotas Vencidas (Mora):</span>
                            <span className="font-mono font-bold text-white bg-rose-900/60 px-1.5 py-0.5 rounded">
                              {countOverdue} (${sumOverdue.toLocaleString('es-ES')})
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-emerald-200">Cuota de Hoy:</span>
                            <span className="font-mono font-bold text-white bg-emerald-900/60 px-1.5 py-0.5 rounded">
                              {countToday} (${sumToday.toLocaleString('es-ES')})
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-t border-rose-500/30 pt-1 mt-1">
                            <span className="text-white font-extrabold uppercase text-[10px]">
                              Monto para Estar al Día:
                            </span>
                            <span className="font-mono font-black text-rose-300 text-xs">
                              ${exigTotal.toLocaleString('es-ES')} ARS
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="bg-white/5 p-2 rounded-xl border border-white/10 col-span-2">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">
                      Próximo Vencimiento
                    </span>
                    <strong className="text-white font-bold font-mono flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      {selectedOp.proximoVencimiento}
                    </strong>
                  </div>

                  {/* Domicilio del Cliente */}
                  {(() => {
                    if (!modoSuperAdminReal) {
                      return (
                        <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-700 col-span-2 text-center text-[10px] text-emerald-300 font-bold">
                          🔒 El Domicilio está restringido para operadores
                        </div>
                      );
                    }
                    const address = currentSelection.cliente.direccion || 'Sin dirección registrada';
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

                    return (
                      <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-700 col-span-2 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] uppercase tracking-wider text-emerald-300 font-extrabold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-rose-400" />
                            Domicilio Real
                          </span>
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[9px] px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            🗺️ Google Maps
                          </a>
                        </div>
                        <div className="text-[11px] text-white font-medium">{address}</div>
                      </div>
                    );
                  })()}

                  {/* Renovación & Ampliación */}
                  <div className="bg-white/5 p-2 rounded-xl border border-white/10 text-[11px]">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">
                      ¿Apto Renovación?
                    </span>
                    <strong className={selectedOp.elegibleRenovacion ? "text-emerald-300 font-bold" : "text-emerald-100/50 font-medium"}>
                      {selectedOp.elegibleRenovacion ? '✅ Sí, Elegible' : '❌ No'}
                    </strong>
                  </div>

                  <div className="bg-white/5 p-2 rounded-xl border border-white/10 text-[11px]">
                    <span className="text-[9px] uppercase tracking-wider text-emerald-300 block mb-0.5">
                      ¿Apto Ampliación?
                    </span>
                    <strong className={selectedOp.elegibleAmpliacion ? "text-emerald-300 font-bold" : "text-emerald-100/50 font-medium"}>
                      {selectedOp.elegibleAmpliacion ? '✅ Sí, Elegible' : '❌ No'}
                    </strong>
                  </div>
                </div>

                {/* CRONOGRAMA DE AMORTIZACIÓN (INSTALLMENT SCHEDULE LIST) */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-2">
                  <div className="flex justify-between items-center border-b border-white/10 pb-1.5 flex-wrap gap-1">
                    <span className="text-[9px] uppercase tracking-widest text-emerald-300 font-black">
                      📅 Cronograma de Amortización
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleExportPDF(selectedOp, includeTotalInPDF)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
                        title="Exportar cronograma a PDF"
                      >
                        <FileText className="w-3 h-3" />
                        PDF
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {cuotas
                      .filter(c => c.idOperacion === selectedOp.id)
                      .sort((a, b) => a.numeroCuota - b.numeroCuota)
                      .map(cuo => {
                        const isOverdue = cuo.estado !== 'PAGADA' && cuo.fechaVencimiento < todayStr;
                        const isHoy = cuo.estado !== 'PAGADA' && cuo.fechaVencimiento === todayStr;

                        return (
                          <div
                            key={cuo.id}
                            className="flex justify-between items-center text-[10px] p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-colors font-semibold"
                          >
                            <div>
                              <span className="text-emerald-300/80 font-mono">Cuota {cuo.numeroCuota}</span>
                              <span className="text-white ml-2">{cuo.fechaVencimiento}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-white font-mono font-bold mr-2">
                                ${(cuo.saldoPendiente || cuo.valorTotalCuota).toLocaleString('es-ES')}
                              </span>
                              <span
                                className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                  cuo.estado === 'PAGADA'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : isOverdue
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : isHoy
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-white/5 text-slate-300'
                                }`}
                              >
                                {cuo.estado === 'PAGADA'
                                  ? '🟢 Paga'
                                  : isOverdue
                                  ? '🔴 Vencida'
                                  : isHoy
                                  ? '🟡 Hoy'
                                  : '⚪ Pend.'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* HISTORIAL DE PAGOS REGISTRADOS DE ESTA OPERACIÓN */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1.5">
                  <span className="text-[9px] uppercase tracking-widest text-emerald-300 font-black block">
                    💳 Pagos Registrados ({pagos.filter(p => p.idOperacion === selectedOp.id).length})
                  </span>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {pagos.filter(p => p.idOperacion === selectedOp.id).length === 0 ? (
                      <p className="text-[10px] text-emerald-200/60 italic text-center py-1">
                        Sin pagos asentados aún.
                      </p>
                    ) : (
                      pagos
                        .filter(p => p.idOperacion === selectedOp.id)
                        .sort((a, b) => parseDateToTimestamp(b.fechaPago) - parseDateToTimestamp(a.fechaPago))
                        .map(p => (
                          <div
                            key={p.id}
                            className="bg-slate-900/80 p-1.5 rounded-lg border border-emerald-800/80 text-[10px] flex justify-between items-center"
                          >
                            <div>
                              <span className="font-mono text-emerald-300 font-bold">{p.fechaPago}</span>
                              <span className="text-slate-400 ml-1.5">({p.metodoPago})</span>
                            </div>
                            <strong className="text-emerald-400 font-mono font-bold">
                              ${p.importe.toLocaleString('es-AR')}
                            </strong>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* DATOS BANCARIOS OFICIALES */}
                <div className="bg-[#111b21] p-2.5 rounded-xl border border-emerald-700/60 space-y-1.5">
                  <div className="text-[10px] text-emerald-300 font-bold flex items-center justify-between">
                    <span>Alias Oficial:</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          configuracion.aliasOficial || 'FINANCIERA.COBROS.OFICIAL',
                          'Alias Oficial'
                        )
                      }
                      className="text-white hover:text-emerald-300 cursor-pointer text-[10px] flex items-center gap-1 font-mono"
                    >
                      <span>{configuracion.aliasOficial || 'FINANCIERA.COBROS.OFICIAL'}</span>
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-[10px] text-emerald-300 font-bold flex items-center justify-between">
                    <span>CBU Oficial:</span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          configuracion.cbuOficial || '0170099220000049281729',
                          'CBU Oficial'
                        )
                      }
                      className="text-white hover:text-emerald-300 cursor-pointer text-[10px] flex items-center gap-1 font-mono"
                    >
                      <span className="truncate max-w-[140px]">{configuracion.cbuOficial || '0170099220000049281729'}</span>
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-[#202c33] rounded-xl text-center text-xs text-slate-400">
                El cliente no posee ningún crédito seleccionado.
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECONDARY PAYMENT CONFIRMATION MODAL (EXACT FROM PAGOS VIEW WITH PREVIEW BREAKDOWN) */}
      {showPaymentConfirmModal && selectedOp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-emerald-950 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-emerald-700/80 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="p-2.5 bg-amber-950/80 rounded-xl border border-amber-800/50">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Confirmación de Seguridad</h3>
                <p className="text-xs text-emerald-200/80">
                  Por favor, verifique los datos antes de registrar el pago.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/90 rounded-xl p-4 border border-emerald-800/80 space-y-2 text-xs">
              <div className="flex justify-between border-b border-emerald-800/60 pb-1.5">
                <span className="text-emerald-200/70 font-medium">Cliente:</span>
                <span className="font-extrabold text-white">
                  {modoSuperAdminReal
                    ? selectedOp.nombreCliente
                    : obtenerNombreAnonimizado(currentSelection?.cliente || { id: selectedOp.idCliente, nombre: selectedOp.nombreCliente } as any)}
                </span>
              </div>
              <div className="flex justify-between border-b border-emerald-800/60 pb-1.5">
                <span className="text-emerald-200/70 font-medium">Crédito ID:</span>
                <span className="font-mono font-bold text-emerald-300">{selectedOp.id}</span>
              </div>
              <div className="flex justify-between border-b border-emerald-800/60 pb-1.5">
                <span className="text-emerald-200/70 font-medium">Modalidad:</span>
                <span className="font-extrabold text-teal-300 bg-teal-950 px-2 py-0.5 rounded-md border border-teal-700 text-[11px]">
                  {activeAction === 'pago_adelantado'
                    ? prepaymentMode === 'CONSECUTIVO_INMEDIATO'
                      ? 'Opción B: Cuota del Día + Consecutivas'
                      : 'Opción A: Desde el final hacia atrás'
                    : activeAction === 'pago_parcial'
                    ? 'Pago Parcial'
                    : 'Pago Regular'}
                </span>
              </div>
              <div className="flex justify-between border-b border-emerald-800/60 pb-1.5">
                <span className="text-emerald-200/70 font-medium">Monto a Registrar:</span>
                <span className="text-sm font-black text-emerald-400">
                  ${parseFloat(importeCobrado || '0').toLocaleString('es-ES')} ARS
                </span>
              </div>
              <div className="flex justify-between border-b border-emerald-800/60 pb-1.5">
                <span className="text-emerald-200/70 font-medium">Medio de Pago:</span>
                <span className="font-bold text-white bg-emerald-900 px-2 py-0.5 rounded-md uppercase border border-emerald-700">
                  {medioPago}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-200/70 font-medium">Fecha de Cobro:</span>
                <span className="font-mono font-bold text-emerald-300">{fechaPago}</span>
              </div>
            </div>

            {/* PREVIEW BREAKDOWN OF COVERED CUOTAS */}
            {(() => {
              const amountToApply = parseFloat(importeCobrado || '0');
              if (amountToApply <= 0) return null;

              let currentModality: 'PAGO_REGULAR' | 'PAGO_PARCIAL' | 'PAGO_ADELANTADO_OPCION_A' | 'PAGO_ADELANTADO_OPCION_B' = 'PAGO_REGULAR';
              if (activeAction === 'pago_parcial') {
                currentModality = 'PAGO_PARCIAL';
              } else if (activeAction === 'pago_adelantado') {
                currentModality = prepaymentMode === 'FINAL_ATRAS' ? 'PAGO_ADELANTADO_OPCION_A' : 'PAGO_ADELANTADO_OPCION_B';
              }

              const targetOpIdStr = String(selectedOp.id).trim();
              const opCuotas = cuotas.filter(c => String(c.idOperacion).trim() === targetOpIdStr);
              const cuotasSorted = sortCuotasByPaymentPriority(opCuotas, fechaPago || todayStr, currentModality);

              let rem = amountToApply;
              const breakdown: { num: number; fec: string; monto: number; completo: boolean; saldoRestante: number }[] = [];

              cuotasSorted.forEach(c => {
                if (c.estado === 'PAGADA' || rem <= 0) return;
                const saldo = c.saldoPendiente !== undefined ? c.saldoPendiente : c.valorTotalCuota;
                if (rem >= saldo) {
                  breakdown.push({ num: c.numeroCuota, fec: c.fechaVencimiento, monto: saldo, completo: true, saldoRestante: 0 });
                  rem -= saldo;
                } else {
                  breakdown.push({ num: c.numeroCuota, fec: c.fechaVencimiento, monto: rem, completo: false, saldoRestante: saldo - rem });
                  rem = 0;
                }
              });

              if (breakdown.length === 0) return null;

              return (
                <div className="bg-slate-900/90 rounded-xl p-3 border border-teal-500/50 space-y-2">
                  <span className="text-[10px] font-black text-teal-300 uppercase tracking-wider block">
                    Previsualización de Cuotas Afectadas:
                  </span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {breakdown.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-[11px] bg-slate-950 p-1.5 rounded-lg border border-teal-800/40"
                      >
                        <div>
                          <strong className="text-white">Cuota #{item.num}</strong>
                          <span className="text-slate-400 ml-1.5">({item.fec})</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-emerald-400 font-bold mr-1.5">
                            ${item.monto.toLocaleString('es-ES')}
                          </span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                              item.completo ? 'bg-emerald-800 text-emerald-200' : 'bg-amber-800 text-amber-200'
                            }`}
                          >
                            {item.completo ? 'Cubierta 100%' : 'Parcial'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmActionExecution}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar y Asentar Pago</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DEUDA CONSOLIDADA Y MORA MATEMÁTICA */}
      {showMoraModal && selectedOp && moraConsolidacion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#111b21] border border-slate-700 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#222d34] pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base text-slate-100">
                  Liquidación de Mora Independiente ({selectedOp.id})
                </h3>
              </div>
              <button onClick={() => setShowMoraModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#202c33] p-3 rounded-xl border border-[#2a3942] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span>Capital Impago:</span>
                <strong className="font-mono">${moraConsolidacion.totalCapitalImpago.toLocaleString('es-AR')}</strong>
              </div>
              <div className="flex items-center justify-between text-rose-300">
                <span>Interés de Mora Acumulado:</span>
                <strong className="font-mono">+${moraConsolidacion.totalMoraAcumulada.toLocaleString('es-AR')}</strong>
              </div>
              <div className="flex items-center justify-between text-white font-extrabold text-sm pt-1 border-t border-[#2a3942]">
                <span>Total Consolidado a Liquidar:</span>
                <span className="font-mono text-emerald-400">
                  ${moraConsolidacion.totalConsolidado.toLocaleString('es-AR')}
                </span>
              </div>
            </div>

            {/* Cuotas Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300">Detalle por Cuota Autónoma:</h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {moraConsolidacion.cuotasImpagas.map(cu => (
                  <div
                    key={cu.numeroCuota}
                    className="p-2.5 rounded-lg bg-[#202c33] border border-[#2a3942] text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-200">
                        Cuota #{cu.numeroCuota} • Vencimiento: {cu.fechaVencimiento}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Capital: ${cu.montoCapital.toLocaleString('es-AR')} | {cu.diasAtrasoHabiles} días hábiles ({cu.periodosMora} períodos)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-rose-400 font-bold font-mono">
                        +${cu.interesMora.toLocaleString('es-AR')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Total: ${cu.totalCuotaConMora.toLocaleString('es-AR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#222d34] flex items-center justify-between">
              <button
                onClick={() => {
                  const text = generarReporteMoraWhatsApp(
                    currentSelection!.cliente,
                    selectedOp,
                    moraConsolidacion,
                    configuracion
                  );
                  copyToClipboard(text, 'Reporte de Mora');
                }}
                className="px-3 py-2 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-xs font-bold text-slate-300 border border-[#2a3942] cursor-pointer flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Reporte</span>
              </button>

              <button
                onClick={() => {
                  const text = generarReporteMoraWhatsApp(
                    currentSelection!.cliente,
                    selectedOp,
                    moraConsolidacion,
                    configuracion
                  );
                  const newMsg: WhatsAppMessage = {
                    id: `REPORT-${Date.now()}`,
                    sender: 'OPERADOR',
                    texto: text,
                    hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                    fecha: todayStr
                  };
                  persistMessages([...chatMessages, newMsg]);
                  setShowMoraModal(false);
                  showToast('Liquidación de mora insertada en la conversación');
                }}
                className="px-4 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#008f72] text-slate-950 font-black text-xs cursor-pointer shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Insertar en Conversación</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#005c4b] text-white border border-[#00a884] px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
          <Check className="w-4 h-4 text-[#25d366]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
