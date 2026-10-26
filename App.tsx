import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { HumanDisclaimerBanner } from './components/layout/HumanDisclaimerBanner';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { ApplicationsPage } from './pages/ApplicationsPage';
import { CreateApplicationPage } from './pages/CreateApplicationPage';
import { ApplicationDetailPage } from './pages/ApplicationDetailPage';
import { DocumentUploadPage } from './pages/DocumentUploadPage';
import { ExtractedFieldsPage } from './pages/ExtractedFieldsPage';
import { DocumentViewerPage } from './pages/DocumentViewerPage';
import { VerificationFindingsPage } from './pages/VerificationFindingsPage';
import { ClaimEvidenceGraphPage } from './pages/ClaimEvidenceGraphPage';
import { ReviewQueuePage } from './pages/ReviewQueuePage';
import { ComplianceRulesPage } from './pages/ComplianceRulesPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { ReportsPage } from './pages/ReportsPage';
import { VerificationCentrePage } from './pages/VerificationCentrePage';
import { SettingsStatusPage } from './pages/SettingsStatusPage';

export function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
        <HumanDisclaimerBanner />
        <Header />
        
        <div className="flex-1 flex">
          <Sidebar />
          <main className="flex-1 p-6 max-w-7xl w-full mx-auto overflow-x-hidden">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/applications" element={<ApplicationsPage />} />
              <Route path="/applications/new" element={<CreateApplicationPage />} />
              <Route path="/applications/:id" element={<ApplicationDetailPage />} />
              <Route path="/upload" element={<DocumentUploadPage />} />
              <Route path="/fields" element={<ExtractedFieldsPage />} />
              <Route path="/documents/:id" element={<DocumentViewerPage />} />
              <Route path="/findings" element={<VerificationFindingsPage />} />
              <Route path="/graph" element={<ClaimEvidenceGraphPage />} />
              <Route path="/review-queue" element={<ReviewQueuePage />} />
              <Route path="/rules" element={<ComplianceRulesPage />} />
              <Route path="/audit" element={<AuditTrailPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/verification-centre" element={<VerificationCentrePage />} />
              <Route path="/settings" element={<VerificationCentrePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
