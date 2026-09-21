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
