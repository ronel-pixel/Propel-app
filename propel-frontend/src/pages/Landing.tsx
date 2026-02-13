import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Cpu, Target } from 'lucide-react';
import './Landing.css';

/* ─── Large Glowing Propeller SVG ─── */

const GlowingPropeller = () => (
  <div className="lp-propeller-wrap">
    <svg
      className="lp-propeller"
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lpBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <filter id="lpGlow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g transform="translate(100,100)" filter="url(#lpGlow)">
        {/* 4-blade propeller */}
        <path d="M0,-88 C7,-68 9,-24 3,-5 L0,0 L-3,-5 C-9,-24 -7,-68 0,-88" fill="url(#lpBlue)" opacity="0.9" />
        <path d="M88,0 C68,7 24,9 5,3 L0,0 L5,-3 C24,-9 68,-7 88,0" fill="url(#lpBlue)" opacity="0.9" />
        <path d="M0,88 C-7,68 -9,24 -3,5 L0,0 L3,5 C9,24 7,68 0,88" fill="url(#lpBlue)" opacity="0.9" />
        <path d="M-88,0 C-68,-7 -24,-9 -5,-3 L0,0 L-5,3 C-24,9 -68,7 -88,0" fill="url(#lpBlue)" opacity="0.9" />
        {/* Hub */}
        <circle cx="0" cy="0" r="12" fill="url(#lpBlue)" />
        <circle cx="0" cy="0" r="6" fill="#0A1120" />
        <circle cx="0" cy="0" r="3" fill="url(#lpBlue)" opacity="0.8" />
      </g>
    </svg>

    {/* Outer glow ring */}
    <div className="lp-glow-ring" />
  </div>
);

/* ═══════════════════════════════════════════════
   Landing Page
   ═══════════════════════════════════════════════ */

const Landing = () => {
  const { user, openAuthModal } = useAuth();

  /* Already logged in — go straight to dashboard */
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="landing">
      {/* Grid / Starfield background overlay */}
      <div className="lp-grid-bg" aria-hidden="true" />

      {/* Hero */}
      <section className="landing-hero">
        <GlowingPropeller />

        <span className="landing-badge">AI-Powered Strategy</span>

        <h1 className="landing-heading">
          Propel Your Vision<br />to Reality.
        </h1>

        <p className="landing-sub">
          Strategic AI analysis for high-stakes business decisions.
          Submit your idea and receive institutional-grade insights in seconds.
        </p>

        <button className="btn-primary landing-cta" onClick={openAuthModal}>
          <span>Get Started</span>
          <ArrowRight size={16} />
        </button>
      </section>

      {/* Features strip */}
      <section className="landing-features">
        {[
          { icon: <Target size={22} />, title: 'Market Analysis', desc: 'Competitors, audience, and positioning — instantly.' },
          { icon: <Cpu size={22} />, title: 'Tech Recommendations', desc: 'The right stack for your scale, chosen by AI.' },
          { icon: <BarChart3 size={22} />, title: 'Visual Insights', desc: 'Interactive charts that turn data into clarity.' },
        ].map((f) => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
};

export default Landing;
