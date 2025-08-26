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
  
  // Test the exact same parameters as the API call
  const projectId = 'dafc439c-a791-428e-b88e-e19dc46b2cf1';
  const taskId = 'aa4ca395-0f7c-4b21-a3df-039c40dfc4ea';
  const newColumnId = 'col-dafc439c-a791-428e-b88e-e19dc46b2cf1-2';
  const newOrder = 0;
  const currentUserUid = 'test-user';
  
  console.log('Testing moveTaskInProjectServer with exact API parameters:');
  console.log('Project ID:', projectId);
  console.log('Task ID:', taskId);
  console.log('New Column ID:', newColumnId);
  console.log('New Order:', newOrder);
  console.log('Current User UID:', currentUserUid);
  
  // Test the exact same query logic as moveTaskInProjectServer
  const projectRef = db.collection('projects').doc(projectId);
  const projectDoc = await projectRef.get();
  
  console.log('Project exists:', projectDoc.exists);
  
  if (!projectDoc.exists) {
    console.log('ERROR: Project not found');
    process.exit(1);
  }
  
  const project = projectDoc.data();
  console.log('Project data keys:', Object.keys(project || {}));
  
  // Check if the task exists in the project
  const tasks = project?.tasks || [];
  const task = tasks.find(t => t.id === taskId);
  
  console.log('Task found:', !!task);
  if (task) {
    console.log('Current task details:', {
      title: task.title,
      columnId: task.columnId,
      order: task.order
    });
  }
  
  // Try to actually move the task
  console.log('\nAttempting to move task...');
  
  // Simulate the move logic
  const taskToMoveIndex = tasks.findIndex(t => t.id === taskId);
  if (taskToMoveIndex === -1) throw new Error('Task not found');

  const taskToMove = tasks[taskToMoveIndex];
  const oldColumnId = taskToMove.columnId;

  // Remove the task from its current position
  tasks.splice(taskToMoveIndex, 1);

  // Update the moved task's properties
  taskToMove.columnId = newColumnId;
  taskToMove.order = newOrder;
  taskToMove.updatedAt = new Date().toISOString();

  // Insert the task back into the array
  tasks.push(taskToMove);

  console.log('Task move simulation successful!');
  console.log('New task details:', {
    title: taskToMove.title,
    columnId: taskToMove.columnId,
    order: taskToMove.order
  });
  
} catch (error) {
  console.error('Error:', error ? error.message : "Error undefined.");
  console.error('Stack:', error?.stack);
  process.exit(1);
}