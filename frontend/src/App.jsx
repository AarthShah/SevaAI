import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { AssistantProvider } from './context/AssistantContext';
import { AssistantPanel } from './components/AssistantPanel';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LanguageProvider } from './context/LanguageContext';
import { LanguagePicker } from './components/LanguagePicker';

// Load each page only when its route is opened so the public landing page stays light.
const loadPage = (importer, exportName) =>
  lazy(() => importer().then((module) => ({ default: module[exportName] })));

const LandingPage = loadPage(() => import('./pages/LandingPage'), 'LandingPage');
const ReportIssuePage = loadPage(() => import('./pages/ReportIssuePage'), 'ReportIssuePage');
const TrackComplaintPage = loadPage(() => import('./pages/TrackComplaintPage'), 'TrackComplaintPage');
const CitizenDashboard = loadPage(() => import('./pages/CitizenDashboard'), 'CitizenDashboard');
const AuthorityDashboard = loadPage(() => import('./pages/AuthorityDashboard'), 'AuthorityDashboard');
const EvaluationPage = loadPage(() => import('./pages/EvaluationPage'), 'EvaluationPage');
const LoginPage = loadPage(() => import('./pages/LoginPage'), 'LoginPage');
const RegisterPage = loadPage(() => import('./pages/RegisterPage'), 'RegisterPage');
const TermsPage = loadPage(() => import('./pages/TermsPage'), 'TermsPage');
const PrivacyPage = loadPage(() => import('./pages/PrivacyPage'), 'PrivacyPage');
const FieldCrewPage = loadPage(() => import('./pages/FieldCrewPage'), 'FieldCrewPage');


const AppContent = () => {
  const location = useLocation();
  const isAuthority = location.pathname.startsWith('/authority') || location.pathname === '/crew';

  return (
    <div className={`flex flex-col min-h-screen ${isAuthority ? 'bg-[#F8FAFC]' : 'bg-white'} text-slate-900`}>
      <Navbar />
      <LanguagePicker />
      <main className="flex-1">
        <Suspense fallback={<div className="grid min-h-48 place-items-center text-sm text-slate-500" role="status">Loading page…</div>}>
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
        </Suspense>
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
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
