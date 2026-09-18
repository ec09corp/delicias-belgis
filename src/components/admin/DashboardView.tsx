import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  Boxes,
  Factory,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  Receipt,
  PieChart as PieIcon,
  LineChart as LineIcon,
  Package,
  Clock,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Banknote,
  Smartphone,
  HelpCircle,
} from 'lucide-react';
import { Venta, Producto, ProduccionRegistro, AdminTab } from '../../types';

interface DashboardViewProps {
  ventas: Venta[];
  productos: Producto[];
  producciones: ProduccionRegistro[];
  onNavigateTab: (tab: AdminTab) => void;
}

const PALETTE = ['#d97706', '#0284c7', '#059669', '#7c3aed', '#db2777', '#ea580c', '#14b8a6', '#6366f1'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  ventas,
  productos,
  producciones,
  onNavigateTab,
}) => {
  const [pieMode, setPieMode] = useState<'ventas_categoria' | 'inventario_categoria' | 'produccion_producto' | 'metodos_pago'>('ventas_categoria');
  const [temporalMode, setTemporalMode] = useState<'ambos' | 'ventas' | 'produccion'>('ambos');
  const [temporalDays, setTemporalDays] = useState<7 | 14 | 30>(7);
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Start of week (Monday)
  const day = now.getDay();
  const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
  const startOfWeek = new Date(new Date().setDate(diffToMonday));
  startOfWeek.setHours(0, 0, 0, 0);

  // Start of month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. KPI Calculations
  const stats = useMemo(() => {
    let ventasHoy = 0;
    let ventasSemana = 0;
    let ventasMes = 0;
    let ventasHistorico = 0;
    const ventasPorProducto: Record<string, { qty: number; revenue: number }> = {};

    ventas.forEach((v) => {
      if (v.anulada) return;
      const total = Number(v.total) || 0;
      ventasHistorico += total;
      const vDateStr = v.fecha || (v.createdAt ? v.createdAt.split('T')[0] : '');
      const vDate = new Date(v.createdAt || v.fecha);

      if (vDateStr === todayStr) {
        ventasHoy += total;
      }
      if (vDate >= startOfWeek) {
        ventasSemana += total;
      }
      if (vDate >= startOfMonth) {
        ventasMes += total;
      }

      // Track item sales
      if (v.items && v.items.length > 0) {
        v.items.forEach((it) => {
          const name = it.nombre || 'Producto';
          if (!ventasPorProducto[name]) ventasPorProducto[name] = { qty: 0, revenue: 0 };
          ventasPorProducto[name].qty += it.cantidad;
          ventasPorProducto[name].revenue += it.subtotal;
        });
      } else if (v.producto) {
        const name = v.producto;
        if (!ventasPorProducto[name]) ventasPorProducto[name] = { qty: 0, revenue: 0 };
        ventasPorProducto[name].qty += Number(v.cantidad) || 1;
        ventasPorProducto[name].revenue += total;
      }
    });

    let topSoldProduct = 'Ninguno';
    let topSoldQty = 0;
    Object.entries(ventasPorProducto).forEach(([name, data]) => {
      if (data.qty > topSoldQty) {
        topSoldQty = data.qty;
        topSoldProduct = name;
      }
    });

    // Production KPIs
    let prodHoy = 0;
    let prodSemana = 0;
    let prodMes = 0;
    let prodTotal = 0;
    const produccionPorProducto: Record<string, number> = {};

    producciones.forEach((p) => {
      const qty = Number(p.cantidad) || 0;
      prodTotal += qty;
      const pDate = new Date(p.fecha);
      if (p.fecha.startsWith(todayStr)) {
        prodHoy += qty;
      }
      if (pDate >= startOfWeek) {
        prodSemana += qty;
      }
      if (pDate >= startOfMonth) {
        prodMes += qty;
      }
      produccionPorProducto[p.producto] = (produccionPorProducto[p.producto] || 0) + qty;
    });

    let topProducedProduct = 'Ninguno';
    let topProducedQty = 0;
    Object.entries(produccionPorProducto).forEach(([name, qty]) => {
      if (qty > topProducedQty) {
        topProducedQty = qty;
        topProducedProduct = name;
      }
    });

    // Inventory KPIs
    let totalStock = 0;
    let valorInventario = 0;
    let stockBajo = 0;
    let stockAgotado = 0;

    productos.forEach((p) => {
      const s = Number(p.stock ?? 0);
      const min = Number(p.stockMinimo ?? 5);
      const price = Number(p.precio ?? 0);
      totalStock += s;
      valorInventario += s * price;

      if (s === 0) stockAgotado++;
      else if (s <= min) stockBajo++;
    });

    return {
      ventasHoy,
      ventasSemana,
      ventasMes,
      ventasHistorico,
      topSoldProduct,
      topSoldQty,
      prodHoy,
      prodSemana,
      prodMes,
      prodTotal,
      topProducedProduct,
      topProducedQty,
      totalStock,
      valorInventario,
      stockBajo,
      stockAgotado,
    };
  }, [ventas, producciones, productos, todayStr]);

  // 2. Temporal Data (Last N days)
  const temporalData = useMemo(() => {
    const list: { dateStr: string; label: string; ventas: number; produccion: number }[] = [];
    const dateMap: Record<string, { label: string; ventas: number; produccion: number }> = {};

    for (let i = temporalDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
      const dayNum = d.getDate();
      const label = `${dayName} ${dayNum}`;
      dateMap[dateStr] = { label, ventas: 0, produccion: 0 };
    }

    // Fill sales
    ventas.forEach((v) => {
      if (v.anulada) return;
      const vDateStr = v.fecha || (v.createdAt ? v.createdAt.split('T')[0] : '');
      if (dateMap[vDateStr]) {
        dateMap[vDateStr].ventas += Number(v.total) || 0;
      }
    });

    // Fill production
    producciones.forEach((p) => {
      const pDateStr = p.fecha.split('T')[0];
      if (dateMap[pDateStr]) {
        dateMap[pDateStr].produccion += Number(p.cantidad) || 0;
      }
    });

    Object.entries(dateMap).forEach(([dateStr, val]) => {
      list.push({ dateStr, ...val });
    });

    return list;
  }, [ventas, producciones, temporalDays]);

  // 3. Distribution Data for Donut Chart
  const pieDistribution = useMemo(() => {
    const items: { label: string; value: number; color: string }[] = [];

    if (pieMode === 'ventas_categoria') {
      const catMap: Record<string, number> = {};
      ventas.forEach((v) => {
        if (v.anulada) return;
        if (v.items && v.items.length > 0) {
          v.items.forEach((it) => {
            const cat = it.categoria || 'Helados';
            catMap[cat] = (catMap[cat] || 0) + it.subtotal;
          });
        } else {
          catMap['General'] = (catMap['General'] || 0) + Number(v.total);
        }
      });
      Object.entries(catMap).forEach(([label, value], idx) => {
        items.push({ label, value: Math.round(value * 100) / 100, color: PALETTE[idx % PALETTE.length] });
      });
    } else if (pieMode === 'inventario_categoria') {
      const catMap: Record<string, number> = {};
      productos.forEach((p) => {
        const cat = p.categoria || 'Sin Categoría';
        const stock = Number(p.stock ?? 0);
        catMap[cat] = (catMap[cat] || 0) + stock;
      });
      Object.entries(catMap).forEach(([label, value], idx) => {
        items.push({ label, value, color: PALETTE[idx % PALETTE.length] });
      });
    } else if (pieMode === 'produccion_producto') {
      const prodMap: Record<string, number> = {};
      producciones.forEach((p) => {
        const qty = Number(p.cantidad) || 0;
        prodMap[p.producto] = (prodMap[p.producto] || 0) + qty;
      });
      Object.entries(prodMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .forEach(([label, value], idx) => {
          items.push({ label, value, color: PALETTE[idx % PALETTE.length] });
        });
    } else if (pieMode === 'metodos_pago') {
      const payMap: Record<string, number> = { Efectivo: 0, Yappy: 0, Tarjeta: 0, Otro: 0 };
      ventas.forEach((v) => {
        if (v.anulada) return;
        const method = v.metodoPago || 'Efectivo';
        payMap[method] = (payMap[method] || 0) + Number(v.total);
      });
      Object.entries(payMap).forEach(([label, value], idx) => {
        if (value > 0) {
          items.push({ label, value: Math.round(value * 100) / 100, color: PALETTE[idx % PALETTE.length] });
        }
      });
    }

    const totalVal = items.reduce((sum, it) => sum + it.value, 0);
    return { items, totalVal };
  }, [pieMode, ventas, productos, producciones]);

  // Max values for line chart scaling
  const maxVentas = Math.max(...temporalData.map((d) => d.ventas), 10);
  const maxProd = Math.max(...temporalData.map((d) => d.produccion), 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 flex items-center gap-2.5">
            <span>Panel Ejecutivo y Métricas</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Resumen en vivo del flujo productivo: Elaboración &rarr; Inventario disponible &rarr; Ventas registradas.
          </p>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigateTab('ventas')}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <DollarSign className="w-4 h-4" />
            <span>+ Registrar Venta</span>
          </button>
          <button
            onClick={() => onNavigateTab('produccion')}
            className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Factory className="w-4 h-4" />
            <span>+ Producción</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Ventas Hoy */}
        <div
          onClick={() => onNavigateTab('ventas')}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-sm hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Ventas de Hoy</span>
            <DollarSign className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 mt-2">
            ${stats.ventasHoy.toFixed(2)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-400 mt-1">
            <span>Semana: ${stats.ventasSemana.toFixed(2)}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-600" />
          </div>
        </div>

        {/* Producción Hoy */}
        <div
          onClick={() => onNavigateTab('produccion')}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-sm hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Producción Hoy</span>
            <Factory className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-2">
            {stats.prodHoy} <span className="text-xs text-stone-400 font-normal">uds.</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-400 mt-1">
            <span>Semana: {stats.prodSemana} uds.</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-600" />
          </div>
        </div>

        {/* Existencias Totales & Valor */}
        <div
          onClick={() => onNavigateTab('inventario')}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200 shadow-sm hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-stone-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Valor de Inventario</span>
            <Boxes className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-stone-900 mt-2">
            ${stats.valorInventario.toFixed(2)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-400 mt-1">
            <span>{stats.totalStock} unidades en stock</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-amber-600" />
          </div>
        </div>

        {/* Alertas de Stock Bajo / Agotado */}
        <div
          onClick={() => onNavigateTab('inventario')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group ${
            stats.stockAgotado > 0 || stats.stockBajo > 0
              ? 'bg-amber-50/70 border-amber-300'
              : 'bg-white border-stone-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-800">
            <span>Stock Bajo / Agotado</span>
            <AlertTriangle className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-900 mt-2">
            {stats.stockBajo + stats.stockAgotado}{' '}
            <span className="text-xs text-amber-700 font-normal">productos</span>
          </div>
          <div className="text-[11px] text-amber-800/80 mt-1">
            {stats.stockAgotado} sin stock • {stats.stockBajo} en nivel crítico
          </div>
        </div>
      </div>

      {/* Top Products Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                Producto Más Vendido
              </span>
              <strong className="text-stone-900 text-sm block truncate max-w-[220px]">
                {stats.topSoldProduct}
              </strong>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 whitespace-nowrap">
            {stats.topSoldQty} vendidos
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">
                Producto Más Producido
              </span>
              <strong className="text-stone-900 text-sm block truncate max-w-[220px]">
                {stats.topProducedProduct}
              </strong>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 whitespace-nowrap">
            {stats.topProducedQty} producidos
          </span>
        </div>
      </div>

      {/* SECTION: GRÁFICAS DEL DASHBOARD (Lineal temporal + Pastel de distribuciones) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 1. GRÁFICA DE LÍNEAS: COMPORTAMIENTO EN EL TIEMPO */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-stone-100">
            <div>
              <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                <LineIcon className="w-4 h-4 text-amber-600" />
                <span>Tendencia Temporal: Ventas y Producción</span>
              </h3>
              <p className="text-xs text-stone-400">Comportamiento diario de ingresos ($) vs lotes elaborados (uds)</p>
            </div>
            {/* Controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 bg-stone-100 rounded-lg text-xs font-bold">
                <button
                  onClick={() => setTemporalMode('ambos')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    temporalMode === 'ambos' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                  }`}
                >
                  Ambos
                </button>
                <button
                  onClick={() => setTemporalMode('ventas')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    temporalMode === 'ventas' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                  }`}
                >
                  Ventas ($)
                </button>
                <button
                  onClick={() => setTemporalMode('produccion')}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    temporalMode === 'produccion' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'
                  }`}
                >
                  Prod. (uds)
                </button>
              </div>
              <select
                value={temporalDays}
                onChange={(e) => setTemporalDays(Number(e.target.value) as any)}
                className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 font-semibold text-stone-700"
              >
                <option value={7}>7 días</option>
                <option value={14}>14 días</option>
                <option value={30}>30 días</option>
              </select>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="relative pt-4">
            <div className="h-64 w-full">
              <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
                {/* Horizontal Grid lines */}
                {[0, 50, 100, 150].map((y) => (
                  <line
                    key={y}
                    x1="20"
                    y1={y}
                    x2="490"
                    y2={y}
                    stroke="#f0ece4"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                ))}

                {/* Draw Sales Line */}
                {(temporalMode === 'ambos' || temporalMode === 'ventas') && (
                  <>
                    <polyline
                      fill="none"
                      stroke="#d97706"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={temporalData
                        .map((d, i) => {
                          const x = 30 + (i * (460 / (temporalData.length - 1 || 1)));
                          const y = 170 - (d.ventas / maxVentas) * 140;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                    {temporalData.map((d, i) => {
                      const x = 30 + (i * (460 / (temporalData.length - 1 || 1)));
                      const y = 170 - (d.ventas / maxVentas) * 140;
                      return (
                        <circle
                          key={`v-${i}`}
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#d97706"
                          className="hover:r-6 cursor-pointer transition-all"
                          onMouseEnter={() => setHoveredLineIndex(i)}
                        />
                      );
                    })}
                  </>
                )}

                {/* Draw Production Line */}
                {(temporalMode === 'ambos' || temporalMode === 'produccion') && (
                  <>
                    <polyline
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray={temporalMode === 'ambos' ? '4 2' : 'none'}
                      points={temporalData
                        .map((d, i) => {
                          const x = 30 + (i * (460 / (temporalData.length - 1 || 1)));
                          const y = 170 - (d.produccion / maxProd) * 140;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                    {temporalData.map((d, i) => {
                      const x = 30 + (i * (460 / (temporalData.length - 1 || 1)));
                      const y = 170 - (d.produccion / maxProd) * 140;
                      return (
                        <circle
                          key={`p-${i}`}
                          cx={x}
                          cy={y}
                          r="4"
                          fill="#0284c7"
                          className="hover:r-6 cursor-pointer transition-all"
                          onMouseEnter={() => setHoveredLineIndex(i)}
                        />
                      );
                    })}
                  </>
                )}

                {/* X-axis labels */}
                {temporalData.map((d, i) => {
                  const x = 30 + (i * (460 / (temporalData.length - 1 || 1)));
                  // Only show some labels if there are many days
                  if (temporalDays === 30 && i % 4 !== 0 && i !== temporalData.length - 1) return null;
                  return (
                    <text
                      key={`lbl-${i}`}
                      x={x}
                      y="192"
                      textAnchor="middle"
                      className="text-[9px] fill-stone-400 font-semibold"
                    >
                      {d.label}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Hover Tooltip Box */}
            {hoveredLineIndex !== null && temporalData[hoveredLineIndex] && (
              <div className="mt-3 p-3 bg-stone-900 text-white rounded-xl text-xs flex items-center justify-between">
                <div>
                  <span className="text-stone-400 block text-[10px]">
                    {temporalData[hoveredLineIndex].dateStr} ({temporalData[hoveredLineIndex].label})
                  </span>
                  <div className="flex items-center gap-4 mt-0.5">
                    <span className="font-bold text-amber-400">
                      Ventas: ${temporalData[hoveredLineIndex].ventas.toFixed(2)}
                    </span>
                    <span className="font-bold text-sky-400">
                      Producción: {temporalData[hoveredLineIndex].produccion} uds.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setHoveredLineIndex(null)}
                  className="text-stone-400 hover:text-white text-[10px] underline cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            )}

            {/* Line Legend */}
            <div className="flex items-center justify-center gap-6 pt-2 text-xs font-semibold text-stone-600">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1 bg-amber-600 rounded-full inline-block" />
                <span>Ingresos por Ventas ($)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-1 bg-sky-600 rounded-full inline-block border-t border-dashed" />
                <span>Producción Elaborada (uds)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. GRÁFICA DE PASTEL (DONUT): DISTRIBUCIONES */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-amber-600" />
                <span>Distribuciones (Pastel)</span>
              </h3>
            </div>

            {/* Distribution Category Toggle */}
            <div className="grid grid-cols-2 gap-1.5 mt-3">
              <button
                onClick={() => setPieMode('ventas_categoria')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold text-center transition-all cursor-pointer ${
                  pieMode === 'ventas_categoria'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Ventas x Categoría
              </button>
              <button
                onClick={() => setPieMode('inventario_categoria')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold text-center transition-all cursor-pointer ${
                  pieMode === 'inventario_categoria'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Stock x Categoría
              </button>
              <button
                onClick={() => setPieMode('produccion_producto')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold text-center transition-all cursor-pointer ${
                  pieMode === 'produccion_producto'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Producción x Producto
              </button>
              <button
                onClick={() => setPieMode('metodos_pago')}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold text-center transition-all cursor-pointer ${
                  pieMode === 'metodos_pago'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                Métodos de Pago
              </button>
            </div>

            {/* Donut Chart Visual */}
            <div className="py-5 flex flex-col sm:flex-row items-center justify-center gap-6">
              {pieDistribution.items.length === 0 || pieDistribution.totalVal === 0 ? (
                <div className="text-center py-8">
                  <PieIcon className="w-12 h-12 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs text-stone-500 font-semibold">Sin datos para esta distribución</p>
                  <p className="text-[11px] text-stone-400 mt-1">Registra información para ver el desglose gráfico.</p>
                </div>
              ) : (
                <>
                  {/* SVG Donut */}
                  <div className="relative w-36 h-36 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      {/* Background circle */}
                      <circle
                        cx="18"
                        cy="18"
                        r="15.9155"
                        fill="transparent"
                        stroke="#f5f3ef"
                        strokeWidth="3.8"
                      />
                      {/* Donut segments */}
                      {(() => {
                        let accumulated = 0;
                        return pieDistribution.items.map((item, idx) => {
                          const pct = (item.value / pieDistribution.totalVal) * 100;
                          const strokeDash = `${pct} ${100 - pct}`;
                          const strokeOffset = 100 - accumulated;
                          accumulated += pct;
                          return (
                            <circle
                              key={idx}
                              cx="18"
                              cy="18"
                              r="15.9155"
                              fill="transparent"
                              stroke={item.color}
                              strokeWidth="3.8"
                              strokeDasharray={strokeDash}
                              strokeDashoffset={strokeOffset}
                              className="transition-all duration-300"
                            />
                          );
                        });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] text-stone-400 font-bold uppercase">Total</span>
                      <strong className="text-sm font-black text-stone-900">
                        {pieMode === 'ventas_categoria' || pieMode === 'metodos_pago'
                          ? `$${pieDistribution.totalVal.toFixed(0)}`
                          : `${pieDistribution.totalVal}`}
                      </strong>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {pieDistribution.items.map((item, idx) => {
                      const pct = ((item.value / pieDistribution.totalVal) * 100).toFixed(1);
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="truncate text-stone-700 font-medium">{item.label}</span>
                          </div>
                          <div className="font-mono text-stone-500 whitespace-nowrap text-[11px]">
                            {pieMode === 'ventas_categoria' || pieMode === 'metodos_pago'
                              ? `$${item.value.toFixed(2)}`
                              : `${item.value} uds.`}{' '}
                            <span className="font-bold text-stone-800">({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-500 text-[11px] flex items-center justify-between">
            <span>Visualización interactiva</span>
            <span className="text-amber-700 font-bold">Datos en tiempo real</span>
          </div>
        </div>

      </div>
    </div>
  );
};
