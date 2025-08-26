import { readFileSync } from 'fs';
import { config } from 'dotenv';
import admin from 'firebase-admin';

// Load .env file
config({ path: '.env' });

// Test both approaches: process.env vs $env/static/private
console.log('=== Testing Firebase Initialization ===');

// Method 1: Direct from process.env (what test scripts use)
console.log('1. Using process.env.FIREBASE_SERVICE_ACCOUNT_KEY:');
const serviceAccountKey1 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (serviceAccountKey1) {
  try {
    const serviceAccount = JSON.parse(serviceAccountKey1);
    console.log('   Project ID from process.env:', serviceAccount.project_id);
    console.log('   Client email from process.env:', serviceAccount.client_email);
  } catch (e) {
    console.log('   Error parsing from process.env:', e.message);
  }
} else {
  console.log('   FIREBASE_SERVICE_ACCOUNT_KEY not found in process.env');
}

// Method 2: Direct file read (simulating $env/static/private)
console.log('\n2. Reading from .env file directly:');
try {
  const envContent = readFileSync('.env', 'utf8');
  const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.+)/);
  if (match) {
    const serviceAccountKey2 = match[1];
    try {
      const serviceAccount = JSON.parse(serviceAccountKey2);
      console.log('   Project ID from .env file:', serviceAccount.project_id);
      console.log('   Client email from .env file:', serviceAccount.client_email);
    } catch (e) {
      console.log('   Error parsing from .env file:', e.message);
    }
  } else {
    console.log('   FIREBASE_SERVICE_ACCOUNT_KEY not found in .env file');
  }
} catch (e) {
  console.log('   Error reading .env file:', e.message);
}

// Test actual Firebase initialization
console.log('\n3. Testing Firebase initialization...');
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('   Firebase initialized successfully');
    
    const db = admin.firestore();
    console.log('   Database instance created');
    
    // Test actual query
    const projectId = 'dafc439c-a791-428e-b88e-e19dc46b2cf1';
    console.log('   Testing query for project:', projectId);
    
    const projectRef = db.collection('projects').doc(projectId);
    projectRef.get().then(doc => {
      console.log('   Project exists:', doc.exists);
      if (doc.exists) {
        console.log('   Project data keys:', Object.keys(doc.data() || {}));
      }
    }).catch(err => {
      console.log('   Query error:', err.message);
    });
    
  } catch (e) {
    console.log('   Firebase initialization error:', e.message);
  }
} else {
  console.log('   Firebase already initialized');
}