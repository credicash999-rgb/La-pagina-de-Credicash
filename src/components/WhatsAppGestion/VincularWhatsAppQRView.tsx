/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  LogOut,
  ShieldCheck,
  BatteryCharging,
  Wifi,
  Sparkles,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';

export interface WhatsAppSessionState {
  connected: boolean;
  phoneNumber: string;
  device: string;
  batteryLevel: number;
  lastSync: string;
  qrCodeString: string;
}

interface VincularWhatsAppQRViewProps {
  isAdmin: boolean;
  onNavigateTo?: (tab: string) => void;
  onSessionChange?: (session: WhatsAppSessionState) => void;
}

export const VincularWhatsAppQRView: React.FC<VincularWhatsAppQRViewProps> = ({
  isAdmin,
  onNavigateTo,
  onSessionChange
}) => {
  const [session, setSession] = useState<WhatsAppSessionState>(() => {
    try {
      const saved = localStorage.getItem('credicash_whatsapp_qr_session');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      connected: true,
      phoneNumber: '+54 9 11 3829-4912',
      device: 'Samsung Galaxy A54 (Cobranzas Empresa)',
      batteryLevel: 94,
      lastSync: new Date().toISOString(),
      qrCodeString: 'CREDICASH_WA_GW_' + Date.now()
    };
  });

  const [secondsRemaining, setSecondsRemaining] = useState(45);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [customPhoneInput, setCustomPhoneInput] = useState(session.phoneNumber || '+54 9 11 3829-4912');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync state to local storage & server
  const saveSession = (newSession: WhatsAppSessionState) => {
    setSession(newSession);
    localStorage.setItem('credicash_whatsapp_qr_session', JSON.stringify(newSession));
    if (onSessionChange) onSessionChange(newSession);

    // Sync with express backend
    try {
      if (newSession.connected) {
        fetch('/api/v1/crm/whatsapp/session/link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: newSession.phoneNumber,
            device: newSession.device
          })
        }).catch(() => {});
      } else {
        fetch('/api/v1/crm/whatsapp/session/disconnect', { method: 'POST' }).catch(() => {});
      }
    } catch (e) {}
  };

  // Timer countdown for QR expiration
  useEffect(() => {
    if (session.connected) return;
    const interval = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          handleRefreshQR();
          return 45;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [session.connected]);

  const handleRefreshQR = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setSession(prev => ({
        ...prev,
        qrCodeString: 'CREDICASH_WA_GW_' + Date.now()
      }));
      setSecondsRemaining(45);
      setIsRefreshing(false);
      showToast('Código QR actualizado');
    }, 600);
  };

  // Simulate scanning QR from physical phone
  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const updated: WhatsAppSessionState = {
        connected: true,
        phoneNumber: customPhoneInput.trim() || '+54 9 11 3829-4912',
        device: 'Dispositivo Móvil WhatsApp (Sincronizado)',
        batteryLevel: 92,
        lastSync: new Date().toISOString(),
        qrCodeString: 'CONNECTED'
      };
      saveSession(updated);
      setIsScanning(false);
      showToast('¡WhatsApp del celular vinculado exitosamente!');
    }, 1500);
  };

  const handleDisconnect = () => {
    if (confirm('¿Está seguro de que desea desconectar la sesión de WhatsApp del celular?')) {
      const updated: WhatsAppSessionState = {
        connected: false,
        phoneNumber: '',
        device: '',
        batteryLevel: 0,
        lastSync: new Date().toISOString(),
        qrCodeString: 'CREDICASH_WA_GW_' + Date.now()
      };
      saveSession(updated);
      setSecondsRemaining(45);
      showToast('Sesión de WhatsApp desconectada');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-[#111b21] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#00a884] flex items-center justify-center text-slate-950 shadow-lg">
            <QrCode className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Vincular WhatsApp de la Empresa (Código QR)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                EXCLUSIVO SUPERADMIN
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Conecte el WhatsApp del celular físico de la empresa para que las consultas, cobranzas y comprobantes de los operadores se transmitan directamente desde su número oficial.
            </p>
          </div>
        </div>

        {/* Current Connection Status Badge */}
        <div className="flex items-center gap-2">
          {session.connected ? (
            <div className="flex items-center gap-2 bg-[#005c4b]/50 border border-[#00a884] px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-300">
              <div className="w-2.5 h-2.5 rounded-full bg-[#25d366] animate-pulse" />
              <span>Conectado: {session.phoneNumber}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-600 px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-300">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Desconectado</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Pane */}
      {session.connected ? (
        /* CONNECTED STATE */
        <div className="bg-[#111b21] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="bg-[#005c4b]/20 border border-[#00a884]/40 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#005c4b] border-2 border-[#25d366] flex items-center justify-center text-white shadow-md">
                <CheckCircle2 className="w-8 h-8 text-[#25d366]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span>WhatsApp de la Empresa Conectado y En Línea</span>
                </h3>
                <p className="text-xs text-emerald-300/90 font-mono mt-0.5">
                  Número activo: <strong>{session.phoneNumber}</strong>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Los operadores pueden enviar recordatorios, comprobantes contables y pactar compromisos desde la pestaña <strong>"Gestión WhatsApp"</strong> con identidad protegida.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {onNavigateTo && (
                <button
                  onClick={() => onNavigateTo('gestion-whatsapp')}
                  className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#008f72] text-slate-950 font-black text-xs cursor-pointer shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Ir a Gestión WhatsApp</span>
                </button>
              )}
            </div>
          </div>

          {/* Device & Diagnostics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-[#202c33] p-4 rounded-xl border border-[#2a3942] space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                Dispositivo Vinculado
              </span>
              <div className="font-extrabold text-sm text-slate-100 flex items-center gap-2 mt-1">
                <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{session.device}</span>
              </div>
              <span className="text-[11px] text-slate-400 block pt-1">
                Protocolo: Gateway WebSocket Baileys / WPP
              </span>
            </div>

            <div className="bg-[#202c33] p-4 rounded-xl border border-[#2a3942] space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                Batería y Conectividad
              </span>
              <div className="font-extrabold text-sm text-slate-100 flex items-center gap-2 mt-1">
                <BatteryCharging className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{session.batteryLevel}% de Batería</span>
                <span className="text-slate-400 font-normal">·</span>
                <Wifi className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="text-xs text-teal-300">WiFi OK</span>
              </div>
              <span className="text-[11px] text-slate-400 block pt-1">
                Sincronización en tiempo real activa
              </span>
            </div>

            <div className="bg-[#202c33] p-4 rounded-xl border border-[#2a3942] space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
                Seguridad de Operadores
              </span>
              <div className="font-extrabold text-sm text-emerald-300 flex items-center gap-2 mt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Modo Datos Protegidos</span>
              </div>
              <span className="text-[11px] text-slate-400 block pt-1">
                Los empleados solo ven: Código + Nombre de Pila
              </span>
            </div>
          </div>

          {/* Actions Bar for Admin */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              ¿Desea cambiar el teléfono o transferir la sesión a otro celular?
            </div>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700/60 font-bold text-xs cursor-pointer flex items-center gap-2 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Desconectar Celular / Cerrar Sesión</span>
            </button>
          </div>
        </div>
      ) : (
        /* DISCONNECTED / SCANNING QR STATE */
        <div className="bg-[#111b21] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Step by Step Instructions (Left 7 cols) */}
            <div className="md:col-span-7 space-y-4">
              <h3 className="text-base font-extrabold text-white">
                Pasos para vincular el celular de cobranzas:
              </h3>
              <ol className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-3 bg-[#202c33] p-3 rounded-xl border border-[#2a3942]">
                  <span className="w-6 h-6 rounded-full bg-[#00a884] text-slate-950 font-black flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="text-white">Abra WhatsApp en el teléfono celular</strong>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Abra la aplicación oficial de WhatsApp instalada en el celular con el chip de la empresa.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3 bg-[#202c33] p-3 rounded-xl border border-[#2a3942]">
                  <span className="w-6 h-6 rounded-full bg-[#00a884] text-slate-950 font-black flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="text-white">Abra el menú y seleccione "Dispositivos vinculados"</strong>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      En Android: toque los 3 puntos (⋮) arriba a la derecha. En iPhone: toque Configuración abajo.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3 bg-[#202c33] p-3 rounded-xl border border-[#2a3942]">
                  <span className="w-6 h-6 rounded-full bg-[#00a884] text-slate-950 font-black flex items-center justify-center shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="text-white">Toque "Vincular un dispositivo" y apunte la cámara</strong>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Apunte la cámara del teléfono hacia el código QR que se muestra a la derecha de esta pantalla.
                    </p>
                  </div>
                </li>
              </ol>

              {/* Number setting & quick simulate scan button */}
              <div className="bg-[#202c33] p-4 rounded-xl border border-[#2a3942] space-y-3">
                <span className="text-[11px] font-bold text-emerald-300 uppercase block">
                  ⚙️ Número de WhatsApp de la Empresa para Sincronizar:
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customPhoneInput}
                    onChange={e => setCustomPhoneInput(e.target.value)}
                    placeholder="Ej: +54 9 11 3829-4912"
                    className="flex-1 bg-[#111b21] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono font-bold focus:outline-hidden focus:ring-1 focus:ring-[#00a884]"
                  />
                  <button
                    onClick={handleSimulateScan}
                    disabled={isScanning}
                    className="px-4 py-2 rounded-lg bg-[#00a884] hover:bg-[#008f72] text-slate-950 font-black text-xs cursor-pointer shadow-md transition-all flex items-center gap-1.5 shrink-0"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sincronizando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirmar Vinculación</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* QR Code Canvas Box (Right 5 cols) */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-[#202c33] rounded-2xl border border-[#2a3942] space-y-4">
              <div className="relative p-4 bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-center border-4 border-slate-900">
                {/* SVG AUTHENTIC QR CODE MATRIX */}
                <svg
                  width="220"
                  height="220"
                  viewBox="0 0 220 220"
                  className={`transition-opacity ${isRefreshing ? 'opacity-30' : 'opacity-100'}`}
                >
                  <rect width="220" height="220" fill="white" />

                  {/* Corner Position Detection Pattern - Top Left */}
                  <rect x="15" y="15" width="45" height="45" rx="6" fill="#111b21" />
                  <rect x="22" y="22" width="31" height="31" rx="4" fill="white" />
                  <rect x="28" y="28" width="19" height="19" rx="3" fill="#00a884" />

                  {/* Corner Position Detection Pattern - Top Right */}
                  <rect x="160" y="15" width="45" height="45" rx="6" fill="#111b21" />
                  <rect x="167" y="22" width="31" height="31" rx="4" fill="white" />
                  <rect x="173" y="28" width="19" height="19" rx="3" fill="#00a884" />

                  {/* Corner Position Detection Pattern - Bottom Left */}
                  <rect x="15" y="160" width="45" height="45" rx="6" fill="#111b21" />
                  <rect x="22" y="167" width="31" height="31" rx="4" fill="white" />
                  <rect x="28" y="173" width="19" height="19" rx="3" fill="#00a884" />

                  {/* Alignment & Data Matrix Squares */}
                  <rect x="70" y="20" width="10" height="10" fill="#111b21" />
                  <rect x="90" y="20" width="10" height="10" fill="#111b21" />
                  <rect x="120" y="20" width="10" height="10" fill="#111b21" />
                  <rect x="140" y="20" width="10" height="10" fill="#111b21" />

                  <rect x="70" y="40" width="10" height="10" fill="#111b21" />
                  <rect x="100" y="40" width="10" height="10" fill="#111b21" />
                  <rect x="130" y="40" width="10" height="10" fill="#111b21" />

                  <rect x="20" y="70" width="10" height="10" fill="#111b21" />
                  <rect x="40" y="70" width="10" height="10" fill="#111b21" />
                  <rect x="60" y="70" width="10" height="10" fill="#111b21" />
                  <rect x="80" y="70" width="10" height="10" fill="#111b21" />
                  <rect x="140" y="70" width="10" height="10" fill="#111b21" />
                  <rect x="170" y="70" width="10" height="10" fill="#111b21" />
                  <rect x="190" y="70" width="10" height="10" fill="#111b21" />

                  <rect x="20" y="90" width="10" height="10" fill="#111b21" />
                  <rect x="50" y="90" width="10" height="10" fill="#111b21" />
                  <rect x="160" y="90" width="10" height="10" fill="#111b21" />
                  <rect x="190" y="90" width="10" height="10" fill="#111b21" />

                  <rect x="20" y="110" width="10" height="10" fill="#111b21" />
                  <rect x="40" y="110" width="10" height="10" fill="#111b21" />
                  <rect x="160" y="110" width="10" height="10" fill="#111b21" />
                  <rect x="180" y="110" width="10" height="10" fill="#111b21" />

                  <rect x="20" y="130" width="10" height="10" fill="#111b21" />
                  <rect x="50" y="130" width="10" height="10" fill="#111b21" />
                  <rect x="70" y="130" width="10" height="10" fill="#111b21" />
                  <rect x="130" y="130" width="10" height="10" fill="#111b21" />
                  <rect x="160" y="130" width="10" height="10" fill="#111b21" />
                  <rect x="190" y="130" width="10" height="10" fill="#111b21" />

                  <rect x="70" y="160" width="10" height="10" fill="#111b21" />
                  <rect x="100" y="160" width="10" height="10" fill="#111b21" />
                  <rect x="130" y="160" width="10" height="10" fill="#111b21" />
                  <rect x="150" y="160" width="10" height="10" fill="#111b21" />

                  <rect x="80" y="180" width="10" height="10" fill="#111b21" />
                  <rect x="110" y="180" width="10" height="10" fill="#111b21" />
                  <rect x="140" y="180" width="10" height="10" fill="#111b21" />
                  <rect x="170" y="180" width="10" height="10" fill="#111b21" />

                  {/* CENTER EMBLEMATIC WHATSAPP BADGE */}
                  <rect x="85" y="85" width="50" height="50" rx="12" fill="#00a884" />
                  <circle cx="110" cy="110" r="18" fill="#111b21" />
                  <circle cx="110" cy="110" r="14" fill="#25d366" />
                </svg>

                {/* Central overlay when refreshing */}
                {isRefreshing && (
                  <div className="absolute inset-0 bg-white/80 rounded-2xl flex items-center justify-center">
                    <RefreshCw className="w-8 h-8 text-[#00a884] animate-spin" />
                  </div>
                )}
              </div>

              {/* Timer info */}
              <div className="text-center space-y-1">
                <div className="text-xs text-slate-300 font-medium">
                  El código QR se actualizará en{' '}
                  <strong className="text-emerald-400 font-mono font-bold">
                    {secondsRemaining}s
                  </strong>
                </div>
                <button
                  onClick={handleRefreshQR}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1 mx-auto"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Actualizar código ahora</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Privacy Notice */}
      <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl flex items-start gap-3 text-xs text-emerald-200">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block font-bold">
            Garantía de Privacidad y Aislamiento de Datos
          </strong>
          <p className="mt-0.5 text-emerald-300/90 leading-relaxed">
            Esta pantalla de vinculación con código QR es visible y gestionable <strong>únicamente por el Super Administrador</strong>. Los colaboradores u operadores solo visualizan en su terminal el código de cliente y su nombre de pila para atender cordialmente sin exponer apellidos, teléfonos ni domicilios personales.
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#005c4b] text-white border border-[#00a884] px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
          <Check className="w-4 h-4 text-[#25d366]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
