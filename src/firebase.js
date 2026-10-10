import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredConfig = ['apiKey', 'authDomain', 'projectId', 'appId'];
const missingConfig = requiredConfig.filter((key) => !config[key]);
if (missingConfig.length) {
  throw new Error(`Firebase is not configured. Missing VITE_FIREBASE_${missingConfig.map((key) => key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()).join(', VITE_FIREBASE_')}.`);
}

export const firebaseApp = getApps().length ? getApp() : initializeApp(config);
export const firebaseAuth = getAuth(firebaseApp);
export const authPersistenceReady = setPersistence(firebaseAuth, browserLocalPersistence);

export const firebaseAnalytics = typeof window !== 'undefined'
  ? isSupported().then((supported) => (supported ? getAnalytics(firebaseApp) : null)).catch(() => null)
  : Promise.resolve(null);
