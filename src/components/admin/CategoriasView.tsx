import React, { useState } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Folder,
} from 'lucide-react';
import { Categoria, Producto } from '../../types';
import { categoriasService } from '../../services/categoriasService';

interface CategoriasViewProps {
  categorias: Categoria[];
  productos: Producto[];
}

export const CategoriasView: React.FC<CategoriasViewProps> = ({
  categorias,
  productos,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Categoria | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [deleteCat, setDeleteCat] = useState<Categoria | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openCreateModal = () => {
    setEditingCat(null);
    setNombre('');
    setDescripcion('');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Categoria) => {
    setEditingCat(cat);
    setNombre(cat.nombre);
    setDescripcion(cat.descripcion || '');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMsg('El nombre de la categoría es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      if (editingCat && editingCat.id) {
        await categoriasService.updateCategoria(editingCat.id, {
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
        });
      } else {
        await categoriasService.createCategoria({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          activa: true,
        });
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al guardar la categoría.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCat || !deleteCat.id) return;
    setIsDeleting(true);
    try {
      await categoriasService.deleteCategoria(deleteCat.id);
      setDeleteCat(null);
    } catch (err: any) {
      alert('Error al eliminar categoría: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const getProductCountForCat = (catName: string) => {
    return productos.filter((p) => p.categoria === catName).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2.5">
            <FolderTree className="w-7 h-7 text-amber-700" />
            <span>Gestión de Categorías</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Organiza las familias de productos para la tienda pública y el sistema de caja.
          </p>
        </div>

        <button
          id="nueva-categoria-btn"
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Categoría</span>
        </button>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categorias.map((cat) => {
          const prodCount = getProductCountForCat(cat.nombre);

          return (
            <div
              key={cat.id}
              className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Folder className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-stone-100 text-stone-700">
                    {prodCount} {prodCount === 1 ? 'producto' : 'productos'}
                  </span>
                </div>

                <h3 className="font-serif font-bold text-stone-900 text-base mt-3">
                  {cat.nombre}
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  {cat.descripcion || 'Sin descripción adicional'}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-end gap-1">
                <button
                  onClick={() => openEditModal(cat)}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
                  title="Editar categoría"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteCat(cat)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Eliminar categoría"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL CREAR / EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif font-bold text-base text-stone-900">
                {editingCat ? 'Editar Categoría' : 'Nueva Categoría'}
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
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Bolis Gourmet, Helados, Tortas..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre los productos de esta categoría..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
                />
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
                  {isSubmitting ? 'Guardando...' : editingCat ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {deleteCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-full bg-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  ¿Eliminar Categoría?
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">{deleteCat.nombre}</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Los productos asociados a esta categoría seguirán existiendo en el sistema pero quedarán catalogados de manera general.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteCat(null)}
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
