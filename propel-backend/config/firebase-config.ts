import * as admin from 'firebase-admin';

/**
 * Firebase Admin SDK initialization.
 *
 * In production (Render), the service account JSON is stored in
 * the FIREBASE_SERVICE_ACCOUNT environment variable.
 * Locally, it falls back to reading the serviceAccountKey.json file.
 */
function getServiceAccount(): admin.ServiceAccount {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) as admin.ServiceAccount;
  }

  // Local development fallback
  try {
    return require('../serviceAccountKey.json');
  } catch {
    throw new Error(
      'Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT env var or place serviceAccountKey.json in the project root.',
    );
  }
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(getServiceAccount()),
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
export { admin };
