import { collection, getDocs, doc, addDoc, updateDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { Producto } from '../types';
import { authService } from './authService';
import { INITIAL_PRODUCTOS } from './initialData';

const LOCAL_STORAGE_KEY = 'delicias_belgi_productos';

function normalizeProducto(id: string, data: any): Producto {
  const isDisp = data.disponible !== undefined ? Boolean(data.disponible) : (data.activo !== undefined ? Boolean(data.activo) : true);
  return {
    id,
    nombre: data.nombre || data.name || 'Producto',
    descripcion: data.descripcion || data.description || '',
    precio: Number(data.precio || data.price || 0),
    categoria: data.categoria || data.category || 'Helados',
    imagen: data.imagen || data.image || 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&q=80&w=800',
    disponible: isDisp,
    activo: isDisp,
    stock: data.stock !== undefined ? Number(data.stock) : 99,
    stockMinimo: data.stockMinimo !== undefined ? Number(data.stockMinimo) : 5,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

function getLocalProductos(): Producto[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed: any[] = JSON.parse(saved);
      return parsed.map((p, i) => normalizeProducto(p.id || `local-${i}`, p));
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
  return INITIAL_PRODUCTOS.map((p, i) => normalizeProducto(p.id || `init-${i}`, p));
}

function saveLocalProductos(items: Producto[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('delicias_productos_changed'));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

export const productosService = {
  subscribeToProductos(callback: (items: Producto[]) => void): () => void {
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'productos');
        return onSnapshot(
          colRef,
          (snapshot) => {
            if (snapshot.empty) {
              callback(getLocalProductos());
              return;
            }
            const list: Producto[] = [];
            snapshot.forEach((docSnap) => {
              list.push(normalizeProducto(docSnap.id, docSnap.data()));
            });
            callback(list);
          },
          (error) => {
            console.warn('Firestore snapshot error on productos, using local fallback:', error);
            callback(getLocalProductos());
          }
        );
      } catch (err) {
        console.warn('Error setting up onSnapshot for productos:', err);
      }
    }
    // Fallback mode
    callback(getLocalProductos());
    const handler = () => callback(getLocalProductos());
    window.addEventListener('delicias_productos_changed', handler);
    return () => window.removeEventListener('delicias_productos_changed', handler);
  },

  async getProductosActivos(): Promise<Producto[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'productos');
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          const list: Producto[] = [];
          snap.forEach((docSnap) => {
            const prod = normalizeProducto(docSnap.id, docSnap.data());
            if (prod.disponible !== false && prod.activo !== false) {
              list.push(prod);
            }
          });
          return list;
        }
      } catch (error) {
        console.warn('Error fetching activos from Firebase, using local fallback:', error);
      }
    }
    const local = getLocalProductos();
    return local.filter((p) => p.disponible !== false && p.activo !== false);
  },

  async getAllProductos(): Promise<Producto[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'productos');
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          const list: Producto[] = [];
          snap.forEach((docSnap) => {
            list.push(normalizeProducto(docSnap.id, docSnap.data()));
          });
          return list;
        }
      } catch (error) {
        console.warn('Error fetching all productos from Firebase, using fallback:', error);
      }
    }
    return getLocalProductos();
  },

  async createProducto(producto: Omit<Producto, 'id'>): Promise<Producto> {
    const now = new Date().toISOString();
    const isDisp = producto.disponible !== undefined ? Boolean(producto.disponible) : (producto.activo !== undefined ? Boolean(producto.activo) : true);
    const docPayload = {
      nombre: producto.nombre.trim(),
      descripcion: producto.descripcion.trim(),
      precio: Number(producto.precio) || 0,
      categoria: producto.categoria.trim() || 'Helados',
      imagen: producto.imagen.trim(),
      disponible: isDisp,
      activo: isDisp,
      stock: producto.stock !== undefined ? Number(producto.stock) : 99,
      stockMinimo: producto.stockMinimo !== undefined ? Number(producto.stockMinimo) : 5,
      createdAt: producto.createdAt || now,
      updatedAt: now,
    };
    if (isFirebaseConfigured() && db) {
      try {
        await authService.ensureAnonymousAuth();
        const colRef = collection(db, 'productos');
        const docRef = await addDoc(colRef, docPayload);
        return { id: docRef.id, ...docPayload };
      } catch (error: any) {
        console.warn('Aviso: Producto guardado en almacenamiento local (Firestore usando fallback):', error?.message || error);
      }
    }
    // LocalStorage
    const list = getLocalProductos();
    const newProd: Producto = {
      id: 'prod-' + Date.now(),
      ...docPayload,
    };
    list.unshift(newProd);
    saveLocalProductos(list);
    return newProd;
  },

  async updateProducto(id: string, updates: Partial<Producto>): Promise<void> {
    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      ...updates,
      updatedAt: now,
    };
    if (updates.disponible !== undefined) {
      updatePayload.activo = updates.disponible;
    } else if (updates.activo !== undefined) {
      updatePayload.disponible = updates.activo;
    }
    if (updates.precio !== undefined) {
      updatePayload.precio = Number(updates.precio) || 0;
    }
    if (updates.stock !== undefined) {
      updatePayload.stock = Math.max(0, Number(updates.stock));
    }
    if (updates.stockMinimo !== undefined) {
      updatePayload.stockMinimo = Math.max(0, Number(updates.stockMinimo));
    }
    if (isFirebaseConfigured() && db) {
      try {
        await authService.ensureAnonymousAuth();
        const docRef = doc(db, 'productos', id);
        await setDoc(docRef, updatePayload, { merge: true });
      } catch (error: any) {
        console.warn('Aviso: Producto actualizado en almacenamiento local (Firestore usando fallback):', error?.message || error);
      }
    }
    // LocalStorage fallback sync
    const list = getLocalProductos();
    const index = list.findIndex((p) => p.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updatePayload };
      saveLocalProductos(list);
    }
  },

  async toggleActivo(id: string, currentStatus: boolean): Promise<void> {
    await this.updateProducto(id, { disponible: !currentStatus, activo: !currentStatus });
  },

  async deleteProducto(id: string): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await authService.ensureAnonymousAuth();
        const docRef = doc(db, 'productos', id);
        await deleteDoc(docRef);
      } catch (error: any) {
        console.warn('Aviso: Producto eliminado localmente (Firestore usando fallback):', error?.message || error);
      }
    }
    const list = getLocalProductos();
    const filtered = list.filter((p) => p.id !== id);
    saveLocalProductos(filtered);
  },

  // Aliases
  async crearProducto(producto: Omit<Producto, 'id'>): Promise<Producto> {
    return this.createProducto(producto);
  },

  async actualizarProducto(id: string, updates: Partial<Producto>): Promise<void> {
    return this.updateProducto(id, updates);
  },

  async eliminarProducto(id: string): Promise<void> {
    return this.deleteProducto(id);
  },

  async duplicarProducto(producto: Producto): Promise<Producto> {
    const copyData: Omit<Producto, 'id'> = {
      nombre: `${producto.nombre} (Copia)`,
      descripcion: producto.descripcion || '',
      precio: Number(producto.precio) || 0,
      categoria: producto.categoria || 'Helados',
      imagen: producto.imagen || '',
      disponible: producto.disponible !== undefined ? producto.disponible : true,
      activo: producto.activo !== undefined ? producto.activo : true,
      stock: producto.stock !== undefined ? Number(producto.stock) : 99,
      stockMinimo: producto.stockMinimo !== undefined ? Number(producto.stockMinimo) : 5,
    };
    return this.createProducto(copyData);
  },

  subscribeProductos(callback: (items: Producto[]) => void): () => void {
    return this.subscribeToProductos(callback);
  },

  recargarProductosEjemplo(): Producto[] {
    const list = INITIAL_PRODUCTOS.map((p, i) => normalizeProducto(p.id || `init-${i}`, p));
    saveLocalProductos(list);
    return list;
  },
};
