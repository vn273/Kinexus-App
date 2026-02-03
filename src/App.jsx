import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ContactProvider } from './contexts/ContactContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { GamificationProvider } from './contexts/GamificationContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NetworkingTracker from './pages/NetworkingTracker';
import NetworkGraphPage from './pages/NetworkGraphPage';
import Settings from './pages/Settings';

// Protected Route wrapper - redirects to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // Require login - redirect to login page if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route wrapper - redirects to dashboard if already authenticated
const PublicRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <ErrorBoundary>
            <Dashboard />
          </ErrorBoundary>
        </ProtectedRoute>
      } />
      <Route path="/networking" element={
        <ProtectedRoute>
          <ErrorBoundary>
            <NetworkingTracker />
          </ErrorBoundary>
        </ProtectedRoute>
      } />
      <Route path="/network-graph" element={
        <ProtectedRoute>
          <ErrorBoundary>
            <NetworkGraphPage />
          </ErrorBoundary>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <ErrorBoundary>
            <Settings />
          </ErrorBoundary>
        </ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SettingsProvider>
          <ContactProvider>
            <GamificationProvider>
              <Router>
                <AppRoutes />
              </Router>
            </GamificationProvider>
          </ContactProvider>
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
