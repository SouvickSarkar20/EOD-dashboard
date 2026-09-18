import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Smartphone, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export function Verify2FA() {
  const navigate = useNavigate();
  const tempToken = useAuthStore((s) => s.tempToken);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);

  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || totpCode.length < 6) {
      setError('Please enter the complete 6-digit security code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post(
        '/api/auth/admin/supabase-2fa/verify-login',
        { totp_code: totpCode },
        { headers: { Authorization: `Bearer ${tempToken}` } }
      );

      const data = response.data;
      setAuth(data.user, data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Invalid security code. Please check your authenticator app and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-8 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-700 text-white shadow-lg mb-1">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Two-Factor Security Verification</h1>
          <p className="text-slate-300 text-sm">
            Administrator 2FA Protection Enabled
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          
          {/* Plain language explanation card for non-tech users */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3 text-slate-800 text-xs">
            <Smartphone className="w-5 h-5 text-blue-900 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">How to get your 6-digit code:</p>
              <p className="text-slate-600 mt-1">
                Open the <strong>Google Authenticator</strong> or <strong>Authy</strong> app on your mobile phone and type the current 6-digit security code shown for your account.
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Verification Problem</p>
                <p className="text-red-700 text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleVerify} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800 text-center">
                6-Digit Security Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                required
                className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || totpCode.length < 6}
              className="w-full bg-blue-900 hover:bg-blue-950 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <span>Verifying Security Code...</span>
              ) : (
                <>
                  <span>Verify and Access Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={handleBackToLogin}
            className="w-full flex items-center justify-center space-x-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition py-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </button>

        </div>
      </div>
    </div>
  );
}
