import React from 'react';
import { ShieldCheck, FileCheck, CheckCircle2, Search, Clock, AlertTriangle } from 'lucide-react';

export default function VerificacionView() {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-emerald-950 border border-teal-800/80 rounded-2xl p-6 shadow-lg relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-900/60 border border-teal-700/80 rounded-2xl text-teal-400 shadow-md">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">Verificación</h1>
                <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Módulo Preparado
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Módulo dedicado al análisis crediticio, validación de identidad, scoring y verificación domiciliaria/laboral.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="w-10 h-10 bg-teal-950 border border-teal-800 rounded-xl flex items-center justify-center text-teal-400 mb-3">
            <FileCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">1. Análisis Documental</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Revisión de DNI, servicios, recibos de sueldo y constancias laborales aportadas por el solicitante.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="w-10 h-10 bg-emerald-950 border border-emerald-800 rounded-xl flex items-center justify-center text-emerald-400 mb-3">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">2. Informe Domiciliario</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Confirmación de campo por el verificador con reporte fotográfico y geolocalización.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-md">
          <div className="w-10 h-10 bg-amber-950 border border-amber-800 rounded-xl flex items-center justify-center text-amber-400 mb-3">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">3. Aprobación & Scoring</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Dictamen final de riesgo y determinación de límite máximo de financiamiento pre-aprobado.
          </p>
        </div>
      </div>

      {/* Readiness Message */}
      <div className="bg-slate-900/60 border border-dashed border-teal-800/80 rounded-2xl p-8 text-center space-y-3">
        <div className="w-12 h-12 bg-teal-950/80 border border-teal-700/60 rounded-full flex items-center justify-center text-teal-400 mx-auto">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-base font-bold text-white">Módulo Integrado y Listo para Desarrollo</h3>
        <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
          La opción de navegación <strong className="text-teal-300">Verificación</strong> está correctamente integrada al menú principal. El flujo interno completo se desarrollará en las siguientes iteraciones.
        </p>
      </div>
    </div>
  );
}
