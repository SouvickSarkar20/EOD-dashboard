import React, { useState, useEffect } from 'react';
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
  ArrowRight,
  Edit3,
  X,
  Save,
  Loader2
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';

export function Settings() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuthStore();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [dmid, setDmid] = useState(user?.dmid || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setDmid(user.dmid || '');
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOpenModal = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setDmid(user?.dmid || '');
    setError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await api.put('/api/auth/me', {
        name,
        email,
        dmid
      });

      updateUser(response.data);
      setIsEditModalOpen(false);
      setSuccessMsg('Profile details updated and saved successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update profile details. Please try again.');
    } finally {
      setSaving(false);
    }
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

      {/* Success Notification Banner */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center space-x-3 text-emerald-900 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-6 h-6 text-emerald-700 flex-shrink-0" />
          <span className="text-sm font-bold">{successMsg}</span>
        </div>
      )}

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
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-slate-100 text-slate-800 rounded-xl">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">User Profile Information</h2>
                <p className="text-xs text-slate-500">Your registered account credentials and assigned operational scope</p>
              </div>
            </div>

            {/* Edit Profile Button */}
            <button
              type="button"
              onClick={handleOpenModal}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile Details</span>
            </button>
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
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">DM ID / User Identifier</span>
              <div className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-slate-500" />
                <span>{user?.dmid || 'ADMIN001'}</span>
              </div>
            </div>

          </div>

          {/* Quick Actions (Temporarily hidden for testing) */}
          {false && (
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
          )}
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

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-6">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-700 rounded-xl text-white">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Edit Profile Details</h3>
                  <p className="text-xs text-slate-300">Update your full name, email address, and user identifier</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content / Form */}
            <form onSubmit={handleSaveProfile} className="p-6 pt-0 space-y-4">
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start space-x-2.5 text-red-800 text-xs">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@demo.com"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              {/* DM ID / Identifier */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  DM ID / User Identifier
                </label>
                <input
                  type="text"
                  value={dmid}
                  onChange={(e) => setDmid(e.target.value)}
                  placeholder="ADMIN001"
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile Details</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default Settings;
