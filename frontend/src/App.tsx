import React from 'react';

export function App() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-indigo-400">EOD Admin Dashboard</h1>
        <p className="text-sm text-slate-400">
          Operation Supervision, Analytics & Admin 2FA Management Portal.
        </p>
        <div className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono rounded-full">
          Phase 0 Scaffold Ready
        </div>
      </div>
    </div>
  );
}

export default App;
