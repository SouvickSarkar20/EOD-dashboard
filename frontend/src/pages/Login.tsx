import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle2, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setTempToken = useAuthStore((s) => s.setTempToken);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/auth/login', { email, password });
      const data = response.data;

      if (data.mfa_required) {
        setTempToken(data.access_token);
        navigate('/verify-2fa');
      } else {
        setAuth(data.user, data.access_token);
        
        if (false && data.user.role === 'admin' && (data.user.is_demo_creds || data.is_demo_creds)) {
          // Temporarily disabled for testing
          navigate('/update-credentials');
        } else if (false && data.user.must_change_password) {
          // Temporarily disabled for testing
          navigate('/change-password');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Sign in failed. Please check your credentials and try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoCreds = () => {
    setEmail('admin@demo.com');
    setPassword('AdminDemo123!');
    setError(null);
  };

  const handleClearForm = () => {
    setEmail('');
    setPassword('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header Strip */}
        <div className="bg-slate-900 text-white p-8 text-center space-y-3 relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-700 text-white shadow-lg mb-1">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">EOD Operations Management</h1>
          <p className="text-slate-300 text-sm">
            Sign in to access your dashboard, station reports, and analytics
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-6">
          
          {/* Demo Pre-fill Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-slate-700 flex-shrink-0" />
              <span>Demo Admin Login Ready</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleFillDemoCreds}
                className="text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
              >
                Use Demo Login
              </button>
              {(email || password) && (
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 px-2 py-1.5 rounded-lg transition"
                  title="Clear inputs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Error Callout */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Sign In Problem</p>
                <p className="text-red-700 text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-slate-800">
                  Email address or DM ID
                </label>
                {email && (
                  <button
                    type="button"
                    onClick={() => setEmail('')}
                    className="text-[11px] text-slate-400 hover:text-slate-600"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.com or ClabDM01"
                  autoComplete="username"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent text-sm transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-slate-800">
                  Password
                </label>
                {password && (
                  <button
                    type="button"
                    onClick={() => setPassword('')}
                    className="text-[11px] text-slate-400 hover:text-slate-600"
                  >
                    Clear password
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full pl-11 pr-11 py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent text-sm transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-900 hover:bg-blue-950 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center space-y-1 pt-1">
            <p className="text-xs text-slate-500">
              Note: If you updated your email & password, sign in with your updated credentials.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
