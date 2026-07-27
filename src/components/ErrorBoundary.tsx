import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, ShieldAlert, RotateCcw } from 'lucide-react';
import CrediCashLogo from './CrediCashLogo';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CrediCash Uncaught Error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('credicash_logged_in');
      localStorage.removeItem('credicash_real_user_rol_id');
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  private handleClearAllAndReload = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="flex justify-center">
              <CrediCashLogo size="lg" showSubtitle={true} />
            </div>

            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-400">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Sistema CrediCash</h2>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Se detectó un inconveniente al cargar el estado local. Podés reintentar ingresar o restablecer la sesión.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={this.handleReset}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar e Iniciar Sesión
              </button>

              <button
                onClick={this.handleClearAllAndReload}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer Datos Locales
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
