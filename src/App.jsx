import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DeviceProvider, useDevice } from './context/DeviceContext';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import PDFTools from './pages/PDFTools';
import History from './pages/History';
import Pricing from './pages/Pricing';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminPayments from './pages/admin/AdminPayments';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminSystem from './pages/admin/AdminSystem';

// Mobile Pages
import MobileHome from './mobile/MobileHome';
import QuickScan from './mobile/QuickScan';

// Components
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import AdminRoute from './components/AdminRoute';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

function AppRoutes() {
  const { isMobile, isDetecting } = useDevice();

  // Show loading while detecting device
  if (isDetecting) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* ============ MOBILE ROUTES ============ */}
      {/* These routes are ONLY for mobile users */}
      
      {/* Mobile Home - redirects mobile users from root */}
      <Route 
        path="/mobile" 
        element={isMobile ? <MobileHome /> : <Navigate to="/" replace />} 
      />
      
      {/* Mobile Feature 1: Quick Scan & Translate */}
      <Route 
        path="/mobile/quick-scan" 
        element={isMobile ? <QuickScan /> : <Navigate to="/scanner" replace />} 
      />
      
      {/* Mobile Feature 2: Create PDF (coming soon) */}
      <Route 
        path="/mobile/create-pdf" 
        element={isMobile ? <MobileHome /> : <Navigate to="/scanner" replace />} 
      />
      
      {/* Mobile Feature 3: Extract Tables (coming soon) */}
      <Route 
        path="/mobile/extract-tables" 
        element={isMobile ? <MobileHome /> : <Navigate to="/scanner" replace />} 
      />
      
      {/* Mobile Feature 4: AI OCR Pro (coming soon) */}
      <Route 
        path="/mobile/ai-ocr-pro" 
        element={isMobile ? <MobileHome /> : <Navigate to="/scanner" replace />} 
      />
      
      {/* Mobile My Files (coming soon) */}
      <Route 
        path="/mobile/my-files" 
        element={isMobile ? <MobileHome /> : <Navigate to="/history" replace />} 
      />

      {/* ============ PUBLIC ROUTES ============ */}
      {/* Root path - redirect mobile users to mobile home */}
      <Route 
        path="/" 
        element={isMobile ? <Navigate to="/mobile" replace /> : <Landing />} 
      />
      
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route path="/pricing" element={<Pricing />} />
      
      {/* Scanner - redirect mobile users to mobile quick scan */}
      <Route
        path="/scanner"
        element={
          isMobile ? (
            <Navigate to="/mobile/quick-scan" replace />
          ) : (
            <Layout>
              <Scanner />
            </Layout>
          )
        }
      />
      
      {/* PDF Tools - Now PUBLIC (no login required) */}
      <Route
        path="/pdf-tools"
        element={
          <Layout>
            <PDFTools />
          </Layout>
        }
      />

      {/* Protected Routes (still require login) */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <Layout>
              <History />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <AdminDashboard />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <AdminUsers />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <AdminPayments />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <AdminAnalytics />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/system"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <Layout>
                <AdminSystem />
              </Layout>
            </AdminRoute>
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DeviceProvider>
          <AppRoutes />
        </DeviceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
