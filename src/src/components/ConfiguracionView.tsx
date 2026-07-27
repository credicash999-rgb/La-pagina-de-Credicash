import React from 'react';
import { Configuracion, ConfiguracionComisiones, Feriado, Cliente, Operacion, Cuota, Pago, TransaccionTesoreria } from '../types';

interface ConfiguracionViewProps {
  configuracion: Configuracion;
  configComisiones: ConfiguracionComisiones;
  feriados: Feriado[];
  clientes: Cliente[];
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
  transacciones: TransaccionTesoreria[];
  onUpdateConfiguracion: (config: Configuracion) => void;
  onUpdateConfigComisiones: (config: ConfiguracionComisiones) => void;
  onAddFeriado: (f: Feriado) => void;
  onDeleteFeriado: (fecha: string) => void;
  onClearDatabase: () => void;
  onResetToSeed: () => void;
  onRestoreBackup: (data: any) => void;
  onBatchUpdateData: (data: any) => void;
}

export default function ConfiguracionView({ configuracion }: ConfiguracionViewProps) {
  return (
    <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl text-slate-100">
      <h2 className="text-xl font-black text-white mb-2">Configuración del Sistema</h2>
      <p className="text-xs text-slate-400">Tasas de interés y parámetros generales de operación.</p>
    </div>
  );
}
