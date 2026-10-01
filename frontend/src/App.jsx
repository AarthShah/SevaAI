import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AssistantProvider } from './context/AssistantContext';
import { AssistantPanel } from './components/AssistantPanel';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LanguageProvider } from './context/LanguageContext';
import { LanguagePicker } from './components/LanguagePicker';

// Pages
import { LandingPage } from './pages/LandingPage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { TrackComplaintPage } from './pages/TrackComplaintPage';
import { CitizenDashboard } from './pages/CitizenDashboard';
import { AuthorityDashboard } from './pages/AuthorityDashboard';
import { EvaluationPage } from './pages/EvaluationPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { FieldCrewPage } from './pages/FieldCrewPage';


const AppContent = () => {
  const location = useLocation();
  const isAuthority = location.pathname.startsWith('/authority') || location.pathname === '/crew';

  return (
    <div className={`flex flex-col min-h-screen ${isAuthority ? 'bg-[#F8FAFC]' : 'bg-white'} text-slate-900`}>
      <Navbar />
      <LanguagePicker />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/report" element={<ReportIssuePage />} />
          <Route path="/track" element={<TrackComplaintPage />} />
          <Route path="/track/:id" element={<TrackComplaintPage />} />
          <Route path="/dashboard" element={<CitizenDashboard />} />
          <Route path="/authority" element={<AuthorityDashboard />} />
          <Route path="/crew" element={<FieldCrewPage />} />
          <Route path="/map" element={<Navigate to="/authority?tab=MAP" replace />} />
          <Route path="/analytics" element={<Navigate to="/authority?tab=ANALYTICS" replace />} />
          <Route path="/cctv" element={<Navigate to="/authority?tab=CCTV" replace />} />
          <Route path="/audit-logs" element={<Navigate to="/authority?tab=AUDIT_LOGS" replace />} />
          <Route path="/authority/audit-logs" element={<Navigate to="/authority?tab=AUDIT_LOGS" replace />} />
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
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <AssistantProvider>
            <Router>
              <AppContent />
              <AssistantPanel />
            </Router>
          </AssistantProvider>
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;
