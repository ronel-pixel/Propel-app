import express, { Request, Response } from 'express';
import { db, admin } from '../config/firebase-config';

const router = express.Router();

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

    // Always return 200 to acknowledge receipt — PayPal retries on non-200
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Webhook] Processing error:', error);
    // Still return 200 to prevent PayPal from retrying indefinitely
    res.status(200).json({ received: true, error: 'Internal processing error logged' });
  }
});

export default router;
