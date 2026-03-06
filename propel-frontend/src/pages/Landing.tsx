import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { analysisService } from '@/services/apiService';
import AnalysisView from '@/components/AnalysisView';
import type { Project } from '@/types/analysis';
import { ArrowDown, ArrowRight, BarChart3, Compass, Cpu, Send, ShieldCheck, Target } from 'lucide-react';
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
  const { user, credits, openAuthModal, openPayment } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<Project | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<'en' | 'he'>('en');
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setCurrentAnalysis(null);
      return;
    }

    try {
      const data = await analysisService.getProjects();
      setProjects(data);
      if (!currentAnalysis && data.length > 0) {
        setCurrentAnalysis(data[0]);
      }
    } catch {
      // non-blocking for the landing experience
    }
  }, [user, currentAnalysis]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    if (!user) {
      setError('Sign in with Google to run your first strategic analysis.');
      openAuthModal();
      return;
    }

    if (credits <= 0) {
      setError('You have no credits remaining.');
      openPayment();
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analysisService.analyzeProject(title, description, credits, language);
      const project: Project = {
        id: result.id,
        title,
        description,
        analysis: result.analysis,
        createdAt: null,
      };
      setCurrentAnalysis(project);
      setTitle('');
      setDescription('');
      await fetchProjects();
    } catch (err) {
      if (err instanceof Error && err.message === 'NO_CREDITS') {
        setError('You have no credits remaining.');
        openPayment();
      } else {
        setError('Analysis failed. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="landing">
      {/* Grid / Starfield background overlay */}
      <div className="lp-grid-bg" aria-hidden="true" />

      <section className="landing-hero">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <GlowingPropeller />
        </motion.div>

        <motion.span
          className="landing-badge"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          Enclave Strategic Intelligence
        </motion.span>

        <motion.h1
          className="landing-heading"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.15 }}
        >
          AI-Powered Project Analysis
          <br />
          for Elite Teams
        </motion.h1>

        <motion.p
          className="landing-sub"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24 }}
        >
          Enclave delivers boardroom-grade market intelligence, technical positioning, and
          execution strategy in minutes, so decisive teams move with confidence.
        </motion.p>

        <motion.div
          className="landing-hero-actions"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.3 }}
        >
          <button className="btn-primary landing-cta" onClick={openAuthModal}>
            <span>Enter Enclave</span>
            <ArrowRight size={16} />
          </button>
          <a className="landing-secondary-cta" href="#strategic-console">
            <ArrowDown size={14} />
            See Strategic Console
          </a>
        </motion.div>

        <motion.div
          className="landing-kpis"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.38 }}
        >
          <div className="landing-kpi"><span>20</span> monthly premium credits</div>
          <div className="landing-kpi"><span>&lt; 60s</span> average analysis generation</div>
          <div className="landing-kpi"><span>3</span> free analyses to start</div>
        </motion.div>
      </section>

      <section className="landing-features">
        {[
          {
            icon: <Target size={20} />,
            title: 'Investor-Ready Positioning',
            desc: 'Instantly map market entry angle, target segment, and competitive pressure.',
          },
          {
            icon: <Cpu size={20} />,
            title: 'Execution-Grade Stack Guidance',
            desc: 'Get practical recommendations that align with budget, scale, and team maturity.',
          },
          {
            icon: <BarChart3 size={20} />,
            title: 'Decision Visuals',
            desc: 'Translate complexity into clear economic, timeline, and growth chart narratives.',
          },
          {
            icon: <ShieldCheck size={20} />,
            title: 'Secure Billing Infrastructure',
            desc: 'Backend-verified payment and subscription enforcement built for production trust.',
          },
          {
            icon: <Compass size={20} />,
            title: 'Strategic Pivot Intelligence',
            desc: 'AI identifies salvageable strengths and proposes higher-margin alternatives.',
          },
        ].map((f) => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>

      <div className="landing-transition" aria-hidden="true" />

      <section id="strategic-console" className="landing-console-section">
        <div className="landing-console-inner">
          <div className="landing-console-header">
            <span className="console-label">Strategic Console</span>
            <h2>Run Your Analysis Below The Fold</h2>
            <p>
              The top of this page stays focused on brand and narrative. The execution console
              starts here, ready when you are.
            </p>
          </div>

          <form className="landing-analysis-form" onSubmit={handleSubmit}>
            <div className="landing-form-row">
              <label htmlFor="landing-project-title">Project Title</label>
              <input
                id="landing-project-title"
                type="text"
                placeholder="e.g. Meridian OS for compliance-heavy fintech teams"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isAnalyzing}
                required
              />
            </div>

            <div className="landing-form-row">
              <label htmlFor="landing-project-description">Description</label>
              <textarea
                id="landing-project-description"
                rows={4}
                placeholder="Describe product, audience, pricing model, and strategic risk profile..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isAnalyzing}
                required
              />
            </div>

            <div className="landing-console-actions">
              <div className="landing-language-toggle">
                <button
                  type="button"
                  className={language === 'en' ? 'active' : ''}
                  onClick={() => setLanguage('en')}
                  disabled={isAnalyzing}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={language === 'he' ? 'active' : ''}
                  onClick={() => setLanguage('he')}
                  disabled={isAnalyzing}
                >
                  HE
                </button>
              </div>

              <button type="submit" className="btn-primary landing-analyze-btn" disabled={isAnalyzing}>
                <Send size={15} />
                {isAnalyzing ? 'Analyzing...' : 'Run Strategic Analysis'}
              </button>
            </div>
          </form>

          {!user && (
            <div className="landing-auth-gate">
              <p>Sign in with Google to unlock live analysis and archive access.</p>
              <button className="btn-primary" onClick={openAuthModal}>Sign In with Google</button>
            </div>
          )}

          {error && <p className="landing-form-error">{error}</p>}

          {currentAnalysis?.analysis && (
            <div className="landing-analysis-result">
              <div className="landing-result-head">
                <h3>{currentAnalysis.title}</h3>
                <span>{projects.length} analyses in archive</span>
              </div>
              <AnalysisView analysis={currentAnalysis.analysis} idSuffix="-landing" />
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Landing;
