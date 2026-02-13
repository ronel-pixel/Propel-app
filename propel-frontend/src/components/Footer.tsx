const FooterPropeller = () => (
  <svg viewBox="0 0 100 100" className="footer-propeller" fill="currentColor" aria-hidden="true">
    <g transform="translate(50,50)">
      <path d="M0,-38 C8,-32 10,-12 0,0 C-10,-12 -8,-32 0,-38" opacity="0.85" />
      <path d="M0,-38 C8,-32 10,-12 0,0 C-10,-12 -8,-32 0,-38" opacity="0.85" transform="rotate(120)" />
      <path d="M0,-38 C8,-32 10,-12 0,0 C-10,-12 -8,-32 0,-38" opacity="0.85" transform="rotate(240)" />
      <circle cx="0" cy="0" r="4.5" />
    </g>
  </svg>
);

const Footer = () => (
  <footer className="app-footer">
    <div className="footer-inner">
      <div className="footer-brand">
        <FooterPropeller />
        <span>Propel</span>
        <span className="footer-brand-ai">AI</span>
      </div>
      <span className="footer-copy">
        &copy; {new Date().getFullYear()} Propel &mdash; All rights reserved.
      </span>
    </div>
  </footer>
);

export default Footer;
