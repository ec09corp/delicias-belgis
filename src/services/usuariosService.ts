import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { UserRole, UsuarioDoc } from '../types';

const LOCAL_STORAGE_KEY = 'delicias_belgi_usuarios';

const DEFAULT_USUARIOS: UsuarioDoc[] = [
  {
    id: 'usr-1',
    uid: 'usr-1',
    email: 'admin@deliciasbelgi.com',
    nombre: 'Administrador General',
    role: 'admin',
    rol: 'admin',
    activo: true,
    createdAt: '2026-01-01T08:00:00.000Z',
  },
  {
    id: 'usr-2',
    uid: 'usr-2',
    email: 'caja@deliciasbelgi.com',
    nombre: 'Caja Principal',
    role: 'caja',
    rol: 'caja',
    activo: true,
    createdAt: '2026-01-01T08:00:00.000Z',
  },
];

function getLocalUsuarios(): UsuarioDoc[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading local usuarios:', e);
  }
  return DEFAULT_USUARIOS;
}

function saveLocalUsuarios(list: UsuarioDoc[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('delicias_usuarios_changed'));
  } catch (e) {
    console.warn('Error saving local usuarios:', e);
  }
}

export const usuariosService = {
  async getUserRole(uid: string, email?: string | null): Promise<UserRole> {
    return (await this.getUserAccess(uid, email)).role;
  },

  /**
   * Rol y estado (activo) del usuario que inicia sesión.
   * Los usuarios creados desde el panel se guardan con un id propio (usr-...), no con el
   * uid de Firebase Auth; por eso, si no hay documento con su uid, se busca por correo y
   * se vincula a su uid conservando el rol y el estado que le dio el administrador.
   */
  async getUserAccess(uid: string, email?: string | null): Promise<{ role: UserRole; activo: boolean }> {
    if (!uid) return { role: 'caja', activo: true };
    const cleanEmail = (email || '').trim().toLowerCase();
    if (isFirebaseConfigured() && db) {
      try {
        const userDocRef = doc(db, 'usuarios', uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          return {
            role: (data.role as UserRole) || (data.rol as UserRole) || 'caja',
            activo: data.activo !== false,
          };
        }

        if (cleanEmail) {
          const emailSnap = await getDoc(doc(db, 'usuarios', cleanEmail));
          const byEmail = emailSnap.exists()
            ? [emailSnap]
            : (await getDocs(query(collection(db, 'usuarios'), where('email', '==', cleanEmail)))).docs;
          if (byEmail.length > 0) {
            const preDoc = byEmail[0];
            const data = preDoc.data() || {};
            const role: UserRole = (data.role as UserRole) || (data.rol as UserRole) || 'caja';
            const activo = data.activo !== false;
            await setDoc(userDocRef, { ...data, id: uid, uid, email: cleanEmail, role, rol: role, activo });
            if (preDoc.id !== uid) {
              await deleteDoc(preDoc.ref).catch((e) => console.warn('No se pudo borrar el registro previo del usuario:', e));
            }
            return { role, activo };
          }
        }

        const allUsersSnap = await getDocs(collection(db, 'usuarios'));
        const assignedRole: UserRole = allUsersSnap.empty ? 'admin' : 'caja';
        await setDoc(userDocRef, {
          uid,
          email: cleanEmail,
          role: assignedRole,
          rol: assignedRole,
          activo: true,
          createdAt: new Date().toISOString(),
        });
        return { role: assignedRole, activo: true };
      } catch (err) {
        console.warn('Error leyendo el rol del usuario en Firestore; se usa el rol "caja":', err);
        return { role: 'caja', activo: true };
      }
    }
    const local = getLocalUsuarios();
    const found = local.find((u) => u.email === cleanEmail || u.uid === uid);
    return { role: found?.role || found?.rol || 'admin', activo: found ? found.activo !== false : true };
  },

  async getAllUsuarios(): Promise<UsuarioDoc[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'usuarios');
        const snap = await getDocs(colRef);
        const list: UsuarioDoc[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            uid: d.id,
            email: data.email || '',
            nombre: data.nombre || '',
            role: (data.role as UserRole) || (data.rol as UserRole) || 'caja',
            rol: (data.role as UserRole) || (data.rol as UserRole) || 'caja',
            activo: data.activo !== false,
            createdAt: data.createdAt || '',
          });
        });
        if (list.length > 0) return list;
      } catch (err) {
        console.warn('Error getting all usuarios:', err);
      }
    }
    return getLocalUsuarios();
  },

  async updateUserRole(uid: string, newRole: UserRole): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        const userDocRef = doc(db, 'usuarios', uid);
        await updateDoc(userDocRef, { role: newRole, rol: newRole });
      } catch (err) {
        console.warn('Error updating user role in Firebase:', err);
      }
    }
    const local = getLocalUsuarios();
    const idx = local.findIndex((u) => u.uid === uid || u.id === uid);
    if (idx !== -1) {
      local[idx].role = newRole;
      local[idx].rol = newRole;
      saveLocalUsuarios(local);
    }
  },

  subscribeToUsuarios(callback: (items: UsuarioDoc[]) => void): () => void {
    if (isFirebaseConfigured() && db) {
      try {
        const colRef = collection(db, 'usuarios');
        return onSnapshot(
          colRef,
          (snap: QuerySnapshot<DocumentData>) => {
            if (!snap.empty) {
              const list: UsuarioDoc[] = [];
              snap.forEach((d) => {
                const data = d.data();
                list.push({
                  id: d.id,
                  uid: d.id,
                  email: data.email || '',
                  nombre: data.nombre || '',
                  role: (data.role as UserRole) || (data.rol as UserRole) || 'caja',
                  rol: (data.role as UserRole) || (data.rol as UserRole) || 'caja',
                  activo: data.activo !== false,
                  createdAt: data.createdAt || '',
                });
              });
              callback(list);
              return;
            }
            callback(getLocalUsuarios());
          },
          (err: Error) => {
            console.warn('Error snapshot usuarios:', err);
            callback(getLocalUsuarios());
          }
        );
      } catch (e) {
        console.warn('Error setup snapshot usuarios:', e);
      }
    }
    callback(getLocalUsuarios());
    const handler = () => callback(getLocalUsuarios());
    window.addEventListener('delicias_usuarios_changed', handler);
    return () => window.removeEventListener('delicias_usuarios_changed', handler);
  },

  async createUserDoc(email: string, nombre: string, role: UserRole): Promise<void> {
    await this.createUsuario({ email, nombre, role, rol: role });
  },

  async createUsuario(data: Partial<UsuarioDoc>): Promise<UsuarioDoc> {
    // Sin uid de Firebase Auth, el documento se guarda con el correo como id para que,
    // al iniciar sesión, se pueda vincular con su rol (y las reglas lo puedan comprobar).
    const id = data.uid || data.id || (data.email || '').trim().toLowerCase() || 'usr-' + Date.now();
    const role = data.role || data.rol || 'caja';
    const newDoc: UsuarioDoc = {
      id,
      uid: id,
      email: (data.email || '').trim().toLowerCase(),
      nombre: (data.nombre || '').trim() || (data.email || '').split('@')[0],
      role,
      rol: role,
      activo: data.activo !== false,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured() && db) {
      try {
        const userDocRef = doc(db, 'usuarios', id);
        await setDoc(userDocRef, newDoc);
      } catch (err) {
        console.warn('Error creating user doc in Firestore:', err);
      }
    }

    const local = getLocalUsuarios();
    local.push(newDoc);
    saveLocalUsuarios(local);
    return newDoc;
  },

  async updateUsuario(id: string, data: Partial<UsuarioDoc>): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        const userDocRef = doc(db, 'usuarios', id);
        await updateDoc(userDocRef, data);
      } catch (err) {
        console.warn('Error updating user doc in Firestore:', err);
      }
    }
    const local = getLocalUsuarios();
    const idx = local.findIndex((u) => u.id === id || u.uid === id);
    if (idx !== -1) {
      local[idx] = {
        ...local[idx],
        ...data,
        role: data.role || data.rol || local[idx].role,
        rol: data.role || data.rol || local[idx].rol,
      };
      saveLocalUsuarios(local);
    }
  },

  async deleteUsuario(id: string): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        const userDocRef = doc(db, 'usuarios', id);
        await deleteDoc(userDocRef);
      } catch (err) {
        console.warn('Error deleting user doc in Firestore:', err);
      }
    }
    const local = getLocalUsuarios().filter((u) => u.id !== id && u.uid !== id);
    saveLocalUsuarios(local);
  },

  async deleteUserDoc(uid: string): Promise<void> {
    return this.deleteUsuario(uid);
  },
};
