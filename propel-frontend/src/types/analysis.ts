/* ═══════════════════════════════════════════════
   Shared analysis types — McKinsey Standard
   ═══════════════════════════════════════════════ */

export interface AnalysisResult {
  market_analysis: {
    summary: string;
    competitors: string[];
    target_audience: string;
  };
  tech_stack: {
    frontend: string;
    backend: string;
    database: string;
    reasoning: string;
  };
  mvp_features: string[];
  premium_roadmap: string[];
  strategic_advice: string;

  /** The Pivot — a smarter alternative when the original idea has flaws */
  the_pivot?: {
    viable_element: string;
    alternative: string;
    reasoning: string;
  };

  /** Data-driven charts (McKinsey Standard) */
  charts?: {
    /** Tech Stack TCO — 12-month cost comparison */
    tco_comparison: {
      category: string;
      saas: number;
      on_premise: number;
    }[];
    /** Execution Roadmap — 12-month milestone projection */
    execution_timeline: {
      month: string;
      milestone: string;
      progress: number;
    }[];
    /** Unit Economics — monthly revenue vs. cost showing break-even */
    unit_economics: {
      month: string;
      revenue: number;
      cost: number;
      profit: number;
    }[];
  };
}

export interface Project {
  id: string;
  title: string;
  description: string;
  analysis: AnalysisResult;
  createdAt: { _seconds?: number; seconds?: number } | null;
}

/* ─── Chart palette (Professional Light) ─── */

export const CHART_COLORS = ['#3B82F6', '#2563EB', '#64748B', '#94A3B8', '#475569', '#334155'];
export const ACCENT = '#3B82F6';
export const ACCENT_SECONDARY = '#64748B';
export const ACCENT_DANGER = '#EF4444';

/* ─── Tooltip style (shared) ─── */

export const TOOLTIP_STYLE = {
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  fontSize: 13,
  color: '#334155',
};

export const AXIS_TICK = { fontSize: 12, fill: '#64748B' };
export const GRID_STROKE = '#E2E8F0';

/* ─── Date helper ─── */

export function formatProjectDate(
  createdAt: Project['createdAt'],
): string {
  if (!createdAt) return '';
  const seconds = createdAt._seconds ?? createdAt.seconds ?? 0;
  if (!seconds) return '';
  return new Date(seconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
