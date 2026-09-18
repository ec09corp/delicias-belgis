import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import { ConfiguracionNegocio } from '../types';
import { INITIAL_CONFIGURACION } from './initialData';

const LOCAL_STORAGE_KEY = 'delicias_belgi_configuracion';

function getLocalConfig(): ConfiguracionNegocio {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
  return INITIAL_CONFIGURACION;
}

function saveLocalConfig(config: ConfiguracionNegocio) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new Event('delicias_config_changed'));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

export const configuracionService = {
  subscribeToConfig(callback: (config: ConfiguracionNegocio) => void): () => void {
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, 'configuracion', 'negocio');
        return onSnapshot(
          docRef,
          (docSnap) => {
            if (docSnap.exists()) {
              callback(docSnap.data() as ConfiguracionNegocio);
            } else {
              callback(INITIAL_CONFIGURACION);
            }
          },
          (error) => {
            console.warn('Firestore snapshot error on configuracion/negocio, using fallback:', error);
            callback(getLocalConfig());
          }
        );
      } catch (err) {
        console.warn('Error setting up onSnapshot for configuracion:', err);
      }
    }
    callback(getLocalConfig());
    const handler = () => callback(getLocalConfig());
    window.addEventListener('delicias_config_changed', handler);
    return () => window.removeEventListener('delicias_config_changed', handler);
  },

  async getConfiguracion(): Promise<ConfiguracionNegocio> {
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, 'configuracion', 'negocio');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          return snap.data() as ConfiguracionNegocio;
        } else {
          await setDoc(docRef, INITIAL_CONFIGURACION);
          return INITIAL_CONFIGURACION;
        }
      } catch (error) {
        console.warn('Error fetching configuracion from Firebase, using fallback:', error);
      }
    }
    return getLocalConfig();
  },

  async updateConfiguracion(data: Partial<ConfiguracionNegocio>): Promise<ConfiguracionNegocio> {
    const current = await this.getConfiguracion();
    const updated: ConfiguracionNegocio = {
      ...current,
      ...data,
      actualizadoEn: new Date().toISOString(),
    };
    if (isFirebaseConfigured() && db) {
      try {
        const docRef = doc(db, 'configuracion', 'negocio');
        await setDoc(docRef, updated, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'configuracion/negocio');
      }
    }
    saveLocalConfig(updated);
    return updated;
  },

  async actualizarConfig(data: Partial<ConfiguracionNegocio>): Promise<ConfiguracionNegocio> {
    return this.updateConfiguracion(data);
  },

  async updateConfig(data: Partial<ConfiguracionNegocio>): Promise<ConfiguracionNegocio> {
    return this.updateConfiguracion(data);
  },

  subscribeConfig(callback: (config: ConfiguracionNegocio) => void): () => void {
    return this.subscribeToConfig(callback);
  },

  subscribeToConfiguracion(callback: (config: ConfiguracionNegocio) => void): () => void {
    return this.subscribeToConfig(callback);
  },
};
