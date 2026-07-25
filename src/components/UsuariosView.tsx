import React, { useState } from 'react';
import { PermisosRol, UsuarioRol, FichajeAsistencia } from '../types';
import { 
  Shield, UserPlus, Users, ToggleLeft, ToggleRight, Check, Trash2, 
  Lock, KeyRound, Mail, Info, ShieldAlert, CheckCircle2, Edit2, X,
  Clock, Calendar, LogIn, LogOut, CheckCircle, Activity, UserCheck,
  UserX, AlertCircle, Filter
} from 'lucide-react';

interface UsuariosViewProps {
  usuarios: UsuarioRol[];
  roles: PermisosRol[];
  activeUser: UsuarioRol;
  fichajes?: FichajeAsistencia[];
  onAddFichaje?: (fichaje: FichajeAsistencia) => void;
  onUpdateFichaje?: (fichaje: FichajeAsistencia) => void;
  onAddUsuario: (usuario: UsuarioRol) => void;
  onUpdateUsuario: (usuario: UsuarioRol) => void;
  onDeleteUsuario: (id: string) => void;
  onUpdateRolePermisos: (rol: PermisosRol) => void;
  onAddRole: (rol: PermisosRol) => void;
}

export default function UsuariosView({
  usuarios,
  roles,
  activeUser,
  fichajes = [],
  onAddFichaje,
  onUpdateFichaje,
  onAddUsuario,
  onUpdateUsuario,
  onDeleteUsuario,
  onUpdateRolePermisos,
  onAddRole,
}: UsuariosViewProps) {
  const [activeTab, setActiveTab] = useState<'USUARIOS' | 'PRESENTISMO'>('USUARIOS');

  // Attendance Date & Filter States
  const todayStr = new Date().toISOString().split('T')[0];
  const [fechaFiltroAsistencia, setFechaFiltroAsistencia] = useState<string>(todayStr);
  const [rolFiltroAsistencia, setRolFiltroAsistencia] = useState<string>('OPERADOR');
  const [estadoFiltroAsistencia, setEstadoFiltroAsistencia] = useState<'TODOS' | 'PRESENTE' | 'AUSENTE'>('TODOS');

  // Attendance Calculation Logic
  const targetUsersForAttendance = usuarios.filter(u => {
    if (rolFiltroAsistencia === 'TODOS') return true;
    return u.rolId === rolFiltroAsistencia || u.rolId.includes(rolFiltroAsistencia);
  });

  const now = new Date();
  const currentHour = now.getHours();
  const isPast1pmToday = currentHour >= 13;
  const isPastDate = fechaFiltroAsistencia < todayStr;

  const attendanceRoster = targetUsersForAttendance.map(user => {
    const userFichaje = fichajes.find(f => f.usuarioId === user.id && f.fecha === fechaFiltroAsistencia);
    
    let estadoAsistencia: 'PRESENTE_ACTIVO' | 'PRESENTE_FINALIZADO' | 'AUSENTE' | 'PENDIENTE' = 'PENDIENTE';
    
    if (userFichaje) {
      if (userFichaje.estado === 'ACTIVA') {
        estadoAsistencia = 'PRESENTE_ACTIVO';
      } else {
        estadoAsistencia = 'PRESENTE_FINALIZADO';
      }
    } else {
      if (isPastDate || (fechaFiltroAsistencia === todayStr && isPast1pmToday)) {
        estadoAsistencia = 'AUSENTE';
      } else {
        estadoAsistencia = 'PENDIENTE';
      }
    }

    return {
      user,
      fichaje: userFichaje,
      estadoAsistencia
    };
  }).filter(item => {
    if (estadoFiltroAsistencia === 'TODOS') return true;
    if (estadoFiltroAsistencia === 'PRESENTE') {
      return item.estadoAsistencia === 'PRESENTE_ACTIVO' || item.estadoAsistencia === 'PRESENTE_FINALIZADO';
    }
    if (estadoFiltroAsistencia === 'AUSENTE') {
      return item.estadoAsistencia === 'AUSENTE';
    }
    return true;
  });

  const countPresentes = targetUsersForAttendance.filter(u => {
    const f = fichajes.find(x => x.usuarioId === u.id && x.fecha === fechaFiltroAsistencia);
    return !!f;
  }).length;

  const countAusentes = targetUsersForAttendance.filter(u => {
    const f = fichajes.find(x => x.usuarioId === u.id && x.fecha === fechaFiltroAsistencia);
    return !f && (isPastDate || (fechaFiltroAsistencia === todayStr && isPast1pmToday));
  }).length;

  // New User Form States
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoRolId, setNuevoRolId] = useState('OPERADOR');
  const [nuevoPassword, setNuevoPassword] = useState('123');

  // New Custom Role Form States
  const [showAddRole, setShowAddRole] = useState(false);
  const [nuevoRolNombre, setNuevoRolNombre] = useState('');

  // Selected role for the permissions checklist grid
  const [selectedRolId, setSelectedRolId] = useState<string>('OPERADOR');

  const selectedRole = roles.find(r => r.id === selectedRolId) || roles[0];

  // Edit User Form States
  const [editingUsuario, setEditingUsuario] = useState<UsuarioRol | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRolId, setEditRolId] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editLugarInicio, setEditLugarInicio] = useState('');
  const [editLugarFin, setEditLugarFin] = useState('');

  const [nuevoLugarInicio, setNuevoLugarInicio] = useState('');
  const [nuevoLugarFin, setNuevoLugarFin] = useState('');

  const handleStartEdit = (usuario: UsuarioRol) => {
    setEditingUsuario(usuario);
    setEditNombre(usuario.nombre);
    setEditEmail(usuario.email);
    setEditRolId(usuario.rolId);
    setEditPassword(usuario.password || '');
    setEditLugarInicio(usuario.lugarInicioRecorrido || 'Oficina Central - Av. San Martín 1230');
    setEditLugarFin(usuario.lugarFinRecorrido || 'Oficina Central - Av. San Martín 1230');
  };

  const handleResetEmployeeAccount = () => {
    if (!editingUsuario) return;
    const confirmReset = confirm(
      `¿Desea restablecer la cuenta de ${editingUsuario.nombre}?\n\nSe fijará la fecha de inicio de su nuevo período a HOY (${new Date().toLocaleDateString('es-AR')}), reiniciando el cómputo de horas, accesos, presentismo y comisiones para su próxima liquidación.`
    );
    if (confirmReset) {
      const todayIso = new Date().toISOString();
      const updated: UsuarioRol = {
        ...editingUsuario,
        nombre: editNombre,
        email: editEmail.toLowerCase().trim(),
        rolId: editRolId,
        password: editPassword || '123',
        lugarInicioRecorrido: editLugarInicio,
        lugarFinRecorrido: editLugarFin,
        fechaInicioLiquidacionActual: todayIso,
        horasAjustadasOffset: 0,
        comisionesAjustadasOffset: 0
      };
      onUpdateUsuario(updated);
      setEditingUsuario(null);
      alert(`✅ Cuenta de ${editingUsuario.nombre} restablecida correctamente con fecha de inicio ${new Date().toLocaleDateString('es-AR')}.`);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUsuario) return;
    if (!editNombre || !editEmail) {
      alert('Por favor complete todos los campos.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(editEmail)) {
      alert('Por favor ingrese un correo electrónico válido.');
      return;
    }

    const updated: UsuarioRol = {
      ...editingUsuario,
      nombre: editNombre,
      email: editEmail.toLowerCase().trim(),
      rolId: editRolId,
      password: editPassword || '123',
      lugarInicioRecorrido: editLugarInicio,
      lugarFinRecorrido: editLugarFin
    };

    onUpdateUsuario(updated);
    setEditingUsuario(null);
    alert('Usuario actualizado correctamente.');
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevoEmail) {
      alert('Por favor complete todos los campos.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(nuevoEmail)) {
      alert('Por favor ingrese un correo electrónico válido.');
      return;
    }

    const nuevo: UsuarioRol = {
      id: `USR-${Date.now()}`,
      nombre: nuevoNombre,
      email: nuevoEmail.toLowerCase().trim(),
      password: nuevoPassword || '123',
      rolId: nuevoRolId,
      lugarInicioRecorrido: nuevoLugarInicio || 'Oficina Central - Av. San Martín 1230',
      lugarFinRecorrido: nuevoLugarFin || 'Oficina Central - Av. San Martín 1230',
      fechaInicioLiquidacionActual: new Date().toISOString()
    };

    onAddUsuario(nuevo);
    setNuevoNombre('');
    setNuevoEmail('');
    setNuevoPassword('123');
    setNuevoLugarInicio('');
    setNuevoLugarFin('');
    alert(`Usuario ${nuevoNombre} registrado correctamente.`);
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoRolNombre) return;

    const rolId = nuevoRolNombre.toUpperCase().replace(/\s+/g, '_');
    
    // Check if exists
    if (roles.some(r => r.id === rolId)) {
      alert('Ya existe un rol con este nombre.');
      return;
    }

    const nuevo: PermisosRol = {
      id: rolId,
      nombre: nuevoRolNombre,
      verDashboard: true,
      verClientes: true,
      crearClientes: false,
      verTelefonoCliente: true,
      verDniCliente: true,
      verDireccionCliente: true,
      verIngresosCliente: false,
      verPrestamos: false,
      crearPrestamos: false,
      verPagos: true,
      registrarPagos: false,
      verTesoreria: false,
      verConfiguracion: false,
    };

    onAddRole(nuevo);
    setSelectedRolId(rolId);
    setNuevoRolNombre('');
    setShowAddRole(false);
    alert(`Nuevo rol "${nuevoRolNombre}" creado con éxito. Ahora puede configurar sus accesos en el panel de la derecha.`);
  };

  const togglePermission = (field: keyof Omit<PermisosRol, 'id' | 'nombre'>) => {
    if (!selectedRole) return;
    if (selectedRole.id === 'ADMIN') {
      alert('No es posible restringir los accesos del rol Super Administrador.');
      return;
    }

    const updated = {
      ...selectedRole,
      [field]: !selectedRole[field]
    };
    onUpdateRolePermisos(updated);
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Card with Tab Switcher */}
      <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-md space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Gestión de Personal, Permisos y Control de Asistencia
            </h2>
            <p className="text-xs text-emerald-200/80 leading-relaxed max-w-3xl">
              Administre la nómina de colaboradores de Credi-Cash, asigne roles y permisos de pantalla, y controle el registro de horas de conexión (fichaje de entrada y salida) del personal.
            </p>
          </div>
          <div className="px-3 py-1.5 bg-emerald-900 text-emerald-200 rounded-lg text-xs font-semibold self-start md:self-auto flex items-center gap-2 border border-emerald-700">
            <Lock className="w-3.5 h-3.5" />
            Acceso Jerárquico Controlado
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-emerald-800/80 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('USUARIOS')}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'USUARIOS'
                ? 'border-emerald-400 text-emerald-300 font-extrabold'
                : 'border-transparent text-emerald-200/60 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuarios & Roles ({usuarios.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('PRESENTISMO')}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'PRESENTISMO'
                ? 'border-emerald-400 text-emerald-300 font-extrabold'
                : 'border-transparent text-emerald-200/60 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Control de Presentismo y Fichaje</span>
            <span className="bg-emerald-900 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
              {fichajes.filter(f => f.estado === 'ACTIVA').length} Activos
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'PRESENTISMO' ? (
        /* Module: Presentismo y Fichaje de Personal */
        <div className="space-y-6 animate-fadeIn">

          {/* Operating Schedule Restriction Notice Box */}
          <div className="p-4 bg-emerald-900/60 border border-emerald-700/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-emerald-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <span>Horario de Trabajo Regulado: 08:00 AM a 01:00 PM (13:00 hs)</span>
                </h4>
                <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                  Los usuarios con rol <b>OPERADOR</b> solo pueden abrir sesión dentro de esta franja horaria. Cada inicio de sesión queda registrado automáticamente como <b>PRESENTE</b>. Si en el día no abre sesión, el sistema lo registra como <b>AUSENTE</b>.
                </p>
              </div>
            </div>
            <div className="px-3 py-1.5 bg-slate-900 rounded-xl text-[10px] font-extrabold text-emerald-300 border border-emerald-800 whitespace-nowrap">
              Regulación Activa
            </div>
          </div>

          {/* Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-md flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-900/80 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-700/60">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/70 block">Presentes en la Fecha</span>
                <span className="text-2xl font-black text-white">
                  {countPresentes} <span className="text-xs font-semibold text-emerald-400">colaborador(es)</span>
                </span>
              </div>
            </div>

            <div className="bg-emerald-950/90 p-5 rounded-2xl border border-rose-900/80 shadow-md flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-950/80 text-rose-300 flex items-center justify-center shrink-0 border border-rose-800/60">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300/70 block">Ausentes (Sin Sesión)</span>
                <span className="text-2xl font-black text-rose-200">
                  {countAusentes} <span className="text-xs font-semibold text-rose-400">operador(es)</span>
                </span>
              </div>
            </div>

            <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-md flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-teal-900/80 text-teal-300 flex items-center justify-center shrink-0 border border-teal-700/60">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/70 block">Nómina Evaluada</span>
                <span className="text-2xl font-black text-white">
                  {targetUsersForAttendance.length} <span className="text-xs font-semibold text-emerald-400">usuarios</span>
                </span>
              </div>
            </div>

            <div className="bg-emerald-950/90 p-5 rounded-2xl border border-emerald-800/80 shadow-md flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-900/80 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-700/60">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/70 block">Franja de Trabajo</span>
                <span className="text-lg font-black text-amber-300">
                  08:00 - 13:00 hs
                </span>
              </div>
            </div>
          </div>

          {/* Date & Filter Toolbar */}
          <div className="bg-emerald-950/90 p-4 rounded-2xl border border-emerald-800/80 shadow-md flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <label className="text-xs font-bold text-white uppercase tracking-wider">Fecha:</label>
                <input 
                  type="date"
                  value={fechaFiltroAsistencia}
                  onChange={(e) => setFechaFiltroAsistencia(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 text-white font-mono font-bold text-xs border border-emerald-700 rounded-xl focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-emerald-400" />
                <label className="text-xs font-bold text-white uppercase tracking-wider">Rol:</label>
                <select
                  value={rolFiltroAsistencia}
                  onChange={(e) => setRolFiltroAsistencia(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900 text-white font-bold text-xs border border-emerald-700 rounded-xl focus:outline-none focus:border-emerald-400"
                >
                  <option value="OPERADOR">Solo Operadores</option>
                  <option value="TODOS">Todos los Roles</option>
                  <option value="COBRADOR">Solo Cobradores</option>
                  <option value="ADMIN">Solo Administradores</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider">Estado:</label>
                <select
                  value={estadoFiltroAsistencia}
                  onChange={(e) => setEstadoFiltroAsistencia(e.target.value as any)}
                  className="px-3 py-1.5 bg-slate-900 text-white font-bold text-xs border border-emerald-700 rounded-xl focus:outline-none focus:border-emerald-400"
                >
                  <option value="TODOS">Todos (Presentes y Ausentes)</option>
                  <option value="PRESENTE">Solo Presentes</option>
                  <option value="AUSENTE">Solo Ausentes</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setFechaFiltroAsistencia(todayStr)}
              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Ver Hoy ({todayStr})
            </button>
          </div>

          {/* Daily Attendance Control Table (Roster of Presentes vs Ausentes) */}
          <div className="bg-emerald-950/90 rounded-2xl border border-emerald-800/80 shadow-md overflow-hidden">
            <div className="p-5 border-b border-emerald-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-900/40">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4.5 h-4.5 text-emerald-400" />
                  Control de Presentismo de Operadores para la fecha: <span className="text-emerald-300 font-mono font-bold">{fechaFiltroAsistencia}</span>
                </h3>
                <p className="text-xs text-emerald-200/70">Muestra si cada colaborador abrió su sesión de trabajo en el horario permitido de 08:00 AM a 01:00 PM.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 text-emerald-100 uppercase font-bold text-[10px] tracking-wider border-b-2 border-emerald-700">
                    <th className="p-3.5 pl-5">Colaborador / Operador</th>
                    <th className="p-3.5">Rol Institucional</th>
                    <th className="p-3.5">Horario Laboral Asignado</th>
                    <th className="p-3.5">Apertura de Sesión</th>
                    <th className="p-3.5">Cierre de Sesión</th>
                    <th className="p-3.5 text-center">Estado de Asistencia</th>
                    <th className="p-3.5 pr-5 text-right">Acción Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-800/60 text-emerald-100">
                  {attendanceRoster.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-emerald-300/60">
                        No hay operadores registrados para los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    attendanceRoster.map(({ user, fichaje, estadoAsistencia }) => (
                      <tr key={user.id} className="hover:bg-emerald-900/60 transition-colors">
                        <td className="p-3.5 pl-5 font-bold text-white flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border ${
                            estadoAsistencia.startsWith('PRESENTE') 
                              ? 'bg-emerald-900 text-emerald-300 border-emerald-500' 
                              : estadoAsistencia === 'AUSENTE'
                              ? 'bg-rose-950 text-rose-300 border-rose-700'
                              : 'bg-amber-950 text-amber-300 border-amber-700'
                          }`}>
                            {user.nombre.charAt(0)}
                          </div>
                          <div>
                            <span className="block font-bold text-white">{user.nombre}</span>
                            <span className="block text-[10px] text-emerald-300/70 font-mono">{user.email}</span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-emerald-300 border border-emerald-800">
                            {user.rolId}
                          </span>
                        </td>

                        <td className="p-3.5 font-bold text-amber-300 flex items-center gap-1 mt-2">
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          08:00 AM - 01:00 PM
                        </td>

                        <td className="p-3.5 font-bold text-emerald-200">
                          {fichaje ? (
                            <span className="flex items-center gap-1.5 text-emerald-300 font-mono">
                              <LogIn className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              {fichaje.horaEntrada}
                            </span>
                          ) : (
                            <span className="text-rose-400/80 italic text-[11px]">No abrió sesión</span>
                          )}
                        </td>

                        <td className="p-3.5 font-bold text-emerald-200">
                          {fichaje?.horaSalida ? (
                            <span className="flex items-center gap-1.5 text-emerald-200/80 font-mono">
                              <LogOut className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              {fichaje.horaSalida}
                            </span>
                          ) : fichaje?.estado === 'ACTIVA' ? (
                            <span className="text-emerald-400 font-bold animate-pulse">Sesión Abierta</span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        <td className="p-3.5 text-center">
                          {estadoAsistencia === 'PRESENTE_ACTIVO' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-900 text-emerald-300 border border-emerald-500 shadow-sm animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                              PRESENTE (EN JORNADA)
                            </span>
                          )}
                          {estadoAsistencia === 'PRESENTE_FINALIZADO' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-teal-950 text-teal-300 border border-teal-700 shadow-sm">
                              <CheckCircle className="w-3 h-3 text-teal-400" />
                              PRESENTE (FINALIZADO)
                            </span>
                          )}
                          {estadoAsistencia === 'AUSENTE' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-rose-950 text-rose-200 border border-rose-800 shadow-sm">
                              <UserX className="w-3 h-3 text-rose-400" />
                              AUSENTE (SIN INGRESO)
                            </span>
                          )}
                          {estadoAsistencia === 'PENDIENTE' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-amber-950 text-amber-200 border border-amber-800 shadow-sm">
                              <Clock className="w-3 h-3 text-amber-400" />
                              PENDIENTE (EN FRANJA)
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 pr-5 text-right">
                          {fichaje?.estado === 'ACTIVA' && onUpdateFichaje && (
                            <button
                              onClick={() => {
                                const timeStr = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                                const updated: FichajeAsistencia = {
                                  ...fichaje,
                                  horaSalida: timeStr,
                                  horasTrabajadas: 5,
                                  estado: 'FINALIZADA'
                                };
                                onUpdateFichaje(updated);
                              }}
                              className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800 rounded font-bold text-[10px] cursor-pointer transition-colors"
                              title="Cerrar sesión del operador"
                            >
                              Cerrar Sesión
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Complete Historical Activity Log */}
          <div className="bg-emerald-950/90 rounded-2xl border border-emerald-800/80 shadow-md overflow-hidden">
            <div className="p-4 border-b border-emerald-800/80 bg-emerald-900/30 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Historial Cronológico de Sesiones Registradas ({fichajes.length})
              </h3>
            </div>
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-emerald-200/80 uppercase font-bold text-[9px] tracking-wider border-b border-emerald-800">
                    <th className="p-2.5 pl-4">Colaborador</th>
                    <th className="p-2.5">Rol</th>
                    <th className="p-2.5">Fecha</th>
                    <th className="p-2.5">Entrada</th>
                    <th className="p-2.5">Salida</th>
                    <th className="p-2.5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-900/60 text-emerald-100">
                  {fichajes.map(f => (
                    <tr key={f.id} className="hover:bg-emerald-900/40">
                      <td className="p-2.5 pl-4 font-bold text-white">{f.usuarioNombre}</td>
                      <td className="p-2.5 text-emerald-300">{f.usuarioRol}</td>
                      <td className="p-2.5 font-mono">{f.fecha}</td>
                      <td className="p-2.5 font-bold text-emerald-400">{f.horaEntrada}</td>
                      <td className="p-2.5 text-emerald-200">{f.horaSalida || '-'}</td>
                      <td className="p-2.5 text-center font-bold text-[10px]">
                        {f.estado === 'ACTIVA' ? '● En jornada' : '✔ Finalizada'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Users List & Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* User Registration Form */}
          <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-md space-y-4">
            <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-2">
              <UserPlus className="w-4.5 h-4.5 text-emerald-400" />
              Registrar o Autorizar Nuevo Usuario
            </h3>
            
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Nombre del Colaborador</label>
                <input 
                  type="text"
                  placeholder="Ej. Rodrigo Gómez"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-900 text-white placeholder-emerald-300/50 border border-emerald-700 rounded-lg focus:outline-none focus:border-emerald-400 transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Correo Electrónico (Google)</label>
                <input 
                  type="email"
                  placeholder="Ej. cobrador@gmail.com"
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-900 text-white placeholder-emerald-300/50 border border-emerald-700 rounded-lg focus:outline-none focus:border-emerald-400 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Rol Asignado</label>
                <select 
                  value={nuevoRolId}
                  onChange={(e) => setNuevoRolId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-900 text-white border border-emerald-700 rounded-lg focus:outline-none focus:border-emerald-400 transition-all cursor-pointer font-bold"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Contraseña de Ingreso</label>
                <input 
                  type="text"
                  placeholder="Ej. cobrador123"
                  value={nuevoPassword}
                  onChange={(e) => setNuevoPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-900 text-white border border-emerald-700 rounded-lg focus:outline-none focus:border-emerald-400 transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Lugar Inicio Recorrido (Cobrador)</label>
                <input 
                  type="text"
                  placeholder="Ej. Oficina Central - Av. San Martín 1230"
                  value={nuevoLugarInicio}
                  onChange={(e) => setNuevoLugarInicio(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-900 text-white placeholder-emerald-300/50 border border-emerald-700 rounded-lg focus:outline-none focus:border-emerald-400 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Lugar Fin Recorrido (Cobrador)</label>
                <input 
                  type="text"
                  placeholder="Ej. Oficina Central - Av. San Martín 1230"
                  value={nuevoLugarFin}
                  onChange={(e) => setNuevoLugarFin(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-900 text-white placeholder-emerald-300/50 border border-emerald-700 rounded-lg focus:outline-none focus:border-emerald-400 transition-all"
                />
              </div>

              <div className="flex items-end sm:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer h-[34px]"
                >
                  <UserPlus className="w-4 h-4" />
                  Agregar Personal
                </button>
              </div>
            </form>
          </div>

          {/* Authorized Users List */}
          <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-md space-y-4">
            <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-emerald-400" />
              Personal Registrado y Lista de Accesos
            </h3>

            <div className="overflow-x-auto border border-emerald-800/80 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-emerald-950 to-teal-950 border-b border-emerald-800">
                    <th className="p-3 text-[10px] font-extrabold uppercase text-emerald-300 tracking-wider">Usuario</th>
                    <th className="p-3 text-[10px] font-extrabold uppercase text-emerald-300 tracking-wider">Correo Electrónico</th>
                    <th className="p-3 text-[10px] font-extrabold uppercase text-emerald-300 tracking-wider">Rol de Sistema</th>
                    <th className="p-3 text-[10px] font-extrabold uppercase text-emerald-300 tracking-wider">Contraseña</th>
                    <th className="p-3 text-[10px] font-extrabold uppercase text-emerald-300 tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-800/60 text-xs">
                  {usuarios.map(u => {
                    const r = roles.find(rol => rol.id === u.rolId);
                    const isActiveSimulated = activeUser.id === u.id;
                    return (
                      <tr key={u.id} className={`hover:bg-emerald-900/60 transition-colors ${isActiveSimulated ? 'bg-emerald-900/80' : ''}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-900 text-emerald-300 border border-emerald-700 flex items-center justify-center font-bold uppercase text-[11px]">
                              {u.nombre.substring(0, 2)}
                            </div>
                            <div>
                              <div className="font-bold text-white flex items-center gap-1.5">
                                {u.nombre}
                                {isActiveSimulated && (
                                  <span className="text-[9px] bg-emerald-800 text-emerald-200 font-bold px-1.5 py-0.2 rounded-full border border-emerald-600">Actual</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-emerald-200/80 font-mono text-[11px]">
                          {u.email}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            u.rolId === 'ADMIN' ? 'bg-purple-950 text-purple-300 border-purple-800' :
                            u.rolId === 'COBRADOR' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                            u.rolId === 'OPERADOR' ? 'bg-blue-950 text-blue-300 border-blue-800' : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}>
                            {r?.nombre || u.rolId}
                          </span>
                        </td>
                        <td className="p-3 text-emerald-200/80 font-mono text-[11px] font-bold">
                          {u.password || '123'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleStartEdit(u)}
                              className="text-emerald-300 hover:text-white p-1 bg-emerald-900 hover:bg-emerald-800 border border-emerald-700 rounded-lg transition-all cursor-pointer inline-flex items-center"
                              title="Editar usuario"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {u.rolId === 'ADMIN' && u.email === 'credicash999@gmail.com' ? (
                              <span className="text-[10px] text-emerald-400/60 italic">Creador (Fijo)</span>
                            ) : (
                              <button
                                onClick={() => {
                                  if (confirm(`¿Está seguro de que desea eliminar a ${u.nombre}? Perderá el acceso de forma inmediata.`)) {
                                    onDeleteUsuario(u.id);
                                  }
                                }}
                                className="text-rose-300 hover:text-rose-100 p-1 bg-rose-950 hover:bg-rose-900 border border-rose-800 rounded-lg transition-all cursor-pointer inline-flex items-center"
                                title="Revocar acceso"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-amber-950/80 border border-amber-800/80 rounded-xl flex gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[10px] text-amber-200 leading-relaxed">
                <b>Regla de Negocio para Cobradores:</b> Cuando un colaborador tiene asignado el rol de <b>Cobrador</b>, 
                el sistema filtra de forma automática las listas de Clientes y Cobranza Diaria. Solo podrá visualizar y 
                registrar pagos de aquellos clientes y préstamos en los que esté registrado bajo la columna <b>"Cobrador"</b>.
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Roles and Checklist Permissions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-emerald-950/90 p-6 rounded-2xl border border-emerald-800/80 shadow-md space-y-5">
            <div className="flex items-center justify-between border-b border-emerald-800 pb-3">
              <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-widest flex items-center gap-2">
                <KeyRound className="w-4.5 h-4.5 text-emerald-400" />
                Matriz de Permisos por Rol
              </h3>
              
              <button
                type="button"
                onClick={() => setShowAddRole(!showAddRole)}
                className="text-[10px] text-emerald-300 hover:text-white font-extrabold uppercase tracking-wider"
              >
                {showAddRole ? 'Cancelar' : '+ Crear Rol'}
              </button>
            </div>

            {/* Create Custom Role form toggler */}
            {showAddRole && (
              <form onSubmit={handleCreateRole} className="p-3.5 bg-slate-900 border border-emerald-800 rounded-xl space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-300 uppercase">Nombre del nuevo Rol</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Cobrador Externo, Atención"
                    value={nuevoRolNombre}
                    onChange={(e) => setNuevoRolNombre(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-900 text-white border border-emerald-700 rounded-lg focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  Crear e Iniciar Configuración
                </button>
              </form>
            )}

            {/* Select Role to edit */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Seleccionar Rol para Configurar</label>
              <div className="flex flex-wrap gap-1.5">
                {roles.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelectedRolId(r.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                      selectedRolId === r.id
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-slate-900 hover:bg-slate-800 text-emerald-200 border border-emerald-800'
                    }`}
                  >
                    {r.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* Checklist of permissions */}
            <div className="space-y-3 pt-2">
              <div className="p-3.5 bg-slate-900 rounded-xl border border-emerald-800">
                <span className="text-[10px] uppercase font-bold text-emerald-300/70 tracking-wider">Modificando accesos para:</span>
                <div className="text-sm font-bold text-white mt-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  {selectedRole?.nombre}
                </div>
              </div>

              <div className="space-y-2.5 divide-y divide-emerald-800/60 text-xs text-emerald-100">
                
                {/* Permiso 1: Dashboard */}
                <div className="flex items-center justify-between pt-2.5 first:pt-0">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">Ver Dashboard</div>
                    <div className="text-[10px] text-emerald-200/70">Permite ver gráficos, resumen diario y moras.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('verDashboard')}
                    className="cursor-pointer text-emerald-400 focus:outline-none"
                  >
                    {selectedRole?.verDashboard ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Permiso 2: Ver Clientes */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">Ver Clientes (Base)</div>
                    <div className="text-[10px] text-emerald-200/70">Visualizar la cartera de clientes de la base.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('verClientes')}
                    className="cursor-pointer focus:outline-none"
                  >
                    {selectedRole?.verClientes ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Permiso 3: Crear Clientes */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">Agregar y Editar Clientes</div>
                    <div className="text-[10px] text-emerald-200/70">Dar de alta nuevos solicitantes o actualizar datos.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('crearClientes')}
                    className="cursor-pointer focus:outline-none"
                  >
                    {selectedRole?.crearClientes ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Sub-permisos de Privacidad de Clientes */}
                <div className="bg-slate-900 p-3.5 rounded-xl space-y-2.5 mt-2 border border-emerald-800">
                  <div className="text-[9px] font-extrabold text-emerald-300 uppercase tracking-widest mb-1">
                    🔓 Privacidad de Clientes para {selectedRole?.nombre}
                  </div>
                  
                  {/* DNI */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[11px] text-white">Ver Número de DNI</div>
                      <div className="text-[9px] text-emerald-200/60">Restringir documento de identidad</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePermission('verDniCliente')}
                      className="cursor-pointer focus:outline-none"
                    >
                      {selectedRole?.verDniCliente ? (
                        <ToggleRight className="w-8 h-8 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-600" />
                      )}
                    </button>
                  </div>

                  {/* Teléfono */}
                  <div className="flex items-center justify-between border-t border-emerald-800/60 pt-2">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[11px] text-white">Ver Teléfono / Celular</div>
                      <div className="text-[9px] text-emerald-200/60">Ocultar número para evitar contacto no supervisado</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePermission('verTelefonoCliente')}
                      className="cursor-pointer focus:outline-none"
                    >
                      {selectedRole?.verTelefonoCliente ? (
                        <ToggleRight className="w-8 h-8 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-600" />
                      )}
                    </button>
                  </div>

                  {/* Dirección */}
                  <div className="flex items-center justify-between border-t border-emerald-800/60 pt-2">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[11px] text-white">Ver Dirección Física</div>
                      <div className="text-[9px] text-emerald-200/60">Permitir ver el domicilio para cobros en calle</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePermission('verDireccionCliente')}
                      className="cursor-pointer focus:outline-none"
                    >
                      {selectedRole?.verDireccionCliente ? (
                        <ToggleRight className="w-8 h-8 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-600" />
                      )}
                    </button>
                  </div>

                  {/* Ingresos */}
                  <div className="flex items-center justify-between border-t border-emerald-800/60 pt-2">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[11px] text-white">Ver Actividad Laboral e Ingresos</div>
                      <div className="text-[9px] text-emerald-200/60">Ver ingresos y profesión declarada</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePermission('verIngresosCliente')}
                      className="cursor-pointer focus:outline-none"
                    >
                      {selectedRole?.verIngresosCliente ? (
                        <ToggleRight className="w-8 h-8 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-600" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Permiso 4: Ver Préstamos */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">Ver Solicitudes y Créditos</div>
                    <div className="text-[10px] text-emerald-200/70">Ver el listado de préstamos otorgados o pendientes.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('verPrestamos')}
                    className="cursor-pointer focus:outline-none"
                  >
                    {selectedRole?.verPrestamos ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Permiso 5: Crear Préstamos */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">Otorgar y Liquidar Créditos</div>
                    <div className="text-[10px] text-emerald-200/70">Crear nuevas operaciones de amortización y desembolsos.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('crearPrestamos')}
                    className="cursor-pointer focus:outline-none"
                  >
                    {selectedRole?.crearPrestamos ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Permiso 6: Ver Pagos */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">Ver Pantalla de Cobros (Operador)</div>
                    <div className="text-[10px] text-emerald-200/70">Acceso para ver el cronograma y plan de pagos.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('verPagos')}
                    className="cursor-pointer focus:outline-none"
                  >
                    {selectedRole?.verPagos ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Permiso 7: Registrar Pagos */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">Cobrar y Aplicar Pagos</div>
                    <div className="text-[10px] text-emerald-200/70">Cargar abonos de cuotas al sistema manualmente.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('registrarPagos')}
                    className="cursor-pointer focus:outline-none"
                  >
                    {selectedRole?.registrarPagos ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Permiso 8: Tesoreria */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">Caja y Tesorería</div>
                    <div className="text-[10px] text-emerald-200/70">Ver saldos, egresos de capital e ingresos de cobros.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('verTesoreria')}
                    className="cursor-pointer focus:outline-none"
                  >
                    {selectedRole?.verTesoreria ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Permiso 9: Configuracion */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">Configuración & Feriados</div>
                    <div className="text-[10px] text-emerald-200/70">Cambiar tasas de interés diarias/mensuales y limpiar BD.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('verConfiguracion')}
                    className="cursor-pointer focus:outline-none"
                  >
                    {selectedRole?.verConfiguracion ? (
                      <ToggleRight className="w-8 h-8 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-600" />
                    )}
                  </button>
                </div>

              </div>
            </div>

            <div className="p-3 bg-emerald-900/80 border border-emerald-700 rounded-xl text-[11px] text-emerald-200 leading-relaxed">
              Los cambios en la matriz de roles se aplican al instante para cualquier colaborador que pertenezca a este grupo.
            </div>
          </div>

        </div>

      </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUsuario && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-emerald-950 rounded-2xl border border-emerald-700/80 shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn">
            <div className="p-5 border-b border-emerald-800 bg-emerald-900/60 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Editar Colaborador
                </h3>
              </div>
              <button
                onClick={() => setEditingUsuario(null)}
                className="p-1 hover:bg-emerald-800 rounded-full text-emerald-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs text-emerald-100">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-emerald-300 uppercase">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 text-white border border-emerald-700 rounded-lg focus:outline-none focus:border-emerald-400 transition-all font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-emerald-300 uppercase">Correo Electrónico (Acceso)</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-900 text-white border border-emerald-700 rounded-lg focus:outline-none focus:border-emerald-400 transition-all font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-300 uppercase">Contraseña</label>
                  <input
                    type="text"
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-900 text-white border border-emerald-700 rounded-lg focus:outline-none focus:border-emerald-400 transition-all font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-300 uppercase">Rol Asignado</label>
                  <select
                    value={editRolId}
                    onChange={(e) => setEditRolId(e.target.value)}
                    className="w-full h-[34px] px-3 py-1.5 text-xs bg-slate-900 text-white border border-emerald-700 rounded-lg focus:outline-none focus:border-emerald-400 font-bold"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-emerald-300 uppercase">Lugar de Inicio de Recorrido</label>
                <input
                  type="text"
                  value={editLugarInicio}
                  onChange={(e) => setEditLugarInicio(e.target.value)}
                  placeholder="Ej. Oficina Central - Av. San Martín 1230"
                  className="w-full px-3 py-2 text-xs bg-slate-900 text-white border border-emerald-700 rounded-lg focus:outline-none focus:border-emerald-400 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-emerald-300 uppercase">Lugar de Finalización de Recorrido</label>
                <input
                  type="text"
                  value={editLugarFin}
                  onChange={(e) => setEditLugarFin(e.target.value)}
                  placeholder="Ej. Oficina Central - Av. San Martín 1230"
                  className="w-full px-3 py-2 text-xs bg-slate-900 text-white border border-emerald-700 rounded-lg focus:outline-none focus:border-emerald-400 transition-all"
                />
              </div>

              <div className="pt-2 border-t border-emerald-800">
                <button
                  type="button"
                  onClick={handleResetEmployeeAccount}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
                >
                  <RefreshCw className="w-4 h-4 text-slate-950 animate-spin-slow" />
                  <span>Restablecer Cuenta (Horas, Actividad, Comisiones)</span>
                </button>
                <span className="text-[9px] text-emerald-300/70 text-center block mt-1">
                  Permite empezar a computar horas, asistencias y comisiones desde hoy para la próxima liquidación.
                </span>
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-emerald-800">
                <button
                  type="button"
                  onClick={() => setEditingUsuario(null)}
                  className="px-4 py-2 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 rounded-lg font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-bold uppercase tracking-wider text-[10px] transition-all shadow-md cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
