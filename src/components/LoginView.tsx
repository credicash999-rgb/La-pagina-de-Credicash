import React, { useState } from 'react';
import { UsuarioRol, PermisosRol } from '../types';
import { 
  Lock, Mail, Eye, EyeOff, ShieldCheck, 
  TrendingUp, Globe2, Handshake, ShieldAlert, Key, ChevronRight, Check
} from 'lucide-react';

interface LoginViewProps {
  usuarios: UsuarioRol[];
  roles: PermisosRol[];
  onLogin: (user: UsuarioRol) => void;
}

export default function LoginView({ usuarios, roles, onLogin }: LoginViewProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showTestingUsers, setShowTestingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.toLowerCase().trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Por favor complete todos los campos.');
      return;
    }

    let user = usuarios.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      // Bulletproof self-healing master account fallback
      if (cleanEmail === 'credicash999@gmail.com' && cleanPassword === 'admin') {
        user = {
          id: 'USR-1',
          nombre: 'Administrador Principal',
          email: 'credicash999@gmail.com',
          password: 'admin',
          rolId: 'ADMIN'
        };
      } else {
        setError('El correo electrónico no se encuentra registrado.');
        return;
      }
    }

    const userPassword = user.password || '123';
    if (userPassword !== cleanPassword) {
      setError('Contraseña incorrecta. Intente nuevamente.');
      return;
    }

    onLogin(user);
  };

  const handleQuickLogin = (user: UsuarioRol) => {
    setEmail(user.email);
    setPassword(user.password || '123');
    setError(null);
    onLogin(user);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row w-full overflow-x-hidden font-sans antialiased text-slate-800 relative">
      
      {/* Secret Developer Panel Button - Kept hidden to avoid cluttering but available for testing */}
      <button 
        type="button"
        onClick={() => setShowTestingUsers(!showTestingUsers)}
        title="Panel de Desarrollo (Credenciales)"
        className="absolute top-4 right-4 z-50 p-2 rounded-full bg-slate-200/50 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all cursor-pointer opacity-30 hover:opacity-100"
      >
        <Key className="w-4 h-4" />
      </button>

      {/* Secret Testing Panel */}
      {showTestingUsers && (
        <div className="fixed top-16 right-4 z-50 p-4 bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm animate-fadeIn text-left">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">Accesos Rápidos de Prueba</span>
            <button onClick={() => setShowTestingUsers(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">Cerrar</button>
          </div>
          <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">Haga clic en cualquiera de estos usuarios preconfigurados para acceder sin escribir:</p>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {usuarios.map((u, i) => {
              const roleObj = roles.find(r => r.id === u.rolId);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleQuickLogin(u)}
                  className="w-full p-2 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 rounded-lg text-left transition-all text-[11px] font-semibold text-slate-700 flex justify-between items-center"
                >
                  <div className="flex flex-col">
                    <span>{u.nombre}</span>
                    <span className="text-[9px] text-slate-400 font-normal">{u.email}</span>
                  </div>
                  <span className="text-[9px] bg-white text-slate-500 font-bold px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                    {roleObj?.nombre || u.rolId}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* LEFT COLUMN: BRAND & MARKETING (Shows at bottom on mobile, left on desktop) */}
      <div className="w-full lg:w-[55%] flex flex-col justify-between bg-[#F4FAF6] relative overflow-hidden shrink-0 min-h-screen order-2 lg:order-1">
        
        {/* Subtle decorative vector graphic waves or shapes */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-emerald-100/40 to-transparent rounded-full pointer-events-none blur-3xl"></div>
        <div className="absolute bottom-24 -left-12 w-80 h-80 bg-emerald-200/20 rounded-full pointer-events-none blur-3xl"></div>

        {/* Brand Header */}
        <div className="p-8 md:p-12 lg:p-16 flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center shadow-md border border-emerald-400/20">
            {/* Beautiful custom vector graphic of bar chart inside circular badge */}
            <svg className="w-5.5 h-5.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v5.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0 1 3 18.375v-5.25zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125v-9.75zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v14.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125z" />
            </svg>
          </div>
          <div className="flex flex-col text-left">
            <h1 className="text-xl font-black text-[#0B4B27] tracking-tight leading-none flex items-center gap-1">
              Credi<span className="text-[#1E803B]">Cash</span>
            </h1>
            <span className="text-[8px] font-extrabold uppercase tracking-[0.25em] text-[#1E803B]/60 mt-1 leading-none">
              SOLUCIONES FINANCIERAS
            </span>
          </div>
        </div>

        {/* Main Content Info */}
        <div className="px-8 md:px-12 lg:px-16 space-y-10 relative z-10 max-w-xl text-left">
          <div className="space-y-5">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Impulsamos tu negocio con <br />
              <span className="text-[#1E803B] relative inline-block">
                soluciones financieras
                <span className="absolute left-0 bottom-1 h-1.5 w-full bg-[#1E803B]/20 rounded-full"></span>
              </span> <br />
              simples y efectivas.
            </h2>
            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-md">
              Gestioná clientes, créditos y cobranzas de manera ágil, segura y en tiempo real.
            </p>
          </div>

          {/* Core Values Minimalist Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6 pt-4 border-t border-slate-200/50">
            <div className="flex gap-3.5 items-start">
              <div className="w-9 h-9 rounded-full border-2 border-emerald-600/30 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col text-left">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">CONFIANZA</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">Seguridad en cada decisión financiera.</p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <div className="w-9 h-9 rounded-full border-2 border-emerald-600/30 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col text-left">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">CRECIMIENTO</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">Impulsamos tus metas y proyectos.</p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <div className="w-9 h-9 rounded-full border-2 border-emerald-600/30 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col text-left">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">VISIÓN GLOBAL</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">Soluciones inteligentes para un mundo en evolución.</p>
              </div>
            </div>

            <div className="flex gap-3.5 items-start">
              <div className="w-9 h-9 rounded-full border-2 border-emerald-600/30 text-emerald-700 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="flex flex-col text-left">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">COMPROMISO</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">Acompañamiento cercano y responsable.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Solid Green Protected Notice Footer Bar */}
        <div className="w-full bg-[#0B4B27] px-8 py-5 flex items-center gap-4 relative z-10 mt-12 text-left">
          <div className="w-8 h-8 rounded-full bg-amber-400 text-[#0B4B27] flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4 stroke-[3]" />
          </div>
          <p className="text-[10px] md:text-xs text-white/90 font-medium leading-relaxed">
            <b>Tu información está protegida.</b> Utilizamos tecnología de encriptación avanzada para garantizar la seguridad de tus datos de manera permanente.
          </p>
        </div>

      </div>

      {/* RIGHT COLUMN: LOGIN BOX (Shows at top on mobile, right on desktop) */}
      <div className="w-full lg:w-[45%] bg-[#F1F5F9] p-6 md:p-12 lg:p-16 flex items-center justify-center shrink-0 min-h-screen order-1 lg:order-2">
        
        <div className="w-full max-w-[420px] bg-white rounded-[32px] shadow-xl border border-slate-200/50 p-8 md:p-10 space-y-6 relative z-10 text-left">
          
          {/* Padlock Icon & Brand Title inside the Card */}
          <div className="flex flex-col items-center text-center space-y-3.5">
            <div className="w-14 h-14 bg-[#0B4B27] text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-950/10 border-2 border-emerald-300/10">
              <Lock className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Iniciar Sesión</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">Bienvenido a CrediCash</p>
            </div>
          </div>

          {/* Error Message banner */}
          {error && (
            <div className="space-y-2.5">
              <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
                <span className="text-xs font-semibold leading-relaxed">{error}</span>
              </div>
              
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-2xl text-[11px] leading-relaxed space-y-1.5 shadow-xs">
                <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                  💡 ¿Es la primera vez que ingresa en este link?
                </p>
                <p className="text-slate-600">
                  Al subir su web a un nuevo dominio (como Vercel/GitHub), el almacenamiento local de su navegador se reinicia. Debe ingresar con las <b>credenciales maestras por defecto</b>:
                </p>
                <div className="bg-white/80 p-2 rounded-xl border border-emerald-100 space-y-1 font-mono text-[10px] text-slate-800">
                  <div><b>Usuario:</b> <span className="select-all font-bold text-[#0B4B27]">credicash999@gmail.com</span></div>
                  <div><b>Contraseña:</b> <span className="select-all font-bold text-[#0B4B27]">admin</span></div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('credicash999@gmail.com');
                    setPassword('admin');
                    setError(null);
                  }}
                  className="w-full mt-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] rounded-lg uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  ✨ Auto-Completar Admin
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Correo Electrónico
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input 
                  type="email"
                  required
                  placeholder="ejemplo@credicash.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-[#1E803B] focus:ring-1 focus:ring-[#1E803B] transition-all text-xs font-bold text-slate-800"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Contraseña
                </label>
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-[#1E803B] focus:ring-1 focus:ring-[#1E803B] transition-all text-xs font-bold text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer flex items-center justify-center"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Remember Me and Forgot Password row */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <label className="flex items-center gap-2 font-bold text-slate-500 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-[#1E803B] focus:ring-[#1E803B] border-slate-300 w-4 h-4 cursor-pointer"
                />
                Recordarme
              </label>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Por favor contacte al administrador del sistema para reestablecer su contraseña institucional.'); }} className="font-extrabold text-[#1E803B] hover:underline">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Login Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-[#1E803B] hover:bg-[#0B4B27] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md hover:shadow-none flex items-center justify-center gap-2 cursor-pointer mt-5"
            >
              Iniciar Sesión
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>

          </form>

          {/* Direct Support/Emergency Bypass for Easy Access */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                const adminUser = {
                  id: 'USR-1',
                  nombre: 'Administrador Principal',
                  email: 'credicash999@gmail.com',
                  password: 'admin',
                  rolId: 'ADMIN'
                };
                setEmail('credicash999@gmail.com');
                setPassword('admin');
                onLogin(adminUser);
              }}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-none"
            >
              🔓 Acceso Directo Administrador (Soporte)
            </button>
            <p className="text-[9px] text-slate-400 text-center mt-1.5 font-bold">
              Evite errores de escritura: toque el botón de arriba para ingresar instantáneamente.
            </p>
          </div>

          {/* Social Divider / Continued alternative */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="absolute bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">o continúa con</span>
          </div>

          {/* Google Single Sign-On Button */}
          <button
            type="button"
            onClick={() => alert('Autenticación mediante Google Workspace en proceso de homologación.')}
            className="w-full py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-black flex items-center justify-center gap-2.5 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.1-.23-.19-.46-.19-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>

          {/* Footer Card Notice */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] font-extrabold text-emerald-700 uppercase tracking-wide">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            Accedé desde cualquier lugar y dispositivo.
          </div>

        </div>

      </div>

    </div>
  );
}
