import {
  collection,
  addDoc,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { ProduccionRegistro, Producto } from '../types';
import { productosService } from './productosService';
import { inventarioService } from './inventarioService';
import { authService } from './authService';

const LOCAL_STORAGE_KEY = 'delicias_belgi_producciones';

function getLocalProducciones(): ProduccionRegistro[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('LocalStorage error reading producciones:', e);
  }
  return [];
}

function saveLocalProducciones(items: ProduccionRegistro[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('delicias_producciones_changed'));
  } catch (e) {
    console.warn('LocalStorage error saving producciones:', e);
  }
}

function normalizeProduccion(id: string, data: any): ProduccionRegistro {
  return {
    id,
    productoId: String(data.productoId || ''),
    producto: String(data.producto || data.productoNombre || 'Producto'),
    cantidad: Math.max(0, Number(data.cantidad) || 0),
    fecha: data.fecha || new Date().toISOString(),
    usuario: String(data.usuario || data.usuarioEmail || 'Administrador'),
    observacion: data.observacion ? String(data.observacion) : '',
    stockAnterior: data.stockAnterior !== undefined ? Number(data.stockAnterior) : undefined,
    stockNuevo: data.stockNuevo !== undefined ? Number(data.stockNuevo) : undefined,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

export const produccionService = {
  subscribeToProducciones(callback: (items: ProduccionRegistro[]) => void): () => void {
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'producciones');
        return onSnapshot(
          colRef,
          (snapshot) => {
            const list: ProduccionRegistro[] = [];
            snapshot.forEach((d) => {
              list.push(normalizeProduccion(d.id, d.data()));
            });
            list.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            saveLocalProducciones(list);
            callback(list);
          },
          (error) => {
            console.warn('Error onSnapshot producciones, using fallback:', error);
            callback(getLocalProducciones());
          }
        );
      } catch (err) {
        console.warn('Error in subscribeToProducciones:', err);
      }
    }
    callback(getLocalProducciones());
    const handler = () => callback(getLocalProducciones());
    window.addEventListener('delicias_producciones_changed', handler);
    return () => window.removeEventListener('delicias_producciones_changed', handler);
  },

  subscribeToProduccion(callback: (items: ProduccionRegistro[]) => void): () => void {
    return this.subscribeToProducciones(callback);
  },

  async registrarProduccion(
    producto: Producto,
    cantidad: number,
    fecha: string,
    usuario: string = 'Administrador',
    observacion: string = ''
  ): Promise<ProduccionRegistro> {
    const qty = Math.max(1, Number(cantidad));
    const now = new Date().toISOString();
    const cantAnterior = Number(producto.stock ?? 0);
    const cantNueva = cantAnterior + qty;

    // 1. Update stock in product
    if (producto.id) {
      await productosService.updateProducto(producto.id, {
        stock: cantNueva,
        disponible: true,
      });
    }

    // 2. Register inventory movement
    await inventarioService.registrarMovimiento({
      productoId: producto.id || '',
      producto: producto.nombre,
      productoNombre: producto.nombre,
      cantidadAnterior: cantAnterior,
      cantidadNueva: cantNueva,
      diferencia: qty,
      cantidad: qty,
      tipo: 'entrada',
      motivo: `Producción (+${qty})`,
      usuario,
      fecha: fecha || now,
    });

    // 3. Save to Firestore producciones
    const payload = {
      productoId: producto.id || '',
      producto: producto.nombre,
      cantidad: qty,
      fecha: fecha || now,
      usuario,
      observacion: observacion.trim(),
      stockAnterior: cantAnterior,
      stockNuevo: cantNueva,
      createdAt: now,
      updatedAt: now,
    };

    let docId = 'prod-rec-' + Date.now();
    if (isFirebaseConfigured() && db) {
      try {
        await authService.ensureAnonymousAuth();
        const colRef = collection(db, 'producciones');
        const docRef = await addDoc(colRef, payload);
        docId = docRef.id;
      } catch (error: any) {
        console.warn('Aviso: Producción guardada en almacenamiento local (Firestore usando fallback):', error?.message || error);
      }
    }

    const created: ProduccionRegistro = { id: docId, ...payload };
    const local = getLocalProducciones();
    local.unshift(created);
    saveLocalProducciones(local);
    return created;
  },

  async editarProduccion(
    produccionId: string,
    producto: Producto,
    nuevaCantidad: number,
    nuevaFecha: string,
    observacion: string,
    usuario: string = 'Administrador'
  ): Promise<void> {
    const qty = Math.max(1, Number(nuevaCantidad));
    const now = new Date().toISOString();

    // Find original production to compute difference
    const all = getLocalProducciones();
    const original = all.find((p) => p.id === produccionId);
    const cantOriginal = original ? Number(original.cantidad) : qty;
    const diff = qty - cantOriginal;

    if (diff !== 0 && producto.id) {
      const currentStock = Number(producto.stock ?? 0);
      const updatedStock = Math.max(0, currentStock + diff);
      await productosService.updateProducto(producto.id, {
        stock: updatedStock,
        disponible: updatedStock > 0,
      });
      await inventarioService.registrarMovimiento({
        productoId: producto.id,
        producto: producto.nombre,
        productoNombre: producto.nombre,
        cantidadAnterior: currentStock,
        cantidadNueva: updatedStock,
        diferencia: diff,
        cantidad: Math.abs(diff),
        tipo: diff > 0 ? 'entrada' : 'salida',
        motivo: `Ajuste por edición de Producción (${diff > 0 ? '+' : ''}${diff})`,
        usuario,
        fecha: now,
      });
    }

    const updatePayload = {
      cantidad: qty,
      fecha: nuevaFecha || now,
      observacion: observacion.trim(),
      usuario,
      updatedAt: now,
    };

    if (isFirebaseConfigured() && db) {
      try {
        await authService.ensureAnonymousAuth();
        const docRef = doc(db, 'producciones', produccionId);
        await setDoc(docRef, updatePayload, { merge: true });
      } catch (e: any) {
        console.warn('Aviso: Producción editada en almacenamiento local (Firestore usando fallback):', e?.message || e);
      }
    }

    const idx = all.findIndex((p) => p.id === produccionId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updatePayload };
      saveLocalProducciones(all);
    }
  },

  async eliminarProduccion(
    produccion: ProduccionRegistro,
    producto?: Producto,
    usuario: string = 'Administrador'
  ): Promise<void> {
    const qty = Number(produccion.cantidad) || 0;
    const now = new Date().toISOString();

    // Revert added stock
    if (producto && producto.id && qty > 0) {
      const currentStock = Number(producto.stock ?? 0);
      const revertedStock = Math.max(0, currentStock - qty);
      await productosService.updateProducto(producto.id, {
        stock: revertedStock,
        disponible: revertedStock > 0,
      });
      await inventarioService.registrarMovimiento({
        productoId: producto.id,
        producto: producto.nombre,
        productoNombre: producto.nombre,
        cantidadAnterior: currentStock,
        cantidadNueva: revertedStock,
        diferencia: -qty,
        cantidad: qty,
        tipo: 'salida',
        motivo: `Anulación de Producción (-${qty})`,
        usuario,
        fecha: now,
      });
    }

    if (produccion.id && isFirebaseConfigured() && db) {
      try {
        await authService.ensureAnonymousAuth();
        const docRef = doc(db, 'producciones', produccion.id);
        await deleteDoc(docRef);
      } catch (e: any) {
        console.warn('Aviso: Producción eliminada localmente (Firestore usando fallback):', e?.message || e);
      }
    }

    const all = getLocalProducciones();
    const filtered = all.filter((p) => p.id !== produccion.id);
    saveLocalProducciones(filtered);
  },

  async deleteProduccion(id: string, producto?: Producto, usuario: string = 'Administrador'): Promise<void> {
    const all = getLocalProducciones();
    const target = all.find((p) => p.id === id);
    if (target) {
      return this.eliminarProduccion(target, producto, usuario);
    }
    if (isFirebaseConfigured() && db && id) {
      try {
        await authService.ensureAnonymousAuth();
        const docRef = doc(db, 'producciones', id);
        await deleteDoc(docRef);
      } catch (e) {
        console.warn('Error deleting produccion from Firebase:', e);
      }
    }
    saveLocalProducciones(all.filter((p) => p.id !== id));
  },

  async clearAllProducciones(): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await authService.ensureAnonymousAuth();
        const colRef = collection(db, 'producciones');
        const snap = await getDocs(colRef);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
      } catch (e) {
        console.warn('Error clearing Firestore producciones:', e);
      }
    }
    saveLocalProducciones([]);
  },
};
