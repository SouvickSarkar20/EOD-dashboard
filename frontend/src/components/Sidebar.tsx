import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Calendar,
  Activity,
  AlertTriangle,
  Download,
  Settings,
  Shield,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export function Sidebar() {
  const user = useAuthStore((s) => s.user);

  const navItems = [
    {
      to: '/dashboard',
      label: 'Executive Overview',
      icon: BarChart3,
      adminOnly: false,
      end: true,
    },
    {
      to: '/dashboard/dms',
      label: 'District Managers',
      icon: Users,
      adminOnly: true,
      end: false,
    },
    {
      to: '/dashboard/monthly',
      label: 'Monthly Summaries',
      icon: Calendar,
      adminOnly: false,
      end: false,
    },
    {
      to: '/dashboard/daily',
      label: 'Daily Operational Logs',
      icon: Activity,
      adminOnly: false,
      end: false,
    },
    {
      to: '/dashboard/anomalies',
      label: 'Anomaly Warning Center',
      icon: AlertTriangle,
      adminOnly: false,
      end: false,
    },
    {
      to: '/dashboard/reports',
      label: 'Reports & Exports',
      icon: Download,
      adminOnly: false,
      end: false,
    },
    {
      to: '/dashboard/settings',
      label: 'Settings & Security',
      icon: Settings,
      adminOnly: false,
      end: false,
    },
  ];

  return (
    <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
      
      {/* App Branding */}
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3.5">
        <div className="p-3 rounded-xl bg-blue-700 text-white shadow-md">
          <Shield className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight leading-tight">
            EOD Operations
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            Supervision & Analytics
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-5 space-y-2 overflow-y-auto">
        <div className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          Navigation Menu
        </div>

        {navItems.map((item) => {
          if (item.adminOnly && user?.role !== 'admin') {
            return null;
          }

          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center space-x-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-blue-800 text-white shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Status Card at Sidebar Bottom */}
      <div className="p-5 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-sm shadow">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

    </aside>
  );
}
