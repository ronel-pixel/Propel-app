import express, { Request, Response } from 'express';
import { db, admin } from '../config/firebase-config';

const router = express.Router();
const PAYPAL_BASE = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';
const firstDayOfNextMonth = (baseDate = new Date()) =>
  new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);

function readHeaderValue(headers: Request['headers'], key: string): string {
  const value = headers[key];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PayPal OAuth2 failed (${response.status}): ${body}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

async function verifyWebhookSignature(req: Request): Promise<{ verified: boolean; reason?: string }> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    return { verified: false, reason: 'Missing PAYPAL_WEBHOOK_ID' };
  }

  const transmissionId = readHeaderValue(req.headers, 'paypal-transmission-id');
  const transmissionTime = readHeaderValue(req.headers, 'paypal-transmission-time');
  const transmissionSig = readHeaderValue(req.headers, 'paypal-transmission-sig');
  const certUrl = readHeaderValue(req.headers, 'paypal-cert-url');
  const authAlgo = readHeaderValue(req.headers, 'paypal-auth-algo');

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    return { verified: false, reason: 'Missing required PayPal signature headers' };
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const verifyResponse = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: webhookId,
        webhook_event: req.body,
      }),
    });

    const responseText = await verifyResponse.text();
    if (!verifyResponse.ok) {
      return {
        verified: false,
        reason: `Verification API failed (${verifyResponse.status}): ${responseText}`,
      };
    }

    const verification = JSON.parse(responseText) as { verification_status?: string };
    if (verification.verification_status !== 'SUCCESS') {
      return {
        verified: false,
        reason: `verification_status=${verification.verification_status ?? 'UNKNOWN'}`,
      };
    }

    return { verified: true };
  } catch (error) {
    return {
      verified: false,
      reason: `Verification exception: ${error instanceof Error ? error.message : 'unknown'}`,
    };
  }
}

/**
 * POST /webhooks/paypal
 *
 * Listens for PayPal webhook events to keep Firestore in sync
 * with billing events that happen outside our app (recurring
 * payments, cancellations, failures).
 *
 * NOTE: In production, you MUST verify the webhook signature
 * using PayPal's Webhook Signature Verification API.
 * See: https://developer.paypal.com/api/rest/webhooks/
 */
router.post('/paypal', async (req: Request, res: Response) => {
  const event = req.body;
  const eventType: string = event?.event_type ?? '';

  console.log(`[Webhook] PayPal event received: ${eventType}`);
  console.log(`[Webhook] Event ID: ${event?.id}`);

  try {
    const verification = await verifyWebhookSignature(req);
    if (!verification.verified) {
      console.error(
        `[Security][Webhook] PayPal signature verification failed. eventId=${event?.id ?? 'unknown'} `
        + `reason="${verification.reason ?? 'unspecified'}"`,
      );
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    console.log(`[Security][Webhook] PayPal signature verified for eventId=${event?.id ?? 'unknown'}`);

    switch (eventType) {

      /* ────────────────────────────────────────────
         BILLING.SUBSCRIPTION.CANCELLED
         User cancelled via PayPal dashboard or API.
         Set cancelAtPeriodEnd so credits persist
         until the next refresh cycle.
         ──────────────────────────────────────────── */
      case 'BILLING.SUBSCRIPTION.CANCELLED': {
        const payerEmail = event?.resource?.subscriber?.email_address;
        const subscriptionId = event?.resource?.id;

        console.log(`[Webhook] Subscription cancelled — email: ${payerEmail}, subId: ${subscriptionId}`);

        // Find user by the stored paypalOrderId or by email as fallback
        const snapshot = await db.collection('users')
          .where('isSubscribed', '==', true)
          .where('email', '==', payerEmail)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          await userDoc.ref.update({
            cancelAtPeriodEnd: true,
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`[Webhook] cancelAtPeriodEnd set for user ${userDoc.id}`);
        } else {
          console.warn(`[Webhook] No matching subscriber found for email: ${payerEmail}`);
        }
        break;
      }

      /* ────────────────────────────────────────────
         PAYMENT.SALE.COMPLETED
         A recurring payment succeeded.
         Update lastRefresh and refresh credits
         (the credit-refresh middleware handles the
         actual math, but we update the timestamp
         here to ensure it's in sync with PayPal).
         ──────────────────────────────────────────── */
      case 'PAYMENT.SALE.COMPLETED': {
        const payerEmail = event?.resource?.payer?.payer_info?.email
          || event?.resource?.custom_id
          || null;
        const amount = event?.resource?.amount?.total;

        console.log(`[Webhook] Payment completed — email: ${payerEmail}, amount: $${amount}`);

        if (payerEmail) {
          const snapshot = await db.collection('users')
            .where('isSubscribed', '==', true)
            .where('email', '==', payerEmail)
            .limit(1)
            .get();

          if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            const data = userDoc.data();
            const extra = data.extraCredits || 0;

            await userDoc.ref.update({
              credits: 20 + extra,
              extraCredits: 0,
              cancelAtPeriodEnd: false, // Clear cancellation on successful payment
              lastRefresh: admin.firestore.FieldValue.serverTimestamp(),
              lastPayment: admin.firestore.FieldValue.serverTimestamp(),
              nextRefreshDate: admin.firestore.Timestamp.fromDate(firstDayOfNextMonth()),
            });
            console.log(`[Webhook] Credits refreshed for user ${userDoc.id}: 20 + ${extra} extra`);
          }
        }
        break;
      }

      /* ────────────────────────────────────────────
         BILLING.SUBSCRIPTION.PAYMENT.FAILED
         Recurring payment failed after retries.
         Flag the account for downgrade. The credit-
         refresh middleware will enforce the actual
         downgrade at the next month boundary.
         ──────────────────────────────────────────── */
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED': {
        const payerEmail = event?.resource?.subscriber?.email_address;

        console.log(`[Webhook] Payment FAILED — email: ${payerEmail}`);

        if (payerEmail) {
          const snapshot = await db.collection('users')
            .where('isSubscribed', '==', true)
            .where('email', '==', payerEmail)
            .limit(1)
            .get();

          if (!snapshot.empty) {
            const userDoc = snapshot.docs[0];
            await userDoc.ref.update({
              paymentFailed: true,
              paymentFailedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`[Webhook] Payment failure flagged for user ${userDoc.id}`);
          }
        }
        break;
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${eventType}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
