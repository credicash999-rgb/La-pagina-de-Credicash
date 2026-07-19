import React, { useState } from 'react';
import { UsuarioRol } from '../types';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: UsuarioRol) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();

    // ACCESO MAESTRO SIMPLIFICADO PARA JONATAN
    if (cleanEmail === '' && password === '') {
      onLoginSuccess({
        id: 'usr-admin',
        nombre: 'Jonatan',
        apellido: 'Luna',
        email: 'admin@credicash.com',
        rolId: 'ADMIN',
        estado: 'ACTIVO'
      });
      return;
    }

    if (password === '123') {
      onLoginSuccess({
        id: 'usr-admin',
        nombre: 'Jonatan',
        apellido: 'Luna',
        email: email || 'admin@credicash.com',
        rolId: 'ADMIN',
        estado: 'ACTIVO'
      });
      return;
    }

    // Usuarios de fábrica alternativos
    if (cleanEmail === 'admin@credicash.com' && password === 'admin123') {
      onLoginSuccess({ id: 'usr-admin', nombre: 'Admin', apellido: 'General', email: cleanEmail, rolId: 'ADMIN', estado: 'ACTIVO' });
    } else if (cleanEmail === 'analista@credicash.com' && password === 'analista123') {
      onLoginSuccess({ id: 'usr-an', nombre: 'Carlos', apellido: 'Analista', email: cleanEmail, rolId: 'ANALISTA', estado: 'ACTIVO' });
    } else if (cleanEmail === 'cobrador@credicash.com' && password === 'cobrador123') {
      onLoginSuccess({ id: 'usr-cob', nombre: 'Felipe', apellido: 'Cobrador', email: cleanEmail, rolId: 'COBRADOR', estado: 'ACTIVO' });
    } else {
      setError('Credenciales incorrectas. Intente con clave 123.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto w-full max-w-md">
        <div className="flex justify-center">
          <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
            <Shield className="w-10 h-10 text-emerald-400" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-2xl font-black text-white tracking-tight">
          CrediCash Sistema
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Panel de Control Operativo e Inversiones
        </p>
      </div>

      <div className="mt-8 sm:mx-auto w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-md py-8 px-4 border border-slate-700/50 shadow-2xl sm:rounded-3xl sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-xl flex items-center gap-2 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="mt-1.5 relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="ejemplo@credicash.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="mt-1.5 relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors uppercase tracking-wider"
            >
              Iniciar Sesión / Entrar Directo
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <p className="text-[10px] text-slate-500 italic">
              * Tip: Si dejas los campos en blanco y presionas el botón, ingresarás automáticamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
