import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ContactProvider } from './contexts/ContactContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { GamificationProvider } from './contexts/GamificationContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NetworkingTracker from './pages/NetworkingTracker';
import NetworkGraphPage from './pages/NetworkGraphPage';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ContactProvider>
          <GamificationProvider>
            <Router>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/networking" element={<NetworkingTracker />} />
                <Route path="/network-graph" element={<NetworkGraphPage />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/" element={<Navigate to="/login" replace />} />
              </Routes>
            </Router>
          </GamificationProvider>
        </ContactProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
