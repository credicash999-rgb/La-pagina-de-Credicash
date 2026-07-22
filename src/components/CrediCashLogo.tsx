import React from 'react';

interface CrediCashLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  layout?: 'horizontal' | 'vertical';
}

export const CrediCashLogo: React.FC<CrediCashLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  layout = 'horizontal',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const textSizes = {
    sm: {
      brand: 'text-lg',
      subtitle: 'text-[9px] tracking-[0.18em]',
    },
    md: {
      brand: 'text-xl sm:text-2xl',
      subtitle: 'text-[10px] sm:text-[11px] tracking-[0.22em]',
    },
    lg: {
      brand: 'text-3xl sm:text-4xl',
      subtitle: 'text-[12px] sm:text-[13px] tracking-[0.25em]',
    },
    xl: {
      brand: 'text-5xl sm:text-6xl',
      subtitle: 'text-[14px] sm:text-[15px] tracking-[0.28em]',
    },
  };

  const currentTextSize = textSizes[size];

  if (layout === 'horizontal' && showSubtitle) {
    return (
      <div className={`flex items-center gap-3 sm:gap-4 ${className}`}>
        {/* Emblem SVG */}
        <div className={`relative shrink-0 ${iconSizes[size]} flex items-center justify-center`}>
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-xs"
          >
            <defs>
              <linearGradient id="crestDarkGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0B4B27" />
                <stop offset="100%" stopColor="#032B15" />
              </linearGradient>

              <linearGradient id="crestBrightGrad" x1="20" y1="0" x2="100" y2="80" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#34D399" />
                <stop offset="60%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#059669" />
              </linearGradient>

              <linearGradient id="crestGoldAccent" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FACC15" />
                <stop offset="100%" stopColor="#CA8A04" />
              </linearGradient>
            </defs>

            <path
              d="M 50,6 L 82,20 C 82,54 70,80 50,94 C 30,80 18,54 18,20 Z"
              fill="url(#crestDarkGrad)"
            />

            <path
              d="M 70,36 C 58,24 38,28 32,44 C 26,60 36,78 54,78 C 66,78 74,70 78,60 L 64,60 C 62,65 57,68 52,68 C 42,68 38,58 41,48 C 44,38 54,36 62,42 Z"
              fill="url(#crestBrightGrad)"
            />

            <circle cx="50" cy="50" r="4.5" fill="#FFFFFF" />
            <path d="M 50,22 L 50,32" stroke="url(#crestBrightGrad)" strokeWidth="3" strokeLinecap="round" />
            <path d="M 66,28 L 74,20" stroke="url(#crestGoldAccent)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Horizontal Expanded Brand Block */}
        <div className="flex items-center gap-3.5 sm:gap-5">
          {/* Main Brand Title */}
          <div className={`font-black tracking-tight ${currentTextSize.brand} leading-none flex items-baseline`}>
            <span className="text-white">Credi</span>
            <span className="text-emerald-400 bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent ml-0.5">Cash</span>
            <span className="text-emerald-400 font-bold ml-0.5">.</span>
          </div>

          {/* Elegant Vertical Divider */}
          <div className="h-6 sm:h-7 w-[2px] bg-emerald-700/60 rounded-full shrink-0" />

          {/* Horizontal Wide Subtitle Banner */}
          <div className="flex flex-col justify-center">
            <span className={`uppercase font-black text-emerald-200 ${currentTextSize.subtitle} block whitespace-nowrap`}>
              Sistema Central de Gestión
            </span>
            <span className="text-[8px] sm:text-[9px] font-extrabold text-emerald-400/90 tracking-widest uppercase block whitespace-nowrap">
              Plataforma Integral de Finanzas & Cobranzas
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${layout === 'vertical' ? 'flex-col items-center text-center gap-3' : 'items-center gap-3.5'} ${className}`}>
      <div className={`relative shrink-0 ${iconSizes[size]} flex items-center justify-center`}>
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xs"
        >
          <defs>
            <linearGradient id="crestDarkGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0B4B27" />
              <stop offset="100%" stopColor="#032B15" />
            </linearGradient>

            <linearGradient id="crestBrightGrad" x1="20" y1="0" x2="100" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="60%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            <linearGradient id="crestGoldAccent" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FACC15" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
          </defs>

          <path
            d="M 50,6 L 82,20 C 82,54 70,80 50,94 C 30,80 18,54 18,20 Z"
            fill="url(#crestDarkGrad)"
          />

          <path
            d="M 70,36 C 58,24 38,28 32,44 C 26,60 36,78 54,78 C 66,78 74,70 78,60 L 64,60 C 62,65 57,68 52,68 C 42,68 38,58 41,48 C 44,38 54,36 62,42 Z"
            fill="url(#crestBrightGrad)"
          />

          <circle cx="50" cy="50" r="4.5" fill="#FFFFFF" />
          <path d="M 50,22 L 50,32" stroke="url(#crestBrightGrad)" strokeWidth="3" strokeLinecap="round" />
          <path d="M 66,28 L 74,20" stroke="url(#crestGoldAccent)" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="flex flex-col text-left leading-none">
        <div className={`font-black tracking-tight ${currentTextSize.brand} leading-none flex items-baseline`}>
          <span className="text-white">Credi</span>
          <span className="text-emerald-400 bg-gradient-to-r from-emerald-300 to-teal-400 bg-clip-text text-transparent ml-0.5">Cash</span>
          <span className="text-emerald-400 font-bold ml-0.5">.</span>
        </div>

        {showSubtitle && (
          <span className={`uppercase font-extrabold text-emerald-200 ${currentTextSize.subtitle} mt-1 block tracking-wider border-t border-emerald-800/40 pt-1`}>
            Sistema Central de Gestión
          </span>
        )}
      </div>
    </div>
  );
};

export default CrediCashLogo;
