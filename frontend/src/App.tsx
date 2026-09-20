import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Login } from './pages/Login';
import { Verify2FA } from './pages/Verify2FA';
import { UpdateCredentials } from './pages/UpdateCredentials';
import { SetupSupabaseMFA } from './pages/SetupSupabaseMFA';
import { ChangePassword } from './pages/ChangePassword';
import { Overview } from './pages/Overview';
import { DistrictManagers } from './pages/DistrictManagers';
import { MonthlyAnalysis } from './pages/MonthlyAnalysis';
import { DailyAnalysis } from './pages/DailyAnalysis';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/DashboardLayout';

function RootRedirect() {
  const token = useAuthStore((s) => s.token);
  return token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

// Temporary placeholders for remaining pages (Phases 12-15)
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

import { AnomaliesCenter } from './pages/AnomaliesCenter';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

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
          <Route index element={<Overview />} />
          <Route
            path="dms"
            element={
              <ProtectedRoute requireAdmin>
                <DistrictManagers />
              </ProtectedRoute>
            }
          />
          <Route path="monthly" element={<MonthlyAnalysis />} />
          <Route path="daily" element={<DailyAnalysis />} />
          <Route path="anomalies" element={<AnomaliesCenter />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
