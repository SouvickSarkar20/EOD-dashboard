import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, LogOut, User, KeyRound } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function Header() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 px-8 py-4 flex items-center justify-between shadow-sm">
      
      {/* Title / Context */}
      <div>
        <h1 className="text-lg font-bold tracking-tight text-white">
          EOD Analytics & Supervision Portal
        </h1>
        <p className="text-xs text-slate-400">
          Real-time operations dashboard, district tracking, and early anomaly detection
        </p>
      </div>

      {/* Right User Controls */}
      <div className="flex items-center space-x-4">
        
        {/* 2FA Security Badge */}
        {user?.role === 'admin' && (
          user.is_2fa_enabled ? (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>2FA Security Active</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/setup-2fa')}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Configure 2FA Security</span>
            </button>
          )
        )}

        {/* User Info Badge */}
        <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs">
          <User className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-200">{user?.name}</span>
          <span className="text-slate-400 font-mono text-[10px] uppercase bg-slate-700 px-1.5 py-0.5 rounded">
            {user?.role}
          </span>
        </div>

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition"
          title="Sign out of dashboard session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>

      </div>

    </header>
  );
}
