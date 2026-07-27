import React from 'react';
import { UsuarioRol, PermisosRol, FichajeAsistencia } from '../types';

interface UsuariosViewProps {
  usuarios: UsuarioRol[];
  roles: PermisosRol[];
  activeUser: UsuarioRol | null;
  fichajes: FichajeAsistencia[];
  onAddFichaje: (f: FichajeAsistencia) => void;
  onUpdateFichaje: (f: FichajeAsistencia) => void;
  onAddUsuario: (u: UsuarioRol) => void;
  onUpdateUsuario: (u: UsuarioRol) => void;
  onDeleteUsuario: (id: string) => void;
  onUpdateRolePermisos: (r: PermisosRol) => void;
  onAddRole: (r: PermisosRol) => void;
}

export default function UsuariosView({ usuarios, roles }: UsuariosViewProps) {
  return (
    <div className="space-y-4 font-sans text-slate-100">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <h2 className="text-xl font-black text-white">Seguridad y Usuarios</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {usuarios.map(u => (
          <div key={u.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1">
            <h3 className="font-black text-white text-sm">{u.nombre}</h3>
            <p className="text-xs text-slate-400">Rol: {u.rolId} | Email: {u.email}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
