console.log('FIREBASE_SERVICE_ACCOUNT_KEY exists:', !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
console.log('Key length:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY ? process.env.FIREBASE_SERVICE_ACCOUNT_KEY.length : 0);
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.log('First 100 chars:', process.env.FIREBASE_SERVICE_ACCOUNT_KEY.substring(0, 100));
}