import React from 'react';
import { TransaccionTesoreria, LiquidacionPersonal, Cliente, Operacion, Cuota, Pago } from '../types';

interface TesoreriaViewProps {
  transacciones: TransaccionTesoreria[];
  onAddTransaccion: (trx: TransaccionTesoreria) => void;
  liquidaciones: LiquidacionPersonal[];
  onAddLiquidacion: (liq: LiquidacionPersonal) => void;
  onUpdateLiquidacion: (liq: LiquidacionPersonal) => void;
  clientes: Cliente[];
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
}

export default function TesoreriaView({ transacciones }: TesoreriaViewProps) {
  return (
    <div className="space-y-4 font-sans text-slate-100">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <h2 className="text-xl font-black text-white">Caja y Tesorería</h2>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2">
        <h3 className="font-extrabold text-white text-sm">Transacciones Recientes</h3>
        {transacciones.length === 0 ? (
          <p className="text-xs text-slate-400">No hay movimientos registrados.</p>
        ) : (
          transacciones.map(t => (
            <div key={t.id} className="flex justify-between text-xs py-1 border-b border-slate-800">
              <span>{t.concepto}</span>
              <span className={t.tipo === 'INGRESO' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                {t.tipo === 'INGRESO' ? '+' : '-'}${t.monto.toLocaleString('es-AR')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
