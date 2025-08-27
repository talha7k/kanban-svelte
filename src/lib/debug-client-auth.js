// Debug script to check client-side authentication state
import { auth } from '$lib/firebase';
import { currentUser, userProfile } from '$lib/stores/auth';
import { get } from 'svelte/store';

export function debugClientAuth() {
  console.log('=== Client Authentication Debug ===');
  
  // Check Firebase auth current user
  const firebaseUser = auth?.currentUser;
  console.log('Firebase Auth Current User:', firebaseUser);
  
  if (firebaseUser) {
    console.log('  UID:', firebaseUser.uid);
    console.log('  Email:', firebaseUser.email);
    console.log('  Display Name:', firebaseUser.displayName);
    console.log('  Email Verified:', firebaseUser.emailVerified);
  }
  
  // Check Svelte stores
  const storeUser = get(currentUser);
  const storeProfile = get(userProfile);
  
  console.log('Svelte Store Current User:', storeUser);
  console.log('Svelte Store User Profile:', storeProfile);
  
  // Check localStorage
  const localStorageAuth = localStorage.getItem('firebase:authUser:AIzaSyDvYQVQVQVQVQVQVQVQVQVQVQVQVQVQVQ:[DEFAULT]');
  console.log('LocalStorage Auth:', localStorageAuth ? 'Present' : 'Not found');
  
  return {
    firebaseUser,
    storeUser,
    storeProfile,
    hasLocalStorage: !!localStorageAuth
  };
}