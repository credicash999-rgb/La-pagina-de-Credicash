import React from 'react';
import { DollarSign } from 'lucide-react';

interface CrediCashLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export default function CrediCashLogo({ size = 'md', showSubtitle = true }: CrediCashLogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 font-black flex items-center justify-center shadow-lg shadow-emerald-900/40 ${
        size === 'sm' ? 'w-8 h-8 text-sm' : size === 'lg' ? 'w-12 h-12 text-xl' : 'w-10 h-10 text-base'
      }`}>
        <DollarSign className="w-6 h-6 stroke-[3]" />
      </div>
      <div className="leading-tight">
        <span className={`font-black tracking-tight text-white block ${
          size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'
        }`}>
          Credi<span className="text-emerald-400">Cash</span>
        </span>
        {showSubtitle && (
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400 block -mt-1">
            Sistema Maestro
          </span>
        )}
      </div>
    </div>
  );
}
