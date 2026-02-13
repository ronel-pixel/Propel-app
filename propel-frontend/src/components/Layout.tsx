import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from './Header';
import Footer from './Footer';
import PaymentModal from './PaymentModal';
import AuthModal from './AuthModal';

const Layout = () => {
  const { loading } = useAuth();

  return (
    <div className="app-layout">
      <Header />

      <main className="app-main">
        {loading ? (
          <div className="loading-screen">Loading Propel AI&hellip;</div>
        ) : (
          <Outlet />
        )}
      </main>

      <Footer />

      {/* Global modals — controlled via AuthContext */}
      <PaymentModal />
      <AuthModal />
    </div>
  );
};

export default Layout;
