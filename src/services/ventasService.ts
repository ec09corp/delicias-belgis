import {
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { Venta, VentaItem, Producto } from '../types';
import { productosService } from './productosService';
import { inventarioService } from './inventarioService';
import { authService } from './authService';
import { INITIAL_VENTAS } from './initialData';

const LOCAL_STORAGE_KEY = 'delicias_belgi_ventas';

function toSafeIsoString(val: any, fallback?: string): string {
  if (!val) return fallback || new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val.toDate === 'function') {
    try {
      return val.toDate().toISOString();
    } catch {
      // ignore
    }
  }
  if (typeof val.seconds === 'number') {
    try {
      return new Date(val.seconds * 1000).toISOString();
    } catch {
      // ignore
    }
  }
  if (val instanceof Date) {
    try {
      return val.toISOString();
    } catch {
      // ignore
    }
  }
  return fallback || new Date().toISOString();
}

function toSafeDateStr(val: any, fallback?: string): string {
  if (!val) return fallback || new Date().toISOString().split('T')[0];
  if (typeof val === 'string') {
    if (val.includes('T')) return val.split('T')[0];
    if (val.includes('-')) return val.trim();
    if (val.includes('/')) {
      const parts = val.split('/');
      if (parts.length === 3) {
        if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return val;
  }
  const iso = toSafeIsoString(val);
  return iso.split('T')[0];
}

function getLocalVentas(): Venta[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Clean out any old mock sales with test identifiers
        const cleaned = parsed.filter((v: Venta) => !v.id?.startsWith('vta-2026-'));
        if (cleaned.length !== parsed.length) {
          saveLocalVentas(cleaned);
        }
        return cleaned;
      }
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
  return [];
}

function saveLocalVentas(items: Venta[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('delicias_ventas_changed'));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

function normalizeVenta(id: string, data: any): Venta {
  let items: VentaItem[] = [];
  if (Array.isArray(data.items) && data.items.length > 0) {
    items = data.items.map((it: any) => ({
      productoId: String(it.productoId || ''),
      nombre: String(it.nombre || it.producto || 'Producto'),
      cantidad: Math.max(1, Number(it.cantidad) || 1),
      precio: Number(it.precio || it.precioUnitario || 0),
      subtotal: Number(it.subtotal || (Number(it.cantidad || 1) * Number(it.precio || 0))),
      categoria: it.categoria || '',
    }));
  } else if (data.producto) {
    const qty = Math.max(1, Number(data.cantidad) || 1);
    const price = Number(data.precioUnitario || (Number(data.total) / qty) || 0);
    items = [{
      productoId: String(data.productoId || ''),
      nombre: String(data.producto),
      cantidad: qty,
      precio: price,
      subtotal: Number(data.total) || (qty * price),
    }];
  }

  const total = Number(data.total) || items.reduce((acc, it) => acc + it.subtotal, 0);
  const rawCreatedAt = toSafeIsoString(data.createdAt);
  const rawUpdatedAt = toSafeIsoString(data.updatedAt, rawCreatedAt);
  const rawFecha = toSafeDateStr(data.fecha || rawCreatedAt);

  return {
    id,
    numeroVenta: data.numeroVenta || `VTA-${id.slice(-4).toUpperCase()}`,
    items,
    producto: data.producto || (items.length > 0 ? items.map((i) => `${i.cantidad}x ${i.nombre}`).join(', ') : 'Venta'),
    cantidad: items.reduce((acc, it) => acc + it.cantidad, 0),
    precioUnitario: items.length === 1 ? items[0].precio : undefined,
    total,
    subtotal: Number(data.subtotal) || total,
    metodoPago: data.metodoPago || 'Efectivo',
    fecha: rawFecha,
    hora: String(data.hora || new Date().toTimeString().slice(0, 5)),
    cliente: String(data.cliente || ''),
    observacion: String(data.observacion || ''),
    anulada: Boolean(data.anulada),
    motivoAnulacion: String(data.motivoAnulacion || ''),
    fechaAnulacion: String(data.fechaAnulacion || ''),
    usuario: String(data.usuario || 'Administrador'),
    permitirStockNegativo: Boolean(data.permitirStockNegativo),
    createdAt: rawCreatedAt,
    updatedAt: rawUpdatedAt,
  };
}

export const ventasService = {
  subscribeToVentas(callback: (items: Venta[]) => void): () => void {
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'ventas');
        return onSnapshot(
          colRef,
          (snapshot) => {
            const list: Venta[] = [];
            snapshot.forEach((docSnap) => {
              list.push(normalizeVenta(docSnap.id, docSnap.data()));
            });
            list.sort((a, b) => new Date(b.createdAt || b.fecha).getTime() - new Date(a.createdAt || a.fecha).getTime());
            saveLocalVentas(list);
            callback(list);
          },
          (error) => {
            console.warn('Firestore snapshot error on ventas, using fallback:', error);
            callback(getLocalVentas());
          }
        );
      } catch (err) {
        console.warn('Error setting up onSnapshot for ventas:', err);
      }
    }
    callback(getLocalVentas());
    const handler = () => callback(getLocalVentas());
    window.addEventListener('delicias_ventas_changed', handler);
    return () => window.removeEventListener('delicias_ventas_changed', handler);
  },

  async getVentas(): Promise<Venta[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'ventas');
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          const list: Venta[] = [];
          snap.forEach((docSnap) => {
            list.push(normalizeVenta(docSnap.id, docSnap.data()));
          });
          return list.sort((a, b) => new Date(b.createdAt || b.fecha).getTime() - new Date(a.createdAt || a.fecha).getTime());
        }
      } catch (error) {
        console.warn('Error fetching ventas from Firebase, using fallback:', error);
      }
    }
    const list = getLocalVentas();
    return list.sort((a, b) => new Date(b.createdAt || b.fecha).getTime() - new Date(a.createdAt || a.fecha).getTime());
  },

  /**
   * Registers a manual sale with inventory deduction and inventory movement logging
   */
  async registrarVentaManual(
    ventaData: {
      items: VentaItem[];
      metodoPago: Venta['metodoPago'];
      fecha: string;
      hora: string;
      cliente?: string;
      observacion?: string;
      permitirStockNegativo?: boolean;
      usuario?: string;
    },
    allProductos: Producto[]
  ): Promise<Venta> {
    const now = new Date().toISOString();
    const numeroVenta = `VTA-${Date.now().toString().slice(-5)}`;
    const total = ventaData.items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
    const subtotal = total;

    // 1. Validate stock if permitirStockNegativo is false
    if (!ventaData.permitirStockNegativo) {
      for (const item of ventaData.items) {
        const prod = allProductos.find((p) => p.id === item.productoId);
        if (prod) {
          const currentStock = Number(prod.stock ?? 0);
          if (currentStock < item.cantidad) {
            throw new Error(
              `Stock insuficiente para "${prod.nombre}". Disponible: ${currentStock}, Solicitado: ${item.cantidad}. Active "Permitir stock negativo" si desea forzar la venta.`
            );
          }
        }
      }
    }

    // 2. Deduct inventory and record movements
    for (const item of ventaData.items) {
      const prod = allProductos.find((p) => p.id === item.productoId);
      if (prod && prod.id) {
        const currentStock = Number(prod.stock ?? 0);
        const newStock = Math.max(
          ventaData.permitirStockNegativo ? -999999 : 0,
          currentStock - item.cantidad
        );
        await productosService.updateProducto(prod.id, {
          stock: Math.max(0, newStock),
          disponible: newStock > 0,
        });
        await inventarioService.registrarMovimiento({
          productoId: prod.id,
          producto: prod.nombre,
          productoNombre: prod.nombre,
          cantidadAnterior: currentStock,
          cantidadNueva: newStock,
          diferencia: -item.cantidad,
          cantidad: item.cantidad,
          tipo: 'salida',
          motivo: `Venta (${numeroVenta})`,
          usuario: ventaData.usuario || 'Administrador',
          fecha: `${ventaData.fecha}T${ventaData.hora}:00Z`,
        });
      }
    }

    // 3. Save sale in Firestore
    const summaryProduct = ventaData.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(', ');
    const payload = {
      numeroVenta,
      items: ventaData.items,
      producto: summaryProduct,
      cantidad: ventaData.items.reduce((acc, it) => acc + it.cantidad, 0),
      total,
      subtotal,
      metodoPago: ventaData.metodoPago,
      fecha: ventaData.fecha,
      hora: ventaData.hora,
      cliente: (ventaData.cliente || '').trim(),
      observacion: (ventaData.observacion || '').trim(),
      anulada: false,
      usuario: ventaData.usuario || 'Administrador',
      permitirStockNegativo: Boolean(ventaData.permitirStockNegativo),
      createdAt: now,
      updatedAt: now,
    };

    let docId = 'vta-' + Date.now();
    if (isFirebaseConfigured() && db) {
      try {
        await authService.ensureAnonymousAuth();
        const colRef = collection(db, 'ventas');
        const docRef = await addDoc(colRef, payload);
        docId = docRef.id;
      } catch (error: any) {
        console.warn('Aviso: Venta guardada en almacenamiento local (Firestore usando fallback):', error?.message || error);
      }
    }

    const created: Venta = { id: docId, ...payload };
    const local = getLocalVentas();
    local.unshift(created);
    saveLocalVentas(local);
    return created;
  },

  /**
   * Anular una venta:
   * 1. Mark sale as anulada: true
   * 2. Revert inventory deduction
   * 3. Register inventory movement: Tipo Entrada, Motivo Anulación de Venta
   */
  async anularVenta(
    venta: Venta,
    allProductos: Producto[],
    motivo: string = 'Anulación solicitada por el usuario',
    usuario: string = 'Administrador'
  ): Promise<void> {
    if (venta.anulada) {
      throw new Error('Esta venta ya se encuentra anulada.');
    }
    const now = new Date().toISOString();

    // 1. Revert stock for all items
    const items = venta.items && venta.items.length > 0
      ? venta.items
      : [{
          productoId: '',
          nombre: venta.producto || 'Producto',
          cantidad: Number(venta.cantidad) || 1,
          precio: Number(venta.precioUnitario) || Number(venta.total),
          subtotal: Number(venta.total),
        }];

    for (const item of items) {
      // Find matching product
      const prod = allProductos.find(
        (p) => (item.productoId && p.id === item.productoId) ||
               p.nombre.toLowerCase().trim() === item.nombre.toLowerCase().trim()
      );
      if (prod && prod.id) {
        const currentStock = Number(prod.stock ?? 0);
        const restoredStock = currentStock + item.cantidad;
        await productosService.updateProducto(prod.id, {
          stock: restoredStock,
          disponible: true,
        });
        await inventarioService.registrarMovimiento({
          productoId: prod.id,
          producto: prod.nombre,
          productoNombre: prod.nombre,
          cantidadAnterior: currentStock,
          cantidadNueva: restoredStock,
          diferencia: item.cantidad,
          cantidad: item.cantidad,
          tipo: 'entrada',
          motivo: `Anulación de Venta (${venta.numeroVenta || venta.id || 'N/A'}) - ${motivo}`,
          usuario,
          fecha: now,
        });
      }
    }

    // 2. Mark sale as anulada in Firestore
    const updatePayload = {
      anulada: true,
      motivoAnulacion: motivo,
      fechaAnulacion: now,
      updatedAt: now,
    };

    if (venta.id && isFirebaseConfigured() && db) {
      try {
        await authService.ensureAnonymousAuth();
        const docRef = doc(db, 'ventas', venta.id);
        await setDoc(docRef, updatePayload, { merge: true });
      } catch (e: any) {
        console.warn('Aviso: Anulación de venta actualizada en almacenamiento local (Firestore usando fallback):', e?.message || e);
      }
    }

    // 3. Update localStorage
    const local = getLocalVentas();
    const idx = local.findIndex((v) => v.id === venta.id);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...updatePayload };
      saveLocalVentas(local);
    }
  },

  // Legacy fallback alias
  async createVenta(venta: Omit<Venta, 'id'>): Promise<Venta> {
    const now = new Date().toISOString();
    const newVentaData = {
      ...venta,
      anulada: false,
      fecha: venta.fecha || now,
      createdAt: now,
    };
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'ventas');
        const docRef = await addDoc(colRef, newVentaData);
        return { id: docRef.id, ...newVentaData };
      } catch (error) {
        console.warn('Error saving venta to Firestore:', error);
      }
    }
    const list = getLocalVentas();
    const created: Venta = {
      id: 'venta-' + Date.now(),
      ...newVentaData,
    };
    list.unshift(created);
    saveLocalVentas(list);
    return created;
  },

  async registrarVenta(venta: Omit<Venta, 'id'>): Promise<Venta> {
    return this.createVenta(venta);
  },

  /**
   * Elimina permanentemente una venta de Firebase Firestore y del almacenamiento local.
   * Opcionalmente restaura el inventario si la venta no estaba anulada.
   */
  async deleteVenta(
    ventaId: string,
    options?: {
      restaurarStock?: boolean;
      allProductos?: Producto[];
      usuario?: string;
    }
  ): Promise<void> {
    const local = getLocalVentas();
    const target = local.find((v) => v.id === ventaId);

    // 1. Si se solicita restaurar stock y la venta no estaba anulada previamente
    if (options?.restaurarStock && target && !target.anulada && options.allProductos) {
      try {
        const items = target.items && target.items.length > 0
          ? target.items
          : [{
              productoId: '',
              nombre: target.producto || 'Producto',
              cantidad: Number(target.cantidad) || 1,
              precio: Number(target.precioUnitario) || Number(target.total),
              subtotal: Number(target.total),
            }];

        for (const item of items) {
          const prod = options.allProductos.find(
            (p) => (item.productoId && p.id === item.productoId) ||
                   p.nombre.toLowerCase().trim() === item.nombre.toLowerCase().trim()
          );
          if (prod && prod.id) {
            const currentStock = Number(prod.stock ?? 0);
            const restoredStock = currentStock + item.cantidad;
            await productosService.updateProducto(prod.id, {
              stock: restoredStock,
              disponible: true,
            });
            await inventarioService.registrarMovimiento({
              productoId: prod.id,
              producto: prod.nombre,
              productoNombre: prod.nombre,
              cantidadAnterior: currentStock,
              cantidadNueva: restoredStock,
              diferencia: item.cantidad,
              cantidad: item.cantidad,
              tipo: 'entrada',
              motivo: `Eliminación de Venta (${target.numeroVenta || target.id}) - Stock devuelto`,
              usuario: options.usuario || 'Administrador',
              fecha: new Date().toISOString(),
            });
          }
        }
      } catch (errStock) {
        console.warn('Error al revertir stock al eliminar venta:', errStock);
      }
    }

    // 2. Eliminar de Firebase Firestore
    if (isFirebaseConfigured() && db && ventaId) {
      try {
        await authService.ensureAnonymousAuth();
        const docRef = doc(db, 'ventas', ventaId);
        await deleteDoc(docRef);
      } catch (e: any) {
        console.warn('Aviso: Venta eliminada localmente (Firestore usando fallback):', e?.message || e);
      }
    }

    // 3. Eliminar de LocalStorage y notificar
    const filtered = local.filter((v) => v.id !== ventaId);
    saveLocalVentas(filtered);
  },

  async clearAllVentas(): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await authService.ensureAnonymousAuth();
        const colRef = collection(db, 'ventas');
        const snap = await getDocs(colRef);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      } catch (e: any) {
        console.warn('Error clearing Firestore ventas:', e);
      }
    }
    saveLocalVentas([]);
  },

  recargarVentasEjemplo(): Venta[] {
    saveLocalVentas(INITIAL_VENTAS);
    return INITIAL_VENTAS;
  },
};
