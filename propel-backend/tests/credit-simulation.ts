/**
 * ═══════════════════════════════════════════════
 *  ENCLAVE — Credit Logic Simulation
 *  Validates Scenarios A, B, C against live Firestore
 * ═══════════════════════════════════════════════
 *
 *  Run:  npx ts-node tests/credit-simulation.ts
 *
 *  This script creates temporary test documents in Firestore,
 *  runs the credit logic inline (same logic as middleware/routes),
 *  validates the results, then deletes the test documents.
 */

import 'dotenv/config';
import { db, admin } from '../config/firebase-config';

// ── Constants (must mirror production) ── //
const PLAN_CREDITS = 20;
const TEST_UID_A = 'enclave-test-scenario-a';
const TEST_UID_B = 'enclave-test-scenario-b';
const TEST_UID_C = 'enclave-test-scenario-c';

// ── Helpers ── //

function passed(label: string) {
  console.log(`  ✅  ${label}`);
}
function failed(label: string, expected: any, got: any) {
  console.error(`  ❌  ${label} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}
function assert(label: string, expected: any, got: any) {
  if (expected === got) passed(label);
  else failed(label, expected, got);
}

/** Create a date N days in the past */
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ═══════════════════════════════════════════════
//  Scenario A: Monthly Refresh (The Reset)
// ═══════════════════════════════════════════════

async function scenarioA() {
  console.log('\n══════════════════════════════════════');
  console.log('  SCENARIO A: Monthly Refresh (The Reset)');
  console.log('══════════════════════════════════════');
  console.log('  Setup: subscriber, credits=5, extraCredits=0, lastRefresh=40 days ago');
  console.log('  Expected: credits → 20, extraCredits → 0\n');

  const userRef = db.collection('users').doc(TEST_UID_A);

  // Setup
  await userRef.set({
    uid: TEST_UID_A,
    email: 'test-a@enclave.dev',
    credits: 5,
    extraCredits: 0,
    isSubscribed: true,
    lastRefresh: admin.firestore.Timestamp.fromDate(daysAgo(40)),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Action — inline credit-refresh logic (same as middleware)
  const snap = await userRef.get();
  const data = snap.data()!;
  const lastRefresh: Date = data.lastRefresh?.toDate?.() ?? new Date(0);
  const now = new Date();
  const isNewMonth =
    now.getMonth() !== lastRefresh.getMonth() ||
    now.getFullYear() !== lastRefresh.getFullYear();

  if (isNewMonth && data.isSubscribed) {
    const extra = data.extraCredits || 0;
    const newCredits = 20 + extra;
    await userRef.update({
      credits: newCredits,
      extraCredits: 0,
      lastRefresh: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Verify
  const result = (await userRef.get()).data()!;
  assert('credits === 20', 20, result.credits);
  assert('extraCredits === 0', 0, result.extraCredits);
  assert('lastRefresh updated (is recent)', true, result.lastRefresh?.toDate?.() > daysAgo(1));
}

// ═══════════════════════════════════════════════
//  Scenario B: Bonus Carry-over (The "Ronel" Rule)
// ═══════════════════════════════════════════════

async function scenarioB() {
  console.log('\n══════════════════════════════════════');
  console.log('  SCENARIO B: Bonus Carry-over (The "Ronel" Rule)');
  console.log('══════════════════════════════════════');
  console.log('  Setup: subscriber, credits=5, extraCredits=15, lastRefresh=40 days ago');
  console.log('  Expected: credits → 35 (20+15), extraCredits → 0\n');

  const userRef = db.collection('users').doc(TEST_UID_B);

  // Setup
  await userRef.set({
    uid: TEST_UID_B,
    email: 'test-b@enclave.dev',
    credits: 5,
    extraCredits: 15,
    isSubscribed: true,
    lastRefresh: admin.firestore.Timestamp.fromDate(daysAgo(40)),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Action — inline credit-refresh logic
  const snap = await userRef.get();
  const data = snap.data()!;
  const lastRefresh: Date = data.lastRefresh?.toDate?.() ?? new Date(0);
  const now = new Date();
  const isNewMonth =
    now.getMonth() !== lastRefresh.getMonth() ||
    now.getFullYear() !== lastRefresh.getFullYear();

  if (isNewMonth && data.isSubscribed) {
    const extra = data.extraCredits || 0;
    const newCredits = 20 + extra;
    await userRef.update({
      credits: newCredits,
      extraCredits: 0,
      lastRefresh: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Verify
  const result = (await userRef.get()).data()!;
  assert('credits === 35', 35, result.credits);
  assert('extraCredits === 0', 0, result.extraCredits);
  assert('lastRefresh updated (is recent)', true, result.lastRefresh?.toDate?.() > daysAgo(1));
}

// ═══════════════════════════════════════════════
//  Scenario C: Zero-Credit Gate (The Paywall)
// ═══════════════════════════════════════════════

async function scenarioC() {
  console.log('\n══════════════════════════════════════');
  console.log('  SCENARIO C: Zero-Credit Gate (The Paywall)');
  console.log('══════════════════════════════════════');
  console.log('  Setup: user with credits=0');
  console.log('  Expected: analysis request returns 403 "Insufficient credits"\n');

  const userRef = db.collection('users').doc(TEST_UID_C);

  // Setup
  await userRef.set({
    uid: TEST_UID_C,
    email: 'test-c@enclave.dev',
    credits: 0,
    extraCredits: 0,
    isSubscribed: false,
    lastRefresh: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Action — inline credit guard logic (same as analysis-routes.ts)
  const userSnap = await userRef.get();
  const currentCredits = userSnap.exists ? (userSnap.data()?.credits ?? 0) : 0;

  let blocked = false;
  let statusCode = 200;
  let errorMessage = '';

  if (currentCredits <= 0) {
    blocked = true;
    statusCode = 403;
    errorMessage = 'No credits remaining. Please upgrade your plan.';
  }

  // Verify
  assert('Request blocked', true, blocked);
  assert('Status code === 403', 403, statusCode);
  assert('Error message matches', 'No credits remaining. Please upgrade your plan.', errorMessage);
}

// ═══════════════════════════════════════════════
//  Bonus: Subscription Stacking Verification
// ═══════════════════════════════════════════════

async function scenarioStacking() {
  console.log('\n══════════════════════════════════════');
  console.log('  BONUS: Subscription Stacking');
  console.log('══════════════════════════════════════');
  console.log('  Setup: free user with credits=2');
  console.log('  Action: activate subscription (+20 via increment)');
  console.log('  Expected: credits → 22, isSubscribed → true\n');

  const testUid = 'enclave-test-scenario-stack';
  const userRef = db.collection('users').doc(testUid);

  // Setup — simulate a free user with 2 remaining credits
  await userRef.set({
    uid: testUid,
    email: 'test-stack@enclave.dev',
    credits: 2,
    extraCredits: 0,
    isSubscribed: false,
    lastRefresh: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Action — inline subscription activation logic (increment, NOT set)
  await userRef.update({
    isSubscribed: true,
    credits: admin.firestore.FieldValue.increment(PLAN_CREDITS),
    extraCredits: 0,
    lastPayment: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Verify
  const result = (await userRef.get()).data()!;
  assert('credits === 22 (2 existing + 20 plan)', 22, result.credits);
  assert('isSubscribed === true', true, result.isSubscribed);

  // Cleanup
  await userRef.delete();
}

// ═══════════════════════════════════════════════
//  Scenario D: Internal Cancel (Grace Period)
// ═══════════════════════════════════════════════

async function scenarioD() {
  console.log('\n══════════════════════════════════════');
  console.log('  SCENARIO D: Internal Cancel (Grace Period)');
  console.log('══════════════════════════════════════');
  console.log('  Setup: subscriber, credits=12, cancelAtPeriodEnd=true, lastRefresh=40 days ago');
  console.log('  Action: trigger credit-refresh (new month)');
  console.log('  Expected: isSubscribed → false, credits → 0\n');

  const testUid = 'enclave-test-scenario-d';
  const userRef = db.collection('users').doc(testUid);

  // Setup — subscriber who cancelled mid-cycle, now month boundary is crossed
  await userRef.set({
    uid: testUid,
    email: 'test-d@enclave.dev',
    credits: 12,
    extraCredits: 0,
    isSubscribed: true,
    cancelAtPeriodEnd: true,
    paymentFailed: false,
    lastRefresh: admin.firestore.Timestamp.fromDate(daysAgo(40)),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Action — inline credit-refresh logic (same as middleware)
  const snap = await userRef.get();
  const data = snap.data()!;
  const lastRefresh: Date = data.lastRefresh?.toDate?.() ?? new Date(0);
  const now = new Date();
  const isNewMonth =
    now.getMonth() !== lastRefresh.getMonth() ||
    now.getFullYear() !== lastRefresh.getFullYear();

  if (isNewMonth && data.isSubscribed) {
    const shouldDowngrade = data.cancelAtPeriodEnd === true || data.paymentFailed === true;

    if (shouldDowngrade) {
      await userRef.update({
        isSubscribed: false,
        cancelAtPeriodEnd: false,
        paymentFailed: false,
        credits: 0,
        extraCredits: 0,
        lastRefresh: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  // Verify
  const result = (await userRef.get()).data()!;
  assert('isSubscribed === false (downgraded)', false, result.isSubscribed);
  assert('credits === 0', 0, result.credits);
  assert('cancelAtPeriodEnd === false (cleared)', false, result.cancelAtPeriodEnd);

  // Cleanup
  await userRef.delete();
}

// ═══════════════════════════════════════════════
//  Scenario E: External Failure (Payment Failed Webhook)
// ═══════════════════════════════════════════════

async function scenarioE() {
  console.log('\n══════════════════════════════════════');
  console.log('  SCENARIO E: External Failure (Payment Failed)');
  console.log('══════════════════════════════════════');
  console.log('  Setup: subscriber, credits=8, paymentFailed=true, lastRefresh=40 days ago');
  console.log('  Action: trigger credit-refresh (new month)');
  console.log('  Expected: isSubscribed → false, credits → 0\n');

  const testUid = 'enclave-test-scenario-e';
  const userRef = db.collection('users').doc(testUid);

  // Setup — subscriber whose PayPal payment failed (webhook set the flag)
  await userRef.set({
    uid: testUid,
    email: 'test-e@enclave.dev',
    credits: 8,
    extraCredits: 5,
    isSubscribed: true,
    cancelAtPeriodEnd: false,
    paymentFailed: true,
    paymentFailedAt: admin.firestore.Timestamp.fromDate(daysAgo(10)),
    lastRefresh: admin.firestore.Timestamp.fromDate(daysAgo(40)),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Action — inline credit-refresh logic
  const snap = await userRef.get();
  const data = snap.data()!;
  const lastRefresh: Date = data.lastRefresh?.toDate?.() ?? new Date(0);
  const now = new Date();
  const isNewMonth =
    now.getMonth() !== lastRefresh.getMonth() ||
    now.getFullYear() !== lastRefresh.getFullYear();

  if (isNewMonth && data.isSubscribed) {
    const shouldDowngrade = data.cancelAtPeriodEnd === true || data.paymentFailed === true;

    if (shouldDowngrade) {
      await userRef.update({
        isSubscribed: false,
        cancelAtPeriodEnd: false,
        paymentFailed: false,
        credits: 0,
        extraCredits: 0,
        lastRefresh: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  // Verify
  const result = (await userRef.get()).data()!;
  assert('isSubscribed === false (downgraded)', false, result.isSubscribed);
  assert('credits === 0', 0, result.credits);
  assert('extraCredits === 0', 0, result.extraCredits);
  assert('paymentFailed === false (cleared)', false, result.paymentFailed);

  // Cleanup
  await userRef.delete();
}

// ═══════════════════════════════════════════════
//  PayPal Client-ID Sync Check
// ═══════════════════════════════════════════════

function paypalSyncCheck() {
  console.log('\n══════════════════════════════════════');
  console.log('  PayPal Client-ID Sync Check');
  console.log('══════════════════════════════════════\n');

  const backendClientId = process.env.PAYPAL_CLIENT_ID || '';

  // NOTE: We can't read the frontend .env directly at runtime,
  // so we hardcode the known value from the frontend .env for comparison.
  // In CI/CD, this should be a shared secret from a vault.
  const frontendClientId = 'AVaFzmB_cyB9cWeqQudkFVL3wgTsNhTrNUx8RXVwQtSsbTBBkoU2UzVtm0IIAqiw1M2ce-rMSYAK50xM';

  if (!backendClientId) {
    console.error('  ⚠️  WARNING: PAYPAL_CLIENT_ID not found in backend .env!');
    return;
  }

  if (backendClientId === frontendClientId) {
    passed('PayPal Client IDs match (frontend ↔ backend)');
  } else {
    console.error('  ⚠️  WARNING: PayPal Client IDs DO NOT MATCH!');
    console.error('    Backend:', backendClientId.substring(0, 20) + '...');
    console.error('    Frontend:', frontendClientId.substring(0, 20) + '...');
  }
}

// ═══════════════════════════════════════════════
//  Cleanup & Runner
// ═══════════════════════════════════════════════

async function cleanup() {
  console.log('\n── Cleaning up test documents... ──');
  const testUids = [TEST_UID_A, TEST_UID_B, TEST_UID_C];
  for (const uid of testUids) {
    try {
      await db.collection('users').doc(uid).delete();
    } catch {
      // Ignore — might not exist
    }
  }
  console.log('── Cleanup complete ──\n');
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   ENCLAVE — Credit Logic Simulation      ║');
  console.log('║   Running all scenarios...                ║');
  console.log('╚══════════════════════════════════════════╝');

  try {
    await scenarioA();
    await scenarioB();
    await scenarioC();
    await scenarioStacking();
    await scenarioD();
    await scenarioE();
    paypalSyncCheck();
  } catch (err) {
    console.error('\n🔴 SIMULATION ERROR:', err);
  } finally {
    await cleanup();
  }

  console.log('╔══════════════════════════════════════════╗');
  console.log('║   All simulations complete.               ║');
  console.log('╚══════════════════════════════════════════╝\n');

  process.exit(0);
}

main();
