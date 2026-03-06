import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { X, AlertCircle } from 'lucide-react';
import './AuthModal.css';

/** Parse Firebase auth error codes into user-friendly messages */
function friendlyError(code: string): string {
  switch (code) {
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/account-exists-with-different-credential':
      return 'An account with this email already exists with a different provider.';
    case 'auth/popup-closed-by-user':
      return '';
    default:
      return 'Google sign-in failed. Please try again.';
  }
}

const AuthModal = () => {
  const {
    authModalOpen,
    closeAuthModal,
    loginWithGoogle,
  } = useAuth();

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!authModalOpen) return null;

  const handleClose = () => {
    setError('');
    closeAuthModal();
  };

  const handleGoogleSignIn = async () => {
    setBusy(true);
    setError('');

    try {
      await loginWithGoogle();
    } catch (err: any) {
      const code = err?.code ?? '';
      const msg = friendlyError(code);
      if (msg) setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="am-overlay" onClick={handleClose}>
      <div className="am-card" onClick={(e) => e.stopPropagation()}>
        <button className="am-close" onClick={handleClose} aria-label="Close">
          <X size={18} />
        </button>

        {/* ── Header ── */}
        <div className="am-header">
          <h2 className="am-title">Welcome to Enclave</h2>
          <p className="am-subtitle">
            Continue with Google to access your strategic dashboard.
          </p>
        </div>

        <div className="am-google-only">
          <button
            className="am-social-btn"
            onClick={handleGoogleSignIn}
            disabled={busy}
          >
            <svg viewBox="0 0 24 24" width={18} height={18}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{busy ? 'Please wait...' : 'Continue with Google'}</span>
          </button>
          <p className="am-exclusive-note">Google Sign-In is the exclusive entry to Enclave.</p>
        </div>

        {error && (
          <div className="am-error">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
