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
    const routeInfo = `${req.method} ${req.originalUrl || req.url}`;
    // Attempt to extract UID from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log(`[CreditRefresh] Skip (${routeInfo}): no bearer token present`);
      return next();
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      console.log(`[CreditRefresh] Skip (${routeInfo}): bearer token empty`);
      return next();
    }

    let uid: string;
    try {
      const decoded = await auth.verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      // Token invalid or expired — skip silently (validateToken will handle rejection)
      console.warn(`[CreditRefresh] Skip (${routeInfo}): token verification failed`);
      return next();
    }

    const parseDateLike = (value: unknown): Date | null => {
      if (!value) return null;
      if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
      if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
      }
      if (typeof value === 'object' && value !== null) {
        const withToDate = value as { toDate?: () => Date };
        if (typeof withToDate.toDate === 'function') {
          const parsed = withToDate.toDate();
          return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
      }
      return null;
    };

    const firstDayOfNextMonth = (baseDate: Date) =>
      new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);

    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();

    // No user document yet — nothing to refresh
    if (!snap.exists) {
      console.log(`[CreditRefresh] Skip (${routeInfo}): user doc missing for ${uid}`);
      return next();
    }

    const data = snap.data()!;

    // Only paying subscribers get a monthly refresh
    if (!data.isSubscribed) {
      console.log(`[CreditRefresh] Skip (${routeInfo}): user ${uid} is not subscribed`);
      return next();
    }

    // Compare last refresh with current date and optionally honor explicit nextRefreshDate.
    const lastRefresh = parseDateLike(data.lastRefresh) ?? new Date(0);
    const explicitNextRefresh =
      parseDateLike(data.nextRefreshDate)
      ?? parseDateLike(data.nextrefreshdate)
      ?? parseDateLike(data.next_refresh_date);
    const dueDateFromLastRefresh = firstDayOfNextMonth(lastRefresh);
    const now = new Date();

    // If an explicit next refresh date exists, trust it. Otherwise fallback to month rollover.
    const isDueForCycle = explicitNextRefresh
      ? now >= explicitNextRefresh
      : (now.getMonth() !== lastRefresh.getMonth() || now.getFullYear() !== lastRefresh.getFullYear());

    console.log(
      `[CreditRefresh] Checking user=${uid} route="${routeInfo}" `
      + `isSubscribed=${data.isSubscribed} cancelAtPeriodEnd=${data.cancelAtPeriodEnd === true} `
      + `paymentFailed=${data.paymentFailed === true} lastRefresh=${lastRefresh.toISOString()} `
      + `explicitNextRefresh=${explicitNextRefresh ? explicitNextRefresh.toISOString() : 'null'} `
      + `dueByLastRefresh=${dueDateFromLastRefresh.toISOString()} isDueForCycle=${isDueForCycle}`,
    );

    if (!isDueForCycle) {
      console.log(`[CreditRefresh] Skip (${routeInfo}): user ${uid} not yet due for billing-cycle update`);
      return next();
    }

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
        nextRefreshDate: null,
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
      const nextRefreshDate = firstDayOfNextMonth(now);

      await userRef.update({
        credits: newCredits,
        extraCredits: 0,
        lastRefresh: admin.firestore.FieldValue.serverTimestamp(),
        nextRefreshDate: admin.firestore.Timestamp.fromDate(nextRefreshDate),
      });

      console.log(
        `[CreditRefresh] Subscriber ${uid} refreshed: 20 base + ${extra} extra = ${newCredits} credits `
        + `(next refresh ${nextRefreshDate.toISOString()})`,
      );
    }
  } catch (err) {
    // Non-blocking — log and continue so the request isn't interrupted
    console.error('Credit refresh middleware error:', err);
  }

  next();
};
