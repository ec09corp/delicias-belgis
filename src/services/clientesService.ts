import {
  collection,
  doc,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  updateDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { Cliente, Pedido } from '../types';

const LOCAL_STORAGE_KEY = 'delicias_belgi_clientes';

function getLocalClientes(): Cliente[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('LocalStorage error reading clientes:', e);
  }
  return [];
}

function saveLocalClientes(items: Cliente[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('delicias_clientes_changed'));
  } catch (e) {
    console.warn('LocalStorage error saving clientes:', e);
  }
}

export const clientesService = {
  subscribeToClientes(callback: (items: Cliente[]) => void): () => void {
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'clientes');
        return onSnapshot(
          colRef,
          (snapshot) => {
            const list: Cliente[] = [];
            snapshot.forEach((d) => {
              const data = d.data();
              list.push({
                id: d.id,
                nombre: data.nombre || 'Cliente',
                telefono: data.telefono || '',
                direccion: data.direccion || '',
                cantidadPedidos: Number(data.cantidadPedidos) || 0,
                totalGastado: Number(data.totalGastado) || 0,
                ultimoPedido: data.ultimoPedido || '',
                fechaUltimoPedido: data.fechaUltimoPedido || '',
                createdAt: data.createdAt || '',
                updatedAt: data.updatedAt || '',
              });
            });
            // Sort by highest spend
            list.sort((a, b) => (b.totalGastado || 0) - (a.totalGastado || 0));
            callback(list);
          },
          (error) => {
            console.warn('Error onSnapshot clientes, using fallback:', error);
            callback(getLocalClientes());
          }
        );
      } catch (err) {
        console.warn('Error setting up onSnapshot for clientes:', err);
      }
    }
    callback(getLocalClientes());
    const handler = () => callback(getLocalClientes());
    window.addEventListener('delicias_clientes_changed', handler);
    return () => window.removeEventListener('delicias_clientes_changed', handler);
  },

  async getClientes(): Promise<Cliente[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'clientes');
        const snap = await getDocs(colRef);
        const list: Cliente[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        return list;
      } catch (err) {
        console.warn('Error getting clientes:', err);
      }
    }
    return getLocalClientes();
  },

  /**
   * Called when a client creates an order or an order is delivered.
   * Updates total spent and order counts.
   */
  async registrarOActualizarClienteDesdePedido(pedido: Pedido): Promise<void> {
    const rawPhone = pedido.telefono?.trim();
    if (!rawPhone || rawPhone.length < 5) return;
    const cleanPhone = rawPhone.replace(/\s+/g, '');
    const now = new Date().toISOString();

    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'clientes');
        const q = query(colRef, where('telefono', '==', cleanPhone));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const clientDoc = snap.docs[0];
          const data = clientDoc.data();
          const newTotal = (Number(data.totalGastado) || 0) + Number(pedido.total || 0);
          const newCount = (Number(data.cantidadPedidos) || 0) + 1;
          await updateDoc(doc(db, 'clientes', clientDoc.id), {
            nombre: pedido.cliente || data.nombre,
            direccion: pedido.direccion || data.direccion || '',
            totalGastado: newTotal,
            cantidadPedidos: newCount,
            ultimoPedido: pedido.numeroPedido,
            fechaUltimoPedido: pedido.fecha || now.split('T')[0],
            updatedAt: now,
          });
          return;
        } else {
          await addDoc(colRef, {
            nombre: pedido.cliente || 'Cliente',
            telefono: cleanPhone,
            direccion: pedido.direccion || '',
            totalGastado: Number(pedido.total) || 0,
            cantidadPedidos: 1,
            ultimoPedido: pedido.numeroPedido,
            fechaUltimoPedido: pedido.fecha || now.split('T')[0],
            createdAt: now,
            updatedAt: now,
          });
          return;
        }
      } catch (err) {
        console.warn('Error updating cliente in Firestore, fallback to local:', err);
      }
    }

    // LocalStorage fallback
    const list = getLocalClientes();
    const idx = list.findIndex((c) => c.telefono.replace(/\s+/g, '') === cleanPhone);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        nombre: pedido.cliente || list[idx].nombre,
        direccion: pedido.direccion || list[idx].direccion,
        totalGastado: (list[idx].totalGastado || 0) + Number(pedido.total || 0),
        cantidadPedidos: (list[idx].cantidadPedidos || 0) + 1,
        ultimoPedido: pedido.numeroPedido,
        fechaUltimoPedido: pedido.fecha || now.split('T')[0],
        updatedAt: now,
      };
    } else {
      list.push({
        id: 'cli-' + Date.now(),
        nombre: pedido.cliente || 'Cliente',
        telefono: cleanPhone,
        direccion: pedido.direccion || '',
        totalGastado: Number(pedido.total) || 0,
        cantidadPedidos: 1,
        ultimoPedido: pedido.numeroPedido,
        fechaUltimoPedido: pedido.fecha || now.split('T')[0],
        createdAt: now,
        updatedAt: now,
      });
    }
    saveLocalClientes(list);
  },

  subscribeClientes(callback: (items: Cliente[]) => void): () => void {
    return this.subscribeToClientes(callback);
  },
};
