import React, { useState, useEffect, useCallback } from 'react';
import { analysisService } from '@/services/apiService';
import { useAuth } from '@/contexts/AuthContext';
import {
  Send, ChevronDown, ChevronUp, FileText, Clock, Globe,
} from 'lucide-react';
import AnalysisView from '@/components/AnalysisView';
import type { Project } from '@/types/analysis';
import './Dashboard.css';

/* ─── Propeller Loading SVG ─── */

const PropellerLoader = () => (
  <div className="propeller-wrapper">
    <svg viewBox="0 0 100 100" className="propeller-svg" aria-label="Loading">
      <g transform="translate(50,50)">
        <path d="M0,-38 C8,-32 10,-12 0,0 C-10,-12 -8,-32 0,-38" fill="currentColor" opacity="0.85" />
        <path d="M0,-38 C8,-32 10,-12 0,0 C-10,-12 -8,-32 0,-38" fill="currentColor" opacity="0.85" transform="rotate(120)" />
        <path d="M0,-38 C8,-32 10,-12 0,0 C-10,-12 -8,-32 0,-38" fill="currentColor" opacity="0.85" transform="rotate(240)" />
        <circle cx="0" cy="0" r="4.5" fill="currentColor" />
      </g>
    </svg>
    <p className="propeller-text">Analyzing your vision&hellip;</p>
  </div>
);

/* ─── Propeller icon (small) ─── */

const PropellerIcon = ({ size = 14 }: { size?: number }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} fill="currentColor" aria-hidden="true">
    <g transform="translate(50,50)">
      <path d="M0,-38 C8,-32 10,-12 0,0 C-10,-12 -8,-32 0,-38" opacity="0.85" />
      <path d="M0,-38 C8,-32 10,-12 0,0 C-10,-12 -8,-32 0,-38" opacity="0.85" transform="rotate(120)" />
      <path d="M0,-38 C8,-32 10,-12 0,0 C-10,-12 -8,-32 0,-38" opacity="0.85" transform="rotate(240)" />
      <circle cx="0" cy="0" r="4.5" />
    </g>
  </svg>
);

/* ─── Large watermark propeller for the hero zone ─── */

const HeroWatermark = () => (
  <svg
    className="hero-watermark"
    viewBox="0 0 200 200"
    fill="none"
    aria-hidden="true"
  >
    <g transform="translate(100,100)">
      <path d="M0,-90 C6,-70 8,-25 3,-5 L0,0 L-3,-5 C-8,-25 -6,-70 0,-90" fill="#FFFFFF" opacity="0.5" />
      <path d="M90,0 C70,6 25,8 5,3 L0,0 L5,-3 C25,-8 70,-6 90,0" fill="#FFFFFF" opacity="0.5" />
      <path d="M0,90 C-6,70 -8,25 -3,5 L0,0 L3,5 C8,25 6,70 0,90" fill="#FFFFFF" opacity="0.5" />
      <path d="M-90,0 C-70,-6 -25,-8 -5,-3 L0,0 L-5,3 C-25,8 -70,6 -90,0" fill="#FFFFFF" opacity="0.5" />
      <circle cx="0" cy="0" r="10" fill="#FFFFFF" opacity="0.6" />
      <circle cx="0" cy="0" r="5" fill="#FFFFFF" opacity="0.3" />
    </g>
  </svg>
);

/* ═══════════════════════════════════════════════
   Dashboard Component
   ═══════════════════════════════════════════════ */

const Dashboard = () => {
  const { credits, openPayment } = useAuth();

  /* ─── State ─── */
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<Project | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [accordionOpen, setAccordionOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'he'>('en');

  /* ─── Fetch projects on mount ─── */
  const fetchProjects = useCallback(async () => {
    try {
      const data = await analysisService.getProjects();
      setProjects(data);
    } catch {
      /* silent – non-blocking */
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  /* ─── Submit analysis (with credit guard + language) ─── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    if (credits <= 0) {
      setError('You have no credits remaining.');
      openPayment();
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setCurrentAnalysis(null);

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
      setAccordionOpen(true);
      setTitle('');
      setDescription('');
      await fetchProjects();
    } catch (err) {
      if (err instanceof Error && err.message === 'NO_CREDITS') {
        setError('You have no credits remaining.');
        openPayment();
      } else {
        setError('Analysis failed. Please check your credits and try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* ─── Select a past project ─── */
  const selectProject = (project: Project) => {
    setCurrentAnalysis(project);
    setAccordionOpen(true);
    setError(null);
  };

  const analysis = currentAnalysis?.analysis;

  /* ─── Only show last 1 project ─── */
  const recentProjects = projects.slice(0, 1);

  /* ═══════════════════════════════════════════════
     Render
     ═══════════════════════════════════════════════ */

  return (
    <div className="dashboard">

      {/* ════════════════════════════════════════
         HERO ZONE — Midnight Navy background
         ════════════════════════════════════════ */}
      <div className="dash-hero">
        <HeroWatermark />

        <div className="dash-hero-inner">
          {/* ── Executive headline ── */}
          <h2 className="dash-headline">
            Propel Your Ambition.</h2>
            {/* <span className="dash-headline-second">
              Architect Your Legacy.</span> */}
          {/* ── Section header row ── */}
          <div className="section-header-row">
            <h2 className="section-label dash-hero-label">New Analysis</h2>

            {/* Language Toggle */}
            <div className="lang-toggle">
              <Globe size={14} />
              <button
                className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                onClick={() => setLanguage('en')}
              >
                EN
              </button>
              <button
                className={`lang-btn ${language === 'he' ? 'active' : ''}`}
                onClick={() => setLanguage('he')}
              >
                HE
              </button>
            </div>
          </div>

          {/* ── The floating form card ── */}
          {isAnalyzing ? (
            <PropellerLoader />
          ) : (
            <form className="analysis-form" onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="project-title">Project Title</label>
                <input
                  id="project-title"
                  type="text"
                  placeholder="e.g. FinTrack — AI Budget Planner"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="project-desc">Description</label>
                <textarea
                  id="project-desc"
                  rows={4}
                  placeholder="Describe your product vision, target market, and what problem it solves…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-primary btn-propel" disabled={isAnalyzing}>
                <Send size={16} />
                <span>Propel</span>
              </button>
            </form>
          )}

          {error && <p className="error-message">{error}</p>}
        </div>
      </div>

      {/* ══════════ Diagonal Transition ══════════ */}
      <div className="dash-transition" />

      {/* ════════════════════════════════════════
         CONTENT ZONE — Off-White background
         ════════════════════════════════════════ */}
      <div className="dash-content">
        <div className="dash-content-inner">

          {/* ── Analysis Result (conditional) ── */}
          {currentAnalysis && analysis && (
            <section className="analysis-section">
              <button
                className="accordion-trigger"
                onClick={() => setAccordionOpen((v) => !v)}
                aria-expanded={accordionOpen}
              >
                <div className="accordion-left">
                  <FileText size={18} />
                  <span className="accordion-title">{currentAnalysis.title}</span>
                </div>
                {accordionOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              {accordionOpen && (
                <div className="accordion-body">
                  <p>{currentAnalysis.description}</p>
                </div>
              )}

              <AnalysisView analysis={analysis} idSuffix="-dashboard" />
            </section>
          )}

          {/* ── Recent Projects (last 1) ── */}
          {recentProjects.length > 0 && (
            <section className="history-section">
              <h2 className="section-label">
                <Clock size={16} />
                <span>Recent Analysis</span>
              </h2>

              <div className="history-grid">
                {recentProjects.map((project) => (
                  <button
                    key={project.id}
                    className={`history-card ${currentAnalysis?.id === project.id ? 'selected' : ''}`}
                    onClick={() => selectProject(project)}
                  >
                    <span className="history-title">{project.title}</span>
                    <span className="history-desc">
                      {project.description.length > 60
                        ? project.description.slice(0, 58) + '\u2026'
                        : project.description}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════
         CREDIT COUNTER (sticky)
         ════════════════════════════════════════ */}
      <button className="credit-counter" onClick={openPayment}>
        <PropellerIcon size={14} />
        <span>Credits: {credits}</span>
      </button>
    </div>
  );
};

export default Dashboard;
