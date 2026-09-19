import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Building2,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Trophy,
  ArrowRight
} from 'lucide-react';
import { api } from '../lib/api';
import { useFilterStore } from '../store/filterStore';
import { useAuthStore } from '../store/authStore';

interface MonthlySummaryOverview {
  kpis: {
    total_enrollment: number;
    total_amount: number;
    total_stations: number;
    active_stations: number;
    total_operators: number;
    mom_growth_pct: number;
  };
  district_comparison: Array<{
    district_id: number;
    district_name: string;
    total_enrollment: number;
    station_count: number;
  }>;
  dm_comparison: Array<{
    dm_user_id: string;
    dm_name: string;
    dmid: string;
    district_name: string;
    total_enrollment: number;
    total_amount: number;
    station_count: number;
  }>;
  category_mix: Array<{
    category: string;
    count: number;
  }>;
  trend: Array<{
    month: number;
    month_name: string;
    total_enrollment: number;
  }>;
}

const COLORS = ['#1E3A8A', '#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#1E293B', '#475569', '#64748B'];

export function Overview() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { month, districtId, dmId } = useFilterStore();

  const [data, setData] = useState<MonthlySummaryOverview | null>(null);
  const [anomalyCount, setAnomalyCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverviewData();
  }, [month, districtId, dmId]);

  const fetchOverviewData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (month) params.month = month;
      if (districtId) params.district_id = districtId;
      if (dmId) params.dm_id = dmId;

      const [summaryRes, anomalyRes] = await Promise.all([
        api.get('/api/monthly/summary', { params }),
        api.get('/api/anomalies/summary', { params }),
      ]);

      setData(summaryRes.data);
      setAnomalyCount(anomalyRes.data.total_anomalies || 0);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load executive overview analytics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-slate-600">Loading Executive Analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800 space-y-2">
        <h3 className="text-base font-bold">Analytics Loading Error</h3>
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchOverviewData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold"
        >
          Try Again
        </button>
      </div>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="space-y-8 pb-12">
      
      {/* Non-Tech Help & Context Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start space-x-4">
        <div className="p-2.5 rounded-xl bg-blue-900 text-white flex-shrink-0 mt-0.5">
          <Info className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-blue-950">Executive Operations Overview</h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            This dashboard displays overall enrollment numbers, active reporting stations, and top performing district managers. 
            Use the <strong>Filter bar at the top of the screen</strong> to narrow results by month or specific district.
          </p>
        </div>
      </div>

      {/* Top Metric Cards (4 KPI Tiles) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Total Enrollments */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Enrollments
            </span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-900">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900">
              {kpis?.total_enrollment ? kpis.total_enrollment.toLocaleString() : '0'}
            </div>
            <div className="flex items-center space-x-1.5 mt-2">
              {kpis && kpis.mom_growth_pct >= 0 ? (
                <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  +{kpis.mom_growth_pct}% MoM
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-lg border border-red-200">
                  <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                  {kpis?.mom_growth_pct}% MoM
                </span>
              )}
              <span className="text-xs text-slate-500">vs previous month</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            Total EOD applications registered across all active stations.
          </p>
        </div>

        {/* Card 2: Active Stations */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active Stations
            </span>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900">
              {kpis?.active_stations || 0} <span className="text-lg font-normal text-slate-500">/ {kpis?.total_stations || 0}</span>
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-2">
              {kpis?.total_stations ? Math.round((kpis.active_stations / kpis.total_stations) * 100) : 0}% Active Coverage
            </div>
          </div>
          <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            Operational stations submitting daily activity logs.
          </p>
        </div>

        {/* Card 3: Active Operators */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Reporting Operators
            </span>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-800">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900">
              {kpis?.total_operators ? kpis.total_operators.toLocaleString() : '0'}
            </div>
            <div className="text-xs font-semibold text-slate-600 mt-2">
              Field Operators Active
            </div>
          </div>
          <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            Operators logging registrations in the selected period.
          </p>
        </div>

        {/* Card 4: Operational Red Flags */}
        <div
          onClick={() => navigate('/dashboard/anomalies')}
          className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 cursor-pointer hover:border-amber-400 transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Operational Red Flags
            </span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-extrabold text-amber-900">
              {anomalyCount}
            </div>
            <div className="text-xs font-semibold text-amber-700 mt-2 flex items-center">
              <span>View Anomaly Warning Center</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </div>
          </div>
          <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            Detected silent stations, drops, and low performers.
          </p>
        </div>

      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* District Comparison Bar Chart (Spans 2 columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">District Production Comparison</h3>
              <p className="text-xs text-slate-500">Total enrollments registered per district</p>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>

          <div className="h-80 w-full pt-4">
            {data?.district_comparison && data.district_comparison.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.district_comparison} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="district_name"
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    height={60}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip
                    formatter={(val: any) => [`${Number(val).toLocaleString()} enrollments`, 'Enrollments']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="total_enrollment" fill="#1E3A8A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No district records available for selected period.
              </div>
            )}
          </div>
        </div>

        {/* Fee Tier Category Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900">Fee Tier Distribution</h3>
            <p className="text-xs text-slate-500">Breakdown across registration fee categories</p>
          </div>

          <div className="h-80 w-full flex items-center justify-center">
            {data?.category_mix && data.category_mix.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.category_mix}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {data.category_mix.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => [Number(val).toLocaleString(), 'Count']} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No fee category data.</div>
            )}
          </div>
        </div>

      </div>

      {/* Month-over-Month Growth Trend Line Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-900">Monthly Enrollment Growth Trajectory</h3>
          <p className="text-xs text-slate-500">Historical enrollment volume trajectory over time</p>
        </div>

        <div className="h-72 w-full pt-2">
          {data?.trend && data.trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month_name" tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 11, fill: '#475569' }} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString()} enrollments`, 'Volume']} />
                <Line type="monotone" dataKey="total_enrollment" stroke="#1E3A8A" strokeWidth={3} dot={{ r: 5, fill: '#1E3A8A' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">
              No trend data available.
            </div>
          )}
        </div>
      </div>

      {/* District Manager Leaderboard Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-blue-900" />
              <span>District Manager Performance Leaderboard</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ranked list of District Managers based on total monthly enrollment output
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Rank</th>
                <th className="py-3.5 px-4">DM Name & ID</th>
                <th className="py-3.5 px-4">District</th>
                <th className="py-3.5 px-4 text-center">Active Stations</th>
                <th className="py-3.5 px-4 text-right">Total Enrollments</th>
                <th className="py-3.5 px-4 text-right">Total Amount (₹)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {data?.dm_comparison && data.dm_comparison.length > 0 ? (
                data.dm_comparison.map((dm, idx) => (
                  <tr key={dm.dm_user_id || idx} className="hover:bg-slate-50 transition">
                    <td className="py-4 px-4 font-bold text-slate-600">
                      #{idx + 1}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900">{dm.dm_name}</div>
                      <div className="text-xs text-slate-500 font-mono">{dm.dmid}</div>
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-700">
                      {dm.district_name || 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-center font-semibold text-slate-800">
                      {dm.station_count}
                    </td>
                    <td className="py-4 px-4 text-right font-extrabold text-blue-900">
                      {dm.total_enrollment ? dm.total_enrollment.toLocaleString() : '0'}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-semibold text-slate-800">
                      ₹{dm.total_amount ? dm.total_amount.toLocaleString() : '0'}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {idx < 3 ? (
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Top Performer
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          Active
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs text-slate-400">
                    No District Manager comparison records found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
