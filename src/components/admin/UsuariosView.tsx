import React, { useState } from 'react';
import {
  Shield,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  User,
  Lock,
  Mail,
  UserCheck,
} from 'lucide-react';
import { UsuarioDoc, UserRole, UserAuth } from '../../types';
import { usuariosService } from '../../services/usuariosService';
import { formatDate } from '../../utils/formatters';

interface UsuariosViewProps {
  usuarios: UsuarioDoc[];
  currentUser: UserAuth;
}

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  usuarios,
  currentUser,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioDoc | null>(null);

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('caja');
  const [activo, setActivo] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [deleteUser, setDeleteUser] = useState<UsuarioDoc | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openCreateModal = () => {
    setEditingUser(null);
    setNombre('');
    setEmail('');
    setPassword('');
    setRole('caja');
    setActivo(true);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (u: UsuarioDoc) => {
    setEditingUser(u);
    setNombre(u.nombre || '');
    setEmail(u.email);
    setPassword('');
    setRole(u.role || u.rol || 'caja');
    setActivo(u.activo !== false);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('El correo electrónico es requerido.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingUser && editingUser.id) {
        await usuariosService.updateUsuario(editingUser.id, {
          nombre: nombre.trim(),
          email: email.trim(),
          role,
          activo,
        });
      } else {
        await usuariosService.createUsuario({
          nombre: nombre.trim() || email.split('@')[0],
          email: email.trim(),
          role,
          activo,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar usuario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteUser || !deleteUser.id) return;
    setIsDeleting(true);
    try {
      await usuariosService.deleteUsuario(deleteUser.id);
      setDeleteUser(null);
    } catch (err: any) {
      alert('Error al eliminar usuario: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-amber-700" />
            <span>Usuarios & Roles de Acceso</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Control de permisos y usuarios del sistema (Administradores con acceso total y Cajeros para ventas).
          </p>
        </div>

        <button
          id="nuevo-usuario-btn"
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Nombre / Usuario</th>
                <th className="py-3 px-4">Correo Electrónico</th>
                <th className="py-3 px-4 text-center">Rol Asignado</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Fecha Alta</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {usuarios.map((u) => {
                const userRole = u.role || u.rol || 'caja';
                const isAdmin = userRole !== 'caja';
                const isCurrent = currentUser.email === u.email;
                const userId = u.id || u.uid || u.email;

                return (
                  <tr key={userId} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-stone-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center font-bold text-xs">
                        {u.nombre ? u.nombre.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <span>{u.nombre || 'Usuario'}</span>
                        {isCurrent && (
                          <span className="ml-2 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            (Tú)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-stone-600 font-mono">
                      {u.email}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          isAdmin
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}
                      >
                        <UserCheck className="w-3 h-3" />
                        <span>{isAdmin ? 'Administrador' : 'Cajero / Caja'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {u.activo !== false ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Activo</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-500">
                          <XCircle className="w-3 h-3" />
                          <span>Inactivo</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center text-stone-400 font-mono text-[11px]">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => openEditModal(u)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
                        title="Editar usuario"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!isCurrent && (
                        <button
                          onClick={() => setDeleteUser(u)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR / EDITAR USUARIO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-base text-stone-900">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  placeholder="Ej. Ana Morales"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  placeholder="usuario@deliciasbelgi.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Rol de Acceso *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('caja')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      role === 'caja'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}
                  >
                    Cajero (Ventas y Stock)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      role === 'admin'
                        ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}
                  >
                    Administrador (Total)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="user-activo-chk"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                />
                <label htmlFor="user-activo-chk" className="text-xs font-semibold text-stone-700 cursor-pointer">
                  Usuario con cuenta activa para ingresar al sistema
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-full bg-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  ¿Eliminar Usuario?
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">{deleteUser.email}</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              El usuario ya no podrá iniciar sesión en la plataforma administrativa.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
