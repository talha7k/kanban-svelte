import { initializeApp, cert, getApps, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { FIREBASE_SERVICE_ACCOUNT_KEY } from '$env/static/private';

let app: ReturnType<typeof initializeApp> | undefined;
let db: ReturnType<typeof getFirestore> | undefined;
let auth: ReturnType<typeof getAuth> | undefined;

// Initialize Firebase Admin SDK for server-side usage
if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_KEY) as ServiceAccount;
    
    app = initializeApp({
      credential: cert(serviceAccount)
    });
    
    db = getFirestore(app);
    auth = getAuth(app);
    
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error;
  }
} else {
  app = getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
}

export { app, db, auth };