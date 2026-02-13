import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line, Legend, ReferenceLine,
} from 'recharts';
import { BarChart3, FileText, Lightbulb, RefreshCw } from 'lucide-react';
import type { AnalysisResult } from '@/types/analysis';
import {
  ACCENT, ACCENT_SECONDARY, ACCENT_DANGER,
  TOOLTIP_STYLE, AXIS_TICK, GRID_STROKE,
} from '@/types/analysis';
import './AnalysisView.css';

interface AnalysisViewProps {
  analysis: AnalysisResult;
  idSuffix?: string;
}

const AnalysisView = ({ analysis, idSuffix = '' }: AnalysisViewProps) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'graphic' | 'conclusions'>('basic');

  const gradientId = `areaGrad${idSuffix}`;
  const charts = analysis.charts;
  const pivot = analysis.the_pivot;

  return (
    <div className="analysis-view">
      {/* Tabs bar */}
      <div className="tabs-bar">
        {([
          { key: 'basic', label: 'Basic Analysis', icon: <FileText size={15} /> },
          { key: 'graphic', label: 'Graphic Analysis', icon: <BarChart3 size={15} /> },
          { key: 'conclusions', label: 'Conclusions', icon: <Lightbulb size={15} /> },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="tab-content">
        {/* ──── Basic Analysis ──── */}
        {activeTab === 'basic' && (
          <div className="tab-basic">
            <div className="card">
              <h3>Market Summary</h3>
              <p>{analysis.market_analysis.summary}</p>
            </div>

            <div className="card">
              <h3>Competitors</h3>
              <div className="tags">
                {analysis.market_analysis.competitors.map((c) => (
                  <span key={c} className="tag">{c}</span>
                ))}
              </div>
            </div>

            <div className="card">
              <h3>Target Audience</h3>
              <p>{analysis.market_analysis.target_audience}</p>
            </div>

            <div className="card">
              <h3>Recommended Tech Stack</h3>
              <div className="tech-grid">
                <div className="tech-item">
                  <span className="tech-label">Frontend</span>
                  <span className="tech-value">{analysis.tech_stack.frontend}</span>
                </div>
                <div className="tech-item">
                  <span className="tech-label">Backend</span>
                  <span className="tech-value">{analysis.tech_stack.backend}</span>
                </div>
                <div className="tech-item">
                  <span className="tech-label">Database</span>
                  <span className="tech-value">{analysis.tech_stack.database}</span>
                </div>
              </div>
              <p className="tech-reasoning">{analysis.tech_stack.reasoning}</p>
            </div>
          </div>
        )}

        {/* ──── Graphic Analysis (McKinsey Standard) ──── */}
        {activeTab === 'graphic' && (
          <div className="tab-graphic">
            {/* Chart 1: TCO Analysis — 12-month cost comparison */}
            <div className="card chart-card">
              <h3>TCO Analysis — SaaS vs. On-Premise (12-Month)</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={charts?.tco_comparison ?? []}
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="category" tick={AXIS_TICK} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={AXIS_TICK} tickFormatter={(v: any) => `$${(Number(v) / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [v != null ? `$${Number(v).toLocaleString()}` : '$0', '']} />
                    <Legend wrapperStyle={{ color: '#94A3B8' }} />
                    <Bar dataKey="saas" name="SaaS" fill={ACCENT} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="on_premise" name="On-Premise" fill={ACCENT_SECONDARY} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Strategic Roadmap — 12-Month Timeline */}
            <div className="card chart-card">
              <h3>Strategic Roadmap — MVP to Scale</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={charts?.execution_timeline ?? []}
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={ACCENT} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="month" tick={AXIS_TICK} />
                    <YAxis tick={AXIS_TICK} unit="%" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(_val: any, _name: any, props: any) =>
                        [props?.payload?.milestone ?? '', 'Milestone']
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="progress"
                      stroke={ACCENT}
                      strokeWidth={2}
                      fill={`url(#${gradientId})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Unit Economics — Break-Even Line Chart */}
            <div className="card chart-card">
              <h3>Unit Economics — Break-Even Projection</h3>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={charts?.unit_economics ?? []}
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                    <XAxis dataKey="month" tick={AXIS_TICK} />
                    <YAxis tick={AXIS_TICK} tickFormatter={(v: any) => `$${(Number(v) / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: any) => [v != null ? `$${Number(v).toLocaleString()}` : '$0', '']} />
                    <Legend wrapperStyle={{ color: '#94A3B8' }} />
                    <ReferenceLine y={0} stroke="rgba(148,163,184,0.2)" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke={ACCENT} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="cost" name="Cost" stroke={ACCENT_DANGER} strokeWidth={2} dot={false} strokeDasharray="6 3" />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="#4ADE80" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ──── Conclusions + The Pivot ──── */}
        {activeTab === 'conclusions' && (
          <div className="tab-conclusions">
            <div className="card highlight-card">
              <h3>Strategic Advice</h3>
              <p className="strategic-text">{analysis.strategic_advice}</p>
            </div>

            {/* The Pivot */}
            {pivot && (
              <div className="card pivot-card">
                <div className="pivot-header">
                  <RefreshCw size={16} />
                  <h3>The Pivot</h3>
                </div>
                <div className="pivot-body">
                  <div className="pivot-field">
                    <span className="pivot-label">Viable Element</span>
                    <p>{pivot.viable_element}</p>
                  </div>
                  <div className="pivot-field">
                    <span className="pivot-label">Smarter Alternative</span>
                    <p>{pivot.alternative}</p>
                  </div>
                  <div className="pivot-field">
                    <span className="pivot-label">Why This Works</span>
                    <p>{pivot.reasoning}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <h3>Premium Roadmap</h3>
              <ol className="roadmap-list">
                {analysis.premium_roadmap.map((item, i) => (
                  <li key={i}>
                    <span className="roadmap-index">{String(i + 1).padStart(2, '0')}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="card">
              <h3>MVP Features</h3>
              <ul className="mvp-list">
                {analysis.mvp_features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisView;
