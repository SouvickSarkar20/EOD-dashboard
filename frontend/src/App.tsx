import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Login } from './pages/Login';
import { Verify2FA } from './pages/Verify2FA';
import { UpdateCredentials } from './pages/UpdateCredentials';
import { SetupSupabaseMFA } from './pages/SetupSupabaseMFA';
import { ChangePassword } from './pages/ChangePassword';
import { ProtectedRoute } from './components/ProtectedRoute';

function RootRedirect() {
  const token = useAuthStore((s) => s.token);
  return token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

function DashboardPlaceholder() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
        <div className="inline-flex p-3 rounded-xl bg-blue-50 text-blue-900 border border-blue-200">
          <span className="font-bold text-sm">EOD Operations Dashboard</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">Welcome, {user?.name}!</h1>
        <p className="text-xs text-slate-600">
          Role: <span className="font-semibold capitalize">{user?.role}</span> | Email: {user?.email}
        </p>

        {user?.is_2fa_enabled ? (
          <div className="p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold">
            Supabase 2FA Protection Active
          </div>
        ) : (
          <div className="p-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs">
            2FA Security Not Enabled
          </div>
        )}

        <div className="pt-4 space-y-2">
          {user?.role === 'admin' && (
            <>
              <a
                href="/update-credentials"
                className="block w-full py-2.5 bg-slate-100 text-slate-800 font-medium rounded-xl text-xs hover:bg-slate-200 transition"
              >
                Update Admin Credentials
              </a>
              <a
                href="/setup-2fa"
                className="block w-full py-2.5 bg-blue-900 text-white font-medium rounded-xl text-xs hover:bg-blue-950 transition"
              >
                Configure Supabase 2FA
              </a>
            </>
          )}
          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl text-xs hover:bg-slate-200 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
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
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPlaceholder />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
