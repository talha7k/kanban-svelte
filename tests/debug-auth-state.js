import { config } from 'dotenv';
import admin from 'firebase-admin';

// Load .env file
config({ path: '.env' });

console.log('=== Debugging Authentication State ===');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✓ Firebase Admin initialized successfully');
  } catch (e) {
    console.log('✗ Firebase Admin initialization error:', e.message);
    process.exit(1);
  }
}

const auth = admin.auth();
const db = admin.firestore();

// List all users to see what users exist
console.log('\n1. Checking existing users...');
try {
  const listUsersResult = await auth.listUsers(10);
  console.log(`Found ${listUsersResult.users.length} users:`);
  
  listUsersResult.users.forEach((userRecord, index) => {
    console.log(`   ${index + 1}. UID: ${userRecord.uid}`);
    console.log(`      Email: ${userRecord.email}`);
    console.log(`      Display Name: ${userRecord.displayName || 'N/A'}`);
    console.log(`      Created: ${userRecord.metadata.creationTime}`);
    console.log(`      Last Sign In: ${userRecord.metadata.lastSignInTime || 'Never'}`);
    console.log('');
  });
} catch (error) {
  console.log('   Error listing users:', error.message);
}

// Check user profiles in Firestore
console.log('2. Checking user profiles in Firestore...');
try {
  const usersSnapshot = await db.collection('users').get();
  console.log(`Found ${usersSnapshot.size} user profiles:`);
  
  usersSnapshot.forEach((doc) => {
    const userData = doc.data();
    console.log(`   Profile ID: ${doc.id}`);
    console.log(`   Name: ${userData.name}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Created: ${userData.createdAt}`);
    console.log('');
  });
} catch (error) {
  console.log('   Error fetching user profiles:', error.message);
}

// Check existing projects and their owners
console.log('3. Checking existing projects and owners...');
try {
  const projectsSnapshot = await db.collection('projects').get();
  console.log(`Found ${projectsSnapshot.size} projects:`);
  
  projectsSnapshot.forEach((doc) => {
    const projectData = doc.data();
    console.log(`   Project ID: ${doc.id}`);
    console.log(`   Name: ${projectData.name}`);
    console.log(`   Owner ID: ${projectData.ownerId}`);
    console.log(`   Team ID: ${projectData.teamId || 'No team'}`);
    console.log(`   Members: ${projectData.memberIds?.length || 0}`);
    console.log('');
  });
} catch (error) {
  console.log('   Error fetching projects:', error.message);
}

console.log('=== Debug Complete ===');
process.exit(0);