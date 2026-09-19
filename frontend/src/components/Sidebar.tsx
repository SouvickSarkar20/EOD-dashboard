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
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
      
      {/* App Branding */}
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
        <div className="p-2.5 rounded-xl bg-blue-700 text-white shadow-md">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight leading-tight">
            EOD Operations
          </h2>
          <span className="text-[11px] text-slate-400 font-medium">
            Management Dashboard
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
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
                `flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-blue-800 text-white shadow-md font-bold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Status Card at Sidebar Bottom */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-blue-900 text-white font-bold flex items-center justify-center text-xs">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-400 truncate capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

    </aside>
  );
}
