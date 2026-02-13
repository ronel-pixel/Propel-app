import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import Dashboard from '@/components/Dashboard';
import History from '@/pages/History';
import About from '@/pages/About';
import Landing from '@/pages/Landing';

/* ─── Protected Route wrapper ─── */

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  /* Layout already shows loading state — render nothing while it resolves */
  if (loading) return null;

  /* Not authenticated → redirect to landing */
  if (!user) return <Navigate to="/landing" replace />;

  /* Authenticated → render child routes */
  return <Outlet />;
};

/* ─── App ─── */

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<Layout />}>
        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<History />} />
        </Route>

        {/* Public routes */}
        <Route path="/about" element={<About />} />
        <Route path="/landing" element={<Landing />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export default App;
