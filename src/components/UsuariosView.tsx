import React, { useState } from 'react';
import { PermisosRol, UsuarioRol, FichajeAsistencia } from '../types';
import { 
  Shield, UserPlus, Users, ToggleLeft, ToggleRight, Check, Trash2, 
  Lock, KeyRound, Mail, Info, ShieldAlert, CheckCircle2, Edit2, X,
  Clock, Calendar, LogIn, LogOut, CheckCircle, Activity, UserCheck
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

  const handleStartEdit = (usuario: UsuarioRol) => {
    setEditingUsuario(usuario);
    setEditNombre(usuario.nombre);
    setEditEmail(usuario.email);
    setEditRolId(usuario.rolId);
    setEditPassword(usuario.password || '');
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
      password: editPassword || '123'
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
    };

    onAddUsuario(nuevo);
    setNuevoNombre('');
    setNuevoEmail('');
    setNuevoPassword('123');
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
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Gestión de Personal, Permisos y Control de Asistencia
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
              Administre la nómina de colaboradores de Credi-Cash, asigne roles y permisos de pantalla, y controle el registro de horas de conexión (fichaje de entrada y salida) del personal.
            </p>
          </div>
          <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold self-start md:self-auto flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" />
            Acceso Jerárquico Controlado
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('USUARIOS')}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'USUARIOS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Usuarios & Roles ({usuarios.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('PRESENTISMO')}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'PRESENTISMO'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Control de Presentismo y Fichaje</span>
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
              {fichajes.filter(f => f.estado === 'ACTIVA').length} Activos
            </span>
          </button>
        </div>
      </div>

      {activeTab === 'PRESENTISMO' ? (
        /* Module: Presentismo y Fichaje de Personal */
        <div className="space-y-6 animate-fadeIn">
          {/* Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Personal Presente Hoy</span>
                <span className="text-xl font-black text-slate-800">
                  {fichajes.filter(f => f.estado === 'ACTIVA').length} operador(es)
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Sesiones este Mes</span>
                <span className="text-xl font-black text-slate-800">
                  {fichajes.length} fichajes
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Promedio de Jornada</span>
                <span className="text-xl font-black text-slate-800">
                  7h 45m
                </span>
              </div>
            </div>
          </div>

          {/* Attendance Log Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Registro de Conexión e Inicio de Jornadas Laborales
                </h3>
                <p className="text-xs text-slate-500">Histórico de inicios y cierres de sesión de los operadores y personal administrativo.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                    <th className="p-3.5 pl-5">Colaborador / Usuario</th>
                    <th className="p-3.5">Rol / Sector</th>
                    <th className="p-3.5">Fecha</th>
                    <th className="p-3.5">Hora Entrada</th>
                    <th className="p-3.5">Hora Salida</th>
                    <th className="p-3.5">Horas Trabajadas</th>
                    <th className="p-3.5 text-center">Estado</th>
                    <th className="p-3.5 pr-5 text-right">Acción Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {fichajes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No hay registros de asistencia guardados aún.
                      </td>
                    </tr>
                  ) : (
                    fichajes.map(f => (
                      <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 pl-5 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-black text-[11px]">
                            {f.usuarioNombre.charAt(0)}
                          </div>
                          <span>{f.usuarioNombre}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {f.usuarioRol || f.rolNombre || 'OPERADOR'}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-slate-600">{f.fecha}</td>
                        <td className="p-3.5 font-bold text-emerald-700 flex items-center gap-1">
                          <LogIn className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          {f.horaEntrada}
                        </td>
                        <td className="p-3.5 font-bold text-slate-700">
                          {f.horaSalida ? (
                            <span className="flex items-center gap-1 text-slate-600">
                              <LogOut className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {f.horaSalida}
                            </span>
                          ) : (
                            <span className="text-amber-600 italic">En curso...</span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-800">
                          {f.horasTrabajadas ? `${f.horasTrabajadas} hrs` : (f.duracionMinutos ? `${Math.round(f.duracionMinutos/60)} hrs` : '-')}
                        </td>
                        <td className="p-3.5 text-center">
                          {f.estado === 'ACTIVA' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                              ● EN JORNADA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              ✔ Finalizada
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          {f.estado === 'ACTIVA' && onUpdateFichaje && (
                            <button
                              onClick={() => {
                                const now = new Date();
                                const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
                                const updated: FichajeAsistencia = {
                                  ...f,
                                  horaSalida: timeStr,
                                  horasTrabajadas: 8,
                                  estado: 'FINALIZADA'
                                };
                                onUpdateFichaje(updated);
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-bold text-[10px] cursor-pointer transition-colors"
                              title="Marcar salida forzada"
                            >
                              Cerrar Jornada
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
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Users List & Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* User Registration Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <UserPlus className="w-4.5 h-4.5 text-blue-600" />
              Registrar o Autorizar Nuevo Usuario
            </h3>
            
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nombre del Colaborador</label>
                <input 
                  type="text"
                  placeholder="Ej. Rodrigo Gómez"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Correo Electrónico (Google)</label>
                <input 
                  type="email"
                  placeholder="Ej. cobrador@gmail.com"
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rol Asignado</label>
                <select 
                  value={nuevoRolId}
                  onChange={(e) => setNuevoRolId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contraseña de Ingreso</label>
                <input 
                  type="text"
                  placeholder="Ej. cobrador123"
                  value={nuevoPassword}
                  onChange={(e) => setNuevoPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex items-end sm:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-sm hover:shadow-none flex items-center justify-center gap-2 cursor-pointer h-[34px]"
                >
                  <UserPlus className="w-4 h-4" />
                  Agregar Personal
                </button>
              </div>
            </form>
          </div>

          {/* Authorized Users List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-blue-600" />
              Personal Registrado y Lista de Accesos
            </h3>

            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="p-3 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Usuario</th>
                    <th className="p-3 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Correo Electrónico</th>
                    <th className="p-3 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Rol de Sistema</th>
                    <th className="p-3 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Contraseña</th>
                    <th className="p-3 text-[10px] font-bold uppercase text-slate-400 tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {usuarios.map(u => {
                    const r = roles.find(rol => rol.id === u.rolId);
                    const isActiveSimulated = activeUser.id === u.id;
                    return (
                      <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${isActiveSimulated ? 'bg-blue-50/30' : ''}`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 uppercase text-[11px]">
                              {u.nombre.substring(0, 2)}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                {u.nombre}
                                {isActiveSimulated && (
                                  <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded-full">Actual</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {u.email}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.rolId === 'ADMIN' ? 'bg-purple-50 text-purple-700' :
                            u.rolId === 'COBRADOR' ? 'bg-amber-50 text-amber-700' :
                            u.rolId === 'OPERADOR' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {r?.nombre || u.rolId}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600 font-mono text-[11px] font-bold">
                          {u.password || '123'}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleStartEdit(u)}
                              className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all cursor-pointer inline-flex items-center"
                              title="Editar usuario"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {u.rolId === 'ADMIN' && u.email === 'credicash999@gmail.com' ? (
                              <span className="text-[10px] text-slate-400 italic">Creador (Fijo)</span>
                            ) : (
                              <button
                                onClick={() => {
                                  if (confirm(`¿Está seguro de que desea eliminar a ${u.nombre}? Perderá el acceso de forma inmediata.`)) {
                                    onDeleteUsuario(u.id);
                                  }
                                }}
                                className="text-rose-600 hover:text-rose-800 p-1 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all cursor-pointer inline-flex items-center"
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

            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[10px] text-amber-800 leading-relaxed">
                <b>Regla de Negocio para Cobradores:</b> Cuando un colaborador tiene asignado el rol de <b>Cobrador</b>, 
                el sistema filtra de forma automática las listas de Clientes y Cobranza Diaria. Solo podrá visualizar y 
                registrar pagos de aquellos clientes y préstamos en los que esté registrado bajo la columna <b>"Cobrador"</b>.
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Roles and Checklist Permissions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <KeyRound className="w-4.5 h-4.5 text-blue-600" />
                Matriz de Permisos por Rol
              </h3>
              
              <button
                type="button"
                onClick={() => setShowAddRole(!showAddRole)}
                className="text-[10px] text-blue-600 hover:text-blue-800 font-bold uppercase tracking-wider"
              >
                {showAddRole ? 'Cancelar' : '+ Crear Rol'}
              </button>
            </div>

            {/* Create Custom Role form toggler */}
            {showAddRole && (
              <form onSubmit={handleCreateRole} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre del nuevo Rol</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Cobrador Externo, Atención"
                    value={nuevoRolNombre}
                    onChange={(e) => setNuevoRolNombre(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                >
                  Crear e Iniciar Configuración
                </button>
              </form>
            )}

            {/* Select Role to edit */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Seleccionar Rol para Configurar</label>
              <div className="flex flex-wrap gap-1.5">
                {roles.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelectedRolId(r.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedRolId === r.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    {r.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* Checklist of permissions */}
            <div className="space-y-3 pt-2">
              <div className="p-3.5 bg-slate-50 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Modificando accesos para:</span>
                <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  {selectedRole?.nombre}
                </div>
              </div>

              <div className="space-y-2.5 divide-y divide-slate-100 text-xs text-slate-700">
                
                {/* Permiso 1: Dashboard */}
                <div className="flex items-center justify-between pt-2.5 first:pt-0">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900">Ver Dashboard</div>
                    <div className="text-[10px] text-slate-500">Permite ver gráficos, resumen diario y moras.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('verDashboard')}
                    className="cursor-pointer text-blue-600 focus:outline-none"
                  >
                    {selectedRole?.verDashboard ? (
                      <ToggleRight className="w-8 h-8 text-blue-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    )}
                  </button>
                </div>

                {/* Permiso 2: Ver Clientes */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900">Ver Clientes (Base)</div>
                    <div className="text-[10px] text-slate-500">Visualizar la cartera de clientes de la base.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('verClientes')}
                    className="cursor-pointer focus:outline-none"
                  >
                    {selectedRole?.verClientes ? (
                      <ToggleRight className="w-8 h-8 text-blue-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    )}
                  </button>
                </div>

                {/* Permiso 3: Crear Clientes */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900">Agregar y Editar Clientes</div>
                    <div className="text-[10px] text-slate-500">Dar de alta nuevos solicitantes o actualizar datos.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('crearClientes')}
                    className="cursor-pointer focus:outline-none"
                  >
                    {selectedRole?.crearClientes ? (
                      <ToggleRight className="w-8 h-8 text-blue-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    )}
                  </button>
                </div>

                {/* Sub-permisos de Privacidad de Clientes */}
                <div className="bg-slate-50 p-3.5 rounded-xl space-y-2.5 mt-2">
                  <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                    🔓 Privacidad de Clientes para {selectedRole?.nombre}
                  </div>
                  
                  {/* DNI */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[11px] text-slate-800">Ver Número de DNI</div>
                      <div className="text-[9px] text-slate-400">Restringir documento de identidad</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePermission('verDniCliente')}
                      className="cursor-pointer focus:outline-none"
                    >
                      {selectedRole?.verDniCliente ? (
                        <ToggleRight className="w-8 h-8 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>

                  {/* Teléfono */}
                  <div className="flex items-center justify-between border-t border-slate-200/50 pt-2">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[11px] text-slate-800">Ver Teléfono / Celular</div>
                      <div className="text-[9px] text-slate-400">Ocultar número para evitar contacto no supervisado</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePermission('verTelefonoCliente')}
                      className="cursor-pointer focus:outline-none"
                    >
                      {selectedRole?.verTelefonoCliente ? (
                        <ToggleRight className="w-8 h-8 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>

                  {/* Dirección */}
                  <div className="flex items-center justify-between border-t border-slate-200/50 pt-2">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[11px] text-slate-800">Ver Dirección Física</div>
                      <div className="text-[9px] text-slate-400">Permitir ver el domicilio para cobros en calle</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePermission('verDireccionCliente')}
                      className="cursor-pointer focus:outline-none"
                    >
                      {selectedRole?.verDireccionCliente ? (
                        <ToggleRight className="w-8 h-8 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>

                  {/* Ingresos */}
                  <div className="flex items-center justify-between border-t border-slate-200/50 pt-2">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-[11px] text-slate-800">Ver Actividad Laboral e Ingresos</div>
                      <div className="text-[9px] text-slate-400">Ver ingresos y profesión declarada</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePermission('verIngresosCliente')}
                      className="cursor-pointer focus:outline-none"
                    >
                      {selectedRole?.verIngresosCliente ? (
                        <ToggleRight className="w-8 h-8 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Permiso 4: Ver Préstamos */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900">Ver Solicitudes y Créditos</div>
                    <div className="text-[10px] text-slate-500">Ver el listado de préstamos otorgados o pendientes.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('verPrestamos')}
                    className="cursor-pointer focus:outline-none"
                  >
                    {selectedRole?.verPrestamos ? (
                      <ToggleRight className="w-8 h-8 text-blue-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    )}
                  </button>
                </div>

                {/* Permiso 5: Crear Préstamos */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900">Otorgar y Liquidar Créditos</div>
                    <div className="text-[10px] text-slate-500">Crear nuevas operaciones de amortización y desembolsos.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('crearPrestamos')}
                    className="cursor-pointer focus:outline-none"
                  >
                    {selectedRole?.crearPrestamos ? (
                      <ToggleRight className="w-8 h-8 text-blue-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    )}
                  </button>
                </div>

                {/* Permiso 6: Ver Pagos */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900">Ver Pantalla de Cobros (Operador)</div>
                    <div className="text-[10px] text-slate-500">Acceso para ver el cronograma y plan de pagos.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('verPagos')}
                    className="cursor-pointer focus:outline-none"
                  >
                    {selectedRole?.verPagos ? (
                      <ToggleRight className="w-8 h-8 text-blue-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    )}
                  </button>
                </div>

                {/* Permiso 7: Registrar Pagos */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900">Cobrar y Aplicar Pagos</div>
                    <div className="text-[10px] text-slate-500">Cargar abonos de cuotas al sistema manualmente.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('registrarPagos')}
                    className="cursor-pointer focus:outline-none"
                  >
                    {selectedRole?.registrarPagos ? (
                      <ToggleRight className="w-8 h-8 text-blue-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    )}
                  </button>
                </div>

                {/* Permiso 8: Tesoreria */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900">Caja y Tesorería</div>
                    <div className="text-[10px] text-slate-500">Ver saldos, egresos de capital e ingresos de cobros.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('verTesoreria')}
                    className="cursor-pointer focus:outline-none"
                  >
                    {selectedRole?.verTesoreria ? (
                      <ToggleRight className="w-8 h-8 text-blue-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    )}
                  </button>
                </div>

                {/* Permiso 9: Configuracion */}
                <div className="flex items-center justify-between pt-2.5">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-900">Configuración & Feriados</div>
                    <div className="text-[10px] text-slate-500">Cambiar tasas de interés diarias/mensuales y limpiar BD.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => togglePermission('verConfiguracion')}
                    className="cursor-pointer focus:outline-none"
                  >
                    {selectedRole?.verConfiguracion ? (
                      <ToggleRight className="w-8 h-8 text-blue-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    )}
                  </button>
                </div>

              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-800 leading-relaxed">
              Los cambios en la matriz de roles se aplican al instante para cualquier colaborador que pertenezca a este grupo.
            </div>
          </div>

        </div>

      </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUsuario && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Editar Colaborador
                </h3>
              </div>
              <button
                onClick={() => setEditingUsuario(null)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs text-slate-600">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Correo Electrónico (Acceso)</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Contraseña</label>
                  <input
                    type="text"
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all font-mono font-bold text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Rol Asignado</label>
                  <select
                    value={editRolId}
                    onChange={(e) => setEditRolId(e.target.value)}
                    className="w-full h-[34px] px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-bold text-slate-700"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUsuario(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold uppercase tracking-wider text-[10px] transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold uppercase tracking-wider text-[10px] transition-all shadow-sm cursor-pointer"
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
