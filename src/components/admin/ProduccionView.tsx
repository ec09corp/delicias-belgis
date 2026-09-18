import React, { useState, useMemo } from 'react';
import {
  Factory,
  Plus,
  Search,
  Calendar,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit2,
  X,
  User,
  ArrowUpRight,
  Boxes,
} from 'lucide-react';
import { Producto, ProduccionRegistro, UserAuth } from '../../types';
import { produccionService } from '../../services/produccionService';
import { formatDate } from '../../utils/formatters';

interface ProduccionViewProps {
  producciones: ProduccionRegistro[];
  productos: Producto[];
  currentUser: UserAuth;
}

export const ProduccionView: React.FC<ProduccionViewProps> = ({
  producciones,
  productos,
  currentUser,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'todas' | 'hoy' | 'semana' | 'mes'>('todas');
  const [selectedProductFilter, setSelectedProductFilter] = useState('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduccion, setEditingProduccion] = useState<ProduccionRegistro | null>(null);

  // Form Fields
  const [selectedProductId, setSelectedProductId] = useState('');
  const [cantidad, setCantidad] = useState<number>(10);
  const [fecha, setFecha] = useState<string>(new Date().toISOString().split('T')[0]);
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete Modal
  const [deleteRecord, setDeleteRecord] = useState<ProduccionRegistro | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered productions
  const filteredProducciones = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(new Date().setDate(diffToMonday));
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return producciones.filter((p) => {
      const pDateStr = p.fecha.split('T')[0];
      const pDate = new Date(p.fecha);

      if (filterPeriod === 'hoy' && pDateStr !== todayStr) return false;
      if (filterPeriod === 'semana' && pDate < startOfWeek) return false;
      if (filterPeriod === 'mes' && pDate < startOfMonth) return false;

      if (selectedProductFilter !== 'todos' && p.producto !== selectedProductFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchProd = p.producto.toLowerCase().includes(q);
        const matchObs = (p.observacion || '').toLowerCase().includes(q);
        const matchUser = (p.usuario || '').toLowerCase().includes(q);
        if (!matchProd && !matchObs && !matchUser) return false;
      }

      return true;
    });
  }, [producciones, filterPeriod, selectedProductFilter, searchQuery]);

  // Production Metrics
  const metrics = useMemo(() => {
    const totalFiltrado = filteredProducciones.reduce((acc, p) => acc + Number(p.cantidad), 0);
    return {
      totalFiltrado,
      lotes: filteredProducciones.length,
    };
  }, [filteredProducciones]);

  const openCreateModal = () => {
    setEditingProduccion(null);
    setSelectedProductId(productos[0]?.id || '');
    setCantidad(10);
    setFecha(new Date().toISOString().split('T')[0]);
    setObservaciones('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rec: ProduccionRegistro) => {
    setEditingProduccion(rec);
    setSelectedProductId(rec.productoId || '');
    setCantidad(rec.cantidad);
    setFecha(rec.fecha ? rec.fecha.split('T')[0] : new Date().toISOString().split('T')[0]);
    setObservaciones(rec.observacion || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setFormError('Selecciona un producto para la orden de producción.');
      return;
    }
    if (cantidad <= 0) {
      setFormError('La cantidad producida debe ser de al menos 1 unidad.');
      return;
    }

    const prod = productos.find((p) => p.id === selectedProductId);
    if (!prod) {
      setFormError('El producto seleccionado no existe.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingProduccion && editingProduccion.id) {
        await produccionService.editarProduccion(
          editingProduccion.id,
          prod,
          cantidad,
          fecha,
          observaciones,
          currentUser.email || 'Administrador'
        );
      } else {
        await produccionService.registrarProduccion(
          prod,
          cantidad,
          fecha,
          currentUser.email || 'Administrador',
          observaciones
        );
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Error al procesar la producción.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteRecord) return;
    setIsDeleting(true);
    try {
      const prod = productos.find((p) => p.id === deleteRecord.productoId || p.nombre === deleteRecord.producto);
      await produccionService.eliminarProduccion(
        deleteRecord,
        prod,
        currentUser.email || 'Administrador'
      );
      setDeleteRecord(null);
    } catch (err: any) {
      alert('Error al eliminar producción: ' + err.message);
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
            <Factory className="w-7 h-7 text-amber-700" />
            <span>Control de Producción Diaria</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Registro de lotes elaborados con incremento automático de existencias en catálogo e inventario.
          </p>
        </div>

        <button
          id="nueva-produccion-btn"
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Lote de Producción</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
              Total Elaborado (Filtro Actual)
            </span>
            <div className="text-2xl font-black text-amber-800 mt-1">
              {metrics.totalFiltrado} <span className="text-sm font-normal text-stone-400">unidades</span>
            </div>
            <span className="text-[11px] text-stone-400">{metrics.lotes} lotes registrados</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
            <Boxes className="w-6 h-6" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
              Sincronización Automática
            </span>
            <div className="text-base font-bold text-emerald-700 mt-1">
              100% Integrado al Inventario
            </div>
            <span className="text-[11px] text-stone-400">
              Cada lote suma inmediatamente existencias al catálogo público.
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por producto, lote, nota o usuario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
            />
          </div>

          {/* Period Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setFilterPeriod('todas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterPeriod === 'todas' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterPeriod('hoy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterPeriod === 'hoy' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setFilterPeriod('semana')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterPeriod === 'semana' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setFilterPeriod('mes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterPeriod === 'mes' ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600'
              }`}
            >
              Este Mes
            </button>
          </div>

          {/* Product Filter */}
          <select
            value={selectedProductFilter}
            onChange={(e) => setSelectedProductFilter(e.target.value)}
            className="text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700"
          >
            <option value="todos">Todos los Productos</option>
            {productos.map((p) => (
              <option key={p.id} value={p.nombre}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Production Records Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Fecha de Elaboración</th>
                <th className="py-3 px-4">Producto Elaborado</th>
                <th className="py-3 px-4 text-center">Cantidad Elaborada</th>
                <th className="py-3 px-4 text-center">Stock Antes &rarr; Después</th>
                <th className="py-3 px-4">Lote / Observaciones</th>
                <th className="py-3 px-4 text-center">Responsable</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducciones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-stone-400">
                    No se encontraron registros de producción con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredProducciones.map((prod) => (
                  <tr key={prod.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-stone-600 whitespace-nowrap">
                      {formatDate(prod.fecha)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-stone-900">
                      {prod.producto}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-black text-sm text-emerald-700 whitespace-nowrap">
                      +{prod.cantidad} uds.
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-stone-600 text-[11px]">
                      {prod.stockAnterior !== undefined && prod.stockNuevo !== undefined ? (
                        <span>
                          {prod.stockAnterior} &rarr; <strong>{prod.stockNuevo}</strong>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-stone-600 max-w-xs truncate">
                      {prod.observacion || 'Sin observaciones'}
                    </td>
                    <td className="py-3.5 px-4 text-center text-stone-500 text-[11px]">
                      {prod.usuario ? prod.usuario.split('@')[0] : 'Admin'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => openEditModal(prod)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                        title="Editar lote"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteRecord(prod)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar registro y revertir stock"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: REGISTRAR / EDITAR PRODUCCIÓN */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                  <Factory className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  {editingProduccion ? 'Editar Lote de Producción' : 'Registrar Lote de Producción'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Producto a Producir *
                </label>
                <select
                  disabled={Boolean(editingProduccion)}
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-800 disabled:bg-stone-100"
                >
                  <option value="">-- Selecciona el producto --</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Stock actual: {p.stock ?? 0})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Cantidad Elaborada *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={cantidad}
                    onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Fecha de Producción *
                  </label>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Lote / Observaciones (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej. Lote B-2026-04, fruta de temporada, preparación extra cremosa..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Al guardar, el stock del producto sumará <strong>+{cantidad} unidades</strong> automáticamente.</span>
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
                  {isSubmitting ? 'Guardando...' : editingProduccion ? 'Actualizar Lote' : 'Guardar Producción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ELIMINAR / ANULAR PRODUCCIÓN */}
      {/* ========================================================= */}
      {deleteRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-full bg-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  ¿Eliminar Registro?
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Lote de {deleteRecord.cantidad} uds. de {deleteRecord.producto}
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Al eliminar este lote, se <strong className="text-rose-700">descontarán las {deleteRecord.cantidad} unidades</strong> del stock del producto y quedará un movimiento de salida en el kardex.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteRecord(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Eliminando...' : 'Confirmar Eliminación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
