import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import api from '../services/apiService';

interface AuthContextType {
  user: User | null;
  credits: number;
  isSubscribed: boolean;
  /** If true, subscription will end at the next billing cycle */
  cancelAtPeriodEnd: boolean;
  /** When the next 20 credits will be issued (null if not subscribed) */
  nextRefreshDate: string | null;
  loading: boolean;
  /** Google sign-in */
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  /** Open the payment modal */
  openPayment: () => void;
  closePayment: () => void;
  paymentOpen: boolean;
  /** Open / close the auth modal */
  openAuthModal: () => void;
  closeAuthModal: () => void;
  authModalOpen: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Compute the next refresh date from the lastRefresh timestamp.
 * Next refresh = 1st of the month following lastRefresh.
 */
function computeNextRefresh(lastRefresh: Timestamp | null): string | null {
  if (!lastRefresh) return null;
  const d = lastRefresh.toDate();
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return next.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [credits, setCredits] = useState<number>(0);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState<boolean>(false);
  const [nextRefreshDate, setNextRefreshDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(currentUser);

      if (currentUser) {
        // Close auth modal on successful login
        setAuthModalOpen(false);

        /*
         * Trigger the backend /users/me endpoint.
         * This ensures the user document exists (getOrCreateUserProfile)
         * and triggers the credit-refresh middleware on the server side.
         * Fire-and-forget — onSnapshot picks up any Firestore changes.
         */
        api.get('/users/me').catch((err) => {
          console.error('User profile sync error:', err);
        });

        /*
         * READ-ONLY real-time listener.
         * The frontend NEVER writes to the user document.
         */
        const userDocRef = doc(db, 'users', currentUser.uid);

        unsubProfile = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setCredits(data.credits ?? 0);
              setIsSubscribed(data.isSubscribed ?? false);
              setCancelAtPeriodEnd(data.cancelAtPeriodEnd ?? false);
              setNextRefreshDate(
                data.isSubscribed ? computeNextRefresh(data.lastRefresh ?? null) : null,
              );
            } else {
              setCredits(0);
              setIsSubscribed(false);
              setCancelAtPeriodEnd(false);
              setNextRefreshDate(null);
            }
            setLoading(false);
          },
          (error) => {
            console.error('Firestore profile listener error:', error);
            setLoading(false);
          },
        );
      } else {
        setCredits(0);
        setIsSubscribed(false);
        setCancelAtPeriodEnd(false);
        setNextRefreshDate(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  /* ── Auth Methods ── */

  const loginWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const logout = useCallback(() => signOut(auth), []);

  /* ── Modal Controls ── */

  const openPayment = useCallback(() => setPaymentOpen(true), []);
  const closePayment = useCallback(() => setPaymentOpen(false), []);
  const openAuthModal = useCallback(() => setAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setAuthModalOpen(false), []);

  return (
    <AuthContext.Provider
      value={{
        user, credits, isSubscribed, cancelAtPeriodEnd, nextRefreshDate, loading,
        loginWithGoogle,
        logout,
        openPayment, closePayment, paymentOpen,
        openAuthModal, closeAuthModal, authModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
