import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Login } from './pages/Login';
import { Verify2FA } from './pages/Verify2FA';
import { UpdateCredentials } from './pages/UpdateCredentials';
import { SetupSupabaseMFA } from './pages/SetupSupabaseMFA';
import { ChangePassword } from './pages/ChangePassword';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/DashboardLayout';

function RootRedirect() {
  const token = useAuthStore((s) => s.token);
  return token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

// Temporary page placeholders until Phase 11-14 pages are built
function OverviewPlaceholder() {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <h2 className="text-xl font-bold text-slate-900">Executive Overview</h2>
      <p className="text-xs text-slate-600">
        Phase 11 Overview Dashboard will display KPI Cards, District Performance Charts, MoM Line Charts, and DM Rankings.
      </p>
    </div>
  );
}

function DmsPlaceholder() {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <h2 className="text-xl font-bold text-slate-900">District Managers Directory</h2>
      <p className="text-xs text-slate-600">
        Phase 12 DM Management page with Add DM, Edit Credentials, Reset Password, and DM Detail Drawer.
      </p>
    </div>
  );
}

function MonthlyPlaceholder() {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <h2 className="text-xl font-bold text-slate-900">Monthly Analytics Table</h2>
      <p className="text-xs text-slate-600">
        Phase 13 Paginated Monthly records with fee tier breakdowns and revenue statistics.
      </p>
    </div>
  );
}

function DailyPlaceholder() {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <h2 className="text-xl font-bold text-slate-900">Daily Operational Logs</h2>
      <p className="text-xs text-slate-600">
        Phase 13 Day-by-day logs with date range picker and operator breakdown drawer.
      </p>
    </div>
  );
}

function AnomaliesPlaceholder() {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <h2 className="text-xl font-bold text-slate-900">Anomaly Warning Center</h2>
      <p className="text-xs text-slate-600">
        Phase 14 Operational red flags (DM decline &ge; 20%, silent stations &ge; 7 days, low performers).
      </p>
    </div>
  );
}

function ReportsPlaceholder() {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <h2 className="text-xl font-bold text-slate-900">Reports & Excel/CSV Exports</h2>
      <p className="text-xs text-slate-600">
        Phase 14 One-click download center for monthly, daily, and anomaly reports in .xlsx and .csv formats.
      </p>
    </div>
  );
}

function SettingsPlaceholder() {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <h2 className="text-xl font-bold text-slate-900">Settings & Security</h2>
      <p className="text-xs text-slate-600">
        Phase 15 Credentials management and Supabase 2FA TOTP configuration.
      </p>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/verify-2fa" element={<Verify2FA />} />
        <Route
          path="/update-credentials"
          element={
            <ProtectedRoute requireAdmin>
              <UpdateCredentials />
            </ProtectedRoute>
          }
        />
        <Route
          path="/setup-2fa"
          element={
            <ProtectedRoute requireAdmin>
              <SetupSupabaseMFA />
            </ProtectedRoute>
          }
        />
        <Route
          path="/change-password"
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        {/* Dashboard Shell with Layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OverviewPlaceholder />} />
          <Route
            path="dms"
            element={
              <ProtectedRoute requireAdmin>
                <DmsPlaceholder />
              </ProtectedRoute>
            }
          />
          <Route path="monthly" element={<MonthlyPlaceholder />} />
          <Route path="daily" element={<DailyPlaceholder />} />
          <Route path="anomalies" element={<AnomaliesPlaceholder />} />
          <Route path="reports" element={<ReportsPlaceholder />} />
          <Route path="settings" element={<SettingsPlaceholder />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
