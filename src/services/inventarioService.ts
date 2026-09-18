import {
  collection,
  addDoc,
  onSnapshot,
  getDocs,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { MovimientoInventario, Producto, TipoMovimientoInventario } from '../types';
import { productosService } from './productosService';
import { authService } from './authService';

const LOCAL_STORAGE_KEY = 'delicias_belgi_movimientos';

function getLocalMovimientos(): MovimientoInventario[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('LocalStorage error reading movimientos:', e);
  }
  return [];
}

function saveLocalMovimientos(items: MovimientoInventario[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('delicias_movimientos_changed'));
  } catch (e) {
    console.warn('LocalStorage error saving movimientos:', e);
  }
}

function normalizeMovimiento(id: string, data: any): MovimientoInventario {
  const cantidadAnterior = Number(data.cantidadAnterior ?? data.stockAnterior ?? 0);
  const cantidadNueva = Number(data.cantidadNueva ?? data.stockNuevo ?? 0);
  const diferencia = Number(data.diferencia ?? (cantidadNueva - cantidadAnterior));
  const cantidad = Number(data.cantidad ?? Math.abs(diferencia));
  return {
    id,
    productoId: String(data.productoId || ''),
    producto: String(data.producto || data.productoNombre || 'Producto'),
    productoNombre: String(data.productoNombre || data.producto || 'Producto'),
    cantidadAnterior,
    cantidadNueva,
    diferencia,
    cantidad,
    tipo: (data.tipo as TipoMovimientoInventario) || (diferencia >= 0 ? 'entrada' : 'salida'),
    motivo: String(data.motivo || 'Movimiento de inventario'),
    usuario: String(data.usuario || data.usuarioEmail || 'Administrador'),
    usuarioEmail: String(data.usuarioEmail || data.usuario || 'Administrador'),
    fecha: data.fecha || data.createdAt || new Date().toISOString(),
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

export const inventarioService = {
  subscribeToMovimientos(callback: (items: MovimientoInventario[]) => void): () => void {
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'inventario_movimientos');
        return onSnapshot(
          colRef,
          (snapshot) => {
            const list: MovimientoInventario[] = [];
            snapshot.forEach((d) => {
              list.push(normalizeMovimiento(d.id, d.data()));
            });
            list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            saveLocalMovimientos(list);
            callback(list);
          },
          (error) => {
            console.warn('Error onSnapshot inventario_movimientos, using fallback:', error);
            callback(getLocalMovimientos());
          }
        );
      } catch (err) {
        console.warn('Error setting up subscribeToMovimientos:', err);
      }
    }
    callback(getLocalMovimientos());
    const handler = () => callback(getLocalMovimientos());
    window.addEventListener('delicias_movimientos_changed', handler);
    return () => window.removeEventListener('delicias_movimientos_changed', handler);
  },

  async registrarMovimiento(mov: Omit<MovimientoInventario, 'id'>): Promise<MovimientoInventario> {
    const now = new Date().toISOString();
    const cantAnt = Number(mov.cantidadAnterior) || 0;
    const cantNue = Number(mov.cantidadNueva) || 0;
    const diff = Number(mov.diferencia) || (cantNue - cantAnt);
    const prodName = mov.producto || mov.productoNombre || 'Producto';
    const userName = mov.usuario || mov.usuarioEmail || 'Administrador';
    const payload = {
      productoId: String(mov.productoId || ''),
      producto: prodName,
      productoNombre: prodName,
      cantidadAnterior: cantAnt,
      cantidadNueva: cantNue,
      diferencia: diff,
      cantidad: Math.abs(diff),
      tipo: mov.tipo || (diff >= 0 ? 'entrada' : 'salida'),
      motivo: String(mov.motivo || 'Movimiento de inventario'),
      usuario: userName,
      usuarioEmail: userName,
      fecha: mov.fecha || now,
      createdAt: now,
    };
    let docId = 'mov-' + Date.now();
    if (isFirebaseConfigured() && db) {
      try {
        await authService.ensureAnonymousAuth();
        const colRef = collection(db, 'inventario_movimientos');
        const docRef = await addDoc(colRef, payload);
        docId = docRef.id;
        // Also add to legacy collection for backwards compatibility
        try {
          const legRef = collection(db, 'movimientos_inventario');
          await addDoc(legRef, payload);
        } catch (_) {}
      } catch (error: any) {
        console.warn('Aviso: Movimiento registrado en almacenamiento local (Firestore usando fallback):', error?.message || error);
      }
    }
    const created: MovimientoInventario = { id: docId, ...payload };
    const localList = getLocalMovimientos();
    localList.unshift(created);
    saveLocalMovimientos(localList);
    return created;
  },

  // 1. Entrada de inventario
  async registrarEntrada(
    producto: Producto,
    cantidad: number,
    motivo: string = 'Entrada de inventario',
    usuario: string = 'Administrador'
  ): Promise<void> {
    const qty = Math.max(0, Number(cantidad));
    if (qty === 0 || !producto.id) return;
    const cantAnterior = Number(producto.stock ?? 0);
    const cantNueva = cantAnterior + qty;
    await productosService.updateProducto(producto.id, {
      stock: cantNueva,
      disponible: cantNueva > 0,
    });
    await this.registrarMovimiento({
      productoId: producto.id,
      producto: producto.nombre,
      productoNombre: producto.nombre,
      cantidadAnterior: cantAnterior,
      cantidadNueva: cantNueva,
      diferencia: qty,
      cantidad: qty,
      tipo: 'entrada',
      motivo: motivo || 'Entrada de inventario',
      usuario,
      fecha: new Date().toISOString(),
    });
  },

  // 2. Salida de inventario
  async registrarSalida(
    producto: Producto,
    cantidad: number,
    motivo: string = 'Salida de inventario',
    usuario: string = 'Administrador'
  ): Promise<void> {
    const qty = Math.max(0, Number(cantidad));
    if (qty === 0 || !producto.id) return;
    const cantAnterior = Number(producto.stock ?? 0);
    const cantNueva = Math.max(0, cantAnterior - qty);
    const diff = cantNueva - cantAnterior;
    await productosService.updateProducto(producto.id, {
      stock: cantNueva,
      disponible: cantNueva > 0 ? producto.disponible : false,
    });
    await this.registrarMovimiento({
      productoId: producto.id,
      producto: producto.nombre,
      productoNombre: producto.nombre,
      cantidadAnterior: cantAnterior,
      cantidadNueva: cantNueva,
      diferencia: diff,
      cantidad: qty,
      tipo: 'salida',
      motivo: motivo || 'Salida de inventario',
      usuario,
      fecha: new Date().toISOString(),
    });
  },

  // 3. Desperdicio / Merma
  async registrarDesperdicio(
    producto: Producto,
    cantidad: number,
    motivo: string = 'Desperdicio / Merma',
    usuario: string = 'Administrador'
  ): Promise<void> {
    const qty = Math.max(0, Number(cantidad));
    if (qty === 0 || !producto.id) return;
    const cantAnterior = Number(producto.stock ?? 0);
    const cantNueva = Math.max(0, cantAnterior - qty);
    const diff = cantNueva - cantAnterior;
    await productosService.updateProducto(producto.id, {
      stock: cantNueva,
      disponible: cantNueva > 0 ? producto.disponible : false,
    });
    await this.registrarMovimiento({
      productoId: producto.id,
      producto: producto.nombre,
      productoNombre: producto.nombre,
      cantidadAnterior: cantAnterior,
      cantidadNueva: cantNueva,
      diferencia: diff,
      cantidad: qty,
      tipo: 'desperdicio',
      motivo: motivo || 'Desperdicio',
      usuario,
      fecha: new Date().toISOString(),
    });
  },

  // 4. Ajuste de inventario
  async registrarAjuste(
    producto: Producto,
    nuevoStock: number,
    motivo: string = 'Ajuste de inventario',
    usuario: string = 'Administrador'
  ): Promise<void> {
    if (!producto.id) return;
    const cleanNuevoStock = Math.max(0, Number(nuevoStock));
    const cantAnterior = Number(producto.stock ?? 0);
    const diff = cleanNuevoStock - cantAnterior;
    if (diff === 0) return;
    await productosService.updateProducto(producto.id, {
      stock: cleanNuevoStock,
      disponible: cleanNuevoStock > 0 ? producto.disponible : false,
    });
    await this.registrarMovimiento({
      productoId: producto.id,
      producto: producto.nombre,
      productoNombre: producto.nombre,
      cantidadAnterior: cantAnterior,
      cantidadNueva: cleanNuevoStock,
      diferencia: diff,
      cantidad: Math.abs(diff),
      tipo: 'ajuste',
      motivo: motivo || 'Ajuste de inventario',
      usuario,
      fecha: new Date().toISOString(),
    });
  },

  // 5. Corrección manual de cantidad
  async registrarCorreccionManual(
    producto: Producto,
    nuevoStock: number,
    motivo: string = 'Corrección manual de cantidad',
    usuario: string = 'Administrador'
  ): Promise<void> {
    if (!producto.id) return;
    const cleanNuevoStock = Math.max(0, Number(nuevoStock));
    const cantAnterior = Number(producto.stock ?? 0);
    const diff = cleanNuevoStock - cantAnterior;
    await productosService.updateProducto(producto.id, {
      stock: cleanNuevoStock,
      disponible: cleanNuevoStock > 0 ? producto.disponible : false,
    });
    await this.registrarMovimiento({
      productoId: producto.id,
      producto: producto.nombre,
      productoNombre: producto.nombre,
      cantidadAnterior: cantAnterior,
      cantidadNueva: cleanNuevoStock,
      diferencia: diff,
      cantidad: Math.abs(diff),
      tipo: 'ajuste',
      motivo: motivo || 'Corrección manual de cantidad',
      usuario,
      fecha: new Date().toISOString(),
    });
  },

  // Backward compatibility alias methods
  async ajustarStock(producto: Producto, nuevoStock: number, motivo: string, usuarioEmail?: string): Promise<void> {
    return this.registrarAjuste(producto, nuevoStock, motivo, usuarioEmail);
  },
  async agregarStock(producto: Producto, cantidad: number, motivo?: string, usuarioEmail?: string): Promise<void> {
    return this.registrarEntrada(producto, cantidad, motivo, usuarioEmail);
  },
  async reducirStock(producto: Producto, cantidad: number, motivo?: string, usuarioEmail?: string): Promise<void> {
    return this.registrarSalida(producto, cantidad, motivo, usuarioEmail);
  },

  async deleteMovimiento(id: string): Promise<void> {
    if (isFirebaseConfigured() && db && id) {
      try {
        await authService.ensureAnonymousAuth();
        const docRef = doc(db, 'inventario_movimientos', id);
        await deleteDoc(docRef);
      } catch (e: any) {
        console.warn('Aviso: Movimiento eliminado localmente (Firestore fallback):', e);
      }
    }
    const local = getLocalMovimientos();
    const filtered = local.filter((m) => m.id !== id);
    saveLocalMovimientos(filtered);
  },

  async clearAllMovimientos(): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await authService.ensureAnonymousAuth();
        const colRef = collection(db, 'inventario_movimientos');
        const snap = await getDocs(colRef);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      } catch (e) {
        console.warn('Error clearing Firestore movimientos:', e);
      }
    }
    saveLocalMovimientos([]);
  },
};
