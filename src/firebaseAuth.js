import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { firebaseAuth } from './firebase';

export const createAccount = (email, password) =>
  createUserWithEmailAndPassword(firebaseAuth, email, password);

export const signIn = (email, password) =>
  signInWithEmailAndPassword(firebaseAuth, email, password);

export function getFirebaseAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not initialized for this project. In Firebase Console, open Authentication and click Get started.';
    case 'auth/api-key-not-valid':
    case 'auth/invalid-api-key':
      return 'Firebase rejected this web API key. Check the Firebase web app configuration in .env.local.';
    case 'auth/email-already-in-use':
      return 'An account already exists for this email. Sign in instead.';
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Email or password is incorrect.';
    case 'auth/weak-password':
      return 'Choose a stronger password (at least 6 characters).';
    case 'auth/invalid-email':
      return 'Enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email and password sign-in is disabled. Enable it in Firebase Console under Authentication → Sign-in method.';
    default:
      return error?.message || 'Firebase authentication failed. Please try again.';
  }
}
