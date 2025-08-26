import { readFileSync } from 'fs';
import { config } from 'dotenv';
import admin from 'firebase-admin';

// Load .env file
config({ path: '.env' });

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY is empty');
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(serviceAccountKey);
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
  
  const db = admin.firestore();
  const projectId = 'dafc439c-a791-428e-b88e-e19dc46b2cf1';
  
  console.log('Checking if project exists:', projectId);
  
  const projectRef = db.collection('projects').doc(projectId);
  const projectDoc = await projectRef.get();
  
  console.log('Project exists:', projectDoc.exists);
  
  if (projectDoc.exists) {
    console.log('Project data:', JSON.stringify(projectDoc.data(), null, 2));
  } else {
    console.log('Project does not exist in database');
  }
  
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}