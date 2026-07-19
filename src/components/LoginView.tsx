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

    // ACCESO INTEGRADO: CORREO PERSONAL O ADMIN CON CLAVE 123
    if (password === '123' || (cleanEmail === 'admin@credicash.com' && password === 'admin123')) {
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

    // Roles alternativos de fábrica
    if (cleanEmail === 'analista@credicash.com' && password === 'analista123') {
      onLoginSuccess({ id: 'usr-an', nombre: 'Carlos', apellido: 'Analista', email: cleanEmail, rolId: 'ANALISTA', estado: 'ACTIVO' });
    } else if (cleanEmail === 'cobrador@credicash.com' && password === 'cobrador123') {
      onLoginSuccess({ id: 'usr-cob', nombre: 'Felipe', apellido: 'Cobrador', email: cleanEmail, rolId: 'COBRADOR', estado: 'ACTIVO' });
    } else {
      setError('Credenciales incorrectas. Intente usando su clave 123.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto w-full max-w-md">
        <div className="flex justify-center">
          <div className="bg-emerald-100 p-3 rounded-2xl border border-emerald-200 shadow-xs">
            <Shield className="w-10 h-10 text-emerald-600" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          CrediCash
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Sistema de Gestión de Créditos y Cobranzas
        </p>
      </div>

      <div className="mt-8 sm:mx-auto w-full max-w-md">
        <div className="bg-white py-8 px-4 border border-slate-200 shadow-xl sm:rounded-3xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center gap-2 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Usuario / Correo Electrónico
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/15 text-slate-800"
                  placeholder="usuario@credicash.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Contraseña de Acceso
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/15 text-slate-800"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors uppercase tracking-wider"
              >
                Ingresar al Sistema
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
