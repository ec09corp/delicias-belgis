import React, { useState, useMemo } from 'react';
import {
  BadgeDollarSign,
  Plus,
  Search,
  Filter,
  Trash2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Printer,
  Calendar,
  User,
  ShoppingBag,
  CreditCard,
  Banknote,
  Smartphone,
  AlertTriangle,
  Receipt,
  X,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';
import { Venta, VentaItem, Producto, MetodoPago, UserAuth } from '../../types';
import { ventasService } from '../../services/ventasService';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface VentasViewProps {
  ventas: Venta[];
  productos: Producto[];
  currentUser: UserAuth;
}

export const VentasView: React.FC<VentasViewProps> = ({
  ventas,
  productos,
  currentUser,
}) => {
  // Filters
  const [filterPeriod, setFilterPeriod] = useState<'todas' | 'hoy' | 'semana' | 'mes'>('todas');
  const [filterMetodo, setFilterMetodo] = useState<string>('todos');
  const [filterEstado, setFilterEstado] = useState<'todos' | 'activas' | 'anuladas'>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // New Sale Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saleItems, setSaleItems] = useState<{ producto: Producto; cantidad: number }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProductQty, setSelectedProductQty] = useState<number>(1);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('Efectivo');
  const [clienteNombre, setClienteNombre] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Void/Cancel Modal state
  const [voidModalVenta, setVoidModalVenta] = useState<Venta | null>(null);
  const [voidMotivo, setVoidMotivo] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);

  // Receipt Modal state
  const [receiptVenta, setReceiptVenta] = useState<Venta | null>(null);

  // Permanent Delete Modal state
  const [deleteModalVenta, setDeleteModalVenta] = useState<Venta | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [restoreStockOnDelete, setRestoreStockOnDelete] = useState(true);

  // Clear All Modal state
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Filtered sales
  const filteredVentas = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(new Date().setDate(diffToMonday));
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return ventas.filter((v) => {
      // Period filter
      const vDateStr = v.fecha || (v.createdAt ? v.createdAt.split('T')[0] : '');
      const vDate = new Date(v.createdAt || v.fecha);

      if (filterPeriod === 'hoy' && vDateStr !== todayStr) return false;
      if (filterPeriod === 'semana' && vDate < startOfWeek) return false;
      if (filterPeriod === 'mes' && vDate < startOfMonth) return false;

      // Metodo filter
      if (filterMetodo !== 'todos' && v.metodoPago !== filterMetodo) return false;

      // Estado filter
      if (filterEstado === 'activas' && v.anulada) return false;
      if (filterEstado === 'anuladas' && !v.anulada) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchClient = (v.cliente || '').toLowerCase().includes(q);
        const matchProduct = (v.producto || '').toLowerCase().includes(q);
        const matchItem = v.items?.some((i) => i.nombre.toLowerCase().includes(q));
        const matchId = (v.id || '').toLowerCase().includes(q);
        if (!matchClient && !matchProduct && !matchItem && !matchId) return false;
      }

      return true;
    });
  }, [ventas, filterPeriod, filterMetodo, filterEstado, searchQuery]);

  // Totals of filtered
  const totalFiltrado = filteredVentas.reduce((acc, v) => (v.anulada ? acc : acc + Number(v.total)), 0);
  const totalAnuladas = filteredVentas.reduce((acc, v) => (v.anulada ? acc + Number(v.total) : acc), 0);

  // Add item to new sale cart
  const handleAddItem = () => {
    if (!selectedProductId) return;
    const prod = productos.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const availableStock = Number(prod.stock ?? 0);
    const existing = saleItems.find((i) => i.producto.id === prod.id);
    const currentInCart = existing ? existing.cantidad : 0;
    const wanted = currentInCart + selectedProductQty;

    if (wanted > availableStock) {
      setFormError(`Stock insuficiente para "${prod.nombre}". Disponible: ${availableStock}`);
      return;
    }

    setFormError(null);
    if (existing) {
      setSaleItems(
        saleItems.map((i) =>
          i.producto.id === prod.id ? { ...i, cantidad: i.cantidad + selectedProductQty } : i
        )
      );
    } else {
      setSaleItems([...saleItems, { producto: prod, cantidad: selectedProductQty }]);
    }
    setSelectedProductQty(1);
  };

  const handleUpdateItemQty = (prodId: string, delta: number) => {
    const existing = saleItems.find((i) => i.producto.id === prodId);
    if (!existing) return;
    const next = existing.cantidad + delta;
    if (next <= 0) {
      setSaleItems(saleItems.filter((i) => i.producto.id !== prodId));
    } else {
      const prod = existing.producto;
      const stock = Number(prod.stock ?? 0);
      if (next > stock) {
        setFormError(`No hay más stock disponible de "${prod.nombre}" (Máximo: ${stock})`);
        return;
      }
      setFormError(null);
      setSaleItems(
        saleItems.map((i) => (i.producto.id === prodId ? { ...i, cantidad: next } : i))
      );
    }
  };

  const handleRemoveItem = (prodId: string) => {
    setSaleItems(saleItems.filter((i) => i.producto.id !== prodId));
  };

  // Submit sale
  const handleRegistrarVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saleItems.length === 0) {
      setFormError('Debes agregar al menos un producto a la venta.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      const itemsToSave: VentaItem[] = saleItems.map((item) => ({
        productoId: item.producto.id || '',
        nombre: item.producto.nombre,
        cantidad: item.cantidad,
        precio: Number(item.producto.precio),
        subtotal: item.cantidad * Number(item.producto.precio),
        categoria: item.producto.categoria,
      }));

      const totalCalculado = itemsToSave.reduce((sum, it) => sum + it.subtotal, 0);

      await ventasService.registrarVenta({
        items: itemsToSave,
        total: totalCalculado,
        metodoPago,
        cliente: clienteNombre.trim() || 'Cliente Mostrador',
        usuario: currentUser.email || 'Administrador',
        observacion: observaciones.trim(),
        observaciones: observaciones.trim(),
        fecha: new Date().toISOString(),
        allProductos: productos,
      });

      // Reset
      setIsModalOpen(false);
      setSaleItems([]);
      setSelectedProductId('');
      setClienteNombre('');
      setObservaciones('');
    } catch (err: any) {
      setFormError(err.message || 'Error al registrar la venta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Anular venta
  const handleConfirmAnulacion = async () => {
    if (!voidModalVenta) return;
    setIsVoiding(true);
    try {
      await ventasService.anularVenta(
        voidModalVenta,
        productos,
        voidMotivo.trim() || 'Anulación por cajero/administrador',
        currentUser.email || 'Administrador'
      );
      setVoidModalVenta(null);
      setVoidMotivo('');
    } catch (err: any) {
      alert('Error al anular venta: ' + (err.message || err));
    } finally {
      setIsVoiding(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredVentas.length === 0) {
      alert('No hay ventas para exportar con los filtros actuales.');
      return;
    }
    const headers = ['ID', 'Fecha', 'Cliente', 'Items / Detalle', 'Total ($)', 'Método de Pago', 'Usuario', 'Estado', 'Motivo Anulación'];
    const rows = filteredVentas.map((v) => {
      const itemsStr =
        v.items && v.items.length > 0
          ? v.items.map((i) => `${i.cantidad}x ${i.nombre}`).join('; ')
          : `${v.cantidad || 1}x ${v.producto || 'Producto'}`;
      return [
        v.id,
        v.fecha || v.createdAt || '',
        v.cliente || 'Mostrador',
        `"${itemsStr}"`,
        Number(v.total).toFixed(2),
        v.metodoPago || 'Efectivo',
        v.usuario || '',
        v.anulada ? 'ANULADA' : 'COMPLETADA',
        `"${v.motivoAnulacion || ''}"`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ventas_delicias_belgi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentSaleTotal = saleItems.reduce(
    (acc, it) => acc + it.cantidad * Number(it.producto.precio),
    0
  );

  const handleConfirmDelete = async () => {
    if (!deleteModalVenta || !deleteModalVenta.id) return;
    setIsDeleting(true);
    try {
      await ventasService.deleteVenta(deleteModalVenta, {
        restaurarStock: restoreStockOnDelete,
        allProductos: productos,
        usuario: currentUser.displayName || currentUser.email || 'Administrador',
      });
      setDeleteModalVenta(null);
    } catch (e: any) {
      alert(`Error al eliminar la venta: ${e?.message || e}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmClearAll = async () => {
    setIsClearingAll(true);
    try {
      await ventasService.clearAllVentas();
      setShowClearAllModal(false);
    } catch (e: any) {
      alert(`Error al vaciar ventas: ${e?.message || e}`);
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2.5">
            <BadgeDollarSign className="w-7 h-7 text-amber-700" />
            <span>Módulo de Ventas & Caja</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Registro con descuento automático de inventario, soporte multi-ítem, medios de pago y anulación trazable.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {ventas.length > 0 && (
            <button
              onClick={() => setShowClearAllModal(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              title="Vaciar todas las ventas para empezar en blanco"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Vaciar Ventas ({ventas.length})</span>
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            title="Exportar ventas a CSV/Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Exportar CSV</span>
          </button>
          <button
            id="nueva-venta-btn"
            onClick={() => {
              setIsModalOpen(true);
              setFormError(null);
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Venta</span>
          </button>
        </div>
      </div>

      {/* Sales KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
            Ventas Netas Filtradas
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {formatCurrency(totalFiltrado)}
          </div>
          <span className="text-[11px] text-stone-400">
            {filteredVentas.filter((v) => !v.anulada).length} transacciones activas
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
            Ventas Anuladas
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {formatCurrency(totalAnuladas)}
          </div>
          <span className="text-[11px] text-stone-400">
            {filteredVentas.filter((v) => v.anulada).length} cancelaciones (stock reintegrado)
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm">
          <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
            Ticket Promedio
          </span>
          <div className="text-2xl font-black text-stone-900 mt-1">
            {filteredVentas.filter((v) => !v.anulada).length > 0
              ? formatCurrency(
                  totalFiltrado / filteredVentas.filter((v) => !v.anulada).length
                )
              : '$0.00'}
          </div>
          <span className="text-[11px] text-stone-400">Promedio por operación activa</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente, producto o ID..."
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

          {/* Payment method selector */}
          <select
            value={filterMetodo}
            onChange={(e) => setFilterMetodo(e.target.value)}
            className="text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700"
          >
            <option value="todos">Todos los Métodos</option>
            <option value="Efectivo">Efectivo</option>
            <option value="Yappy">Yappy</option>
            <option value="Tarjeta">Tarjeta</option>
            <option value="Otro">Otro</option>
          </select>

          {/* Status selector */}
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as any)}
            className="text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700"
          >
            <option value="todos">Todos los Estados</option>
            <option value="activas">Solo Activas</option>
            <option value="anuladas">Solo Anuladas</option>
          </select>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Fecha & Hora</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Detalle / Productos</th>
                <th className="py-3 px-4 text-center">Método</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Usuario</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredVentas.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <h4 className="font-serif font-bold text-stone-800 text-sm">
                        No hay ventas registradas
                      </h4>
                      <p className="text-xs text-stone-500 leading-relaxed">
                        Los datos de prueba han sido limpiados. Puedes registrar ventas reales manualmente con el botón &ldquo;Nueva Venta&rdquo; o gestionarlas directamente en Firebase Firestore.
                      </p>
                      <button
                        onClick={() => {
                          setIsModalOpen(true);
                          setFormError(null);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Registrar Nueva Venta</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVentas.map((venta) => {
                  const isAnulada = Boolean(venta.anulada);

                  return (
                    <tr
                      key={venta.id}
                      className={`hover:bg-stone-50/80 transition-colors ${
                        isAnulada ? 'bg-rose-50/30 opacity-75' : ''
                      }`}
                    >
                      {/* Fecha */}
                      <td className="py-3.5 px-4 font-mono text-stone-600 whitespace-nowrap">
                        {formatDate(venta.fecha || venta.createdAt)}
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4 font-semibold text-stone-800">
                        {venta.cliente || 'Mostrador'}
                      </td>

                      {/* Detalle */}
                      <td className="py-3.5 px-4 text-stone-700 max-w-xs truncate">
                        {venta.items && venta.items.length > 0 ? (
                          <span>
                            {venta.items.map((it) => `${it.cantidad}x ${it.nombre}`).join(', ')}
                          </span>
                        ) : (
                          <span>
                            {venta.cantidad || 1}x {venta.producto || 'Producto'}
                          </span>
                        )}
                      </td>

                      {/* Método */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-800">
                          {venta.metodoPago === 'Efectivo' && <Banknote className="w-3 h-3 text-emerald-600" />}
                          {venta.metodoPago === 'Yappy' && <Smartphone className="w-3 h-3 text-blue-600" />}
                          {venta.metodoPago === 'Tarjeta' && <CreditCard className="w-3 h-3 text-purple-600" />}
                          <span>{venta.metodoPago || 'Efectivo'}</span>
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-sm whitespace-nowrap">
                        <span className={isAnulada ? 'line-through text-stone-400' : 'text-stone-900'}>
                          {formatCurrency(venta.total)}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isAnulada ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800"
                            title={`Anulado por: ${venta.usuarioAnulacion || 'Admin'}. Motivo: ${venta.motivoAnulacion || 'Sin motivo'}`}
                          >
                            <XCircle className="w-3 h-3" />
                            <span>Anulada</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Completada</span>
                          </span>
                        )}
                      </td>

                      {/* Usuario */}
                      <td className="py-3.5 px-4 text-center text-stone-500 truncate max-w-[100px] text-[11px]">
                        {venta.usuario ? venta.usuario.split('@')[0] : 'Admin'}
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                        <button
                          onClick={() => setReceiptVenta(venta)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
                          title="Ver Ticket de Venta"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                        {!isAnulada && (
                          <button
                            onClick={() => setVoidModalVenta(venta)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                            title="Anular venta y restaurar stock"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteModalVenta(venta)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Eliminar venta permanentemente de Firebase y el sistema"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* ========================================================= */}
      {/* MODAL: NUEVA VENTA (MULTI-ITEM) */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                  <BadgeDollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Registrar Nueva Venta
                  </h3>
                  <span className="text-[11px] text-stone-500">
                    El inventario se descontará automáticamente al confirmar.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegistrarVenta} className="p-5 overflow-y-auto space-y-4 flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Selector de Producto */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
                <label className="text-xs font-bold text-stone-800 block">
                  Agregar Producto al Ticket
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-8">
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-800"
                    >
                      <option value="">-- Selecciona un producto --</option>
                      {productos
                        .filter((p) => p.disponible !== false)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} — {formatCurrency(p.precio)} (Stock: {p.stock ?? 0})
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min={1}
                      value={selectedProductQty}
                      onChange={(e) => setSelectedProductQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white text-center font-bold text-stone-800"
                      title="Cantidad a agregar"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!selectedProductId}
                      className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                    >
                      + Agregar
                    </button>
                  </div>
                </div>
              </div>

              {/* Items agregados */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1.5">
                  Productos en esta Venta ({saleItems.length})
                </label>
                {saleItems.length === 0 ? (
                  <div className="p-6 text-center border-2 border-dashed border-stone-200 rounded-xl text-stone-400 text-xs">
                    Ningún producto agregado aún. Selecciona arriba para armar el ticket.
                  </div>
                ) : (
                  <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 max-h-48 overflow-y-auto">
                    {saleItems.map((it) => (
                      <div key={it.producto.id} className="p-2.5 flex items-center justify-between text-xs">
                        <div className="flex-1 min-w-0 pr-2">
                          <span className="font-bold text-stone-800 block truncate">
                            {it.producto.nombre}
                          </span>
                          <span className="text-[11px] text-stone-400">
                            {formatCurrency(it.producto.precio)} c/u
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(it.producto.id!, -1)}
                            className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                          >
                            <MinusCircle className="w-4 h-4" />
                          </button>
                          <span className="font-mono font-bold w-5 text-center text-stone-800">
                            {it.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateItemQty(it.producto.id!, 1)}
                            className="p-1 text-stone-400 hover:text-stone-700 cursor-pointer"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="w-20 text-right font-mono font-bold text-stone-900">
                          {formatCurrency(it.cantidad * Number(it.producto.precio))}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.producto.id!)}
                          className="ml-2 text-stone-300 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cliente y Método de Pago */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Nombre del Cliente (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Cliente Mostrador"
                    value={clienteNombre}
                    onChange={(e) => setClienteNombre(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Método de Pago
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['Efectivo', 'Yappy', 'Tarjeta'] as MetodoPago[]).map((met) => (
                      <button
                        key={met}
                        type="button"
                        onClick={() => setMetodoPago(met)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          metodoPago === met
                            ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                            : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        {met}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Observaciones / Notas (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Cambio de $20, mesa 3, sin servilletas..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
                />
              </div>

              {/* Total Banner */}
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">Total a Cobrar:</span>
                <span className="font-serif text-2xl font-black text-amber-950">
                  {formatCurrency(currentSaleTotal)}
                </span>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || saleItems.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Completar Venta</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ANULACIÓN DE VENTA */}
      {/* ========================================================= */}
      {voidModalVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-full bg-rose-100">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  Anular Venta {voidModalVenta.numeroVenta || `#${(voidModalVenta.id || '').slice(-6)}`}
                </h3>
                <span className="text-xs text-stone-500">
                  Total: {formatCurrency(voidModalVenta.total)}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Al anular esta venta, los productos vendidos serán{' '}
              <strong className="text-emerald-700 font-bold">restaurados automáticamente al inventario</strong>{' '}
              y quedará registrado en la auditoría con tu usuario ({currentUser.email}).
            </p>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">
                Motivo de anulación *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Ej. Error de cobro, devolución del cliente, duplicado..."
                value={voidMotivo}
                onChange={(e) => setVoidMotivo(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setVoidModalVenta(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleConfirmAnulacion}
                disabled={isVoiding || !voidMotivo.trim()}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {isVoiding ? 'Anulando...' : 'Confirmar Anulación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: TICKET DE VENTA (IMPRIMIBLE) */}
      {/* ========================================================= */}
      {receiptVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <span className="text-xs font-bold text-stone-700">Comprobante de Venta</span>
              <button
                onClick={() => setReceiptVenta(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div id="printable-ticket" className="p-6 font-mono text-xs text-stone-800 space-y-4">
              <div className="text-center space-y-1">
                <h4 className="font-serif text-base font-black text-amber-950">DELICIAS BELGI</h4>
                <p className="text-[10px] text-stone-500">Heladería, Repostería y Bolis Gourmet</p>
                <p className="text-[10px] text-stone-500">Colón, PH Bahía Limón</p>
                <div className="border-b border-dashed border-stone-300 my-2" />
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Ticket:</span>
                  <strong className="font-bold">{receiptVenta.numeroVenta || `#${(receiptVenta.id || '').slice(-8)}`}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Fecha:</span>
                  <span>{formatDate(receiptVenta.fecha || receiptVenta.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span className="font-semibold">{receiptVenta.cliente || 'Mostrador'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Atendido por:</span>
                  <span>{receiptVenta.usuario ? receiptVenta.usuario.split('@')[0] : 'Admin'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Medio de Pago:</span>
                  <span className="font-bold">{receiptVenta.metodoPago || 'Efectivo'}</span>
                </div>
                {receiptVenta.anulada && (
                  <div className="p-1.5 bg-rose-50 text-rose-700 font-bold text-center rounded border border-rose-200">
                    *** COMPROBANTE ANULADO ***
                  </div>
                )}
              </div>

              <div className="border-b border-dashed border-stone-300" />

              {/* Items List */}
              <div className="space-y-1.5">
                {receiptVenta.items && receiptVenta.items.length > 0 ? (
                  receiptVenta.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span className="truncate max-w-[170px]">
                        {it.cantidad}x {it.nombre}
                      </span>
                      <span className="font-bold">{formatCurrency(it.subtotal)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between">
                    <span>
                      {receiptVenta.cantidad || 1}x {receiptVenta.producto || 'Producto'}
                    </span>
                    <span className="font-bold">{formatCurrency(receiptVenta.total)}</span>
                  </div>
                )}
              </div>

              <div className="border-b border-dashed border-stone-300" />

              {/* Total */}
              <div className="flex justify-between text-sm font-black pt-1">
                <span>TOTAL:</span>
                <span>{formatCurrency(receiptVenta.total)}</span>
              </div>

              <div className="text-center pt-2 text-[10px] text-stone-400">
                ¡Gracias por endulzar tu día con Delicias Belgi!
              </div>
            </div>

            <div className="p-4 border-t border-stone-100 flex justify-end gap-2 bg-stone-50">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Ticket</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR ELIMINACIÓN PERMANENTE DE VENTA */}
      {/* ========================================================= */}
      {deleteModalVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  ¿Eliminar venta permanentemente?
                </h3>
                <span className="text-xs text-stone-500">
                  ID: {deleteModalVenta.id} · Total: {formatCurrency(deleteModalVenta.total)}
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600">
              Esta acción eliminará el registro de venta de forma definitiva tanto de Firebase Firestore como del sistema local.
            </p>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
                <input
                  type="checkbox"
                  checked={restoreStockOnDelete}
                  onChange={(e) => setRestoreStockOnDelete(e.target.checked)}
                  className="rounded text-amber-800 focus:ring-amber-800"
                />
                <span>Restaurar automáticamente el stock de los productos vendidos</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeleteModalVenta(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Eliminando...' : 'Eliminar Definitivamente'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAR VACIAR TODAS LAS VENTAS */}
      {/* ========================================================= */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  ¿Vaciar todas las ventas?
                </h3>
                <span className="text-xs text-stone-500">
                  Se eliminarán los {ventas.length} registros existentes
                </span>
              </div>
            </div>

            <p className="text-xs text-stone-600">
              Esta operación eliminará todas las ventas de la base de datos de Firebase Firestore y del almacenamiento local para que puedas comenzar desde cero con tu propio historial.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowClearAllModal(false)}
                disabled={isClearingAll}
                className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                disabled={isClearingAll}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isClearingAll ? 'Vaciando...' : 'Sí, Vaciar Todo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
