import * as admin from 'firebase-admin';
// שימי לב לנתיב של הקובץ - וודאי שהוא אכן נמצא שם
const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export const db = admin.firestore();
export const auth = admin.auth();
export { admin };