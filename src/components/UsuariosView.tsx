import React, { useState } from 'react';
import { PermisosRol, UsuarioRol } from '../types';
import { 
  Shield, UserPlus, Users, ToggleLeft, ToggleRight, Trash2, 
  Lock, KeyRound, Info 
} from 'lucide-react';

interface UsuariosViewProps {
  usuarios: UsuarioRol[];
  roles: PermisosRol[];
  activeUser: UsuarioRol;
  onAddUsuario: (usuario: UsuarioRol) => void;
  onDeleteUsuario: (id: string) => void;
  onUpdateRolePermisos: (rol: PermisosRol) => void;
  onAddRole: (rol: PermisosRol) => void;
}

export default function UsuariosView({
  usuarios,
  roles,
  activeUser,
  onAddUsuario,
  onDeleteUsuario,
  onUpdateRolePermisos,
  onAddRole,
}: UsuariosViewProps) {
  
  // Estados del formulario simplificado (Solo Usuario y Contraseña)
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');

  // Estados para creación de roles
  const [showAddRole, setShowAddRole] = useState(false);
  const [nuevoRolNombre, setNuevoRolNombre] = useState('');

  // Rol seleccionado para la matriz de permisos
  const [selectedRolId, setSelectedRolId] = useState<string>('OPERADOR');
  const selectedRole = roles.find(r => r.id === selectedRolId);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();

    const nuevo: UsuarioRol = {
      id: `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      nombre: nuevoEmail.split('@')[0], // Extrae el nombre automáticamente a partir del correo
      email: nuevoEmail.toLowerCase().trim(),
      password: nuevoPassword.trim(),
      rolId: 'OPERADOR', // Asigna por defecto el rol base
    };

    onAddUsuario(nuevo);
    setNuevoEmail('');
    setNuevoPassword('');
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoRolNombre.trim()) return;

    const rolId = nuevoRolNombre.toUpperCase().trim().replace(/\s+/g, '_');
    
    if (roles.some(r => r.id === rolId)) {
      alert('Ya existe un rol con este nombre.');
      return;
    }

    const nuevo: PermisosRol = {
      id: rolId,
      nombre: nuevoRolNombre.trim(),
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
      
      {/* Cabecera */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              Gestión de Usuarios, Roles y Permisos
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-3xl">
              Administre las cuentas del personal con acceso al sistema. Defina roles a medida, 
              asigne permisos específicos para cada pantalla y asocie correos electrónicos autorizados.
            </p>
          </div>
          <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold self-start md:self-auto flex items-center gap-2">
            <Lock className="w-3.5 h-3.5" />
            Acceso Jerárquico Controlado
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna Izquierda: Formulario y Tabla de Usuarios */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Formulario Modificado (Solo Usuario y Contraseña) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <UserPlus className="w-4.5 h-4.5 text-blue-600" />
              Registrar Nuevo Usuario
            </h3>
            
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Usuario / Correo Electrónico</label>
                <input 
                  type="email"
                  required
                  placeholder="ejemplo@correo.com"
                  value={nuevoEmail}
                  onChange={(e) => setNuevoEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contraseña</label>
                <input 
                  type="password"
                  required
                  placeholder="Ingrese contraseña"
                  value={nuevoPassword}
                  onChange={(e) => setNuevoPassword(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div className="flex items-end sm:col-span-2">
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer h-[34px]"
                >
                  <UserPlus className="w-4 h-4" />
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>

          {/* Tabla de Personal Registrado */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
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
                          {u.rolId === 'ADMIN' && u.email === 'credicash999@gmail.com' ? (
                            <span className="text-[10px] text-slate-400 italic">Creador (Fijo)</span>
                          ) : (
                            <button
                              type="button"
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
                <b>Regla para Cobradores:</b> Si un colaborador es <b>Cobrador</b>, el sistema filtrará automáticamente las listas de Clientes y Cobranza. Solo visualizará aquellos elementos asignados bajo su nombre.
              </div>
            </div>
          </div>

        </div>

        {/* Columna Derecha: Matriz de Permisos */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
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

            {showAddRole && (
              <form onSubmit={handleCreateRole} className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre del nuevo Rol</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Cobrador Externo"
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

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Seleccionar Rol para Configurar</label>
              <div className="flex flex-wrap gap-1.5">
                {roles.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRolId(r.id)}
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

            <div className="space-y-3 pt-2">
              <div className="p-3.5 bg-slate-50 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Modificando accesos para:</span>
                <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  {selectedRole ? selectedRole.nombre : 'Rol no seleccionado'}
                </div>
              </div>

              {selectedRole ? (
                <div className="space-y-2.5 divide-y divide-slate-100 text-xs text-slate-700">
                  
                  {/* Dashboard */}
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
                      {selectedRole.verDashboard ? (
                        <ToggleRight className="w-8 h-8 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>

                  {/* Ver Clientes */}
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
                      {selectedRole.verClientes ? (
                        <ToggleRight className="w-8 h-8 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>

                  {/* Crear Clientes */}
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
                      {selectedRole.crearClientes ? (
                        <ToggleRight className="w-8 h-8 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>

                  {/* Privacidad de Clientes */}
                  <div className="bg-slate-50 p-3.5 rounded-xl space-y-2.5 mt-2">
                    <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                      🔓 Privacidad de Clientes para {selectedRole.nombre}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[11px] text-slate-800">Ver Número de DNI</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePermission('verDniCliente')}
                        className="cursor-pointer focus:outline-none"
                      >
                        {selectedRole.verDniCliente ? (
                          <ToggleRight className="w-8 h-8 text-blue-600" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-300" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/50 pt-2">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[11px] text-slate-800">Ver Teléfono / Celular</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePermission('verTelefonoCliente')}
                        className="cursor-pointer focus:outline-none"
                      >
                        {selectedRole.verTelefonoCliente ? (
                          <ToggleRight className="w-8 h-8 text-blue-600" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-300" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/50 pt-2">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[11px] text-slate-800">Ver Dirección Física</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePermission('verDireccionCliente')}
                        className="cursor-pointer focus:outline-none"
                      >
                        {selectedRole.verDireccionCliente ? (
                          <ToggleRight className="w-8 h-8 text-blue-600" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-300" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-200/50 pt-2">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[11px] text-slate-800">Ver Actividad e Ingresos</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => togglePermission('verIngresosCliente')}
                        className="cursor-pointer focus:outline-none"
                      >
                        {selectedRole.verIngresosCliente ? (
                          <ToggleRight className="w-8 h-8 text-blue-600" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-300" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Ver Préstamos */}
                  <div className="flex items-center justify-between pt-2.5">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-900">Ver Solicitudes y Préstamos</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePermission('verPrestamos')}
                      className="cursor-pointer focus:outline-none"
                    >
                      {selectedRole.verPrestamos ? (
                        <ToggleRight className="w-8 h-8 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>

                  {/* Crear Préstamos */}
                  <div className="flex items-center justify-between pt-2.5">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-900">Otorgar Préstamos</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePermission('crearPrestamos')}
                      className="cursor-pointer focus:outline-none"
                    >
                      {selectedRole.crearPrestamos ? (
                        <ToggleRight className="w-8 h-8 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>

                  {/* Ver Pagos */}
                  <div className="flex items-center justify-between pt-2.5">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-900">Ver Plan de Pagos</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePermission('verPagos')}
                      className="cursor-pointer focus:outline-none"
                    >
                      {selectedRole.verPagos ? (
                        <ToggleRight className="w-8 h-8 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>

                  {/* Registrar Pagos */}
                  <div className="flex items-center justify-between pt-2.5">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-900">Registrar y Cobrar Cuotas</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePermission('registrarPagos')}
                      className="cursor-pointer focus:outline-none"
                    >
                      {selectedRole.registrarPagos ? (
                        <ToggleRight className="w-8 h-8 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>

                  {/* Tesorería */}
                  <div className="flex items-center justify-between pt-2.5">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-900">Caja y Tesorería</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePermission('verTesoreria')}
                      className="cursor-pointer focus:outline-none"
                    >
                      {selectedRole.verTesoreria ? (
                        <ToggleRight className="w-8 h-8 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>

                  {/* Configuración */}
                  <div className="flex items-center justify-between pt-2.5">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-900">Configuración del Sistema</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePermission('verConfiguracion')}
                      className="cursor-pointer focus:outline-none"
                    >
                      {selectedRole.verConfiguracion ? (
                        <ToggleRight className="w-8 h-8 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>

                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  Seleccione un rol válido para configurar.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
