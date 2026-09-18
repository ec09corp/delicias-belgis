import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { authService } from './authService';
import { clientesService } from './clientesService';
import { ventasService } from './ventasService';
import { Pedido, PedidoEstado, PedidoProductoItem, TipoPedido } from '../types';

const LOCAL_STORAGE_KEY = 'delicias_belgi_pedidos';

function normalizePedido(docId: string, data: any): Pedido {
  const customerName = data.customerName || data.cliente || 'Cliente';
  const customerPhone = data.customerPhone || data.telefono || '';
  const orderType: TipoPedido = data.orderType || data.tipoPedido || 'para_recoger';
  const address = data.address || data.direccion || '';
  const items: PedidoProductoItem[] = (data.items || data.productos || []).map((it: any) => ({
    id: it.id || '',
    nombre: it.nombre || it.name || 'Producto',
    name: it.nombre || it.name || 'Producto',
    cantidad: Number(it.cantidad || it.quantity || 1),
    quantity: Number(it.cantidad || it.quantity || 1),
    precio: Number(it.precio || it.price || 0),
    price: Number(it.precio || it.price || 0),
    subtotal: Number(it.subtotal || (Number(it.precio || it.price || 0) * Number(it.cantidad || it.quantity || 1))),
  }));
  const status: PedidoEstado = (data.status || data.estado || 'pendiente') as PedidoEstado;
  const subtotal = Number(data.subtotal || items.reduce((acc, it) => acc + it.subtotal, 0));
  const total = Number(data.total || subtotal);
  const notes = data.notes || data.notas || '';
  const numeroPedido = data.numeroPedido || data.orderNumber || `#ORD-${docId.slice(-4).toUpperCase()}`;

  // Handle dates from Firestore Timestamp or string
  let createdAtStr = new Date().toISOString();
  if (data.createdAt) {
    if (typeof data.createdAt === 'string') {
      createdAtStr = data.createdAt;
    } else if (data.createdAt.toDate && typeof data.createdAt.toDate === 'function') {
      createdAtStr = data.createdAt.toDate().toISOString();
    }
  }
  let updatedAtStr = createdAtStr;
  if (data.updatedAt) {
    if (typeof data.updatedAt === 'string') {
      updatedAtStr = data.updatedAt;
    } else if (data.updatedAt.toDate && typeof data.updatedAt.toDate === 'function') {
      updatedAtStr = data.updatedAt.toDate().toISOString();
    }
  }

  const fecha = data.fecha || createdAtStr.split('T')[0];
  const hora = data.hora || new Date(createdAtStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

  return {
    id: docId,
    numeroPedido,
    cliente: customerName,
    customerName,
    telefono: customerPhone,
    customerPhone,
    tipoPedido: orderType,
    orderType,
    direccion: address,
    address,
    productos: items,
    items,
    subtotal,
    total,
    notas: notes,
    notes,
    estado: status,
    status,
    fecha,
    hora,
    ventaContabilizada: Boolean(data.ventaContabilizada),
    createdAt: createdAtStr,
    updatedAt: updatedAtStr,
  };
}

function getLocalPedidos(): Pedido[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed: any[] = JSON.parse(saved);
      return parsed.map((p, i) => normalizePedido(p.id || `local-${i}`, p));
    }
  } catch (e) {
    console.warn('LocalStorage error reading pedidos:', e);
  }
  return [];
}

function saveLocalPedidos(items: Pedido[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('delicias_pedidos_changed'));
  } catch (e) {
    console.warn('LocalStorage error saving pedidos:', e);
  }
}

function generateNumeroPedido(): string {
  const timestampPart = Date.now().toString().slice(-4);
  const randomPart = Math.floor(10 + Math.random() * 90);
  return `#ORD-${timestampPart}${randomPart}`;
}

export const pedidosService = {
  /**
   * Real-time listener for orders. Updates automatically via onSnapshot without refreshing the page.
   */
  subscribeToPedidos(callback: (pedidos: Pedido[]) => void): () => void {
    if (isFirebaseConfigured() && db) {
      const firestoreDb = db;
      try {
        // Listen to primary 'orders' collection
        const ordersCol = collection(firestoreDb, 'orders');
        return onSnapshot(
          ordersCol,
          (snapshot) => {
            const list: Pedido[] = [];
            snapshot.forEach((docSnap) => {
              list.push(normalizePedido(docSnap.id, docSnap.data()));
            });
            // If 'orders' is empty, also check 'pedidos' for backwards compatibility
            if (list.length === 0) {
              const legacyCol = collection(firestoreDb, 'pedidos');
              getDocs(legacyCol).then((legacySnap) => {
                if (!legacySnap.empty) {
                  const legacyList: Pedido[] = [];
                  legacySnap.forEach((docSnap) => {
                    legacyList.push(normalizePedido(docSnap.id, docSnap.data()));
                  });
                  legacyList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                  callback(legacyList);
                  return;
                }
                callback(list);
              }).catch(() => callback(list));
              return;
            }
            // Sort in memory by createdAt descending
            list.sort((a, b) => {
              const timeA = new Date(a.createdAt || 0).getTime();
              const timeB = new Date(b.createdAt || 0).getTime();
              return timeB - timeA;
            });
            callback(list);
          },
          (error) => {
            console.warn('Firestore snapshot error on orders, listening to pedidos or local fallback:', error);
            // Fallback to legacy 'pedidos' listener
            try {
              const pedidosCol = collection(firestoreDb, 'pedidos');
              onSnapshot(pedidosCol, (snap) => {
                const legacyList: Pedido[] = [];
                snap.forEach((d) => legacyList.push(normalizePedido(d.id, d.data())));
                legacyList.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
                callback(legacyList);
              }, () => callback(getLocalPedidos()));
            } catch {
              callback(getLocalPedidos());
            }
          }
        );
      } catch (err) {
        console.warn('Error setting up onSnapshot for orders:', err);
      }
    }
    // Local fallback
    callback(getLocalPedidos());
    const handler = () => callback(getLocalPedidos());
    window.addEventListener('delicias_pedidos_changed', handler);
    return () => window.removeEventListener('delicias_pedidos_changed', handler);
  },

  async getPedidos(): Promise<Pedido[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'orders');
        const snap = await getDocs(colRef);
        const list: Pedido[] = [];
        snap.forEach((docSnap) => {
          list.push(normalizePedido(docSnap.id, docSnap.data()));
        });
        if (list.length > 0) {
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          return list;
        }
        // Check fallback 'pedidos' collection
        const legacyRef = collection(db, 'pedidos');
        const legacySnap = await getDocs(legacyRef);
        legacySnap.forEach((docSnap) => {
          list.push(normalizePedido(docSnap.id, docSnap.data()));
        });
        list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        return list;
      } catch (error) {
        console.warn('Error fetching orders from Firestore, using fallback:', error);
      }
    }
    return getLocalPedidos();
  },

  /**
   * Creates an order directly in Firestore without WhatsApp dependency.
   * Stores all requested fields in 'orders' and mirrors to 'pedidos'.
   */
  async createPedido(pedidoData: {
    cliente: string;
    telefono: string;
    tipoPedido: TipoPedido;
    direccion?: string;
    productos: PedidoProductoItem[];
    subtotal: number;
    total: number;
    notas?: string;
  }): Promise<Pedido> {
    const now = new Date();
    const fecha = now.toISOString().split('T')[0];
    const hora = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const numeroPedido = generateNumeroPedido();
    const customerName = pedidoData.cliente.trim() || 'Cliente';
    const customerPhone = pedidoData.telefono.trim();
    const orderType = pedidoData.tipoPedido;
    const address = orderType === 'delivery' || orderType === 'a_domicilio' ? (pedidoData.direccion?.trim() || '') : '';
    const items = pedidoData.productos.map((it) => ({
      id: it.id || '',
      name: it.nombre || it.name || 'Producto',
      nombre: it.nombre || it.name || 'Producto',
      quantity: Number(it.cantidad || it.quantity || 1),
      cantidad: Number(it.cantidad || it.quantity || 1),
      price: Number(it.precio || it.price || 0),
      precio: Number(it.precio || it.price || 0),
      subtotal: Number(it.subtotal || (Number(it.precio || it.price || 0) * Number(it.cantidad || it.quantity || 1))),
    }));
    const subtotal = Number(pedidoData.subtotal);
    const total = Number(pedidoData.total);
    const notes = pedidoData.notas?.trim() || '';

    const newOrderPayload: Record<string, any> = {
      numeroPedido,
      customerName,
      cliente: customerName,
      customerPhone,
      telefono: customerPhone,
      orderType,
      tipoPedido: orderType,
      address,
      direccion: address,
      items,
      productos: items,
      subtotal,
      total,
      notes,
      notas: notes,
      status: 'pendiente',
      estado: 'pendiente',
      fecha,
      hora,
      ventaContabilizada: false,
      createdAt: isFirebaseConfigured() ? serverTimestamp() : now.toISOString(),
      updatedAt: isFirebaseConfigured() ? serverTimestamp() : now.toISOString(),
    };

    if (isFirebaseConfigured() && db) {
      try {
        await authService.ensureAnonymousAuth();
        // 1. Write to primary 'orders' collection
        const ordersCol = collection(db, 'orders');
        const docRef = await addDoc(ordersCol, newOrderPayload);
        // 2. Also write with matching ID to 'pedidos' for compatibility
        try {
          const pedidosDocRef = doc(db, 'pedidos', docRef.id);
          await setDoc(pedidosDocRef, newOrderPayload);
        } catch (e) {
          console.warn('Error syncing order to pedidos collection:', e);
        }

        const createdPedido: Pedido = normalizePedido(docRef.id, {
          ...newOrderPayload,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });

        // Register client info for CRM tracking
        clientesService.registrarOActualizarClienteDesdePedido(createdPedido).catch(console.warn);

        return createdPedido;
      } catch (error: any) {
        console.warn('Aviso: Creación de pedido en Firestore falló, usando almacenamiento local:', error?.message || error);
      }
    }

    // LocalStorage fallback
    const list = getLocalPedidos();
    const localPedido: Pedido = normalizePedido('ped-' + Date.now(), {
      ...newOrderPayload,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    list.unshift(localPedido);
    saveLocalPedidos(list);
    clientesService.registrarOActualizarClienteDesdePedido(localPedido).catch(console.warn);
    return localPedido;
  },

  /**
   * Updates the order status in Firestore and manages sale recording without double counting.
   */
  async updateEstadoPedido(
    id: string,
    nuevoEstado: PedidoEstado,
    currentPedido?: Pedido
  ): Promise<void> {
    const updatedAtIso = new Date().toISOString();
    let shouldRecordSale = false;

    // A sale is recorded when the status changes to 'entregado' and hasn't been counted yet
    if (nuevoEstado === 'entregado' && currentPedido && !currentPedido.ventaContabilizada) {
      shouldRecordSale = true;
    }

    if (isFirebaseConfigured() && db) {
      try {
        const updatePayload: Record<string, any> = {
          estado: nuevoEstado,
          status: nuevoEstado,
          updatedAt: serverTimestamp(),
        };
        if (shouldRecordSale) {
          updatePayload.ventaContabilizada = true;
        }

        // Update in 'orders' collection
        try {
          const orderDocRef = doc(db, 'orders', id);
          await updateDoc(orderDocRef, updatePayload);
        } catch (e) {
          console.warn('Could not update in orders collection, will try pedidos:', e);
        }

        // Update in 'pedidos' collection
        try {
          const pedidosDocRef = doc(db, 'pedidos', id);
          await updateDoc(pedidosDocRef, updatePayload);
        } catch (e) {
          console.warn('Could not update in pedidos collection:', e);
        }

        // Record sale without double-counting
        if (shouldRecordSale && currentPedido) {
          const saleItemsSummary = currentPedido.productos.map((p) => `${p.cantidad}x ${p.nombre}`).join(', ');
          await ventasService.createVenta({
            producto: saleItemsSummary || `Pedido ${currentPedido.numeroPedido}`,
            cantidad: currentPedido.productos.reduce((acc, p) => acc + p.cantidad, 0) || 1,
            precioUnitario: currentPedido.total,
            total: currentPedido.total,
            fecha: new Date().toISOString(),
          }).catch(console.warn);
        }
        return;
      } catch (error: any) {
        console.warn('Aviso: Error actualizando estado en Firestore, aplicando en local:', error?.message || error);
      }
    }

    // LocalStorage fallback
    const list = getLocalPedidos();
    const idx = list.findIndex((p) => p.id === id);
    if (idx !== -1) {
      list[idx].estado = nuevoEstado;
      list[idx].status = nuevoEstado;
      list[idx].updatedAt = updatedAtIso;
      if (shouldRecordSale) {
        list[idx].ventaContabilizada = true;
      }
      saveLocalPedidos(list);

      if (shouldRecordSale && currentPedido) {
        const saleItemsSummary = currentPedido.productos.map((p) => `${p.cantidad}x ${p.nombre}`).join(', ');
        ventasService.createVenta({
          producto: saleItemsSummary || `Pedido ${currentPedido.numeroPedido}`,
          cantidad: currentPedido.productos.reduce((acc, p) => acc + p.cantidad, 0) || 1,
          precioUnitario: currentPedido.total,
          total: currentPedido.total,
          fecha: new Date().toISOString(),
        }).catch(console.warn);
      }
    }
  },

  /**
   * Deletes an order from Firestore after user confirmation.
   */
  async deletePedido(id: string): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        // Delete from 'orders'
        try {
          const orderDocRef = doc(db, 'orders', id);
          await deleteDoc(orderDocRef);
        } catch (e) {
          console.warn('Error deleting from orders collection:', e);
        }
        // Delete from 'pedidos'
        try {
          const pedidosDocRef = doc(db, 'pedidos', id);
          await deleteDoc(pedidosDocRef);
        } catch (e) {
          console.warn('Error deleting from pedidos collection:', e);
        }
        return;
      } catch (error: any) {
        console.warn('Aviso: Error eliminando pedido en Firestore, eliminando en local:', error?.message || error);
      }
    }
    // LocalStorage fallback
    const list = getLocalPedidos();
    const filtered = list.filter((p) => p.id !== id);
    saveLocalPedidos(filtered);
  },

  subscribePedidos(callback: (pedidos: Pedido[]) => void): () => void {
    return this.subscribeToPedidos(callback);
  },
};
