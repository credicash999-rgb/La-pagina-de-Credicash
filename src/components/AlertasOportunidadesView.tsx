/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Cliente, Operacion, Cuota, Pago, UsuarioRol, Configuracion, FrecuenciaPago, CompromisoPago, FinalidadCompromiso, MesaGestionCompromiso, TransaccionTesoreria } from '../types';
import { generarPlanCuotas, calcularMesesFinanciados, obtenerProximoDiaHabil } from '../utils/cuotasGenerator';
import { calcularInteresesAtrasoCredito, ResumenInteresesCredito } from '../utils/interestCalculator';
import { exportReporteMoraPDF } from '../utils/pdfExportRoute';
import { 
  Bell, RefreshCw, Briefcase, UserCheck, ShieldCheck, CheckCircle2, 
  AlertCircle, DollarSign, Calendar, Search, Filter, Phone, MessageCircle, 
  X, Eye, User, Award, ArrowRight, TrendingUp, Sparkles, AlertTriangle, UserPlus, Clock,
  FileText, Printer, Download, Handshake, CreditCard, Check
} from 'lucide-react';

interface AlertasOportunidadesViewProps {
  clientes: Cliente[];
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
  usuarios: UsuarioRol[];
  activeUser: UsuarioRol;
  configuracion: Configuracion;
  feriados: any[];
  onAddOperacion: (operacion: Operacion, cuotasGeneradas: Cuota[]) => void;
  onUpdateCliente: (cliente: Cliente) => void;
  onUpdateOperacion?: (operacion: Operacion) => void;
  onAddPago?: (nuevoPago: Pago, updatedCuotasList: Cuota[], updatedOperacion: Operacion, tesoreriaTrx: TransaccionTesoreria) => void;
  onAddCompromisoPago?: (nuevoCompromiso: CompromisoPago) => void;
  onAddTransaccion?: (nuevaTrx: TransaccionTesoreria) => void;
}

export type TipoAlerta = 'REFINANCIACION_LISTA' | 'RENOVACION_ELEGIBLE' | 'PROXIMO_A_FINALIZAR' | 'CREDITO_FINALIZADO_ATRASO' | 'NUEVA_ALTA';

export interface ItemOportunidad {
  id: string;
  tipoAlerta: TipoAlerta;
  cliente: Cliente;
  operacionAsociada?: Operacion;
  montoPagoInicialAbonado?: number;
  montoDeudaRestante?: number;
  porcentajePagado?: number;
  cuotasPendientes?: number;
  cuotasPagadas?: number;
  totalCuotas?: number;
  detalleEstado: string;
  resumenIntereses?: ResumenInteresesCredito;
  esAptoRenovacion?: boolean;
  categoriaAlertas?: 'RENOVACIONES' | 'REFINANCIACIONES' | 'REPORTE_MORA' | 'ALTAS';
  semanaRenovacion?: 'ESTA_SEMANA' | 'PROXIMA_SEMANA';
  fechaFinalizacionCalculada?: string;
}

function formatMoney(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '0';
  return Number(amount).toLocaleString('es-AR');
}

export function getFechaFinalizacionCredito(op: Operacion, opCuotas: Cuota[]): string {
  if (op.fechaFinalizacion && op.fechaFinalizacion.trim()) {
    return op.fechaFinalizacion.split('T')[0];
  }
  if (op.ultimoVencimiento && op.ultimoVencimiento.trim()) {
    return op.ultimoVencimiento.split('T')[0];
  }
  if (opCuotas && opCuotas.length > 0) {
    const sorted = [...opCuotas].sort((a, b) => (a.numeroCuota || 0) - (b.numeroCuota || 0));
    const last = sorted[sorted.length - 1];
    if (last && last.fechaVencimiento) {
      return last.fechaVencimiento.split('T')[0];
    }
  }
  return op.primerVencimiento ? op.primerVencimiento.split('T')[0] : '';
}

export function getWeekRanges(nowDate = new Date()) {
  const y = nowDate.getFullYear();
  const m = nowDate.getMonth();
  const d = nowDate.getDate();
  const dayOfWeek = nowDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  let mondayThisWeek: Date;
  if (dayOfWeek === 0) {
    // Sunday: Prepares upcoming week starting tomorrow (Monday)
    mondayThisWeek = new Date(y, m, d + 1);
  } else {
    // Monday (1) to Saturday (6): Monday of current week is d - (dayOfWeek - 1)
    mondayThisWeek = new Date(y, m, d - (dayOfWeek - 1));
  }

  const saturdayThisWeek = new Date(mondayThisWeek);
  saturdayThisWeek.setDate(mondayThisWeek.getDate() + 5);

  const mondayNextWeek = new Date(mondayThisWeek);
  mondayNextWeek.setDate(mondayThisWeek.getDate() + 7);

  const saturdayNextWeek = new Date(mondayNextWeek);
  saturdayNextWeek.setDate(mondayNextWeek.getDate() + 5);

  const formatISO = (date: Date) => {
    const yearStr = date.getFullYear();
    const monthStr = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    return `${yearStr}-${monthStr}-${dayStr}`;
  };

  return {
    estaSemanaStart: formatISO(mondayThisWeek),
    estaSemanaEnd: formatISO(saturdayThisWeek),
    proximaSemanaStart: formatISO(mondayNextWeek),
    proximaSemanaEnd: formatISO(saturdayNextWeek),
  };
}

function formatShortDate(isoDateStr: string | undefined): string {
  if (!isoDateStr) return '';
  const parts = isoDateStr.split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`;
  }
  return isoDateStr;
}

export type CategoriaFiltroAlertas = 'TODAS' | 'RENOVACION_ESTA_SEMANA' | 'RENOVACION_PROXIMA_SEMANA' | 'REFINANCIACION' | 'REPORTE_MORA' | 'ALTAS';

export default function AlertasOportunidadesView({
  clientes = [],
  operaciones = [],
  cuotas = [],
  pagos = [],
  usuarios = [],
  activeUser,
  configuracion,
  feriados = [],
  onAddOperacion,
  onUpdateCliente,
  onUpdateOperacion,
  onAddPago,
  onAddCompromisoPago,
  onAddTransaccion,
}: AlertasOportunidadesViewProps) {

  // State Filters
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaFiltroAlertas>('TODAS');
  const [searchTerm, setSearchTerm] = useState('');
  const [cobradorFiltro, setCobradorFiltro] = useState<string>('TODOS');

  // Modal States
  const [selectedItemFicha, setSelectedItemFicha] = useState<ItemOportunidad | null>(null);
  const [selectedItemCredito, setSelectedItemCredito] = useState<ItemOportunidad | null>(null);
  const [selectedResumenInteresesModal, setSelectedResumenInteresesModal] = useState<{ op: Operacion; resumen: ResumenInteresesCredito } | null>(null);

  // Modal State for Single Payment (Abonar en 1 solo pago)
  const [modalAbonarPagoUnico, setModalAbonarPagoUnico] = useState<{
    item: ItemOportunidad;
    monto: number;
    fechaPago: string;
    metodoPago: 'EFECTIVO' | 'TRANSFERENCIA' | 'DEPOSITO';
    cobradorNombre: string;
    observaciones: string;
  } | null>(null);

  // Modal State for Payment Commitment (Compromiso de Pago)
  const [modalCompromisoPago, setModalCompromisoPago] = useState<{
    item: ItemOportunidad;
    fechaCompromiso: string;
    montoComprometido: number;
    finalidad: FinalidadCompromiso;
    mesaGestion: MesaGestionCompromiso;
    observaciones: string;
  } | null>(null);

  const handleOpenAbonarPagoUnico = (item: ItemOportunidad) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const defaultMonto = item.resumenIntereses?.totalIntereses || item.montoDeudaRestante || (item.cliente.montoDeudaInactivo || 0) || 0;
    setModalAbonarPagoUnico({
      item,
      monto: defaultMonto,
      fechaPago: todayStr,
      metodoPago: 'EFECTIVO',
      cobradorNombre: item.cliente.cobradorAsignadoNombre || activeUser?.nombre || 'Cobrador',
      observaciones: item.tipoAlerta === 'CREDITO_FINALIZADO_ATRASO'
        ? `Cancelación total en 1 solo pago de Mora ($${defaultMonto}) - Crédito #${item.operacionAsociada?.id || ''}`
        : `Abono único registrado desde Alertas y Oportunidades`
    });
  };

  const handleConfirmarAbonoUnico = () => {
    if (!modalAbonarPagoUnico) return;
    const { item, monto, fechaPago, metodoPago, cobradorNombre, observaciones } = modalAbonarPagoUnico;

    if (monto <= 0) {
      alert('⚠️ Por favor ingrese un monto a abonar mayor a $0.');
      return;
    }

    const op = item.operacionAsociada;
    const nuevoPago: Pago = {
      id: `PAGO-UNICO-${Date.now()}`,
      idOperacion: op?.id || 'MORA-DIRECTA',
      idCliente: item.cliente.id,
      nombreCliente: `${item.cliente.nombre} ${item.cliente.apellido || ''}`.trim(),
      fechaPago: fechaPago,
      importe: monto,
      cobrador: cobradorNombre || 'Cobrador',
      metodoPago: metodoPago,
      modalidad: 'REFINANCIACION',
      observaciones: observaciones || `Abono único de mora por $${monto}`
    };

    const tesoreriaTrx: TransaccionTesoreria = {
      id: `TRX-MORA-${Date.now()}`,
      fecha: fechaPago,
      tipo: 'INGRESO',
      concepto: `Cobro en 1 Pago - Mora/Deuda (${item.cliente.nombre}) - Crédito #${op?.id || ''}`,
      monto: monto,
      referenciaId: nuevoPago.id
    };

    if (onAddPago) {
      const opCuotas = cuotas.filter(c => c.idOperacion === op?.id);
      const updatedCuotasList = opCuotas.map(c => ({
        ...c,
        estado: 'PAGADA' as const,
        fechaPago: fechaPago
      }));
      const updatedOp: Operacion = op ? {
        ...op,
        estado: 'FINALIZADO',
        saldoPendiente: Math.max(0, (op.saldoPendiente || 0) - monto)
      } : {
        id: `OP-${Date.now()}`,
        idCliente: item.cliente.id,
        nombreCliente: `${item.cliente.nombre} ${item.cliente.apellido || ''}`.trim(),
        montoPrestamo: monto,
        totalFinanciado: monto,
        cantidadCuotas: 1,
        valorCuota: monto,
        frecuencia: 'DIARIA',
        tasaInteres: 0,
        fechaOtorgamiento: fechaPago,
        primerVencimiento: fechaPago,
        estado: 'FINALIZADO',
        cobrador: cobradorNombre,
        saldoPendiente: 0
      };

      onAddPago(nuevoPago, updatedCuotasList, updatedOp, tesoreriaTrx);
    } else if (onAddTransaccion) {
      onAddTransaccion(tesoreriaTrx);
    }

    if (onUpdateCliente) {
      const updatedCli: Cliente = {
        ...item.cliente,
        montoDeudaInactivo: 0,
        montoPagoInicialRefinanciacion: 0
      };
      onUpdateCliente(updatedCli);
    }

    alert(`🎉 ¡Pago único de $${formatMoney(monto)} registrado con éxito para ${item.cliente.nombre}!\nFecha de cobro: ${fechaPago}`);
    setModalAbonarPagoUnico(null);
    if (selectedResumenInteresesModal) setSelectedResumenInteresesModal(null);
  };

  const handleOpenCompromiso = (item: ItemOportunidad) => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const tomorrowStr = today.toISOString().split('T')[0];
    const defaultMonto = item.resumenIntereses?.totalIntereses || item.montoDeudaRestante || (item.cliente.montoDeudaInactivo || 0) || 0;

    setModalCompromisoPago({
      item,
      fechaCompromiso: tomorrowStr,
      montoComprometido: defaultMonto,
      finalidad: 'REFINANCIACION',
      mesaGestion: 'GESTION TELEFONICA',
      observaciones: `Compromiso de pago agendado desde Alertas y Oportunidades (${item.tipoAlerta})`
    });
  };

  const handleConfirmarCompromiso = () => {
    if (!modalCompromisoPago) return;
    const { item, fechaCompromiso, montoComprometido, finalidad, mesaGestion, observaciones } = modalCompromisoPago;

    if (!fechaCompromiso) {
      alert('⚠️ Por favor ingrese una fecha válida para el compromiso de pago.');
      return;
    }

    const nuevoCompromiso: CompromisoPago = {
      id: `COMP-${Date.now()}`,
      idCliente: item.cliente.id,
      nombreCliente: `${item.cliente.nombre} ${item.cliente.apellido || ''}`.trim(),
      dniCliente: item.cliente.dni || '',
      idOperacion: item.operacionAsociada?.id,
      fechaCompromiso: fechaCompromiso,
      montoComprometido: Number(montoComprometido) || 0,
      finalidad: finalidad,
      mesaGestion: mesaGestion,
      estado: 'PENDIENTE',
      observaciones: observaciones || 'Compromiso registrado en Alertas y Oportunidades',
      usuarioRegistro: activeUser?.nombre || 'Administrador',
      fechaHoraRegistro: new Date().toLocaleString('es-AR')
    };

    if (onAddCompromisoPago) {
      onAddCompromisoPago(nuevoCompromiso);
      alert(`🤝 Compromiso de pago por $${formatMoney(montoComprometido)} agendado para el ${fechaCompromiso} (${item.cliente.nombre}).`);
    } else {
      alert(`🤝 Compromiso de pago registrado para el ${fechaCompromiso}.`);
    }

    setModalCompromisoPago(null);
  };

  // Form State for "Otorgar Nuevo Crédito / Renovación" Modal
  const [tipoOperacionForm, setTipoOperacionForm] = useState<'NUEVO' | 'RENOVACION' | 'AMPLIACION' | 'REFINANCIACION'>('RENOVACION');
  const [capitalEntregadoForm, setCapitalEntregadoForm] = useState<number>(100000);
  const [frecuenciaForm, setFrecuenciaForm] = useState<FrecuenciaPago>('DIARIA');
  const [cantidadCuotasForm, setCantidadCuotasForm] = useState<number>(20);
  const [fechaOtorgamientoForm, setFechaOtorgamientoForm] = useState<string>(new Date().toISOString().split('T')[0]);
  const [primerVencimientoForm, setPrimerVencimientoForm] = useState<string>('');
  const [cobradorAsignadoForm, setCobradorAsignadoForm] = useState<string>('');
  const [observacionesForm, setObservacionesForm] = useState<string>('Otorgado desde Alertas y Oportunidades');

  // String array of holiday YYYY-MM-DD dates for cuotasGenerator
  const feriadosList = useMemo(() => {
    return (feriados || []).map((f: any) => typeof f === 'string' ? f : f?.fecha).filter(Boolean);
  }, [feriados]);

  // 1. Compute list of opportunities / alert items
  const oportunidades = useMemo(() => {
    const list: ItemOportunidad[] = [];
    const weekRanges = getWeekRanges(new Date());
    const { estaSemanaStart, estaSemanaEnd, proximaSemanaStart, proximaSemanaEnd } = weekRanges;

    try {
      // A. REFINANCIACIONES LISTAS (Clientes inactivos con pago inicial de refinanciación realizado o pago registrado)
      (clientes || []).forEach(cli => {
        if (!cli) return;
        const isInactiveOrDebt = cli.estado === 'INACTIVO' || (cli.montoDeudaInactivo && cli.montoDeudaInactivo > 0);
        if (!isInactiveOrDebt) return;

        // Check if client made payments towards refinancing
        const clientPagos = (pagos || []).filter(p => p && p.idCliente === cli.id);
        const refinPagos = clientPagos.filter(p => (p.idOperacion && typeof p.idOperacion === 'string' && p.idOperacion.startsWith('OP-INACTIVO')) || p.modalidad === 'REFINANCIACION');
        const totalAbonado = refinPagos.reduce((acc, p) => acc + (p.importe || 0), 0);

        const pagoInicialOriginal = cli.montoPagoInicialRefinanciacion !== undefined 
          ? cli.montoPagoInicialRefinanciacion 
          : Math.round((cli.montoDeudaInactivo || 150000) * 0.10);

        // If client paid towards refinancing initial payment OR pagoInicial is 0
        if (totalAbonado > 0 || cli.montoPagoInicialRefinanciacion === 0) {
          list.push({
            id: `OPORT-REFIN-${cli.id}`,
            tipoAlerta: 'REFINANCIACION_LISTA',
            categoriaAlertas: 'REFINANCIACIONES',
            cliente: cli,
            montoPagoInicialAbonado: totalAbonado,
            montoDeudaRestante: cli.montoDeudaInactivo || 0,
            detalleEstado: totalAbonado >= pagoInicialOriginal || cli.montoPagoInicialRefinanciacion === 0
              ? '✅ Pago Inicial de Refinanciación 100% abonado. Listo para estructurar nuevo crédito refinanciado.'
              : `⚡ Registró pago parcial de refinanciación ($${formatMoney(totalAbonado)}). Listo para armar plan de cuotas.`,
          });
        }
      });

      // B. REVISIÓN DE OPERACIONES Y CLASIFICACIÓN
      (operaciones || []).forEach(op => {
        if (!op) return;
        const cli = (clientes || []).find(c => c && c.id === op.idCliente);
        if (!cli) return;

        const opCuotas = (cuotas || []).filter(cu => cu && cu.idOperacion === op.id);
        const pendingCuotas = opCuotas.filter(c => c.estado !== 'PAGADA');
        const cuotasDebt = pendingCuotas.reduce((sum, c) => sum + (c.valorTotalCuota || c.saldoPendiente || 0), 0);
        const opSaldo = op.totalPendiente !== undefined ? op.totalPendiente : cuotasDebt;
        const hasPendingDebt = opSaldo > 0;

        // Calculate late interest
        const resumen = calcularInteresesAtrasoCredito(op, opCuotas, configuracion);
        const hasLateInterest = resumen.totalIntereses > 0;

        // Finished flag
        const isFinished = op.estado === 'FINALIZADA' || (opCuotas.length > 0 && opCuotas.every(c => c.estado === 'PAGADA'));

        // Real finalization date calculation
        const fechaFin = getFechaFinalizacionCredito(op, opCuotas);

        // CONDICIÓN REFINANCIACIÓN: Si tiene deuda pendiente o intereses por atraso generados -> REFINANCIACIÓN
        if (hasPendingDebt || hasLateInterest || (isFinished && resumen.cuotasConAtraso > 0)) {
          if (!list.some(item => item.cliente.id === cli.id && item.operacionAsociada?.id === op.id)) {
            list.push({
              id: `OPORT-FIN-CONATRASO-${op.id}`,
              tipoAlerta: 'CREDITO_FINALIZADO_ATRASO',
              categoriaAlertas: 'REFINANCIACIONES',
              cliente: cli,
              operacionAsociada: op,
              porcentajePagado: Math.round(((opCuotas.length - pendingCuotas.length) / (opCuotas.length || 1)) * 100),
              cuotasPagadas: opCuotas.length - pendingCuotas.length,
              cuotasPendientes: pendingCuotas.length,
              totalCuotas: opCuotas.length || op.cantidadCuotas || 0,
              resumenIntereses: resumen,
              montoDeudaRestante: opSaldo > 0 ? opSaldo : resumen.totalIntereses,
              detalleEstado: `⚠️ Crédito #${op.id} CON ATRASO/DEUDA. Se generaron $${formatMoney(resumen.totalIntereses)} en intereses por atraso (${resumen.cuotasConAtraso} cuotas atrasadas).`
            });
          }
        }
        // CONDICIÓN RENOVACIÓN: Deuda $0 y Sin Intereses de Mora ($0)
        else if (!hasPendingDebt && !hasLateInterest) {
          let semanaRenov: 'ESTA_SEMANA' | 'PROXIMA_SEMANA' | null = null;

          if (fechaFin) {
            if (fechaFin <= estaSemanaEnd) {
              // Finalizado previamente o finaliza entre Lunes y Sábado de esta semana
              semanaRenov = 'ESTA_SEMANA';
            } else if (fechaFin >= proximaSemanaStart && fechaFin <= proximaSemanaEnd) {
              // Finaliza entre Lunes y Sábado de la próxima semana
              semanaRenov = 'PROXIMA_SEMANA';
            }
          } else if (isFinished) {
            semanaRenov = 'ESTA_SEMANA';
          }

          if (semanaRenov) {
            if (!list.some(item => item.cliente.id === cli.id && item.operacionAsociada?.id === op.id)) {
              const totalCuo = opCuotas.length || op.cantidadCuotas || 1;
              const pagadasCount = opCuotas.filter(c => c.estado === 'PAGADA').length || op.cuotasPagadas || totalCuo;

              list.push({
                id: `OPORT-RENOV-${semanaRenov}-${op.id}`,
                tipoAlerta: 'RENOVACION_ELEGIBLE',
                categoriaAlertas: 'RENOVACIONES',
                semanaRenovacion: semanaRenov,
                fechaFinalizacionCalculada: fechaFin,
                cliente: cli,
                operacionAsociada: op,
                porcentajePagado: 100,
                cuotasPagadas: pagadasCount,
                cuotasPendientes: 0,
                totalCuotas: totalCuo,
                esAptoRenovacion: true,
                resumenIntereses: resumen,
                detalleEstado: semanaRenov === 'ESTA_SEMANA'
                  ? `🌟 Crédito #${op.id} finaliza/finalizó esta semana (${fechaFin ? formatShortDate(fechaFin) : 'Finalizado'}, Deuda $0). APTO RENOVACIÓN ESTA SEMANA.`
                  : `📅 Crédito #${op.id} finaliza próxima semana (${formatShortDate(fechaFin)}, Deuda $0). PROGRAMADO RENOVACIÓN PRÓXIMA SEMANA.`
              });
            }
          }
        }
      });

      // C. ALTAS / NUEVOS CRÉDITOS (Clientes en estado SOLICITANTE, PROSPECTO o sin operaciones)
      (clientes || []).forEach(cli => {
        if (!cli) return;
        const cliOps = (operaciones || []).filter(o => o && o.idCliente === cli.id);
        const isProspect = cli.estado === 'SOLICITANTE' || cli.estado === 'PROSPECTO' || cliOps.length === 0;

        if (isProspect) {
          if (!list.some(item => item.cliente.id === cli.id)) {
            list.push({
              id: `OPORT-ALTA-${cli.id}`,
              tipoAlerta: 'NUEVA_ALTA',
              categoriaAlertas: 'ALTAS',
              cliente: cli,
              detalleEstado: `✨ Cliente registrado listo para Otorgamiento de Primer Crédito (Estado: ${cli.estado || 'PROSPECTO'}).`
            });
          }
        }
      });

    } catch (err) {
      console.error("Error al calcular oportunidades:", err);
    }

    return list;
  }, [clientes, operaciones, cuotas, pagos, configuracion]);

  // Filtered Opportunities list
  const oportunidadesFiltradas = useMemo(() => {
    return oportunidades.filter(item => {
      // Category Filter
      if (categoriaFiltro === 'RENOVACION_ESTA_SEMANA') {
        if (item.categoriaAlertas !== 'RENOVACIONES' || item.semanaRenovacion !== 'ESTA_SEMANA') return false;
      } else if (categoriaFiltro === 'RENOVACION_PROXIMA_SEMANA') {
        if (item.categoriaAlertas !== 'RENOVACIONES' || item.semanaRenovacion !== 'PROXIMA_SEMANA') return false;
      } else if (categoriaFiltro === 'REFINANCIACION') {
        if (item.categoriaAlertas !== 'REFINANCIACIONES' && item.tipoAlerta !== 'CREDITO_FINALIZADO_ATRASO') return false;
      } else if (categoriaFiltro === 'REPORTE_MORA') {
        if (item.tipoAlerta !== 'CREDITO_FINALIZADO_ATRASO') return false;
      } else if (categoriaFiltro === 'ALTAS') {
        if (item.categoriaAlertas !== 'ALTAS') return false;
      }

      // Collector Filter
      if (cobradorFiltro !== 'TODOS') {
        const cob = item.cliente.cobradorAsignadoNombre || item.operacionAsociada?.cobrador;
        if (cob !== cobradorFiltro) return false;
      }

      // Search Filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const fullNombre = `${item.cliente.nombre} ${item.cliente.apellido || ''}`.toLowerCase();
        const dni = item.cliente.dni || '';
        const tel = item.cliente.telefono || '';
        const opId = item.operacionAsociada?.id || '';
        return fullNombre.includes(query) || dni.includes(query) || tel.includes(query) || opId.toLowerCase().includes(query);
      }

      return true;
    });
  }, [oportunidades, categoriaFiltro, cobradorFiltro, searchTerm]);

  const weekRanges = useMemo(() => getWeekRanges(new Date()), []);

  // Counts for summary cards
  const countEstaSemana = oportunidades.filter(o => o.categoriaAlertas === 'RENOVACIONES' && o.semanaRenovacion === 'ESTA_SEMANA').length;
  const countProximaSemana = oportunidades.filter(o => o.categoriaAlertas === 'RENOVACIONES' && o.semanaRenovacion === 'PROXIMA_SEMANA').length;
  const countRefinanciaciones = oportunidades.filter(o => o.categoriaAlertas === 'REFINANCIACIONES' && o.tipoAlerta !== 'CREDITO_FINALIZADO_ATRASO').length;
  const countReporteMora = oportunidades.filter(o => o.tipoAlerta === 'CREDITO_FINALIZADO_ATRASO').length;
  const countAltas = oportunidades.filter(o => o.categoriaAlertas === 'ALTAS').length;

  // Open Credit Generator Modal initialized with opportunity data
  const handleOpenCreditoModal = (item: ItemOportunidad) => {
    setSelectedItemCredito(item);
    
    // Set smart defaults
    if (item.tipoAlerta === 'REFINANCIACION_LISTA') {
      setTipoOperacionForm('REFINANCIACION');
      const capitalSugerido = item.montoDeudaRestante && item.montoDeudaRestante > 0 ? item.montoDeudaRestante : 100000;
      setCapitalEntregadoForm(capitalSugerido);
      setCantidadCuotasForm(20);
    } else if (item.tipoAlerta === 'CREDITO_FINALIZADO_ATRASO') {
      setTipoOperacionForm('REFINANCIACION');
      const totalMora = item.resumenIntereses?.totalIntereses || 50000;
      setCapitalEntregadoForm(totalMora);
      if (item.resumenIntereses?.cuotasInteresEquivalentes) {
        setCantidadCuotasForm(Math.max(1, Math.round(item.resumenIntereses.cuotasInteresEquivalentes)));
      } else {
        setCantidadCuotasForm(4);
      }
    } else {
      setTipoOperacionForm('RENOVACION');
      const capitalPrevio = item.operacionAsociada?.capitalEntregado || 100000;
      setCapitalEntregadoForm(capitalPrevio);
      setCantidadCuotasForm(20);
    }

    setFrecuenciaForm(item.operacionAsociada?.frecuencia || 'DIARIA');
    const today = new Date().toISOString().split('T')[0];
    setFechaOtorgamientoForm(today);

    // Calculate primer vencimiento
    const grantDate = new Date(today + 'T12:00:00');
    const nextDay = new Date(grantDate.getTime() + 24 * 60 * 60 * 1000);
    const calculatedFirst = obtenerProximoDiaHabil(nextDay, feriadosList);
    setPrimerVencimientoForm(calculatedFirst.toISOString().split('T')[0]);

    setCobradorAsignadoForm(item.cliente.cobradorAsignadoNombre || item.operacionAsociada?.cobrador || activeUser.nombre);
    setObservacionesForm(
      item.tipoAlerta === 'CREDITO_FINALIZADO_ATRASO'
        ? `Refinanciación de Mora Crédito #${item.operacionAsociada?.id || ''} ($${formatMoney(item.resumenIntereses?.totalIntereses)} = ${item.resumenIntereses?.cuotasInteresEquivalentes || 0} cuotas)`
        : `Otorgado desde Alertas & Oportunidades (${item.tipoAlerta})`
    );
  };

  // Submit Credit Creation
  const handleConfirmCrearCredito = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemCredito) return;

    const cli = selectedItemCredito.cliente;
    const newOpId = `OPE-${String(Date.now()).slice(-6)}`;

    // Calculate financial metrics
    const meses = calcularMesesFinanciados(frecuenciaForm, cantidadCuotasForm);
    let tasa = 50;
    if (frecuenciaForm === 'DIARIA') tasa = configuracion?.interesDiario ?? 50;
    else if (frecuenciaForm === 'SEMANAL') tasa = configuracion?.interesSemanal ?? 50;
    else if (frecuenciaForm === 'QUINCENAL') tasa = configuracion?.interesQuincenal ?? 50;
    else if (frecuenciaForm === 'MENSUAL') tasa = configuracion?.interesMensual ?? 50;

    const interesTotal = capitalEntregadoForm * (tasa / 100) * meses;
    const totalFinanciado = capitalEntregadoForm + interesTotal;
    const valorCuota = parseFloat((totalFinanciado / cantidadCuotasForm).toFixed(2));

    const nuevaOp: Operacion = {
      id: newOpId,
      idCliente: cli.id,
      nombreCliente: `${cli.nombre} ${cli.apellido || ''}`.trim(),
      fechaOtorgamiento: fechaOtorgamientoForm,
      capitalEntregado: capitalEntregadoForm,
      promocionAplicada: '',
      descuentoPorcentaje: 0,
      totalFinanciado,
      totalPendiente: totalFinanciado,
      capitalPendiente: capitalEntregadoForm,
      capitalRecuperado: 0,
      interesCobrado: 0,
      cantidadCuotas: cantidadCuotasForm,
      cuotasPagadas: 0,
      cuotasPendientes: cantidadCuotasForm,
      valorCuota,
      frecuencia: frecuenciaForm,
      estado: 'ACTIVA',
      tipoOperacion: tipoOperacionForm,
      descripcion: `Crédito ${tipoOperacionForm} - ${frecuenciaForm}`,
      primerVencimiento: primerVencimientoForm,
      ultimoVencimiento: '',
      proximoVencimiento: primerVencimientoForm,
      ultimoPago: '',
      captador: cli.captador || activeUser.nombre,
      analista: cli.analista || activeUser.nombre,
      ejecutivoAtencion: activeUser.nombre,
      cobrador: cobradorAsignadoForm || cli.cobradorAsignadoNombre || 'Administración',
      diasMora: 0,
      nivelMora: 'Normal',
      numeroCredito: (operaciones.filter(o => o.idCliente === cli.id).length) + 1,
      mesesFinanciados: meses,
      elegibleRenovacion: false,
      elegibleAmpliacion: false,
      fechaFinalizacion: '',
      motivoCierre: '',
      observaciones: observacionesForm,
      cuotasGeneradas: true
    };

    // Generate Plan Cuotas
    const nuevasCuotas = generarPlanCuotas(nuevaOp, feriadosList);
    if (nuevasCuotas.length > 0) {
      nuevaOp.ultimoVencimiento = nuevasCuotas[nuevasCuotas.length - 1].fechaVencimiento;
    }

    // Call onAddOperacion
    onAddOperacion(nuevaOp, nuevasCuotas);

    // If client was INACTIVO or had inactive debt, update client to ACTIVO
    if (cli.estado === 'INACTIVO' || (cli.montoDeudaInactivo && cli.montoDeudaInactivo > 0) || (cli.montoPagoInicialRefinanciacion && cli.montoPagoInicialRefinanciacion > 0)) {
      onUpdateCliente({
        ...cli,
        estado: 'ACTIVO',
        montoDeudaInactivo: 0,
        montoPagoInicialRefinanciacion: 0
      });
    }

    setSelectedItemCredito(null);
    alert(`🎉 ¡Crédito #${newOpId} por $${formatMoney(totalFinanciado)} otorgado con éxito a ${cli.nombre} ${cli.apellido || ''}!\nSe generaron ${nuevasCuotas.length} cuotas.`);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner with Blinking Alert Indicator */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border-2 border-emerald-500/80 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4 z-10">
          <div className="relative">
            <div className="w-12 h-12 bg-emerald-600 text-slate-950 rounded-2xl flex items-center justify-center font-black shadow-lg">
              <Bell className="w-6 h-6 animate-bounce text-slate-950" />
            </div>
            {oportunidades.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-amber-400 text-slate-950 text-xs font-black px-2 py-0.5 rounded-full border-2 border-slate-950 animate-pulse">
                {oportunidades.length}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white tracking-wide">ALERTAS</h1>
              <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-amber-400/40 animate-pulse flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" /> Atenciones Pendientes
              </span>
            </div>
            <p className="text-xs text-emerald-200/90 font-medium mt-1">
              Refinanciaciones · Renovaciones · Nuevos Créditos
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
          <button 
            onClick={() => setCategoriaFiltro('TODAS')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              categoriaFiltro === 'TODAS'
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-md font-black'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            Ver Todas ({oportunidades.length})
          </button>
          <button 
            onClick={() => setCategoriaFiltro(categoriaFiltro === 'RENOVACION_ESTA_SEMANA' ? 'TODAS' : 'RENOVACION_ESTA_SEMANA')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              categoriaFiltro === 'RENOVACION_ESTA_SEMANA'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md font-black'
                : 'bg-slate-800 text-emerald-300 border-slate-700 hover:text-white'
            }`}
          >
            Esta semana ({countEstaSemana})
          </button>
          <button 
            onClick={() => setCategoriaFiltro(categoriaFiltro === 'RENOVACION_PROXIMA_SEMANA' ? 'TODAS' : 'RENOVACION_PROXIMA_SEMANA')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              categoriaFiltro === 'RENOVACION_PROXIMA_SEMANA'
                ? 'bg-teal-600 text-white border-teal-400 shadow-md font-black'
                : 'bg-slate-800 text-teal-300 border-slate-700 hover:text-white'
            }`}
          >
            Próxima semana ({countProximaSemana})
          </button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <button
          onClick={() => setCategoriaFiltro(categoriaFiltro === 'RENOVACION_ESTA_SEMANA' ? 'TODAS' : 'RENOVACION_ESTA_SEMANA')}
          className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex items-center justify-between ${
            categoriaFiltro === 'RENOVACION_ESTA_SEMANA'
              ? 'bg-emerald-950/90 border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-emerald-600/60'
          }`}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block mb-0.5">
              Renovaciones — Esta semana ({countEstaSemana})
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{countEstaSemana}</span>
              <span className="text-[10px] text-emerald-300 font-medium">Del {formatShortDate(weekRanges.estaSemanaStart)} al {formatShortDate(weekRanges.estaSemanaEnd)}</span>
            </div>
          </div>
          <div className="w-9 h-9 bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 rounded-xl flex items-center justify-center shrink-0">
            <RefreshCw className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => setCategoriaFiltro(categoriaFiltro === 'RENOVACION_PROXIMA_SEMANA' ? 'TODAS' : 'RENOVACION_PROXIMA_SEMANA')}
          className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex items-center justify-between ${
            categoriaFiltro === 'RENOVACION_PROXIMA_SEMANA'
              ? 'bg-teal-950/90 border-teal-400 ring-2 ring-teal-500/40 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-teal-600/60'
          }`}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-teal-400 block mb-0.5">
              Renovaciones — Próxima semana ({countProximaSemana})
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{countProximaSemana}</span>
              <span className="text-[10px] text-teal-300 font-medium">Del {formatShortDate(weekRanges.proximaSemanaStart)} al {formatShortDate(weekRanges.proximaSemanaEnd)}</span>
            </div>
          </div>
          <div className="w-9 h-9 bg-teal-900/60 border border-teal-500/40 text-teal-300 rounded-xl flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => setCategoriaFiltro(categoriaFiltro === 'REFINANCIACION' ? 'TODAS' : 'REFINANCIACION')}
          className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex items-center justify-between ${
            categoriaFiltro === 'REFINANCIACION'
              ? 'bg-purple-950/80 border-purple-400 ring-2 ring-purple-500/30'
              : 'bg-slate-900 border-slate-800 hover:border-purple-600/60'
          }`}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block mb-0.5">
              REFINANCIACIONES ({countRefinanciaciones})
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{countRefinanciaciones}</span>
              <span className="text-[10px] text-purple-300 font-medium">Con atraso / Deuda inactiva</span>
            </div>
          </div>
          <div className="w-9 h-9 bg-purple-900/60 border border-purple-500/40 text-purple-300 rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => setCategoriaFiltro(categoriaFiltro === 'REPORTE_MORA' ? 'TODAS' : 'REPORTE_MORA')}
          className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex items-center justify-between ${
            categoriaFiltro === 'REPORTE_MORA'
              ? 'bg-rose-950/90 border-rose-400 ring-2 ring-rose-500/40 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-rose-600/60'
          }`}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block mb-0.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-400" /> REPORTE DE MORA ({countReporteMora})
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{countReporteMora}</span>
              <span className="text-[10px] text-rose-300 font-medium">Créditos p/ Mora</span>
            </div>
          </div>
          <div className="w-9 h-9 bg-rose-900/60 border border-rose-500/40 text-rose-300 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign className="w-4 h-4" />
          </div>
        </button>

        <button
          onClick={() => setCategoriaFiltro(categoriaFiltro === 'ALTAS' ? 'TODAS' : 'ALTAS')}
          className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer flex items-center justify-between ${
            categoriaFiltro === 'ALTAS'
              ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-500/30'
              : 'bg-slate-900 border-slate-800 hover:border-amber-600/60'
          }`}
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-0.5">
              ALTAS / NUEVOS CRÉDITOS ({countAltas})
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{countAltas}</span>
              <span className="text-[10px] text-amber-300 font-medium">Primer crédito</span>
            </div>
          </div>
          <div className="w-9 h-9 bg-amber-900/60 border border-amber-500/40 text-amber-300 rounded-xl flex items-center justify-center shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, DNI, teléfono o #crédito..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 text-white pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-700 focus:outline-none focus:border-emerald-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 px-3 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-slate-300 font-bold">Cobrador:</span>
            <select
              value={cobradorFiltro}
              onChange={(e) => setCobradorFiltro(e.target.value)}
              className="bg-transparent text-xs font-bold text-emerald-400 focus:outline-none cursor-pointer"
            >
              <option value="TODOS" className="bg-slate-900 text-white">Todos los cobradores</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.nombre} className="bg-slate-900 text-white">
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Opportunities List */}
      <div className="space-y-4">
        {oportunidadesFiltradas.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 p-12 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto opacity-60" />
            <p className="text-base font-extrabold text-slate-200">No hay alertas de oportunidad pendientes bajo este filtro</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Todos los clientes están al día o no se encontraron casos que requieran atención de refinanciación o renovación inmediata.
            </p>
          </div>
        ) : (
          oportunidadesFiltradas.map((item) => {
            const cli = item.cliente;
            const op = item.operacionAsociada;

            return (
              <div 
                key={item.id}
                className={`bg-slate-900 border rounded-2xl p-5 shadow-lg transition-all hover:border-slate-600 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden ${
                  item.tipoAlerta === 'REFINANCIACION_LISTA' || item.tipoAlerta === 'CREDITO_FINALIZADO_ATRASO'
                    ? 'border-purple-500/60 bg-gradient-to-r from-purple-950/30 via-slate-900 to-slate-900'
                    : item.tipoAlerta === 'RENOVACION_ELEGIBLE'
                    ? 'border-emerald-500/60 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900'
                    : 'border-amber-500/60 bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-900'
                }`}
              >
                {/* Left side: Client Info & Status Badge */}
                <div className="space-y-2 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Badge */}
                    {item.tipoAlerta === 'REFINANCIACION_LISTA' && (
                      <span className="bg-purple-500/20 text-purple-300 border border-purple-400/40 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-purple-300" /> Refinanciación Lista
                      </span>
                    )}
                    {item.tipoAlerta === 'CREDITO_FINALIZADO_ATRASO' && (
                      <span className="bg-rose-500/20 text-rose-300 border border-rose-400/40 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-300" /> Crédito Finalizado CON ATRASO
                      </span>
                    )}
                    {item.tipoAlerta === 'RENOVACION_ELEGIBLE' && (
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1 border ${
                        item.semanaRenovacion === 'ESTA_SEMANA'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                          : 'bg-teal-500/20 text-teal-300 border-teal-400/40'
                      }`}>
                        <RefreshCw className="w-3 h-3" /> 
                        {item.semanaRenovacion === 'ESTA_SEMANA'
                          ? `RENOVACIÓN — ESTA SEMANA ${item.fechaFinalizacionCalculada ? `(Fin: ${formatShortDate(item.fechaFinalizacionCalculada)})` : ''}`
                          : `RENOVACIÓN — PRÓXIMA SEMANA ${item.fechaFinalizacionCalculada ? `(Fin: ${formatShortDate(item.fechaFinalizacionCalculada)})` : ''}`}
                      </span>
                    )}
                    {item.tipoAlerta === 'PROXIMO_A_FINALIZAR' && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-300" /> Restan {item.cuotasPendientes} cuotas
                      </span>
                    )}
                    {item.tipoAlerta === 'NUEVA_ALTA' && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex items-center gap-1">
                        <UserPlus className="w-3 h-3 text-amber-300" /> Alta / Nuevo Cliente
                      </span>
                    )}

                    <span className="text-xs font-bold text-slate-400">DNI: {cli.dni}</span>
                    {cli.cobradorAsignadoNombre && (
                      <span className="text-[11px] font-extrabold text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800">
                        Cobrador: {cli.cobradorAsignadoNombre}
                      </span>
                    )}
                  </div>

                  {/* Name and Contact */}
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-black text-white">{cli.nombre} {cli.apellido || ''}</h2>
                    {cli.telefono && (
                      <a 
                        href={`https://wa.me/${String(cli.telefono).replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-bold px-2 py-1 rounded-lg border border-emerald-500/40 flex items-center gap-1 transition-colors"
                        title="Contactar vía WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>

                  {/* Detail description line */}
                  <p className="text-xs text-slate-300 font-medium bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 leading-relaxed">
                    {item.detalleEstado}
                  </p>

                  {/* Prominent Reporte de Mora Block for CREDITO_FINALIZADO_ATRASO */}
                  {item.tipoAlerta === 'CREDITO_FINALIZADO_ATRASO' && item.resumenIntereses && (
                    <div className="bg-rose-950/80 border-2 border-rose-500/80 rounded-2xl p-3.5 space-y-2 mt-2 shadow-inner">
                      <div className="flex items-center justify-between text-rose-300 font-black text-xs">
                        <span className="flex items-center gap-1.5 uppercase tracking-wider">
                          <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                          REPORTE DE MORA — REFINANCIACIÓN REQUERIDA
                        </span>
                        <span className="bg-rose-900/90 text-rose-200 px-2.5 py-0.5 rounded-md border border-rose-700 text-[11px] font-black">
                          {item.resumenIntereses.cuotasConAtraso} cuota(s) abonada(s) fuera de fecha
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-950/90 p-3 rounded-xl border border-rose-900/60 text-xs">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-extrabold block">TOTAL MORA REFINANCIADA:</span>
                          <span className="text-rose-300 font-black text-sm">${formatMoney(item.resumenIntereses.totalIntereses)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-extrabold block">VALOR CUOTA REFERENCIA:</span>
                          <span className="text-white font-bold">${formatMoney(item.resumenIntereses.valorCuota)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase font-extrabold block">CÁLCULO CUOTAS DE MORA:</span>
                          <span className="text-amber-300 font-black text-sm">{item.resumenIntereses.cuotasInteresEquivalentes} cuotas</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-rose-200/90 font-medium italic">
                        💡 <strong>Cálculo Automático:</strong> ${formatMoney(item.resumenIntereses.totalIntereses)} (Suma de mora por cuotas atrasadas) ÷ ${formatMoney(item.resumenIntereses.valorCuota)} (Cuota anterior) = <strong>{item.resumenIntereses.cuotasInteresEquivalentes} cuotas de mora</strong>.
                      </p>
                    </div>
                  )}

                  {/* Financial Mini Metrics */}
                  <div className="flex flex-wrap items-center gap-4 text-xs font-extrabold text-slate-300">
                    {item.montoPagoInicialAbonado !== undefined && (
                      <span className="text-purple-300">
                        Pago Inicial Abonado: <strong className="text-white">${formatMoney(item.montoPagoInicialAbonado)}</strong>
                      </span>
                    )}
                    {item.montoDeudaRestante !== undefined && item.montoDeudaRestante > 0 && (
                      <span className="text-rose-300">
                        Deuda Inactiva Restante: <strong className="text-white">${formatMoney(item.montoDeudaRestante)}</strong>
                      </span>
                    )}
                    {op && (
                      <>
                        <span className="text-emerald-300">
                          Crédito Original: <strong className="text-white">${formatMoney(op.totalFinanciado)}</strong>
                        </span>
                        <span className="text-amber-300">
                          Cuotas: <strong className="text-white">{item.cuotasPagadas} / {item.totalCuotas}</strong> ({op.frecuencia})
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right side: Action Buttons */}
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
                  {item.tipoAlerta === 'CREDITO_FINALIZADO_ATRASO' && item.resumenIntereses && op ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
                        <button
                          onClick={() => setSelectedResumenInteresesModal({ op, resumen: item.resumenIntereses! })}
                          className="px-3.5 py-2 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-500/60 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:scale-[1.01]"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-300" />
                          <span>🔍 Ver Reporte Detallado</span>
                        </button>

                        <button
                          onClick={() => exportReporteMoraPDF(item.cliente, op, item.resumenIntereses!)}
                          className="px-3.5 py-2 rounded-xl bg-amber-950/90 hover:bg-amber-900 text-amber-300 border border-amber-500/70 text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:scale-[1.01]"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-400" />
                          <span>📄 Exportar Reporte PDF</span>
                        </button>

                        <button
                          onClick={() => handleOpenAbonarPagoUnico(item)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.01]"
                        >
                          <DollarSign className="w-4 h-4 text-emerald-200" />
                          <span>💵 Abonar en 1 Solo Pago (${formatMoney(item.resumenIntereses.totalIntereses)})</span>
                        </button>

                        <button
                          onClick={() => handleOpenCreditoModal(item)}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 text-white text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:scale-[1.01]"
                        >
                          <Briefcase className="w-3.5 h-3.5 text-white" />
                          <span>⚡ Generar Crédito en Cuotas ({item.resumenIntereses.cuotasInteresEquivalentes} cuotas)</span>
                        </button>

                        <button
                          onClick={() => handleOpenCompromiso(item)}
                          className="px-3.5 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/50 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs hover:scale-[1.01]"
                        >
                          <Handshake className="w-3.5 h-3.5 text-indigo-400" />
                          <span>🤝 Compromiso de Pago</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2">
                        {item.resumenIntereses && item.resumenIntereses.totalIntereses > 0 && op && (
                          <button
                            onClick={() => setSelectedResumenInteresesModal({ op, resumen: item.resumenIntereses! })}
                            className="px-3.5 py-2 rounded-xl bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-500/50 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-purple-300" />
                            <span>Ver Intereses por Atraso (${formatMoney(item.resumenIntereses.totalIntereses)})</span>
                          </button>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setSelectedItemFicha(item)}
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-teal-400" />
                            <span>Ver Ficha</span>
                          </button>

                          {(item.resumenIntereses?.totalIntereses || item.montoDeudaRestante || (item.cliente.montoDeudaInactivo || 0)) > 0 && (
                            <button
                              onClick={() => handleOpenAbonarPagoUnico(item)}
                              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-emerald-200" />
                              <span>💵 1 Solo Pago</span>
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleOpenCreditoModal(item)}
                            className="flex-1 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:scale-[1.01]"
                          >
                            <Briefcase className="w-3.5 h-3.5 text-slate-950" />
                            <span>Otorgar Crédito</span>
                          </button>

                          <button
                            onClick={() => handleOpenCompromiso(item)}
                            className="px-3 py-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/50 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Handshake className="w-3.5 h-3.5 text-indigo-400" />
                            <span>🤝 Compromiso</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: VIEW CLIENT PROFILE / LAST SITUATION */}
      {selectedItemFicha && selectedItemFicha.cliente && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-slate-700 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-800 text-white rounded-xl flex items-center justify-center font-black">
                  <User className="w-5 h-5 text-teal-300" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Ficha y Situación del Cliente
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold">
                    {selectedItemFicha.cliente.nombre} {selectedItemFicha.cliente.apellido || ''} — DNI {selectedItemFicha.cliente.dni || '-'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedItemFicha(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs font-medium text-slate-300">
              {/* Personal Data Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-extrabold text-emerald-400 uppercase tracking-wider text-[11px]">Datos Personales & Contacto</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div><strong>Teléfono:</strong> {selectedItemFicha.cliente.telefono || 'Sin registrar'}</div>
                  <div><strong>Dirección:</strong> {selectedItemFicha.cliente.direccion || 'Sin registrar'}</div>
                  <div><strong>Trabajo:</strong> {selectedItemFicha.cliente.trabajo || 'Comerciante'}</div>
                  <div><strong>Estado Actual:</strong> <span className="font-black text-amber-400">{selectedItemFicha.cliente.estado}</span></div>
                  <div><strong>Cobrador Asignado:</strong> {selectedItemFicha.cliente.cobradorAsignadoNombre || 'No asignado'}</div>
                  <div><strong>Captador/Analista:</strong> {selectedItemFicha.cliente.captador || 'Sistema'} / {selectedItemFicha.cliente.analista || 'Sistema'}</div>
                </div>
              </div>

              {/* Debt & Refinancing Summary Box */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-extrabold text-purple-400 uppercase tracking-wider text-[11px]">Estado de Deuda y Refinanciación</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <strong>Deuda Inactiva Registrada:</strong> ${ formatMoney(selectedItemFicha.cliente.montoDeudaInactivo) }
                  </div>
                  <div>
                    <strong>Pago Inicial Refinanciación Restante:</strong> ${ formatMoney(selectedItemFicha.cliente.montoPagoInicialRefinanciacion) }
                  </div>
                </div>
                <div className="mt-2 text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  {selectedItemFicha.detalleEstado}
                </div>
              </div>

              {/* History of Recent Operations */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-teal-400 uppercase tracking-wider text-[11px]">Historial de Operaciones</h4>
                {operaciones.filter(o => o.idCliente === selectedItemFicha.cliente.id).length === 0 ? (
                  <p className="text-slate-500 italic">No posee operaciones activas registradas en el historial.</p>
                ) : (
                  <div className="space-y-2">
                    {operaciones.filter(o => o.idCliente === selectedItemFicha.cliente.id).map(op => (
                      <div key={op.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-white">Crédito #{op.id} ({op.frecuencia})</div>
                          <div className="text-[11px] text-slate-400">
                            Otorgado: {op.fechaOtorgamiento} | Total Financiado: ${formatMoney(op.totalFinanciado)}
                          </div>
                        </div>
                        <span className="bg-slate-800 text-emerald-400 px-2 py-1 rounded text-[10px] font-black">
                          {op.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between">
              <button 
                onClick={() => setSelectedItemFicha(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>

              <button
                onClick={() => {
                  const item = selectedItemFicha;
                  setSelectedItemFicha(null);
                  handleOpenCreditoModal(item);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black cursor-pointer flex items-center gap-1.5"
              >
                <Briefcase className="w-4 h-4 text-slate-950" />
                <span>Estructurar Nuevo Crédito Ahora</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GENERATE NEW CREDIT / RENEWAL / REFINANCING */}
      {selectedItemCredito && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border-2 border-emerald-500/80 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl my-8">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-950 via-slate-950 to-slate-950 p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 text-slate-950 rounded-xl flex items-center justify-center font-black">
                  <Briefcase className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Otorgar Nuevo Crédito / Renovación
                  </h3>
                  <p className="text-xs text-emerald-300 font-bold">
                    Cliente: {selectedItemCredito.cliente.nombre} {selectedItemCredito.cliente.apellido || ''} (DNI {selectedItemCredito.cliente.dni})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedItemCredito(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmCrearCredito} className="p-6 space-y-4 text-xs font-bold text-slate-200">
              
              {/* Type of Operation */}
              <div className="space-y-1">
                <label className="text-emerald-400 block font-extrabold">Modalidad / Tipo de Operación:</label>
                <select
                  value={tipoOperacionForm}
                  onChange={(e) => setTipoOperacionForm(e.target.value as any)}
                  className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="RENOVACION">🔄 RENOVACIÓN CON/SIN AMPLIACIÓN</option>
                  <option value="REFINANCIACION">⚡ REFINANCIACIÓN DE DEUDA</option>
                  <option value="NUEVO">✨ NUEVO CRÉDITO ESTÁNDAR</option>
                  <option value="AMPLIACION">📈 AMPLIACIÓN DE MONTO</option>
                </select>
              </div>

              {/* Amount & Frequency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-emerald-400 block font-extrabold">Monto Solicitado / Capital ($):</label>
                  <input
                    type="number"
                    value={capitalEntregadoForm}
                    onChange={(e) => setCapitalEntregadoForm(Number(e.target.value))}
                    className="w-full bg-slate-950 text-white font-black text-sm p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                    required
                    min={1000}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-emerald-400 block font-extrabold">Frecuencia de Cobro:</label>
                  <select
                    value={frecuenciaForm}
                    onChange={(e) => {
                      const frec = e.target.value as FrecuenciaPago;
                      setFrecuenciaForm(frec);
                      if (frec === 'DIARIA') setCantidadCuotasForm(20);
                      else if (frec === 'SEMANAL') setCantidadCuotasForm(8);
                      else if (frec === 'QUINCENAL') setCantidadCuotasForm(4);
                      else if (frec === 'MENSUAL') setCantidadCuotasForm(4);
                    }}
                    className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="DIARIA">DIARIA (Lunes a Sábado)</option>
                    <option value="SEMANAL">SEMANAL (Cada 7 días)</option>
                    <option value="QUINCENAL">QUINCENAL (Cada 15 días)</option>
                    <option value="MENSUAL">MENSUAL (Cada 30 días)</option>
                  </select>
                </div>
              </div>

              {/* Installments & Grant Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 block font-bold">Cantidad Cuotas:</label>
                  <input
                    type="number"
                    value={cantidadCuotasForm}
                    onChange={(e) => setCantidadCuotasForm(Number(e.target.value))}
                    className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                    required
                    min={1}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 block font-bold">Fecha Otorgamiento:</label>
                  <input
                    type="date"
                    value={fechaOtorgamientoForm}
                    onChange={(e) => setFechaOtorgamientoForm(e.target.value)}
                    className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 block font-bold">Primer Vencimiento:</label>
                  <input
                    type="date"
                    value={primerVencimientoForm}
                    onChange={(e) => setPrimerVencimientoForm(e.target.value)}
                    className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Assigned Staff */}
              <div className="space-y-1">
                <label className="text-slate-300 block font-bold">Cobrador Asignado:</label>
                <select
                  value={cobradorAsignadoForm}
                  onChange={(e) => setCobradorAsignadoForm(e.target.value)}
                  className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Seleccionar Cobrador --</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.nombre}>
                      {u.nombre} ({u.rolId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-slate-300 block font-bold">Observaciones Internas:</label>
                <input
                  type="text"
                  value={observacionesForm}
                  onChange={(e) => setObservacionesForm(e.target.value)}
                  className="w-full bg-slate-950 text-white font-medium p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Computed Live Financial Summary Preview */}
              {(() => {
                const meses = calcularMesesFinanciados(frecuenciaForm, cantidadCuotasForm);
                let tasa = 50;
                if (frecuenciaForm === 'DIARIA') tasa = configuracion?.interesDiario ?? 50;
                else if (frecuenciaForm === 'SEMANAL') tasa = configuracion?.interesSemanal ?? 50;
                else if (frecuenciaForm === 'QUINCENAL') tasa = configuracion?.interesQuincenal ?? 50;
                else if (frecuenciaForm === 'MENSUAL') tasa = configuracion?.interesMensual ?? 50;

                const interesTotal = capitalEntregadoForm * (tasa / 100) * meses;
                const totalFinanciado = capitalEntregadoForm + interesTotal;
                const valCuota = parseFloat((totalFinanciado / (cantidadCuotasForm || 1)).toFixed(2));

                return (
                  <div className="bg-emerald-950/60 border border-emerald-600/60 p-4 rounded-xl space-y-2 text-emerald-200">
                    <div className="text-[11px] font-black uppercase text-emerald-400">Resumen Financiero Simulado:</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div>Tasa Aplicada: <strong className="text-white">{tasa}%</strong></div>
                      <div>Total Financiado: <strong className="text-white">${formatMoney(totalFinanciado)}</strong></div>
                      <div>Valor Cuota ({cantidadCuotasForm}): <strong className="text-white">${formatMoney(valCuota)}</strong></div>
                    </div>
                  </div>
                );
              })()}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedItemCredito(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black cursor-pointer shadow-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  <span>Confirmar y Otorgar Crédito</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REPORTE DE MORA Y DESGLOSE DE INTERESES DE CRÉDITO FINALIZADO */}
      {selectedResumenInteresesModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-rose-500/80 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-slate-950 p-4 border-b border-rose-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-950 text-rose-300 rounded-xl flex items-center justify-center font-black border border-rose-700/60">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Reporte de Mora y Desglose de Cuotas</h3>
                  <p className="text-xs text-rose-300 font-medium">
                    Crédito #{selectedResumenInteresesModal.op.id} ({selectedResumenInteresesModal.op.frecuencia}) — Cliente: {selectedResumenInteresesModal.resumen.nombreCliente}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedResumenInteresesModal(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="bg-rose-950/60 border border-rose-500/40 p-3 rounded-xl text-center">
                  <span className="text-[10px] font-black uppercase text-rose-300 block">Total Intereses Generados</span>
                  <span className="text-lg font-black text-white">${formatMoney(selectedResumenInteresesModal.resumen.totalIntereses)}</span>
                </div>
                <div className="bg-amber-950/60 border border-amber-500/40 p-3 rounded-xl text-center">
                  <span className="text-[10px] font-black uppercase text-amber-300 block">Valor Cuota Referencia</span>
                  <span className="text-lg font-black text-white">${formatMoney(selectedResumenInteresesModal.resumen.valorCuota)}</span>
                </div>
                <div className="bg-purple-950/60 border border-purple-500/40 p-3 rounded-xl text-center">
                  <span className="text-[10px] font-black uppercase text-purple-300 block">Equivalente en Cuotas</span>
                  <span className="text-lg font-black text-purple-200">{selectedResumenInteresesModal.resumen.cuotasInteresEquivalentes} cuotas</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Cuotas en Mora</span>
                  <span className="text-lg font-black text-amber-400">{selectedResumenInteresesModal.resumen.cuotasConAtraso}</span>
                </div>
              </div>

              {/* Detail banner */}
              <div className="bg-rose-950/40 border border-rose-800/80 p-3 rounded-xl text-xs text-rose-200 flex items-center justify-between">
                <span>
                  <b>Fórmula de Política:</b> Aplica interés a partir del día <b>{selectedResumenInteresesModal.resumen.detalles[0]?.umbralDiasAplicado || 3}</b> de atraso ({selectedResumenInteresesModal.resumen.detalles[0]?.porcentajeAplicado || 50}% sobre la cuota por {selectedResumenInteresesModal.resumen.detalles[0]?.unidadPeriodo || 'días'}).
                </span>
                <span className="font-extrabold text-amber-300 text-xs">
                  {selectedResumenInteresesModal.resumen.cuotasInteresEquivalentes} cuotas de interés
                </span>
              </div>

              {/* Table of Late Cuotas */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400">
                      <th className="p-3">N° Cuota</th>
                      <th className="p-3">Vencimiento</th>
                      <th className="p-3">Fecha Pago</th>
                      <th className="p-3 text-center">Atraso</th>
                      <th className="p-3 text-center">Umbral Aplicado</th>
                      <th className="p-3 text-right">Interés Generado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs font-medium">
                    {selectedResumenInteresesModal.resumen.detalles.map((item) => (
                      <tr key={item.numeroCuota} className="hover:bg-slate-900/50">
                        <td className="p-3 text-white font-bold">Cuota #{item.numeroCuota}</td>
                        <td className="p-3 text-slate-300">{item.fechaVencimiento || '-'}</td>
                        <td className="p-3 text-slate-300">{item.fechaPago || '-'}</td>
                        <td className="p-3 text-center">
                          <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[11px] font-bold">
                            {item.diasAtraso} días ({item.periodosAtraso} {item.unidadPeriodo})
                          </span>
                        </td>
                        <td className="p-3 text-center text-slate-400 text-[11px]">
                          Día {item.umbralDiasAplicado}+ ({item.porcentajeAplicado}%)
                        </td>
                        <td className="p-3 text-right text-rose-300 font-extrabold">
                          ${formatMoney(item.interesGenerado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-rose-300 font-bold">
                💡 Crédito por Mora listo: <strong>${formatMoney(selectedResumenInteresesModal.resumen.totalIntereses)} ({selectedResumenInteresesModal.resumen.cuotasInteresEquivalentes} cuotas de ${formatMoney(selectedResumenInteresesModal.resumen.valorCuota)})</strong>
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedResumenInteresesModal(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Cerrar
                </button>

                <button
                  onClick={() => {
                    const op = selectedResumenInteresesModal.op;
                    const res = selectedResumenInteresesModal.resumen;
                    const foundCli = clientes.find(c => c.id === op.idCliente);
                    const cli: Cliente = foundCli || {
                      id: op.idCliente,
                      nombre: op.nombreCliente,
                      apellido: '',
                      dni: '',
                      telefono: '',
                      direccion: '',
                      cobradorAsignadoNombre: op.cobrador,
                      estado: 'ACTIVO',
                      fechaRegistro: new Date().toISOString().split('T')[0],
                      trabajo: '',
                      ingresos: 0,
                      captador: op.captador || '',
                      analista: op.analista || '',
                    };
                    exportReporteMoraPDF(cli, op, res);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-2 hover:scale-[1.01]"
                >
                  <FileText className="w-4 h-4 text-slate-950" />
                  <span>📄 Exportar PDF</span>
                </button>

                <button
                  onClick={() => {
                    const op = selectedResumenInteresesModal.op;
                    const res = selectedResumenInteresesModal.resumen;
                    const foundCli = clientes.find(c => c.id === op.idCliente);
                    const cli: Cliente = foundCli || {
                      id: op.idCliente,
                      nombre: op.nombreCliente,
                      apellido: '',
                      dni: '',
                      telefono: '',
                      direccion: '',
                      cobradorAsignadoNombre: op.cobrador,
                      estado: 'ACTIVO',
                      fechaRegistro: new Date().toISOString().split('T')[0],
                      trabajo: '',
                      ingresos: 0,
                      captador: op.captador || '',
                      analista: op.analista || '',
                    };
                    const itemOpp = oportunidades.find(o => o.operacionAsociada?.id === op.id) || {
                      id: `OPORT-${op.id}`,
                      tipoAlerta: 'CREDITO_FINALIZADO_ATRASO' as const,
                      cliente: cli,
                      operacionAsociada: op,
                      categoriaAlertas: 'REPORTE_MORA' as const,
                      detalleEstado: `Mora acumulada: $${formatMoney(res.totalIntereses)}`,
                      resumenIntereses: res
                    };
                    handleOpenAbonarPagoUnico(itemOpp);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer shadow-md flex items-center gap-2 hover:scale-[1.01]"
                >
                  <DollarSign className="w-4 h-4 text-white" />
                  <span>💵 Abonar en 1 Solo Pago (${formatMoney(selectedResumenInteresesModal.resumen.totalIntereses)})</span>
                </button>

                <button
                  onClick={() => {
                    const op = selectedResumenInteresesModal.op;
                    const res = selectedResumenInteresesModal.resumen;
                    const itemOpp = oportunidades.find(o => o.operacionAsociada?.id === op.id);
                    setSelectedResumenInteresesModal(null);
                    
                    if (itemOpp) {
                      handleOpenCreditoModal(itemOpp);
                    } else {
                      const foundCli = clientes.find(c => c.id === op.idCliente);
                      const cli: Cliente = foundCli || {
                        id: op.idCliente,
                        nombre: op.nombreCliente,
                        apellido: '',
                        dni: '',
                        telefono: '',
                        direccion: '',
                        cobradorAsignadoNombre: op.cobrador,
                        estado: 'ACTIVO',
                        fechaRegistro: new Date().toISOString().split('T')[0],
                        trabajo: '',
                        ingresos: 0,
                        captador: op.captador || '',
                        analista: op.analista || '',
                      };

                      const fallbackItem: ItemOportunidad = {
                        id: `OPORT-${op.id}`,
                        tipoAlerta: 'CREDITO_FINALIZADO_ATRASO',
                        cliente: cli,
                        operacionAsociada: op,
                        categoriaAlertas: 'REPORTE_MORA',
                        detalleEstado: `Refinanciación por mora acumulada: $${formatMoney(res.totalIntereses)}`,
                        resumenIntereses: res
                      };
                      handleOpenCreditoModal(fallbackItem);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg flex items-center gap-2 hover:scale-[1.01]"
                >
                  <Briefcase className="w-4 h-4 text-white" />
                  <span>⚡ Generar Crédito ({selectedResumenInteresesModal.resumen.cuotasInteresEquivalentes} cuotas)</span>
                </button>

                <button
                  onClick={() => {
                    const op = selectedResumenInteresesModal.op;
                    const res = selectedResumenInteresesModal.resumen;
                    const foundCli = clientes.find(c => c.id === op.idCliente);
                    const cli: Cliente = foundCli || {
                      id: op.idCliente,
                      nombre: op.nombreCliente,
                      apellido: '',
                      dni: '',
                      telefono: '',
                      direccion: '',
                      cobradorAsignadoNombre: op.cobrador,
                      estado: 'ACTIVO',
                      fechaRegistro: new Date().toISOString().split('T')[0],
                      trabajo: '',
                      ingresos: 0,
                      captador: op.captador || '',
                      analista: op.analista || '',
                    };
                    const itemOpp = oportunidades.find(o => o.operacionAsociada?.id === op.id) || {
                      id: `OPORT-${op.id}`,
                      tipoAlerta: 'CREDITO_FINALIZADO_ATRASO' as const,
                      cliente: cli,
                      operacionAsociada: op,
                      categoriaAlertas: 'REPORTE_MORA' as const,
                      detalleEstado: `Mora acumulada: $${formatMoney(res.totalIntereses)}`,
                      resumenIntereses: res
                    };
                    handleOpenCompromiso(itemOpp);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/60 text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-2"
                >
                  <Handshake className="w-4 h-4 text-indigo-300" />
                  <span>🤝 Compromiso</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 4: ABONAR EN 1 SOLO PAGO */}
      {modalAbonarPagoUnico && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-emerald-500/80 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-slate-950 p-4 border-b border-emerald-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-950 text-emerald-400 rounded-xl flex items-center justify-center font-black border border-emerald-700/60">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Abonar Mora en 1 Solo Pago</h3>
                  <p className="text-xs text-emerald-300 font-medium">
                    Cliente: {modalAbonarPagoUnico.item.cliente.nombre} {modalAbonarPagoUnico.item.cliente.apellido || ''}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalAbonarPagoUnico(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleConfirmarAbonoUnico(); }} className="p-5 space-y-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Total Mora / Deuda Calculada</span>
                <span className="text-xl font-black text-emerald-400">${formatMoney(modalAbonarPagoUnico.item.resumenIntereses?.totalIntereses || modalAbonarPagoUnico.item.montoDeudaRestante)}</span>
              </div>

              {/* Fecha de Pago */}
              <div className="space-y-1">
                <label className="text-slate-300 block font-bold">Fecha del Pago / Cobro:</label>
                <input
                  type="date"
                  value={modalAbonarPagoUnico.fechaPago}
                  onChange={(e) => setModalAbonarPagoUnico({ ...modalAbonarPagoUnico, fechaPago: e.target.value })}
                  className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                  required
                />
                <span className="text-[10px] text-slate-400">Pauta la fecha del cobro (hoy o pautada para otra fecha).</span>
              </div>

              {/* Monto a abonar */}
              <div className="space-y-1">
                <label className="text-slate-300 block font-bold">Monto Efectivo a Cobrar ($):</label>
                <input
                  type="number"
                  value={modalAbonarPagoUnico.monto}
                  onChange={(e) => setModalAbonarPagoUnico({ ...modalAbonarPagoUnico, monto: Number(e.target.value) })}
                  className="w-full bg-slate-950 text-emerald-400 font-black text-base p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Método de Pago */}
              <div className="space-y-1">
                <label className="text-slate-300 block font-bold">Método de Pago:</label>
                <select
                  value={modalAbonarPagoUnico.metodoPago}
                  onChange={(e) => setModalAbonarPagoUnico({ ...modalAbonarPagoUnico, metodoPago: e.target.value as any })}
                  className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="EFECTIVO">EFECTIVO</option>
                  <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  <option value="DEPOSITO">DEPÓSITO / MERCADOPAGO</option>
                </select>
              </div>

              {/* Cobrador */}
              <div className="space-y-1">
                <label className="text-slate-300 block font-bold">Cobrador Recaudador:</label>
                <select
                  value={modalAbonarPagoUnico.cobradorNombre}
                  onChange={(e) => setModalAbonarPagoUnico({ ...modalAbonarPagoUnico, cobradorNombre: e.target.value })}
                  className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Seleccionar Cobrador --</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.nombre}>{u.nombre} ({u.rolId})</option>
                  ))}
                </select>
              </div>

              {/* Observaciones */}
              <div className="space-y-1">
                <label className="text-slate-300 block font-bold">Observaciones / Detalle:</label>
                <input
                  type="text"
                  value={modalAbonarPagoUnico.observaciones}
                  onChange={(e) => setModalAbonarPagoUnico({ ...modalAbonarPagoUnico, observaciones: e.target.value })}
                  className="w-full bg-slate-950 text-white font-medium p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalAbonarPagoUnico(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black cursor-pointer shadow-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Confirmar y Registrar Pago de Mora</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: REGISTRAR COMPROMISO DE PAGO */}
      {modalCompromisoPago && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border-2 border-indigo-500/80 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-slate-950 p-4 border-b border-indigo-800/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-950 text-indigo-400 rounded-xl flex items-center justify-center font-black border border-indigo-700/60">
                  <Handshake className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Registrar Compromiso de Pago</h3>
                  <p className="text-xs text-indigo-300 font-medium">
                    Cliente: {modalCompromisoPago.item.cliente.nombre} {modalCompromisoPago.item.cliente.apellido || ''} — DNI {modalCompromisoPago.item.cliente.dni || '-'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalCompromisoPago(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleConfirmarCompromiso(); }} className="p-5 space-y-4 text-xs">
              {/* Fecha Compromiso */}
              <div className="space-y-1">
                <label className="text-slate-300 block font-bold">Fecha Acordada del Compromiso:</label>
                <input
                  type="date"
                  value={modalCompromisoPago.fechaCompromiso}
                  onChange={(e) => setModalCompromisoPago({ ...modalCompromisoPago, fechaCompromiso: e.target.value })}
                  className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Monto Comprometido */}
              <div className="space-y-1">
                <label className="text-slate-300 block font-bold">Monto Comprometido ($):</label>
                <input
                  type="number"
                  value={modalCompromisoPago.montoComprometido}
                  onChange={(e) => setModalCompromisoPago({ ...modalCompromisoPago, montoComprometido: Number(e.target.value) })}
                  className="w-full bg-slate-950 text-indigo-300 font-black text-base p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Finalidad */}
              <div className="space-y-1">
                <label className="text-slate-300 block font-bold">Finalidad del Compromiso:</label>
                <select
                  value={modalCompromisoPago.finalidad}
                  onChange={(e) => setModalCompromisoPago({ ...modalCompromisoPago, finalidad: e.target.value as any })}
                  className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="REFINANCIACION">REFINANCIACIÓN / PAGO DE MORA</option>
                  <option value="RENOVACION">RENOVACIÓN DE CRÉDITO</option>
                  <option value="OTRA">OTRA GESTIÓN DE COBRANZA</option>
                </select>
              </div>

              {/* Mesa Gestion */}
              <div className="space-y-1">
                <label className="text-slate-300 block font-bold">Mesa de Gestión / Vía:</label>
                <select
                  value={modalCompromisoPago.mesaGestion}
                  onChange={(e) => setModalCompromisoPago({ ...modalCompromisoPago, mesaGestion: e.target.value as any })}
                  className="w-full bg-slate-950 text-white font-bold p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  <option value="GESTION TELEFONICA">GESTIÓN TELEFÓNICA / WHATSAPP</option>
                  <option value="GESTION DOMICILIARIA">GESTIÓN DOMICILIARIA DE CAMPO</option>
                  <option value="GESTION DIARIA">GESTIÓN EN OFICINA / DIARIA</option>
                </select>
              </div>

              {/* Observaciones */}
              <div className="space-y-1">
                <label className="text-slate-300 block font-bold">Observaciones / Notas:</label>
                <input
                  type="text"
                  value={modalCompromisoPago.observaciones}
                  onChange={(e) => setModalCompromisoPago({ ...modalCompromisoPago, observaciones: e.target.value })}
                  className="w-full bg-slate-950 text-white font-medium p-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500"
                  placeholder="Detalle de lo acordado con el cliente"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalCompromisoPago(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-bold cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black cursor-pointer shadow-lg flex items-center gap-2"
                >
                  <Handshake className="w-4 h-4 text-white" />
                  <span>Guardar Compromiso de Pago</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
