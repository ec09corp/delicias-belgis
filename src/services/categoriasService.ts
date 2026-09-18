import {
  collection,
  doc,
  addDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { Categoria } from '../types';
import { authService } from './authService';

const LOCAL_STORAGE_KEY = 'delicias_belgi_categorias';

const INITIAL_CATEGORIAS: Categoria[] = [
  { id: 'cat-1', nombre: 'Helados & Bolis', descripcion: 'Helados artesanales y bolis gourmet', activa: true, orden: 1 },
  { id: 'cat-2', nombre: 'Repostería', descripcion: 'Tartas, cheesecakes y pasteles finos', activa: true, orden: 2 },
  { id: 'cat-3', nombre: 'Dulcería', descripcion: 'Alfajores, brownies y bocadillos dulces', activa: true, orden: 3 },
  { id: 'cat-4', nombre: 'Bebidas', descripcion: 'Café, sodas y jugos naturales', activa: true, orden: 4 },
  { id: 'cat-5', nombre: 'Combos & Especiales', descripcion: 'Paquetes para compartir y creaciones de temporada', activa: true, orden: 5 },
];

function getLocalCategorias(): Categoria[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('LocalStorage error reading categorias:', e);
  }
  return INITIAL_CATEGORIAS;
}

function saveLocalCategorias(items: Categoria[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('delicias_categorias_changed'));
  } catch (e) {
    console.warn('LocalStorage error saving categorias:', e);
  }
}

export const categoriasService = {
  subscribeToCategorias(callback: (items: Categoria[]) => void): () => void {
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'categorias');
        return onSnapshot(
          colRef,
          async (snapshot) => {
            if (snapshot.empty) {
              callback(INITIAL_CATEGORIAS);
              return;
            }
            const list: Categoria[] = [];
            snapshot.forEach((d) => {
              const data = d.data();
              list.push({
                id: d.id,
                nombre: data.nombre || 'Categoría',
                descripcion: data.descripcion || '',
                imagen: data.imagen || '',
                activa: data.activa !== undefined ? Boolean(data.activa) : true,
                orden: Number(data.orden) || 0,
                createdAt: data.createdAt || '',
                updatedAt: data.updatedAt || '',
              });
            });
            list.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
            callback(list);
          },
          (error) => {
            console.warn('Error onSnapshot categorias, using fallback:', error);
            callback(getLocalCategorias());
          }
        );
      } catch (err) {
        console.warn('Error setting up onSnapshot for categorias:', err);
      }
    }
    callback(getLocalCategorias());
    const handler = () => callback(getLocalCategorias());
    window.addEventListener('delicias_categorias_changed', handler);
    return () => window.removeEventListener('delicias_categorias_changed', handler);
  },

  async getCategorias(): Promise<Categoria[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'categorias');
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          const list: Categoria[] = [];
          snap.forEach((d) => {
            const data = d.data();
            list.push({ id: d.id, ...(data as any) });
          });
          list.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
          return list;
        }
      } catch (err) {
        console.warn('Error getting categorias from Firestore:', err);
      }
    }
    return getLocalCategorias();
  },

  async createCategoria(cat: Omit<Categoria, 'id'>): Promise<Categoria> {
    const now = new Date().toISOString();
    const payload = {
      nombre: cat.nombre.trim(),
      descripcion: cat.descripcion?.trim() || '',
      imagen: cat.imagen?.trim() || '',
      activa: cat.activa !== undefined ? Boolean(cat.activa) : true,
      orden: Number(cat.orden) || 0,
      createdAt: now,
      updatedAt: now,
    };
    if (isFirebaseConfigured() && db) {
      try {
        await authService.ensureAnonymousAuth();
        const colRef = collection(db, 'categorias');
        const docRef = await addDoc(colRef, payload);
        return { id: docRef.id, ...payload };
      } catch (error: any) {
        console.warn('Aviso: Categoría guardada en almacenamiento local (Firestore usando fallback):', error?.message || error);
      }
    }
    const localList = getLocalCategorias();
    const created: Categoria = { id: 'cat-' + Date.now(), ...payload };
    localList.push(created);
    saveLocalCategorias(localList);
    return created;
  },

  async updateCategoria(id: string, updates: Partial<Categoria>): Promise<void> {
    const now = new Date().toISOString();
    const payload = {
      ...updates,
      updatedAt: now,
    };
    if (isFirebaseConfigured() && db) {
      try {
        await authService.ensureAnonymousAuth();
        const docRef = doc(db, 'categorias', id);
        await updateDoc(docRef, payload);
        return;
      } catch (error: any) {
        console.warn('Aviso: Categoría actualizada en almacenamiento local (Firestore usando fallback):', error?.message || error);
      }
    }
    const list = getLocalCategorias();
    const index = list.findIndex((c) => c.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...payload };
      saveLocalCategorias(list);
    }
  },

  async deleteCategoria(id: string): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await authService.ensureAnonymousAuth();
        const docRef = doc(db, 'categorias', id);
        await deleteDoc(docRef);
        return;
      } catch (error: any) {
        console.warn('Aviso: Categoría eliminada localmente (Firestore usando fallback):', error?.message || error);
      }
    }
    const list = getLocalCategorias().filter((c) => c.id !== id);
    saveLocalCategorias(list);
  },

  subscribeCategorias(callback: (items: Categoria[]) => void): () => void {
    return this.subscribeToCategorias(callback);
  },
};
