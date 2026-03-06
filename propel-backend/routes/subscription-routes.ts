import express, { Response } from 'express';
import { db, admin } from '../config/firebase-config';
import { validateToken, AuthRequest } from '../middleware/auth-middleware';

const router = express.Router();

const PLAN_CREDITS = 20;
const PLAN_PRICE = '5.00'; // Both subscription and refuel cost $5.00
const firstDayOfNextMonth = (baseDate = new Date()) =>
  new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);

/* ═══════════════════════════════════════════════
   PayPal Server-Side Verification
   Uses OAuth2 + Capture Order REST API
   ═══════════════════════════════════════════════ */

/**
 * PayPal base URL — switches between sandbox and live based on
 * the PAYPAL_MODE environment variable.
 * Set PAYPAL_MODE=live in production .env to use the real API.
 */
const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

/**
 * Fetch a short-lived OAuth2 access token from PayPal.
 */
async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in environment');
  }

  console.log('[PayPal] Requesting OAuth2 token...');
  console.log('[PayPal] Base URL:', PAYPAL_BASE);
  console.log('[PayPal] Client ID prefix:', clientId.substring(0, 12) + '...');

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[PayPal] OAuth2 failed:', response.status, text);
    throw new Error(`PayPal OAuth2 failed (${response.status}): ${text}`);
  }

  const data = await response.json() as { access_token: string };
  console.log('[PayPal] OAuth2 token obtained successfully');
  return data.access_token;
}

/**
 * Capture a PayPal order and return the full capture response.
 * This is the server-side verification step — we never trust the
 * frontend's claim that a payment succeeded.
 */
async function capturePayPalOrder(orderId: string): Promise<{
  status: string;
  amount: string;
  currencyCode: string;
}> {
  console.log('[PayPal] Attempting capture for Order ID:', orderId);
  console.log('[PayPal] Order ID type:', typeof orderId, '| length:', orderId?.length);

  if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') {
    throw new Error('Invalid or empty PayPal Order ID');
  }

  const accessToken = await getPayPalAccessToken();
  const captureUrl = `${PAYPAL_BASE}/v2/checkout/orders/${orderId.trim()}/capture`;
  console.log('[PayPal] Capture URL:', captureUrl);

  const response = await fetch(captureUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const responseText = await response.text();
  console.log('[PayPal] Capture response status:', response.status);
  console.log('[PayPal] Capture response body:', responseText);

  if (!response.ok) {
    throw new Error(`PayPal Capture failed (${response.status}): ${responseText}`);
  }

  const data = JSON.parse(responseText) as {
    status: string;
    purchase_units: {
      payments: {
        captures: {
          amount: { value: string; currency_code: string };
        }[];
      };
    }[];
  };

  // Extract the first capture's amount
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  const amount = capture?.amount?.value ?? '0';
  const currencyCode = capture?.amount?.currency_code ?? 'USD';

  console.log('[PayPal] Capture completed — status:', data.status, '| amount:', amount, currencyCode);

  return {
    status: data.status,
    amount,
    currencyCode,
  };
}

/* ═══════════════════════════════════════════════
   Routes
   ═══════════════════════════════════════════════ */

/**
 * POST /subscription/activate
 * Server-side verified payment flow:
 *   1. Capture the PayPal order (server-to-server).
 *   2. Validate the captured amount ($5.00 for both plans).
 *   3. Branch on isRefuel to update Firestore atomically.
 */
router.post('/activate', validateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.uid;
  const { paypalOrderId, isRefuel } = req.body;

  console.log('[Activate] Request received — userId:', userId, '| paypalOrderId:', paypalOrderId, '| isRefuel:', isRefuel);

  if (!paypalOrderId) {
    console.error('[Activate] Missing paypalOrderId in request body');
    return res.status(400).json({ error: 'Missing paypalOrderId' });
  }

  try {
    /* ── Step 1: Capture the order via PayPal REST API ── */
    const capture = await capturePayPalOrder(paypalOrderId);

    /* ── Step 2: Verify status ── */
    if (capture.status !== 'COMPLETED') {
      console.error(`[Activate] PayPal capture not completed. Status: ${capture.status}`);
      return res.status(400).json({ error: `Payment not completed. Status: ${capture.status}` });
    }

    /* ── Step 3: Validate amount — both plans are $5.00 ── */
    if (capture.amount !== PLAN_PRICE) {
      console.error(
        `[Activate] Amount mismatch — expected ${PLAN_PRICE}, received ${capture.amount}`,
      );
      return res.status(400).json({
        error: `Amount verification failed. Expected $${PLAN_PRICE}, received $${capture.amount}`,
      });
    }

    /* ── Step 4: Update Firestore atomically ── */
    const userRef = db.collection('users').doc(userId as string);

    if (isRefuel) {
      /**
       * REFUEL ($5.00)
       * - Increment current credits by 20 (immediate use).
       * - Increment extraCredits by 20 (carry-over into next monthly refresh).
       */
      await userRef.update({
        credits: admin.firestore.FieldValue.increment(PLAN_CREDITS),
        extraCredits: admin.firestore.FieldValue.increment(PLAN_CREDITS),
        lastRefuel: admin.firestore.FieldValue.serverTimestamp(),
        lastPaypalOrderId: paypalOrderId,
      });

      console.log(`[Activate] Refuel complete for ${userId}: +${PLAN_CREDITS} credits & extraCredits`);

      return res.status(200).json({
        message: 'Credits refueled successfully',
        addedCredits: PLAN_CREDITS,
      });
    } else {
      /**
       * NEW SUBSCRIPTION ($5.00/month)
       * Uses increment(20) so existing credits STACK with the plan.
       * e.g. 2 free credits left → 22 after subscribing.
       */
      await userRef.update({
        isSubscribed: true,
        credits: admin.firestore.FieldValue.increment(PLAN_CREDITS),
        extraCredits: 0,
        lastPayment: admin.firestore.FieldValue.serverTimestamp(),
        lastRefresh: admin.firestore.FieldValue.serverTimestamp(),
        nextRefreshDate: admin.firestore.Timestamp.fromDate(firstDayOfNextMonth()),
        paypalOrderId,
      });

      console.log(`[Activate] Subscription activated for ${userId}: +${PLAN_CREDITS} credits (stacked)`);

      return res.status(200).json({
        message: 'Subscription activated',
        credits: PLAN_CREDITS,
        isSubscribed: true,
      });
    }
  } catch (error) {
    console.error('[Activate] Subscription Activation Error:', error);
    res.status(500).json({ error: 'Failed to process payment activation' });
  }
});

/**
 * POST /subscription/cancel
 * Sets cancelAtPeriodEnd: true so the subscription remains active
 * until the next billing cycle, then downgrades automatically
 * via the credit-refresh middleware.
 */
router.post('/cancel', validateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.uid;

  try {
    const userRef = db.collection('users').doc(userId as string);
    const snap = await userRef.get();

    if (!snap.exists || !snap.data()?.isSubscribed) {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }

    if (snap.data()?.cancelAtPeriodEnd) {
      return res.status(400).json({ error: 'Subscription is already scheduled for cancellation' });
    }

    await userRef.update({
      cancelAtPeriodEnd: true,
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[Cancel] Subscription cancellation scheduled for ${userId}`);

    return res.status(200).json({
      message: 'Subscription will be cancelled at the end of the current billing period',
      cancelAtPeriodEnd: true,
    });
  } catch (error) {
    console.error('[Cancel] Error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * GET /subscription/status
 * Returns current subscription status for the authenticated user.
 */
router.get('/status', validateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.uid;

  try {
    const userDoc = await db.collection('users').doc(userId as string).get();

    if (!userDoc.exists) {
      return res.status(200).json({ isSubscribed: false, credits: 0 });
    }

    const data = userDoc.data();
    res.status(200).json({
      isSubscribed: data?.isSubscribed ?? false,
      credits: data?.credits ?? 0,
      extraCredits: data?.extraCredits ?? 0,
      lastPayment: data?.lastPayment ?? null,
    });
  } catch (error) {
    console.error('Subscription Status Error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

export default router;
