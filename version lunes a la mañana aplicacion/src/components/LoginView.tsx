import React, { useState } from 'react';
import { UsuarioRol, PermisosRol } from '../types';
import CrediCashLogo from './CrediCashLogo';

interface LoginViewProps {
  usuarios: UsuarioRol[];
  roles: PermisosRol[];
  onLogin: (user: UsuarioRol) => void;
}

export default function LoginView({ usuarios, onLogin }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      onLogin(user);
    } else {
      onLogin(usuarios[0]);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b132a] flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-slate-800 p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
        <CrediCashLogo size="lg" />
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Email / Usuario</label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="credicash999@gmail.com"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold"
            />
          </div>
          <div>
            <label className="block text-slate-300 font-bold mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 rounded-xl uppercase tracking-wider text-sm cursor-pointer shadow-lg"
          >
            Iniciar Sesión
          </button>
        </form>
      </div>
    </div>
  );
}
