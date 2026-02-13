import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Archive, Info, Crown, User, ChevronDown } from 'lucide-react';

/* ─── Propeller Logo (replaces Zap) ─── */

const PropellerLogo = () => (
  <svg
    viewBox="0 0 100 100"
    className="header-propeller"
    aria-hidden="true"
  >
    <g transform="translate(50,50)">
      <path d="M0,-40 C9,-34 11,-13 0,0 C-11,-13 -9,-34 0,-40" fill="url(#hpSilver)" />
      <path d="M0,-40 C9,-34 11,-13 0,0 C-11,-13 -9,-34 0,-40" fill="url(#hpSilver)" transform="rotate(120)" />
      <path d="M0,-40 C9,-34 11,-13 0,0 C-11,-13 -9,-34 0,-40" fill="url(#hpSilver)" transform="rotate(240)" />
      <circle cx="0" cy="0" r="5" fill="#FFFFFF" />
    </g>
    <defs>
      <linearGradient id="hpSilver" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E2E8F0" />
        <stop offset="50%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#CBD5E1" />
      </linearGradient>
    </defs>
  </svg>
);

/* ─── Small propeller for credits ─── */

const PropellerSmall = () => (
  <svg viewBox="0 0 100 100" width={13} height={13} fill="currentColor" aria-hidden="true">
    <g transform="translate(50,50)">
      <path d="M0,-38 C8,-32 10,-12 0,0 C-10,-12 -8,-32 0,-38" opacity="0.85" />
      <path d="M0,-38 C8,-32 10,-12 0,0 C-10,-12 -8,-32 0,-38" opacity="0.85" transform="rotate(120)" />
      <path d="M0,-38 C8,-32 10,-12 0,0 C-10,-12 -8,-32 0,-38" opacity="0.85" transform="rotate(240)" />
      <circle cx="0" cy="0" r="4.5" />
    </g>
  </svg>
);

const Header = () => {
  const { user, credits, isSubscribed, cancelAtPeriodEnd, nextRefreshDate, logout, openPayment, openAuthModal } = useAuth();
  const { pathname } = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="app-header">
      <div className="header-left">
        <Link to="/" className="header-brand">
          <PropellerLogo />
          <span>Propel</span>
          <span className="header-brand-ai">AI</span>
        </Link>

        <nav className="header-nav">
          {user && (
            <>
              <Link to="/" className={`header-nav-link ${pathname === '/' ? 'active' : ''}`}>
                Dashboard
              </Link>
              <Link to="/history" className={`header-nav-link ${pathname === '/history' ? 'active' : ''}`}>
                <Archive size={14} />
                Archive
              </Link>
            </>
          )}
          <Link to="/about" className={`header-nav-link ${pathname === '/about' ? 'active' : ''}`}>
            <Info size={14} />
            About
          </Link>
        </nav>
      </div>

      <div className="header-actions">
        {user ? (
          <>
            <button className="header-credits" onClick={openPayment} title="Manage credits">
              <PropellerSmall />
              <span>{credits}</span>
            </button>

            <div className="profile-dropdown-wrap" ref={dropdownRef}>
              <button
                className="profile-trigger"
                onClick={() => setDropdownOpen((v) => !v)}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="profile-avatar" />
                ) : (
                  <User size={16} />
                )}
                <ChevronDown size={13} className={`profile-chevron ${dropdownOpen ? 'open' : ''}`} />
              </button>

              {dropdownOpen && (
                <div className="profile-dropdown">
                  <div className="pd-header">
                    <span className="pd-name">{user.displayName ?? 'User'}</span>
                    <span className="pd-email">{user.email}</span>
                  </div>

                  <div className="pd-divider" />

                  <div className="pd-status">
                    {isSubscribed ? (
                      <span className="pd-sub-active">
                        <Crown size={13} />
                        {cancelAtPeriodEnd ? 'Cancelling' : 'Enclave Basic'}
                      </span>
                    ) : (
                      <span className="pd-sub-free">Free Plan</span>
                    )}
                    <span className="pd-credits">{credits} credits</span>
                  </div>

                  {isSubscribed && nextRefreshDate && !cancelAtPeriodEnd && (
                    <div className="pd-refresh-info">
                      Next 20 credits: {nextRefreshDate}
                    </div>
                  )}

                  {isSubscribed && cancelAtPeriodEnd && nextRefreshDate && (
                    <div className="pd-cancel-info">
                      Active until {nextRefreshDate}
                    </div>
                  )}

                  <div className="pd-divider" />

                  {!isSubscribed && (
                    <button
                      className="pd-upgrade"
                      onClick={() => { setDropdownOpen(false); openPayment(); }}
                    >
                      <Crown size={14} />
                      Upgrade to Enclave
                    </button>
                  )}

                  {isSubscribed && (
                    <button
                      className="pd-manage"
                      onClick={() => { setDropdownOpen(false); openPayment(); }}
                    >
                      <Crown size={14} />
                      Manage Subscription
                    </button>
                  )}

                  <button className="pd-logout" onClick={logout}>
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <button className="header-auth-btn" onClick={openAuthModal}>
            Sign In
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
