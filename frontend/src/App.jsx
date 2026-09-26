import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { LandingPage } from './pages/LandingPage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { TrackComplaintPage } from './pages/TrackComplaintPage';
import { CitizenDashboard } from './pages/CitizenDashboard';
import { AuthorityDashboard } from './pages/AuthorityDashboard';
import { MapViewPage } from './pages/MapViewPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CCTVVisionPage } from './pages/CCTVVisionPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';

const AppShell = () => {
  const location = useLocation();
  const isAuthority = location.pathname.startsWith('/authority');

  return (
    <div className={`flex flex-col min-h-screen ${isAuthority ? 'bg-[#F8FAFC]' : 'bg-white'} text-slate-900`}>
      {!isAuthority && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/report" element={<ReportIssuePage />} />
          <Route path="/track" element={<TrackComplaintPage />} />
          <Route path="/track/:id" element={<TrackComplaintPage />} />
          <Route path="/dashboard" element={<CitizenDashboard />} />
          <Route path="/authority" element={<AuthorityDashboard />} />
          <Route path="/map" element={<Navigate to="/authority?tab=MAP" replace />} />
          <Route path="/cctv" element={<Navigate to="/authority?tab=CCTV" replace />} />
          <Route path="/analytics" element={<Navigate to="/authority?tab=ANALYTICS" replace />} />
          <Route path="/evaluation" element={<EvaluationPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAuthority && <Footer />}
    </div>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <AppShell />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
