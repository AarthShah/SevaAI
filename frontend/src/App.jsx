import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

export const App = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="app-layout min-h-screen text-slate-900">
            <Navbar />
            <main className="app-content">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/report" element={<ReportIssuePage />} />
                <Route path="/track" element={<TrackComplaintPage />} />
                <Route path="/track/:id" element={<TrackComplaintPage />} />
                <Route path="/dashboard" element={<CitizenDashboard />} />
                <Route path="/authority" element={<AuthorityDashboard />} />
                <Route path="/map" element={<MapViewPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/cctv" element={<CCTVVisionPage />} />
                <Route path="/evaluation" element={<EvaluationPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
