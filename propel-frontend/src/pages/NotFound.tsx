import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import './NotFound.css';

const NotFound = () => {
  const { user } = useAuth();
  const homePath = user ? '/' : '/landing';

  return (
    <section className="nf-page">
      <div className="nf-grid-bg" aria-hidden="true" />

      <div className="nf-content">
        <motion.div
          className="nf-propeller-wrap"
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          aria-hidden="true"
        >
          <svg className="nf-propeller" viewBox="0 0 120 120" fill="none">
            <g transform="translate(60,60)">
              <path d="M0,-50 C6,-34 7,-14 2,-4 L0,0 L-2,-4 C-7,-14 -6,-34 0,-50" fill="#60A5FA" opacity="0.92" />
              <path d="M50,0 C34,6 14,7 4,2 L0,0 L4,-2 C14,-7 34,-6 50,0" fill="#60A5FA" opacity="0.92" />
              <path d="M0,50 C-6,34 -7,14 -2,4 L0,0 L2,4 C7,14 6,34 0,50" fill="#60A5FA" opacity="0.92" />
              <path d="M-50,0 C-34,-6 -14,-7 -4,-2 L0,0 L-4,2 C-14,7 -34,6 -50,0" fill="#60A5FA" opacity="0.92" />
              <circle cx="0" cy="0" r="10" fill="#BFDBFE" />
              <circle cx="0" cy="0" r="5" fill="#0A1120" opacity="0.85" />
            </g>
          </svg>
        </motion.div>

        <h1 className="nf-title">Page Not Found</h1>
        <p className="nf-subtitle">Error 404 - You&apos;ve drifted off course.</p>

        <Link to={homePath} className="btn-primary nf-home-btn">
          Back to Home
        </Link>
      </div>
    </section>
  );
};

export default NotFound;
