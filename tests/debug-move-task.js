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
  const taskId = 'aa4ca395-0f7c-4b21-a3df-039c40dfc4ea';
  
  console.log('Testing moveTaskInProjectServer logic:');
  console.log('Project ID:', projectId);
  console.log('Task ID:', taskId);
  
  // Test the exact same query logic as moveTaskInProjectServer
  const projectRef = db.collection('projects').doc(projectId);
  const projectDoc = await projectRef.get();
  
  console.log('Project exists:', projectDoc.exists);
  
  if (!projectDoc.exists) {
    console.log('ERROR: Project not found - this matches the API error');
    process.exit(1);
  }
  
  const project = projectDoc.data();
  console.log('Project data keys:', Object.keys(project || {}));
  
  // Check if the task exists in the project
  const tasks = project?.tasks || [];
  const task = tasks.find(t => t.id === taskId);
  
  console.log('Task found:', !!task);
  if (task) {
    console.log('Task details:', {
      title: task.title,
      columnId: task.columnId,
      order: task.order
    });
  }
  
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}