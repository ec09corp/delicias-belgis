import { signInWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously, User } from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import { UserAuth } from '../types';
import { usuariosService } from './usuariosService';

const SESSION_KEY = 'delicias_belgi_admin_session';

export const authService = {
  onAuthStateChanged(callback: (user: UserAuth | null) => void): () => void {
    return this.subscribe(callback);
  },

  /**
   * Attempts an anonymous sign-in for public clients if needed by Firestore rules.
   * Silently catches errors if anonymous provider is not enabled in Firebase console.
   */
  async ensureAnonymousAuth(): Promise<void> {
    if (isFirebaseConfigured() && auth && !auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        // Anonymous authentication might be disabled in Firebase Console; that is normal
      }
    }
  },

  subscribe(callback: (user: UserAuth | null) => void): () => void {
    if (isFirebaseConfigured() && auth) {
      return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
        if (firebaseUser) {
          // Anonymous users are customers browsing the public storefront; not administrative staff
          if (firebaseUser.isAnonymous) {
            callback(null);
            return;
          }
          const role = await usuariosService.getUserRole(firebaseUser.uid, firebaseUser.email);
          callback({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role,
          });
        } else {
          callback(null);
        }
      });
    }
    // Preview / Fallback mode
    const checkSession = () => {
      try {
        const saved = sessionStorage.getItem(SESSION_KEY);
        if (saved) {
          callback(JSON.parse(saved));
        } else {
          callback(null);
        }
      } catch {
        callback(null);
      }
    };
    checkSession();
    const handleStorage = () => checkSession();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  },

  async login(email: string, password: string): Promise<UserAuth> {
    if (!email || !password) {
      throw new Error('Por favor ingrese correo y contraseña.');
    }
    if (isFirebaseConfigured() && auth) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const u = userCredential.user;
        const role = await usuariosService.getUserRole(u.uid, u.email);
        return {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          role,
        };
      } catch (error: any) {
        let msg = 'Error al iniciar sesión.';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
          msg = 'Credenciales inválidas. Verifique correo y contraseña.';
        } else if (error.code === 'auth/invalid-email') {
          msg = 'El formato del correo no es válido.';
        } else if (error.code === 'auth/unauthorized-domain') {
          msg = 'Dominio no autorizado en Firebase Auth. Agregue el dominio de la aplicación en Firebase Console > Authentication > Configuración > Dominios autorizados.';
        } else if (error.code === 'auth/too-many-requests') {
          msg = 'Demasiados intentos de inicio de sesión fallidos. Espere un momento y vuelva a intentar.';
        } else if (error.code === 'auth/network-request-failed') {
          msg = 'Error de conexión de red al comunicarse con Firebase.';
        } else if (error.message) {
          msg = error.message;
        }
        throw new Error(msg);
      }
    }
    // Preview mode: validate email format and reasonable password
    if (!email.includes('@')) {
      throw new Error('Por favor ingrese un correo electrónico válido.');
    }
    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }
    const previewUser: UserAuth = {
      uid: 'admin-preview-' + Date.now(),
      email: email.trim().toLowerCase(),
      displayName: 'Administrador Belgi',
      role: 'admin',
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(previewUser));
    return previewUser;
  },

  async logout(): Promise<void> {
    if (isFirebaseConfigured() && auth) {
      await signOut(auth);
    }
    sessionStorage.removeItem(SESSION_KEY);
  },

  getCurrentUser(): UserAuth | null {
    if (isFirebaseConfigured() && auth && auth.currentUser) {
      if (auth.currentUser.isAnonymous) {
        return null;
      }
      return {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName,
      };
    }
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },
};
