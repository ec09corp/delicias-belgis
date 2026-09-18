import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  Minus,
  CheckCircle2,
  X,
  History,
  Calendar,
  User,
  Trash2,
} from 'lucide-react';
import { Producto, MovimientoInventario, UserAuth } from '../../types';
import { inventarioService } from '../../services/inventarioService';
import { formatDate } from '../../utils/formatters';

interface InventarioViewProps {
  productos: Producto[];
  movimientos: MovimientoInventario[];
  currentUser: UserAuth;
}

export const InventarioView: React.FC<InventarioViewProps> = ({
  productos,
  movimientos,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'existencias' | 'movimientos'>('existencias');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockLevelFilter, setStockLevelFilter] = useState<'todos' | 'agotados' | 'bajos' | 'optimos'>('todos');
  const [tipoMovimientoFilter, setTipoMovimientoFilter] = useState<string>('todos');

  // Manual Stock Adjustment Modal
  const [adjustProduct, setAdjustProduct] = useState<Producto | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'entrada' | 'salida' | 'ajuste'>('ajuste');
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [adjustmentMotivo, setAdjustmentMotivo] = useState('');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return productos.filter((p) => {
      const stock = Number(p.stock ?? 0);
      const minStock = Number(p.stockMinimo ?? 5);

      if (stockLevelFilter === 'agotados' && stock > 0) return false;
      if (stockLevelFilter === 'bajos' && (stock === 0 || stock > minStock)) return false;
      if (stockLevelFilter === 'optimos' && stock <= minStock) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.nombre.toLowerCase().includes(q) ||
          p.categoria.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [productos, stockLevelFilter, searchQuery]);

  // Filtered Movimientos
  const filteredMovimientos = useMemo(() => {
    return movimientos.filter((m) => {
      if (tipoMovimientoFilter !== 'todos' && m.tipo !== tipoMovimientoFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchProd = (m.producto || m.productoNombre || '').toLowerCase().includes(q);
        const matchMotivo = (m.motivo || '').toLowerCase().includes(q);
        const matchUser = (m.usuario || '').toLowerCase().includes(q);
        return matchProd || matchMotivo || matchUser;
      }
      return true;
    });
  }, [movimientos, tipoMovimientoFilter, searchQuery]);

  const openAdjustModal = (p: Producto) => {
    setAdjustProduct(p);
    setAdjustmentType('ajuste');
    setAdjustmentQty(Number(p.stock ?? 0));
    setAdjustmentMotivo('');
    setAdjustError(null);
  };

  const handleConfirmAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustProduct || !adjustProduct.id) return;
    if (!adjustmentMotivo.trim()) {
      setAdjustError('El motivo del movimiento es obligatorio para la auditoría.');
      return;
    }

    setIsSubmittingAdjust(true);
    setAdjustError(null);
    try {
      const currentStock = Number(adjustProduct.stock ?? 0);
      let newStock = currentStock;
      let diff = 0;

      if (adjustmentType === 'entrada') {
        diff = Math.max(1, Number(adjustmentQty));
        newStock = currentStock + diff;
        await inventarioService.registrarEntrada(
          adjustProduct,
          diff,
          adjustmentMotivo.trim(),
          currentUser.email || 'Administrador'
        );
      } else if (adjustmentType === 'salida') {
        diff = -Math.max(1, Number(adjustmentQty));
        newStock = Math.max(0, currentStock + diff);
        await inventarioService.registrarSalida(
          adjustProduct,
          Math.abs(diff),
          adjustmentMotivo.trim(),
          currentUser.email || 'Administrador'
        );
      } else {
        // Direct set
        newStock = Math.max(0, Number(adjustmentQty));
        diff = newStock - currentStock;
        await inventarioService.registrarAjuste(
          adjustProduct,
          newStock,
          adjustmentMotivo.trim(),
          currentUser.email || 'Administrador'
        );
      }

      setAdjustProduct(null);
    } catch (err: any) {
      setAdjustError(err.message || 'Error al ajustar stock.');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  const handleDeleteMovimiento = async (id?: string) => {
    if (!id) return;
    if (!window.confirm('¿Deseas eliminar este registro de movimiento del historial?')) return;
    try {
      await inventarioService.deleteMovimiento(id);
    } catch (e: any) {
      alert(`Error al eliminar movimiento: ${e?.message || e}`);
    }
  };

  const handleClearAllMovimientos = async () => {
    if (!window.confirm('¿Deseas vaciar todo el historial de movimientos de inventario?')) return;
    try {
      await inventarioService.clearAllMovimientos();
    } catch (e: any) {
      alert(`Error al vaciar movimientos: ${e?.message || e}`);
    }
  };

  // Export Movimientos to CSV
  const handleExportCSV = () => {
    if (filteredMovimientos.length === 0) {
      alert('No hay movimientos para exportar.');
      return;
    }
    const headers = ['Fecha', 'Producto', 'Tipo', 'Cantidad/Diferencia', 'Stock Anterior', 'Stock Nuevo', 'Motivo', 'Usuario'];
    const rows = filteredMovimientos.map((m) => [
      m.fecha || m.createdAt || '',
      `"${m.producto || m.productoNombre || 'Producto'}"`,
      m.tipo.toUpperCase(),
      m.diferencia !== undefined ? m.diferencia : m.cantidad,
      m.cantidadAnterior ?? '',
      m.cantidadNueva ?? '',
      `"${m.motivo || ''}"`,
      m.usuario || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kardex_inventario_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-amber-700" />
            <span>Inventario & Control de Stock</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Monitoreo en tiempo real, alertas de stock mínimo, ajustes con auditoría y kardex de movimientos.
          </p>
        </div>

        {/* Tab & Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'movimientos' && movimientos.length > 0 && (
            <button
              onClick={handleClearAllMovimientos}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              title="Vaciar todo el historial de movimientos"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Vaciar Historial ({movimientos.length})</span>
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            title="Exportar kardex a CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar Kardex</span>
          </button>
        </div>
      </div>

      {/* Tabs Selector: Existencias vs Kardex */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('existencias')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'existencias'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Existencias por Producto ({productos.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('movimientos')}
          className={`py-3 px-5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'movimientos'
              ? 'border-amber-600 text-amber-900 bg-amber-50/50'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Historial de Movimientos ({movimientos.length})</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'existencias' ? 'Buscar producto...' : 'Buscar en movimientos, motivo, usuario...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
            />
          </div>

          {activeTab === 'existencias' ? (
            <select
              value={stockLevelFilter}
              onChange={(e) => setStockLevelFilter(e.target.value as any)}
              className="text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700"
            >
              <option value="todos">Todos los Estados</option>
              <option value="optimos">Nivel Óptimo</option>
              <option value="bajos">Stock Bajo (Crítico)</option>
              <option value="agotados">Agotados (0)</option>
            </select>
          ) : (
            <select
              value={tipoMovimientoFilter}
              onChange={(e) => setTipoMovimientoFilter(e.target.value)}
              className="text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700"
            >
              <option value="todos">Todos los Tipos</option>
              <option value="entrada">Entradas (+)</option>
              <option value="salida">Salidas / Ventas (-)</option>
              <option value="ajuste">Ajustes Manuales</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: EXISTENCIAS */}
      {activeTab === 'existencias' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Stock Actual</th>
                  <th className="py-3 px-4 text-center">Mínimo</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-400">
                      No se encontraron productos con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const stock = Number(p.stock ?? 0);
                    const min = Number(p.stockMinimo ?? 5);
                    const isOut = stock <= 0;
                    const isLow = !isOut && stock <= min;

                    return (
                      <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-stone-900">
                          {p.nombre}
                        </td>
                        <td className="py-3.5 px-4 text-stone-600">
                          {p.categoria}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Agotado</span>
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Stock Bajo</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Óptimo</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-black text-sm text-stone-900">
                          {stock} uds.
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-stone-400">
                          {min} uds.
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => openAdjustModal(p)}
                            className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-colors cursor-pointer"
                          >
                            Ajustar Stock
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORIAL KARDEX */}
      {activeTab === 'movimientos' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha & Hora</th>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4 text-center">Tipo</th>
                  <th className="py-3 px-4 text-center">Cambio / Dif.</th>
                  <th className="py-3 px-4 text-center">Stock Antes &rarr; Después</th>
                  <th className="py-3 px-4">Motivo / Auditoría</th>
                  <th className="py-3 px-4 text-center">Usuario</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredMovimientos.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-400">
                      No hay registros de movimientos en el historial.
                    </td>
                  </tr>
                ) : (
                  filteredMovimientos.map((m) => {
                    const isEntrada = m.tipo === 'entrada';
                    const isSalida = m.tipo === 'salida';
                    const rawDiff = m.diferencia !== undefined ? m.diferencia : m.cantidad;
                    const diff: number = typeof rawDiff === 'number' ? rawDiff : 0;

                    return (
                      <tr key={m.id} className="hover:bg-stone-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-stone-600 whitespace-nowrap">
                          {formatDate(m.fecha || m.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-stone-800">
                          {m.producto || m.productoNombre || 'Producto'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isEntrada
                                ? 'bg-emerald-100 text-emerald-800'
                                : isSalida
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isEntrada ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : isSalida ? (
                              <ArrowDownLeft className="w-3 h-3" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            <span>{m.tipo.toUpperCase()}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-black text-xs">
                          <span className={diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-rose-600' : 'text-stone-700'}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-stone-600 text-[11px]">
                          {m.cantidadAnterior !== undefined && m.cantidadNueva !== undefined ? (
                            <span>
                              {m.cantidadAnterior} &rarr; <strong>{m.cantidadNueva}</strong>
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-stone-600 max-w-xs truncate">
                          {m.motivo || 'Movimiento de inventario'}
                        </td>
                        <td className="py-3.5 px-4 text-center text-stone-500 text-[11px]">
                          {m.usuario ? m.usuario.split('@')[0] : 'Admin'}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteMovimiento(m.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar registro de movimiento de Firebase y del sistema"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: AJUSTE MANUAL DE STOCK */}
      {/* ========================================================= */}
      {adjustProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  Ajustar Stock Manual
                </h3>
                <span className="text-xs text-stone-500">{adjustProduct.nombre}</span>
              </div>
              <button
                onClick={() => setAdjustProduct(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {adjustError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleConfirmAdjustment} className="space-y-4">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs flex justify-between items-center">
                <span className="text-stone-600">Stock Actual en Sistema:</span>
                <strong className="font-mono text-base text-amber-950 font-black">
                  {adjustProduct.stock ?? 0} uds.
                </strong>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Tipo de Operación
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentType('entrada');
                      setAdjustmentQty(1);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      adjustmentType === 'entrada'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}
                  >
                    + Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentType('salida');
                      setAdjustmentQty(1);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      adjustmentType === 'salida'
                        ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}
                  >
                    - Salida
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustmentType('ajuste');
                      setAdjustmentQty(Number(adjustProduct.stock ?? 0));
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      adjustmentType === 'ajuste'
                        ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                        : 'bg-white border-stone-200 text-stone-700'
                    }`}
                  >
                    Fijar Valor
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  {adjustmentType === 'entrada'
                    ? 'Cantidad a sumar (uds)'
                    : adjustmentType === 'salida'
                    ? 'Cantidad a restar (uds)'
                    : 'Nuevo stock total (uds)'}
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm font-mono font-bold rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Motivo del Ajuste * (Requerido para Auditoría)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Merma, producto dañado, reconteo físico, regalo..."
                  value={adjustmentMotivo}
                  onChange={(e) => setAdjustmentMotivo(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setAdjustProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust || !adjustmentMotivo.trim()}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAdjust ? 'Aplicando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
