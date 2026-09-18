import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Boxes,
  Factory,
  X,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { Producto, Categoria, AdminTab, UserAuth } from '../../types';
import { productosService } from '../../services/productosService';
import { formatCurrency } from '../../utils/formatters';

interface ProductosViewProps {
  productos: Producto[];
  categorias: Categoria[];
  currentUser: UserAuth;
  onNavigateTab: (tab: AdminTab) => void;
}

export const ProductosView: React.FC<ProductosViewProps> = ({
  productos,
  categorias,
  currentUser,
  onNavigateTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedStockFilter, setSelectedStockFilter] = useState<'todos' | 'agotados' | 'bajos' | 'disponibles'>('todos');
  const [sortBy, setSortBy] = useState<'nombre' | 'precioAsc' | 'precioDesc' | 'stockAsc' | 'stockDesc'>('nombre');

  // Modal State for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);

  // Form Fields
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [precio, setPrecio] = useState<number>(0);
  const [costo, setCosto] = useState<number>(0);
  const [stock, setStock] = useState<number>(0);
  const [stockMinimo, setStockMinimo] = useState<number>(5);
  const [descripcion, setDescripcion] = useState('');
  const [imagen, setImagen] = useState('');
  const [disponible, setDisponible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete Confirm Modal
  const [deleteProduct, setDeleteProduct] = useState<Producto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return productos
      .filter((p) => {
        if (selectedCategory !== 'Todas' && p.categoria !== selectedCategory) return false;
        
        const currentStock = Number(p.stock ?? 0);
        const minStock = Number(p.stockMinimo ?? 5);

        if (selectedStockFilter === 'agotados' && currentStock > 0) return false;
        if (selectedStockFilter === 'bajos' && (currentStock === 0 || currentStock > minStock)) return false;
        if (selectedStockFilter === 'disponibles' && currentStock === 0) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = p.nombre.toLowerCase().includes(q);
          const matchDesc = p.descripcion.toLowerCase().includes(q);
          const matchCat = p.categoria.toLowerCase().includes(q);
          if (!matchName && !matchDesc && !matchCat) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'nombre') return a.nombre.localeCompare(b.nombre);
        if (sortBy === 'precioAsc') return a.precio - b.precio;
        if (sortBy === 'precioDesc') return b.precio - a.precio;
        if (sortBy === 'stockAsc') return (a.stock ?? 0) - (b.stock ?? 0);
        if (sortBy === 'stockDesc') return (b.stock ?? 0) - (a.stock ?? 0);
        return 0;
      });
  }, [productos, selectedCategory, selectedStockFilter, searchQuery, sortBy]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setNombre('');
    setCategoria(categorias[0]?.nombre || 'Bolis Gourmet');
    setPrecio(2.5);
    setCosto(1.0);
    setStock(10);
    setStockMinimo(5);
    setDescripcion('');
    setImagen('');
    setDisponible(true);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Producto) => {
    setEditingProduct(prod);
    setNombre(prod.nombre);
    setCategoria(prod.categoria);
    setPrecio(prod.precio);
    setCosto(prod.costo ?? 0);
    setStock(prod.stock ?? 0);
    setStockMinimo(prod.stockMinimo ?? 5);
    setDescripcion(prod.descripcion);
    setImagen(prod.imagen);
    setDisponible(prod.disponible ?? true);
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setErrorMessage('El nombre del producto es obligatorio.');
      return;
    }
    if (precio <= 0) {
      setErrorMessage('El precio de venta debe ser mayor a 0.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload: Partial<Producto> = {
        nombre: nombre.trim(),
        categoria: categoria.trim() || 'General',
        precio: Number(precio),
        costo: Number(costo) || 0,
        stock: Number(stock) || 0,
        stockMinimo: Number(stockMinimo) || 5,
        descripcion: descripcion.trim(),
        imagen:
          imagen.trim() ||
          'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=600&q=80',
        disponible,
      };

      if (editingProduct && editingProduct.id) {
        await productosService.updateProducto(editingProduct.id, payload);
      } else {
        await productosService.createProducto(payload as any);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar el producto.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDisponible = async (prod: Producto) => {
    if (!prod.id) return;
    try {
      await productosService.updateProducto(prod.id, {
        disponible: !prod.disponible,
      });
    } catch (err: any) {
      alert('Error al cambiar disponibilidad: ' + err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteProduct || !deleteProduct.id) return;
    setIsDeleting(true);
    try {
      await productosService.deleteProducto(deleteProduct.id);
      setDeleteProduct(null);
    } catch (err: any) {
      alert('Error al eliminar producto: ' + err.message);
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
            <Package className="w-7 h-7 text-amber-700" />
            <span>Catálogo de Productos</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Administra bolis, helados, tartas y postres disponibles para venta en tienda y público.
          </p>
        </div>

        <button
          id="nuevo-producto-btn"
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre, ingrediente o descripción..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700"
          >
            <option value="Todas">Todas las Categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.nombre}>
                {c.nombre}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={selectedStockFilter}
            onChange={(e) => setSelectedStockFilter(e.target.value as any)}
            className="text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700"
          >
            <option value="todos">Todo el Stock</option>
            <option value="disponibles">Con Existencias</option>
            <option value="bajos">Stock Bajo (Crítico)</option>
            <option value="agotados">Agotados (0)</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs font-bold bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700"
          >
            <option value="nombre">Nombre (A-Z)</option>
            <option value="precioAsc">Precio: Menor a Mayor</option>
            <option value="precioDesc">Precio: Mayor a Menor</option>
            <option value="stockAsc">Stock: Menor a Mayor</option>
            <option value="stockDesc">Stock: Mayor a Menor</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full py-16 text-center text-stone-400 bg-white rounded-2xl border border-stone-200">
            <Package className="w-12 h-12 mx-auto mb-2 text-stone-300" />
            <p className="font-semibold text-stone-600">No se encontraron productos</p>
            <p className="text-xs text-stone-400 mt-1">Prueba cambiando los filtros o agrega un producto nuevo.</p>
          </div>
        ) : (
          filteredProducts.map((prod) => {
            const stock = Number(prod.stock ?? 0);
            const minStock = Number(prod.stockMinimo ?? 5);
            const isOutOfStock = stock <= 0;
            const isLowStock = !isOutOfStock && stock <= minStock;

            return (
              <div
                key={prod.id}
                className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md ${
                  isOutOfStock
                    ? 'border-rose-300'
                    : isLowStock
                    ? 'border-amber-300'
                    : 'border-stone-200'
                }`}
              >
                {/* Image & Badges */}
                <div className="relative h-44 bg-stone-100 overflow-hidden">
                  <img
                    src={prod.imagen || 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=500&q=80'}
                    alt={prod.nombre}
                    className={`w-full h-full object-cover transition-transform duration-500 hover:scale-105 ${
                      !prod.disponible ? 'grayscale opacity-75' : ''
                    }`}
                  />
                  {/* Category Pill */}
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-white/90 backdrop-blur-sm text-stone-800 shadow-xs">
                    {prod.categoria}
                  </span>

                  {/* Stock Alert Badge */}
                  {isOutOfStock ? (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-600 text-white shadow-xs flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Agotado</span>
                    </span>
                  ) : isLowStock ? (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500 text-white shadow-xs flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Bajo ({stock})</span>
                    </span>
                  ) : (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
                      Stock: {stock}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif font-bold text-stone-900 text-sm leading-snug line-clamp-1">
                        {prod.nombre}
                      </h3>
                      <span className="font-mono font-black text-amber-950 text-sm whitespace-nowrap">
                        {formatCurrency(prod.precio)}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 line-clamp-2 mt-1">
                      {prod.descripcion || 'Sin descripción'}
                    </p>
                  </div>

                  {/* Stock Metrics Bar */}
                  <div className="p-2 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="text-stone-400 block text-[9px] uppercase font-bold">En Inventario</span>
                      <strong className={`font-mono font-bold ${isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-700' : 'text-stone-800'}`}>
                        {stock} unidades
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-stone-400 block text-[9px] uppercase font-bold">Mínimo sugerido</span>
                      <span className="font-mono text-stone-600 font-semibold">{minStock} uds.</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleDisponible(prod)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                        prod.disponible
                          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                          : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      }`}
                      title="Activar / Desactivar visibilidad en la tienda pública"
                    >
                      {prod.disponible ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{prod.disponible ? 'Visible' : 'Oculto'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(prod)}
                        className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
                        title="Editar producto"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteProduct(prod)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: CREAR / EDITAR PRODUCTO */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  {editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Boli Gourmet Chocolate Belga"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Categoría *
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800 font-semibold"
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={c.nombre}>
                        {c.nombre}
                      </option>
                    ))}
                    <option value="General">General / Otra</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Precio de Venta ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={precio}
                    onChange={(e) => setPrecio(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Costo Producción ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costo}
                    onChange={(e) => setCosto(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Stock Actual (uds)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Stock Mínimo Alerta
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Descripción
                </label>
                <textarea
                  rows={2}
                  placeholder="Ingredientes, características, detalles especiales..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  URL de Imagen (Unsplash, Firebase Storage, etc.)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imagen}
                  onChange={(e) => setImagen(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-800"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="prod-disponible-chk"
                  checked={disponible}
                  onChange={(e) => setDisponible(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
                />
                <label htmlFor="prod-disponible-chk" className="text-xs font-semibold text-stone-700 cursor-pointer">
                  Producto disponible para venta en la tienda pública
                </label>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-stone-100">
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
                  {isSubmitting ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: ELIMINAR PRODUCTO */}
      {/* ========================================================= */}
      {deleteProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-stone-200 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-full bg-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  ¿Eliminar Producto?
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">{deleteProduct.nombre}</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Esta acción removerá el producto del catálogo y de la tienda pública. Las ventas históricas registradas se mantendrán intactas.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteProduct(null)}
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
