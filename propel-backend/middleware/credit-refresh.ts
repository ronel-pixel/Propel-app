import { Request, Response, NextFunction } from 'express';
import { db, admin, auth } from '../config/firebase-config';

/**
 * Credit Refresh Middleware
 *
 * Runs on every /api request. Optionally extracts the user from the
 * Authorization header (non-blocking — does not reject unauthenticated
 * requests, that's validateToken's job on each route).
 *
 * Monthly refresh logic:
 *   - Active subscribers: credits = 20 + extraCredits, then reset extraCredits.
 *   - cancelAtPeriodEnd=true: subscription ends. isSubscribed → false, credits → 0.
 *   - paymentFailed=true: same downgrade as cancel.
 *
 * This ensures credit writes are exclusively handled by the Admin SDK.
 */
export const refreshCreditsIfNeeded = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    // Attempt to extract UID from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) return next();

    let uid: string;
    try {
      const decoded = await auth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      // Token invalid or expired — skip silently (validateToken will handle rejection)
      return next();
    }

    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();

    // No user document yet — nothing to refresh
    if (!snap.exists) return next();

    const data = snap.data()!;

    // Only paying subscribers get a monthly refresh
    if (!data.isSubscribed) return next();

    // Compare lastRefresh month/year with current date
    const lastRefresh: Date = data.lastRefresh?.toDate?.() ?? new Date(0);
    const now = new Date();

    const isNewMonth =
      now.getMonth() !== lastRefresh.getMonth() ||
      now.getFullYear() !== lastRefresh.getFullYear();

    if (!isNewMonth) return next();

    /* ── New month boundary reached ── */

    const shouldDowngrade = data.cancelAtPeriodEnd === true || data.paymentFailed === true;

    if (shouldDowngrade) {
      /*
       * DOWNGRADE: Subscription was cancelled or payment failed.
       * Grace period is over — set isSubscribed=false, credits=0.
       */
      await userRef.update({
        isSubscribed: false,
        cancelAtPeriodEnd: false,
        paymentFailed: false,
        credits: 0,
        extraCredits: 0,
        lastRefresh: admin.firestore.FieldValue.serverTimestamp(),
      });

      const reason = data.cancelAtPeriodEnd ? 'user cancellation' : 'payment failure';
      console.log(`[CreditRefresh] Subscriber ${uid} DOWNGRADED (${reason}): credits → 0`);
    } else {
      /*
       * REFRESH: Active subscriber in good standing.
       * Credits = 20 base + any purchased extraCredits.
       */
      const extra = data.extraCredits || 0;
      const newCredits = 20 + extra;

      await userRef.update({
        credits: newCredits,
        extraCredits: 0,
        lastRefresh: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `[CreditRefresh] Subscriber ${uid} refreshed: 20 base + ${extra} extra = ${newCredits} credits`,
      );
    }
  } catch (err) {
    // Non-blocking — log and continue so the request isn't interrupted
    console.error('Credit refresh middleware error:', err);
  }

  next();
};
