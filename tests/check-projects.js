import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length > 0) {
    envVars[key.trim()] = value.join('=').trim();
  }
});

const serviceAccount = JSON.parse(envVars.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

if (Object.keys(serviceAccount).length === 0) {
  console.log('FIREBASE_SERVICE_ACCOUNT_KEY is empty');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

db.collection('projects').get().then(snapshot => {
  console.log('Projects in database:');
  snapshot.forEach(doc => {
    console.log('ID:', doc.id);
    console.log('Data:', JSON.stringify(doc.data(), null, 2));
    console.log('---');
  });
}).catch(error => {
  console.error('Error fetching projects:', error);
});