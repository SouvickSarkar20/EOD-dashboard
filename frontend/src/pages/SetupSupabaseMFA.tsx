import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, ShieldCheck, ArrowRight, AlertCircle, CheckCircle2, Copy } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export function SetupSupabaseMFA() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleEnroll = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/api/auth/admin/supabase-2fa/enroll');
      const data = response.data;
      setQrCodeUrl(data.qr_code_svg || data.qr_code_url);
      setSecret(data.secret);
      setFactorId(data.factor_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate 2FA security QR Code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpCode || totpCode.length < 6 || !factorId) {
      setError('Please enter the 6-digit verification code from your authenticator app.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/api/auth/admin/supabase-2fa/verify-enrollment', {
        factor_id: factorId,
        totp_code: totpCode,
      });

      updateUser({ is_2fa_enabled: true });
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-8 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-700 text-white shadow-lg mb-1">
            <QrCode className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Set Up Two-Factor Authentication</h1>
          <p className="text-slate-300 text-sm">
            Add an extra layer of protection to your Administrator account
          </p>
        </div>

        <div className="p-8 space-y-6">
          
          {success ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-emerald-900">2FA Security Enabled!</h3>
              <p className="text-slate-600 text-xs">
                Your account is now protected with Supabase Two-Factor Authentication. Redirecting to dashboard...
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 text-red-800 text-sm">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Setup Issue</p>
                    <p className="text-red-700 text-xs mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {!qrCodeUrl ? (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-slate-600">
                    Two-Factor Authentication generates a unique 6-digit code on your mobile phone whenever you log in.
                  </p>
                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={loading}
                    className="w-full bg-blue-900 hover:bg-blue-950 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <span>Generating QR Code...</span>
                    ) : (
                      <>
                        <span>Generate Security QR Code</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      Step 1: Scan with Authenticator App
                    </p>
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      {qrCodeUrl.startsWith('data:image') || qrCodeUrl.startsWith('http') ? (
                        <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48 rounded-lg shadow-sm" />
                      ) : (
                        <div
                          className="w-48 h-48 bg-white p-2 border border-slate-200 rounded-lg flex items-center justify-center text-xs"
                          dangerouslySetInnerHTML={{ __html: qrCodeUrl }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Secret Key display */}
                  {secret && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                      <div className="text-xs space-y-0.5">
                        <span className="text-slate-500 block">Manual Secret Key:</span>
                        <span className="font-mono font-bold text-slate-800">{secret}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopySecret}
                        className="text-xs text-blue-900 bg-white border border-slate-300 hover:bg-slate-100 px-3 py-1.5 rounded-lg flex items-center space-x-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  )}

                  {/* Step 2 */}
                  <form onSubmit={handleVerifyEnrollment} className="space-y-4 pt-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
                      Step 2: Enter Verification Code
                    </p>
                    <input
                      type="text"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent"
                    />

                    <button
                      type="submit"
                      disabled={loading || totpCode.length < 6}
                      className="w-full bg-blue-900 hover:bg-blue-950 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center space-x-2 text-sm disabled:opacity-50"
                    >
                      {loading ? (
                        <span>Verifying...</span>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Confirm and Enable 2FA</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              Cancel and Return to Dashboard
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
