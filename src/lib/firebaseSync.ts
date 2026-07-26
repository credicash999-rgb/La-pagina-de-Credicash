/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  writeBatch, 
  deleteDoc,
  getDoc,
  onSnapshot,
  Firestore
} from 'firebase/firestore';
import { 
  Cliente, Operacion, Cuota, Pago, TransaccionTesoreria, Configuracion, Feriado,
  UsuarioRol, PermisosRol, ComisionCobrador, VisitaDomicilio 
} from '../types';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const STORAGE_KEYS = {
  FIREBASE_CONFIG: 'credicash_firebase_config',
  FIREBASE_ENABLED: 'credicash_firebase_enabled',
  GOOGLE_SHEET_URL: 'credicash_google_sheet_url',
  AUTO_SYNC_ENABLED: 'credicash_auto_sync_enabled',
};

// Retrieve configuration from URL search params, local storage, or environment variables
export function getSavedFirebaseConfig(): FirebaseConfig | null {
  // 1. Try URL parameters for 1-click device configuration sharing
  if (typeof window !== 'undefined') {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const rawParam = urlParams.get('fb_config') || urlParams.get('fb');
      if (rawParam) {
        let decodedStr = rawParam;
        try {
          decodedStr = atob(rawParam);
        } catch (e) {
          // Not Base64, keep raw
        }
        const parsed = JSON.parse(decodedStr);
        if (parsed && parsed.apiKey && parsed.projectId) {
          localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(parsed));
          localStorage.setItem(STORAGE_KEYS.FIREBASE_ENABLED, 'true');
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading URL Firebase config:', e);
    }
  }

  // 2. Try localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error parsing saved Firebase config:', e);
  }

  // 3. Fallback to Vite environment variables if defined
  const metaEnv = (import.meta as any).env || {};
  const envConfig = {
    apiKey: metaEnv.VITE_FIREBASE_API_KEY || '',
    authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: metaEnv.VITE_FIREBOARD_STORAGE_BUCKET || metaEnv.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: metaEnv.VITE_FIREBASE_APP_ID || '',
  };

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }

  return null;
}

export function saveFirebaseConfig(config: FirebaseConfig | null) {
  if (config) {
    localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(config));
    localStorage.setItem(STORAGE_KEYS.FIREBASE_ENABLED, 'true');
  } else {
    localStorage.removeItem(STORAGE_KEYS.FIREBASE_CONFIG);
  }
}

export function isFirebaseEnabled(): boolean {
  const explicit = localStorage.getItem(STORAGE_KEYS.FIREBASE_ENABLED);
  if (explicit === 'false') return false;
  const config = getSavedFirebaseConfig();
  return Boolean(config && config.apiKey && config.projectId);
}

export function setFirebaseEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEYS.FIREBASE_ENABLED, String(enabled));
}

export function generateShareableFirebaseLink(): string {
  if (typeof window === 'undefined') return '';
  const config = getSavedFirebaseConfig();
  if (!config) return window.location.origin + window.location.pathname;
  try {
    const jsonStr = JSON.stringify(config);
    const base64 = btoa(jsonStr);
    return `${window.location.origin}${window.location.pathname}?fb=${encodeURIComponent(base64)}`;
  } catch (e) {
    return window.location.origin + window.location.pathname;
  }
}

export function isAutoSyncEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEYS.AUTO_SYNC_ENABLED) !== 'false'; // Default true if configured
}

export function setAutoSyncEnabled(enabled: boolean) {
  localStorage.setItem(STORAGE_KEYS.AUTO_SYNC_ENABLED, String(enabled));
}

export function getGoogleSheetUrl(): string {
  return localStorage.getItem(STORAGE_KEYS.GOOGLE_SHEET_URL) || '';
}

export function saveGoogleSheetUrl(url: string) {
  localStorage.setItem(STORAGE_KEYS.GOOGLE_SHEET_URL, url);
}

// Global Firebase state references
let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

export function initializeFirebase(): { app: FirebaseApp; db: Firestore } | null {
  const config = getSavedFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }

  try {
    if (getApps().length > 0) {
      firebaseApp = getApp();
    } else {
      firebaseApp = initializeApp(config);
    }
    firestoreDb = getFirestore(firebaseApp);
    return { app: firebaseApp, db: firestoreDb };
  } catch (error) {
    console.error('Failed to initialize Firebase app:', error);
    return null;
  }
}

// Get Firestore database instance, initializing if necessary
export function getDb(): Firestore | null {
  if (firestoreDb) return firestoreDb;
  const init = initializeFirebase();
  return init ? init.db : null;
}

/**
 * Uploads a single document to a specific collection in Firestore
 */
export async function uploadDocToFirestore(collectionName: string, id: string, data: any): Promise<boolean> {
  const db = getDb();
  if (!db || !isFirebaseEnabled()) return false;

  try {
    const docRef = doc(db, collectionName, id);
    await setDoc(docRef, {
      ...data,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error(`Error uploading document to ${collectionName}:`, error);
    return false;
  }
}

/**
 * Deletes a single document from a collection in Firestore
 */
export async function deleteDocFromFirestore(collectionName: string, id: string): Promise<boolean> {
  const db = getDb();
  if (!db || !isFirebaseEnabled()) return false;

  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
    return false;
  }
}

/**
 * Uploads all local system data to Firestore in grouped transactions
 */
export async function uploadAllToFirestore(payload: {
  clientes: Cliente[];
  operaciones: Operacion[];
  cuotas: Cuota[];
  pagos: Pago[];
  transacciones: TransaccionTesoreria[];
  configuracion: Configuracion;
  feriados: Feriado[];
  usuarios?: UsuarioRol[];
  roles?: PermisosRol[];
  comisiones?: ComisionCobrador[];
  visitasHistory?: VisitaDomicilio[];
}): Promise<{ success: boolean; error?: string }> {
  const db = getDb();
  if (!db) {
    return { success: false, error: 'Firebase no está configurado o no se pudo inicializar.' };
  }

  try {
    // Helper function to upload array in chunks of 400
    const uploadCollection = async <T extends { id: string }>(name: string, items: T[]) => {
      if (!items || items.length === 0) return;
      let chunk: T[] = [];
      for (let i = 0; i < items.length; i++) {
        chunk.push(items[i]);
        if (chunk.length === 400 || i === items.length - 1) {
          const batch = writeBatch(db);
          for (const item of chunk) {
            const docRef = doc(db, name, item.id);
            batch.set(docRef, {
              ...item,
              lastUpdated: new Date().toISOString()
            });
          }
          await batch.commit();
          chunk = [];
        }
      }
    };

    // 1. Clientes
    await uploadCollection('clientes', payload.clientes);

    // 2. Operaciones
    await uploadCollection('operaciones', payload.operaciones);

    // 3. Cuotas
    await uploadCollection('cuotas', payload.cuotas);

    // 4. Pagos
    await uploadCollection('pagos', payload.pagos);

    // 5. Transacciones de Tesorería
    await uploadCollection('transacciones', payload.transacciones);

    // 6. Feriados
    const feriadosWithId = payload.feriados.map(f => ({ ...f, id: f.fecha }));
    await uploadCollection('feriados', feriadosWithId);

    // 7. Optional Collections
    if (payload.usuarios && payload.usuarios.length > 0) {
      await uploadCollection('usuarios', payload.usuarios);
    }
    if (payload.roles && payload.roles.length > 0) {
      await uploadCollection('roles', payload.roles);
    }
    if (payload.comisiones && payload.comisiones.length > 0) {
      await uploadCollection('comisiones', payload.comisiones);
    }
    if (payload.visitasHistory && payload.visitasHistory.length > 0) {
      await uploadCollection('visitas', payload.visitasHistory);
    }

    // 8. Configuración
    const configRef = doc(db, 'system_config', 'global');
    await setDoc(configRef, {
      ...payload.configuracion,
      id: 'global',
      lastUpdated: new Date().toISOString()
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error during full upload to Firestore:', error);
    return { success: false, error: error.message || 'Error desconocido al subir los datos.' };
  }
}

/**
 * Downloads all data from Firestore to replace local data
 */
export async function downloadAllFromFirestore(): Promise<{
  success: boolean;
  data?: {
    clientes: Cliente[];
    operaciones: Operacion[];
    cuotas: Cuota[];
    pagos: Pago[];
    transacciones: TransaccionTesoreria[];
    configuracion?: Configuracion;
    feriados: Feriado[];
    usuarios?: UsuarioRol[];
    roles?: PermisosRol[];
    comisiones?: ComisionCobrador[];
    visitasHistory?: VisitaDomicilio[];
  };
  error?: string;
}> {
  const db = getDb();
  if (!db) {
    return { success: false, error: 'Firebase no está configurado o no se pudo inicializar.' };
  }

  try {
    const fetchCollection = async (name: string): Promise<any[]> => {
      try {
        const querySnapshot = await getDocs(collection(db, name));
        const items: any[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          delete data.lastUpdated;
          items.push(data);
        });
        return items;
      } catch (err) {
        console.warn(`Could not fetch collection ${name}:`, err);
        return [];
      }
    };

    const clientes = await fetchCollection('clientes');
    const operaciones = await fetchCollection('operaciones');
    const cuotas = await fetchCollection('cuotas');
    const pagos = await fetchCollection('pagos');
    const transacciones = await fetchCollection('transacciones');
    const feriadosRaw = await fetchCollection('feriados');
    const usuarios = await fetchCollection('usuarios');
    const roles = await fetchCollection('roles');
    const comisiones = await fetchCollection('comisiones');
    const visitasHistory = await fetchCollection('visitas');

    const feriados = feriadosRaw.map(f => ({
      fecha: f.fecha,
      descripcion: f.descripcion,
      seCobra: f.seCobra ?? false
    }));

    // Fetch config
    let configuracion: Configuracion | undefined = undefined;
    try {
      const configDoc = await getDoc(doc(db, 'system_config', 'global'));
      if (configDoc.exists()) {
        const configData = configDoc.data();
        delete configData.id;
        delete configData.lastUpdated;
        configuracion = configData as Configuracion;
      }
    } catch (e) {
      console.warn('Could not fetch global config from Firestore', e);
    }

    return {
      success: true,
      data: {
        clientes,
        operaciones,
        cuotas,
        pagos,
        transacciones,
        configuracion,
        feriados,
        usuarios: usuarios.length > 0 ? usuarios : undefined,
        roles: roles.length > 0 ? roles : undefined,
        comisiones: comisiones.length > 0 ? comisiones : undefined,
        visitasHistory: visitasHistory.length > 0 ? visitasHistory : undefined
      }
    };
  } catch (error: any) {
    console.error('Error during download from Firestore:', error);
    return { success: false, error: error.message || 'Error desconocido al descargar de la nube.' };
  }
}

/**
 * Triggers a Google Sheets webhook or Apps Script web app with the updated data.
 * This is incredibly reliable, fast, and secure for client-side React apps.
 */
export async function syncToGoogleSheet(action: 'add_cliente' | 'add_prestamo' | 'add_pago' | 'sync_all', payload: any): Promise<{ success: boolean; message?: string }> {
  const url = getGoogleSheetUrl();
  if (!url) {
    return { success: false, message: 'Google Sheets App Script URL no está configurada.' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      mode: 'no-cors', // Apps Script is often redirects and has CORS issues; no-cors allows fire-and-forget submission
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        timestamp: new Date().toISOString(),
        data: payload
      })
    });

    // With no-cors, we can't inspect the body, but the browser will send it successfully
    return { success: true, message: 'Información transmitida a Google Sheets con éxito.' };
  } catch (error: any) {
    console.error('Error syncing to Google Sheet:', error);
    return { success: false, message: error.message || 'Error de red al conectar con Google Sheets.' };
  }
}

/**
 * Attaches real-time listeners to Firestore collections to keep multi-device state in sync
 */
export function subscribeToFirestore(onDataChange: (data: any) => void): () => void {
  const db = getDb();
  if (!db || !isFirebaseEnabled()) return () => {};

  const collectionsToListen = ['clientes', 'operaciones', 'cuotas', 'pagos', 'transacciones', 'usuarios', 'comisiones'];
  const unsubscribes: (() => void)[] = [];

  collectionsToListen.forEach((colName) => {
    let collectionFirstLoad = true;
    try {
      const unsub = onSnapshot(collection(db, colName), (snapshot) => {
        // Skip triggering download on initial snapshot load for this specific collection
        if (collectionFirstLoad) {
          collectionFirstLoad = false;
          return;
        }
        // Only trigger download if there are actual document changes in snapshot
        if (snapshot.docChanges().length > 0) {
          downloadAllFromFirestore().then(res => {
            if (res.success && res.data) {
              onDataChange(res.data);
            }
          });
        }
      }, (err) => console.warn(`Snapshot listener notice on ${colName}:`, err));
      unsubscribes.push(unsub);
    } catch (err) {
      console.warn(`Failed to attach snapshot on ${colName}`, err);
    }
  });

  return () => {
    unsubscribes.forEach(u => u());
  };
}
