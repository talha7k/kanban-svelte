import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
const app = initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore(app);

async function listProjects() {
  try {
    const projectsRef = db.collection('projects');
    const snapshot = await projectsRef.get();
    
    if (snapshot.empty) {
      console.log('No projects found in the database.');
      return;
    }
    
    console.log('Projects in database:');
    snapshot.forEach(doc => {
      console.log(`- ${doc.id}: ${JSON.stringify(doc.data(), null, 2)}`);
    });
  } catch (error) {
    console.error('Error listing projects:', error);
  }
}

listProjects();