import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './About.css';

/* ─── Executive Helicopter Propeller SVG ─── */

const ExecutivePropeller = () => (
  <svg
    className="about-propeller-bg"
    viewBox="0 0 200 200"
    fill="none"
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="propSilver" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#CBD5E1" />
        <stop offset="50%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#94A3B8" />
      </linearGradient>
      <linearGradient id="propSteel" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#94A3B8" />
        <stop offset="50%" stopColor="#E2E8F0" />
        <stop offset="100%" stopColor="#94A3B8" />
      </linearGradient>
    </defs>
    <g transform="translate(100,100)">
      {/* 4-blade executive propeller — sleek tapered blades */}
      <path d="M0,-90 C6,-70 8,-25 3,-5 L0,0 L-3,-5 C-8,-25 -6,-70 0,-90" fill="url(#propSteel)" opacity="0.7" />
      <path d="M90,0 C70,6 25,8 5,3 L0,0 L5,-3 C25,-8 70,-6 90,0" fill="url(#propSteel)" opacity="0.7" />
      <path d="M0,90 C-6,70 -8,25 -3,5 L0,0 L3,5 C8,25 6,70 0,90" fill="url(#propSteel)" opacity="0.7" />
      <path d="M-90,0 C-70,-6 -25,-8 -5,-3 L0,0 L-5,3 C-25,8 -70,6 -90,0" fill="url(#propSteel)" opacity="0.7" />
      {/* Hub — silver center */}
      <circle cx="0" cy="0" r="10" fill="url(#propSilver)" />
      <circle cx="0" cy="0" r="6" fill="url(#propSteel)" opacity="0.4" />
      <circle cx="0" cy="0" r="3" fill="url(#propSilver)" opacity="0.9" />
    </g>
  </svg>
);

/* ═══════════════════════════════════════════════
   About — Brand Vision Page
   ═══════════════════════════════════════════════ */

const About = () => (
  <div className="about-page">

    {/* ════════════════════════════════════════
       HERO
       ════════════════════════════════════════ */}
    <section className="about-hero">
      <ExecutivePropeller />

      <div className="about-hero-content">
        <span className="about-badge">Brand Vision</span>
        <h1 className="about-heading">
          Enclave
        </h1>
        <p className="about-tagline">
          Redefining Strategic Management
        </p>
        <div className="about-divider" />
        <p className="about-hero-sub">
          Where aeronautical precision meets business intelligence.
          We engineer altitude for ideas that refuse to stay grounded.
        </p>
      </div>
    </section>

    {/* ════════════════════════════════════════
       THE MISSION
       ════════════════════════════════════════ */}
    <section className="about-section">
      <div className="about-container">
        <span className="about-section-label">01 &mdash; The Mission</span>
        <h2 className="about-section-heading">
          Engineered for Flight
        </h2>

        <div className="about-columns">
          <div className="about-col">
            <p>
              Every great venture begins on the runway. Propel AI is the control
              tower &mdash; scanning the horizon, calculating headwinds, and
              charting the optimal flight path before you ever leave the ground.
            </p>
            <p>
              We believe strategy should operate like aerodynamics: invisible
              forces that create lift. Our AI analyses don&rsquo;t just describe
              your market &mdash; they give your ideas the thrust to break through
              competitive drag and reach cruising altitude.
            </p>
          </div>
          <div className="about-col">
            <p>
              In aviation, every instrument serves a purpose. There is no clutter
              in a cockpit. We apply the same philosophy to strategic management:
              only the data that matters, presented with the clarity a pilot
              demands at 40,000 feet.
            </p>
            <p>
              From market turbulence analysis to technology stack recommendations,
              every output is calibrated to help founders navigate with confidence
              &mdash; turning uncertainty into a flight plan.
            </p>
          </div>
        </div>
      </div>
    </section>

    {/* ════════════════════════════════════════
       THE FOUNDER
       ════════════════════════════════════════ */}
    <section className="about-section about-section-dark">
      <div className="about-container">
        <span className="about-section-label about-label-light">02 &mdash; The Founder</span>
        <h2 className="about-section-heading about-heading-light">
          Building the Powerhouse
        </h2>

        <div className="about-founder-text">
          <p>
            Propel AI was born from a singular conviction: that the next generation
            of web applications and startups deserve institutional-grade strategy
            from day one &mdash; not after the runway has already burned through.
          </p>
          <p>
            The vision is to create an enclave &mdash; a powerhouse where
            cutting-edge AI, lean engineering, and high-level management converge.
            A place where solo founders gain the strategic firepower of an entire
            advisory board, and where every analysis propels them closer to
            product-market fit.
          </p>
          <p>
            This isn&rsquo;t a tool. It&rsquo;s a co-pilot built for builders who think in
            trajectories, not timelines &mdash; and who measure progress in
            altitude gained, not hours spent.
          </p>
        </div>
      </div>
    </section>

    {/* ════════════════════════════════════════
       PRINCIPLES
       ════════════════════════════════════════ */}
    <section className="about-section">
      <div className="about-container">
        <span className="about-section-label">03 &mdash; Principles</span>
        <h2 className="about-section-heading">
          Flight Manual
        </h2>

        <div className="about-principles">
          {[
            {
              num: 'I',
              title: 'Precision Over Volume',
              text: 'One sharp analysis outweighs a hundred shallow reports. We optimise for signal, never noise.',
            },
            {
              num: 'II',
              title: 'Altitude Thinking',
              text: 'Zoom out first. Understand the full airspace before choosing a heading. Strategy precedes execution.',
            },
            {
              num: 'III',
              title: 'Minimal Drag',
              text: 'Every interface element, every data point earns its place. If it doesn\u2019t create lift, it\u2019s removed.',
            },
          ].map((p) => (
            <div key={p.num} className="principle-card">
              <span className="principle-num">{p.num}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>

    {/* ════════════════════════════════════════
       CTA
       ════════════════════════════════════════ */}
    <section className="about-cta">
      <ExecutivePropeller />
      <div className="about-cta-content">
        <h2>Ready to Propel?</h2>
        <p>Your runway is clear. Engines are primed. It&rsquo;s time for liftoff.</p>
        <Link to="/" className="btn-primary about-cta-btn">
          <span>Go to Dashboard</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  </div>
);

export default About;
