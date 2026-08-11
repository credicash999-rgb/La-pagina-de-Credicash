import React from 'react';
import { UserCheck, Sparkles, UserPlus, Search, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

export default function CaptacionClientesView() {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border border-emerald-800/80 rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-900/60 border border-emerald-700/80 rounded-2xl text-emerald-400 shadow-md">
              <UserCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">Captación de Clientes</h1>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Módulo Preparado
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Espacio designado para la prospección, ingreso preliminar y recepción de potenciales clientes interesados en créditos CrediCash.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Card / Structure Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="w-10 h-10 bg-emerald-950 border border-emerald-800 rounded-xl flex items-center justify-center text-emerald-400 mb-3">
            <UserPlus className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">1. Registro Preliminar</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Ingreso rápido de datos de contacto y scoring básico del prospecto antes de enviar a verificación.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="w-10 h-10 bg-teal-950 border border-teal-800 rounded-xl flex items-center justify-center text-teal-400 mb-3">
            <Search className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">2. Asignación a Verificador</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Derivación automática o manual de carpetas para validación domiciliaria y laboral.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="w-10 h-10 bg-amber-950 border border-amber-800 rounded-xl flex items-center justify-center text-amber-400 mb-3">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">3. Tasa de Conversión</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Métricas de captadores y efectividad de canales de atracción comercial.
          </p>
        </div>
      </div>

      {/* Readiness Message */}
      <div className="bg-slate-900/60 border border-dashed border-emerald-800/80 rounded-2xl p-8 text-center space-y-3">
        <div className="w-12 h-12 bg-emerald-950/80 border border-emerald-700/60 rounded-full flex items-center justify-center text-emerald-400 mx-auto">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-base font-bold text-white">Módulo Integrado y Listo para Desarrollo</h3>
        <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
          La estructura de navegación ya tiene reservada la sección <strong className="text-emerald-300">Captación de Clientes</strong>. Las funciones detalladas de este flujo serán implementadas en la siguiente fase de desarrollo.
        </p>
      </div>
    </div>
  );
}
