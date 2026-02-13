import { db, admin } from '../config/firebase-config';

const INITIAL_FREE_CREDITS = 3;

/**
 * Get or create a user profile document.
 *
 * This is the SINGLE source of truth for user document creation.
 * New users receive exactly 3 free credits.
 * No other part of the codebase (frontend or backend) should
 * create user documents.
 */
export const getOrCreateUserProfile = async (uid: string, email?: string) => {
  const userRef = db.collection('users').doc(uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    const newUserProfile = {
      uid,
      email: email || '',
      credits: INITIAL_FREE_CREDITS,
      isSubscribed: false,
      role: 'user',
      lastRefresh: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: admin.firestore.FieldValue.serverTimestamp(),
    };

    await userRef.set(newUserProfile);
    console.log(`New user profile created for UID: ${uid} (${INITIAL_FREE_CREDITS} free credits)`);
    return newUserProfile;
  }

  // Existing user — update last login timestamp.
  // Also sync the email if it was missing or has changed (e.g. a new
  // provider was linked to the same Firebase account).
  const existingData = doc.data()!;
  const updates: Record<string, any> = {
    lastLogin: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (email && email !== existingData.email) {
    updates.email = email;
  }

  await userRef.update(updates);

  return { ...existingData, ...updates };
};
