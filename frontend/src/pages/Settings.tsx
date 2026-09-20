import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Key,
  User,
  Mail,
  Building2,
  QrCode,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Info,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-8 pb-12">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center space-x-3">
          <ShieldCheck className="w-7 h-7 text-blue-900" />
          <span>Settings & Account Security</span>
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage your account credentials, security preferences, Supabase 2FA TOTP authentication, and active dashboard sessions.
        </p>
      </div>

      {/* Non-Technical Usability Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start space-x-4 text-blue-950">
        <div className="p-2.5 rounded-xl bg-blue-900 text-white flex-shrink-0 mt-0.5">
          <Info className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-blue-950">Account Security Guidelines</h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            Keep your login credentials safe. Administrators can configure Two-Factor Authentication (2FA) via Google Authenticator or Authy to require a 6-digit security code on each login.
          </p>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Profile Card (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
            <div className="p-3 bg-slate-100 text-slate-800 rounded-xl">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">User Profile Information</h2>
              <p className="text-xs text-slate-500">Your registered account credentials and assigned operational scope</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Full Name</span>
              <div className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <User className="w-4 h-4 text-slate-500" />
                <span>{user?.name || 'Administrator User'}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Email Address</span>
              <div className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Mail className="w-4 h-4 text-slate-500" />
                <span>{user?.email || 'admin@demo.com'}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Access Role</span>
              <div className="pt-0.5">
                {isAdmin ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs rounded-full">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>System Administrator (Full Privileges)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-blue-100 text-blue-900 border border-blue-200 font-bold text-xs rounded-full">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>District Manager</span>
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">DM ID / District Assignment</span>
              <div className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>{user?.dmid ? `${user.dmid}` : 'All Districts (Supervision Scope)'}</span>
              </div>
            </div>

          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-sm font-bold text-slate-900">Account Password</span>
              <p className="text-xs text-slate-500">Update your login password regularly to protect your operational data.</p>
            </div>
            
            <button
              type="button"
              onClick={() => navigate('/change-password')}
              className="flex items-center space-x-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>Change Account Password</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        {/* Security & 2FA Card (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            
            <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Two-Factor Security (2FA)</h2>
                <p className="text-xs text-slate-500">Supabase TOTP Authenticator Protection</p>
              </div>
            </div>

            {/* 2FA Status Badge */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Security Status</span>
              {user?.is_2fa_enabled ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-900 font-extrabold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                    <span>2FA Authenticator Enabled</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Your account requires a 6-digit TOTP verification code from Google Authenticator or Authy during login.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-amber-900 font-extrabold text-sm">
                    <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0" />
                    <span>2FA Not Yet Configured</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Enhance your administrator account security by connecting an authenticator app.
                  </p>
                </div>
              )}
            </div>

            {/* Admin 2FA Setup Actions */}
            {isAdmin && (
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/setup-2fa')}
                  className="w-full flex items-center justify-center space-x-2 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Configure 2FA Authenticator</span>
                </button>
              </div>
            )}

          </div>

          {/* Log Out Action */}
          <div className="pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs border border-red-200 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out of Dashboard Session</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Settings;
