import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { analysisService } from '@/services/apiService';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search, ChevronDown, ChevronUp, Archive, ArrowRight, Lock, Crown,
} from 'lucide-react';
import AnalysisView from '@/components/AnalysisView';
import type { Project } from '@/types/analysis';
import { formatProjectDate } from '@/types/analysis';
import './History.css';

/* ─── Spinner ─── */

const Spinner = () => (
  <div className="history-spinner">
    <div className="spinner-ring" />
    <p>Loading your archive&hellip;</p>
  </div>
);

/* ═══════════════════════════════════════════════
   History Page (with Executive Paywall)
   ═══════════════════════════════════════════════ */

const History = () => {
  const { isSubscribed, openPayment } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ─── Fetch on mount ─── */
  useEffect(() => {
    const load = async () => {
      try {
        const data = await analysisService.getProjects();
        setProjects(data);
      } catch {
        /* non-blocking */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* ─── Real-time filter ─── */
  const filtered = useMemo(
    () =>
      projects.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [projects, search],
  );

  /* ─── Toggle expand ─── */
  const toggle = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  /* ═══════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════ */

  if (loading) return <Spinner />;

  return (
    <div className="history-page">
      <div className="history-container">

        {/* ──── Page header ──── */}
        <div className="history-header">
          <div>
            <h1 className="history-title">Archive</h1>
            <p className="history-subtitle">
              {projects.length} {projects.length === 1 ? 'analysis' : 'analyses'} in your fleet
            </p>
          </div>
        </div>

        {/* ──── Empty state ──── */}
        {projects.length === 0 ? (
          <div className="history-empty">
            <div className="empty-icon">
              <Archive size={36} strokeWidth={1.4} />
            </div>
            <h2>Your archive is empty</h2>
            <p>
              Start your first analysis to build your fleet strategy.
            </p>
            <Link to="/" className="btn-primary">
              <span>Go to Dashboard</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <>
            {/* ──── Search ──── */}
            <div className="history-search-wrap">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="history-search"
                placeholder="Search by project name\u2026"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* ──── No results ──── */}
            {filtered.length === 0 && (
              <p className="history-no-results">
                No projects matching &ldquo;{search}&rdquo;
              </p>
            )}

            {/* ──── Card list ──── */}
            <div className="history-list">
              {filtered.map((project, index) => {
                const isExpanded = expandedId === project.id;

                /* Paywall: non-subscribers see only first project */
                const isLocked = !isSubscribed && index > 0;

                return (
                  <div
                    key={project.id}
                    className={`archive-card ${isExpanded ? 'expanded' : ''} ${isLocked ? 'locked' : ''}`}
                  >
                    {/* Card header — clickable only if unlocked */}
                    <button
                      className="archive-card-header"
                      onClick={() => !isLocked && toggle(project.id)}
                      aria-expanded={isLocked ? false : isExpanded}
                      disabled={isLocked}
                    >
                      <div className="archive-card-info">
                        <span className="archive-card-title">{project.title}</span>
                        <span className="archive-card-desc">{project.description}</span>
                      </div>

                      <div className="archive-card-meta">
                        <span className="archive-card-date">
                          {formatProjectDate(project.createdAt)}
                        </span>
                        {isLocked ? (
                          <Lock size={16} />
                        ) : isExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </div>
                    </button>

                    {/* Expanded analysis (only for unlocked cards) */}
                    <AnimatePresence>
                      {isExpanded && !isLocked && (
                        <motion.div
                          className="archive-card-body"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <AnalysisView
                            analysis={project.analysis}
                            idSuffix={`-hist-${project.id}`}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* ═══════════════════════════════════════
               EXECUTIVE PAYWALL OVERLAY
               ═══════════════════════════════════════ */}
            {!isSubscribed && filtered.length > 1 && (
              <div className="paywall-overlay">
                <div className="paywall-card">
                  <div className="paywall-icon">
                    <Crown size={24} />
                  </div>
                  <h3>Unlock Your Full Fleet Strategy</h3>
                  <p>
                    Subscribe for <strong>$5/month</strong> to access your entire
                    analysis history, advanced charts, and strategic insights.
                  </p>
                  <button className="paywall-btn" onClick={openPayment}>
                    <Crown size={16} />
                    <span>Upgrade Now</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default History;
