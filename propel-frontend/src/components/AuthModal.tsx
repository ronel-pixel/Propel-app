import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { X, Mail, Lock, Github, AlertCircle } from 'lucide-react';
import './AuthModal.css';

type AuthTab = 'signin' | 'signup';

/** Parse Firebase auth error codes into user-friendly messages */
function friendlyError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try signing in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/account-exists-with-different-credential':
      return 'An account with this email already exists using a different sign-in method.';
    case 'auth/popup-closed-by-user':
      return '';
    default:
      return 'Authentication failed. Please try again.';
  }
}

const AuthModal = () => {
  const {
    authModalOpen, closeAuthModal,
    loginWithGoogle, loginWithGithub,
    signUpWithEmail, signInWithEmail,
  } = useAuth();

  const [tab, setTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!authModalOpen) return null;

  /* ── Validation ── */

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  const canSubmit = emailValid && passwordValid && !busy;

  /* ── Handlers ── */

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError('');
  };

  const switchTab = (t: AuthTab) => {
    setTab(t);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    closeAuthModal();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError('');

    try {
      if (tab === 'signup') {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      // Success — onAuthStateChanged will close the modal
    } catch (err: any) {
      const code = err?.code ?? '';
      const msg = friendlyError(code);
      if (msg) setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleSocial = async (provider: 'google' | 'github') => {
    setBusy(true);
    setError('');

    try {
      if (provider === 'google') {
        await loginWithGoogle();
      } else {
        await loginWithGithub();
      }
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
          <h2 className="am-title">
            {tab === 'signin' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="am-subtitle">
            {tab === 'signin'
              ? 'Sign in to access your strategic dashboard.'
              : 'Start with 5 free AI analysis credits.'}
          </p>
        </div>

        {/* ── Social Buttons ── */}
        <div className="am-social">
          <button
            className="am-social-btn"
            onClick={() => handleSocial('google')}
            disabled={busy}
          >
            <svg viewBox="0 0 24 24" width={18} height={18}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            className="am-social-btn"
            onClick={() => handleSocial('github')}
            disabled={busy}
          >
            <Github size={18} />
            <span>Continue with GitHub</span>
          </button>
        </div>

        {/* ── Divider ── */}
        <div className="am-divider">
          <span>or</span>
        </div>

        {/* ── Email / Password Form ── */}
        <form className="am-form" onSubmit={handleEmailSubmit}>
          <div className="am-field">
            <Mail size={16} className="am-field-icon" />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="am-field">
            <Lock size={16} className="am-field-icon" />
            <input
              type="password"
              placeholder={tab === 'signup' ? 'Password (min. 6 characters)' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
              minLength={6}
              required
            />
          </div>

          {/* ── Inline Validation Hints ── */}
          {tab === 'signup' && password.length > 0 && !passwordValid && (
            <p className="am-hint">Password must be at least 6 characters.</p>
          )}

          {error && (
            <div className="am-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary am-submit"
            disabled={!canSubmit}
          >
            {busy ? 'Please wait…' : tab === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* ── Tab Switch ── */}
        <p className="am-switch">
          {tab === 'signin' ? (
            <>
              Don&rsquo;t have an account?{' '}
              <button className="am-switch-btn" onClick={() => switchTab('signup')}>
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button className="am-switch-btn" onClick={() => switchTab('signin')}>
                Sign In
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthModal;
