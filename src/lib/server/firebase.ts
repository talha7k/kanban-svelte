import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { FIREBASE_SERVICE_ACCOUNT_KEY } from '$env/static/private';
import { building } from '$app/environment';

let app: ReturnType<typeof initializeApp> | undefined;
let db: ReturnType<typeof getFirestore> | undefined;
let auth: ReturnType<typeof getAuth> | undefined;

// Function to initialize Firebase Admin SDK
function initializeFirebase() {
  if (getApps().length > 0) {
    console.log('Using existing Firebase app');
    app = getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
    return;
  }

  try {
    console.log('Initializing Firebase Admin SDK...');
    
    if (!FIREBASE_SERVICE_ACCOUNT_KEY) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set');
    }

    console.log('Parsing service account key...');
    console.log('Service account key length:', FIREBASE_SERVICE_ACCOUNT_KEY?.length || 0);
    console.log('Service account key preview:', FIREBASE_SERVICE_ACCOUNT_KEY?.substring(0, 100) + '...');
    
    const serviceAccountRaw = JSON.parse(FIREBASE_SERVICE_ACCOUNT_KEY);
    console.log('Raw parsed service account keys:', Object.keys(serviceAccountRaw));
    console.log('Raw project_id:', serviceAccountRaw.project_id);
    
    // Convert project_id to projectId if needed for Firebase Admin SDK
    if (serviceAccountRaw.project_id && !serviceAccountRaw.projectId) {
      serviceAccountRaw.projectId = serviceAccountRaw.project_id;
    }
    
    const serviceAccount = serviceAccountRaw as ServiceAccount;
    console.log('Final service account projectId:', serviceAccount.projectId);
    
    if (!serviceAccount.projectId) {
      throw new Error('Invalid service account: missing projectId');
    }

    console.log('Creating Firebase app with project:', serviceAccount.projectId);
    app = initializeApp({
      credential: cert(serviceAccount)
    });
    
    db = getFirestore(app);
    auth = getAuth(app);
    
    console.log('Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
}

// Initialize Firebase Admin SDK for server-side usage
// Skip initialization during build time
if (!building) {
  initializeFirebase();
} else {
  console.log('Skipping Firebase initialization during build');
}

// Getter functions to ensure Firebase is initialized when accessed
function getFirebaseApp() {
  if (!app && !building) {
    initializeFirebase();
  }
  return app;
}

function getFirebaseDb() {
  if (!db && !building) {
    initializeFirebase();
  }
  if (!db) {
    throw new Error('Firebase Firestore not initialized');
  }
  return db;
}

function getFirebaseAuth() {
  if (!auth && !building) {
    initializeFirebase();
  }
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }
  return auth;
}


export { getFirebaseApp as app, getFirebaseDb as db, getFirebaseAuth as auth };