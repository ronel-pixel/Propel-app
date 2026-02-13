import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PayPalButtons } from '@paypal/react-paypal-js';
import { useAuth } from '@/contexts/AuthContext';
import { subscriptionService } from '@/services/apiService';
import { X, Crown, Check, Zap, Archive, BarChart3, AlertTriangle, CalendarClock } from 'lucide-react';
import './PaymentModal.css';

type ModalState = 'plan' | 'processing' | 'success' | 'error' | 'cancelling' | 'cancelled';

const PaymentModal = () => {
  const {
    paymentOpen, closePayment,
    isSubscribed, credits,
    cancelAtPeriodEnd, nextRefreshDate,
  } = useAuth();
  const [state, setState] = useState<ModalState>('plan');
  const [errorMsg, setErrorMsg] = useState('');

  /* Business Logic: Determine if user is eligible for a $5 refuel */
  const isEligibleForRefuel = isSubscribed && credits === 0;

  /* Reset modal state on close */
  const handleClose = () => {
    setState('plan');
    setErrorMsg('');
    closePayment();
  };

  /* PayPal: Create order — $5 for both subscription and refuel */
  const createOrder = (_data: any, actions: any) => {
    const description = isEligibleForRefuel
      ? 'Enclave Refuel — 20 Extra Credits'
      : 'Enclave Basic — Monthly Subscription';

    return actions.order.create({
      purchase_units: [
        {
          description,
          amount: {
            currency_code: 'USD',
            value: '5.00',
          },
        },
      ],
    });
  };

  /**
   * PayPal: On buyer approval, send the order ID to our backend.
   * The backend performs server-side capture & verification via
   * PayPal REST API — we do NOT capture on the client.
   */
  const onApprove = async (data: any) => {
    const paypalOrderId: string = data.orderID;
    setState('processing');

    try {
      await subscriptionService.activate(paypalOrderId, isEligibleForRefuel);
      setState('success');
    } catch (err) {
      console.error('Activation error:', err);
      setErrorMsg('Payment verification failed. Please contact Enclave support.');
      setState('error');
    }
  };

  const onError = (err: any) => {
    console.error('PayPal error:', err);
    setErrorMsg('The payment gate could not be initialized. Please try again.');
    setState('error');
  };

  /* Cancel subscription handler */
  const handleCancel = async () => {
    setState('cancelling');
    try {
      await subscriptionService.cancel();
      setState('cancelled');
    } catch (err) {
      console.error('Cancel error:', err);
      setErrorMsg('Failed to cancel subscription. Please try again.');
      setState('error');
    }
  };

  /* Determine if we should show the "active subscriber" view */
  const showActiveView = isSubscribed && credits > 0 && !isEligibleForRefuel;

  return (
    <AnimatePresence>
      {paymentOpen && (
        <motion.div
          className="pm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={handleClose}
        >
          <motion.div
            className="pm-card"
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="pm-close" onClick={handleClose} aria-label="Close">
              <X size={18} />
            </button>

            {/* ──── Active Subscriber View ──── */}
            {state === 'plan' && showActiveView && (
              <div className="pm-plan">
                <div className="pm-badge">
                  <Crown size={14} />
                  <span>Enclave Basic</span>
                </div>

                <h2 className="pm-status-heading">You are on the Basic Plan</h2>

                {cancelAtPeriodEnd ? (
                  <div className="pm-cancel-notice">
                    <AlertTriangle size={16} />
                    <span>Cancellation scheduled. Active until {nextRefreshDate ?? 'end of billing period'}.</span>
                  </div>
                ) : (
                  <div className="pm-active-badge">Active</div>
                )}

                <div className="pm-status-details">
                  <div className="pm-status-row">
                    <span className="pm-status-label">Credits remaining</span>
                    <span className="pm-status-value">{credits}</span>
                  </div>
                  {nextRefreshDate && !cancelAtPeriodEnd && (
                    <div className="pm-status-row">
                      <span className="pm-status-label">
                        <CalendarClock size={13} /> Next 20 credits
                      </span>
                      <span className="pm-status-value">{nextRefreshDate}</span>
                    </div>
                  )}
                </div>

                <div className="pm-divider" />

                {!cancelAtPeriodEnd && (
                  <button className="pm-cancel-btn" onClick={handleCancel}>
                    Cancel Subscription
                  </button>
                )}

                <button className="btn-primary pm-close-btn" onClick={handleClose}>
                  Close
                </button>
              </div>
            )}

            {/* ──── Purchase View (New sub or Refuel) ──── */}
            {state === 'plan' && !showActiveView && (
              <div className="pm-plan">
                <div className="pm-badge">
                  <Crown size={14} />
                  <span>{isEligibleForRefuel ? 'Enclave Refuel' : 'Enclave Basic'}</span>
                </div>

                <h2 className="pm-price">
                  <span className="pm-currency">$</span>5
                  <span className="pm-period">{isEligibleForRefuel ? ' one-time' : '/month'}</span>
                </h2>

                <p className="pm-plan-desc">
                  {isEligibleForRefuel
                    ? "Out of fuel? Refill your engine with 20 extra credits. Unused credits carry over to next month."
                    : "Propel your startup with 20 monthly credits and elite strategic tools."}
                </p>

                <ul className="pm-features">
                  <li><Check size={15} /> <span>20 {isEligibleForRefuel ? 'Extra' : 'Monthly'} AI credits</span></li>
                  <li><Archive size={15} /> <span>Full archive access</span></li>
                  <li><BarChart3 size={15} /> <span>Graphic analysis & charts</span></li>
                  <li><Zap size={15} /> <span>Priority processing</span></li>
                </ul>

                <div className="pm-divider" />

                <div className="pm-paypal-wrap">
                  <PayPalButtons
                    style={{
                      layout: 'vertical',
                      color: 'blue',
                      shape: 'rect',
                      label: 'pay',
                      height: 45,
                    }}
                    createOrder={createOrder}
                    onApprove={onApprove}
                    onError={onError}
                  />
                </div>

                <p className="pm-disclaimer">
                  Secured by PayPal. Enclave does not store credit card data.
                </p>
              </div>
            )}

            {/* Processing state */}
            {(state === 'processing' || state === 'cancelling') && (
              <div className="pm-state-view">
                <div className="pm-spinner" />
                <h3>{state === 'cancelling' ? 'Processing Cancellation...' : 'Verifying Transaction...'}</h3>
                <p>
                  {state === 'cancelling'
                    ? 'Updating your subscription status.'
                    : 'Establishing secure connection with the strategic engine.'}
                </p>
              </div>
            )}

            {/* Success state */}
            {state === 'success' && (
              <motion.div
                className="pm-state-view pm-success"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="pm-success-icon">
                  <Check size={28} strokeWidth={2.5} />
                </div>
                <h3>Credits Loaded</h3>
                <p>Your account has been fueled. You are ready for takeoff.</p>
                <button className="btn-primary" onClick={handleClose}>
                  Continue to Dashboard
                </button>
              </motion.div>
            )}

            {/* Cancelled state */}
            {state === 'cancelled' && (
              <motion.div
                className="pm-state-view"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="pm-cancelled-icon">
                  <AlertTriangle size={28} strokeWidth={2} />
                </div>
                <h3>Subscription Cancelled</h3>
                <p>Your credits remain active until {nextRefreshDate ?? 'the end of the current billing period'}. You will not be charged again.</p>
                <button className="btn-primary" onClick={handleClose}>
                  Close
                </button>
              </motion.div>
            )}

            {/* Error state */}
            {state === 'error' && (
              <div className="pm-state-view pm-error">
                <h3>System Alert</h3>
                <p>{errorMsg}</p>
                <button className="btn-primary" onClick={() => setState('plan')}>
                  Go Back
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaymentModal;
