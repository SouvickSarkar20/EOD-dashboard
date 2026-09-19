import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Users,
  TrendingUp,
  RotateCcw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import { api } from '../lib/api';
import { useFilterStore } from '../store/filterStore';
import { useAuthStore } from '../store/authStore';

interface MonthlyRow {
  summary_id: number;
  enroll_month: number;
  station_id: string;
  station_name?: string;
  operator_code: string;
  operator_name?: string;
  district_id?: number;
  district_name?: string;
  dm_id?: string;
  dm_name?: string;
  total_enrollment: number;
  total_amount: number;
  bmu_100: number;
  dmu_50: number;
  mbu_0: number;
  mbu_100: number;
  new_0: number;
  bmu_125: number;
  dmu_75: number;
  mbu_125: number;
}

export function MonthlyAnalysis() {
  const currentUser = useAuthStore((s) => s.user);
  const globalFilters = useFilterStore();

  const [records, setRecords] = useState<MonthlyRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Local search filter
  const [stationSearch, setStationSearch] = useState<string>('');

  useEffect(() => {
    fetchMonthlyRecords();
  }, [page, pageSize, globalFilters.month, globalFilters.districtId, globalFilters.dmId]);

  const fetchMonthlyRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        page_size: pageSize,
      };
      if (globalFilters.month) params.month = globalFilters.month;
      if (globalFilters.districtId) params.district_id = globalFilters.districtId;
      if (globalFilters.dmId) params.dm_id = globalFilters.dmId;
      if (stationSearch.trim()) params.station_id = stationSearch.trim();

      const res = await api.get('/api/monthly/', { params });
      setRecords(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to load monthly station records.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMonthlyRecords();
  };

  const handleResetSearch = () => {
    setStationSearch('');
    setPage(1);
    fetchMonthlyRecords();
  };

  const formatMonthLabel = (m: number) => {
    const s = m.toString();
    if (s.length === 6) {
      const yr = s.substring(0, 4);
      const mo = parseInt(s.substring(4, 6), 10);
      const dateObj = new Date(parseInt(yr, 10), mo - 1, 1);
      return dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    }
    return s;
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  // Calculate local page aggregates for high-level insight
  const pageEnrollments = records.reduce((sum, r) => sum + r.total_enrollment, 0);
  const pageAmount = records.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

  return (
    <div className="space-y-8 pb-12">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center space-x-3">
          <Calendar className="w-7 h-7 text-blue-900" />
          <span>Monthly Station Summaries</span>
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Detailed monthly production records, fee category breakdowns, and revenue statistics across all active stations.
        </p>
      </div>

      {/* Non-Tech Help & Guidance Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start space-x-4">
        <div className="p-2.5 rounded-xl bg-blue-900 text-white flex-shrink-0 mt-0.5">
          <Info className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-blue-950">Station Production Inspection</h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            Each row represents a station's consolidated monthly output. Use the top <strong>Filter bar</strong> to target specific months or districts, or search below by <strong>Station ID / Name</strong>.
          </p>
        </div>
      </div>

      {/* Summary KPI Strip for Current View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Total Monthly Records</span>
            <div className="p-2 bg-blue-50 text-blue-900 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {total.toLocaleString()} <span className="text-xs text-slate-500 font-normal">station records</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Page Volume</span>
            <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-blue-900">
            {pageEnrollments.toLocaleString()} <span className="text-xs text-slate-500 font-normal">enrollments on page</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Page Revenue Output</span>
            <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            ₹{pageAmount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[280px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by Station ID (e.g. STN001 or 1001)..."
              value={stationSearch}
              onChange={(e) => setStationSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-slate-800 transition cursor-pointer"
          >
            Search Station
          </button>

          {stationSearch && (
            <button
              type="button"
              onClick={handleResetSearch}
              className="flex items-center space-x-1 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition border border-slate-200 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset Search</span>
            </button>
          )}
        </form>
      </div>

      {/* Error Callout */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-900 flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-amber-700 flex-shrink-0" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      {/* Monthly Summary Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Month</th>
                <th className="py-3.5 px-4">Station ID & Name</th>
                <th className="py-3.5 px-4">Operator Code</th>
                <th className="py-3.5 px-4">District</th>
                <th className="py-3.5 px-4">District Manager</th>
                <th className="py-3.5 px-4">Fee Mix Breakdown</th>
                <th className="py-3.5 px-4 text-right">Total Enrollments</th>
                <th className="py-3.5 px-4 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <div className="flex items-center justify-center space-x-2 text-sm font-semibold">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-900" />
                      <span>Loading Monthly Records...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((r) => (
                  <tr key={r.summary_id} className="hover:bg-slate-50 transition">
                    
                    {/* Month */}
                    <td className="py-4 px-4 font-bold text-slate-900">
                      {formatMonthLabel(r.enroll_month)}
                    </td>

                    {/* Station */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900">{r.station_name || `Station ${r.station_id}`}</div>
                      <div className="text-xs text-slate-500 font-mono">{r.station_id}</div>
                    </td>

                    {/* Operator */}
                    <td className="py-4 px-4 font-mono font-semibold text-slate-700">
                      {r.operator_code}
                    </td>

                    {/* District */}
                    <td className="py-4 px-4 font-medium text-slate-700">
                      {r.district_name || 'Unassigned'}
                    </td>

                    {/* DM */}
                    <td className="py-4 px-4">
                      {r.dm_name ? (
                        <>
                          <div className="font-semibold text-slate-800">{r.dm_name}</div>
                          <div className="text-[11px] font-mono text-slate-500">{r.dm_id}</div>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Fee Category Breakdown */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 text-[11px]">
                        {r.bmu_100 > 0 && <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-bold border border-blue-200">BMU 100: {r.bmu_100}</span>}
                        {r.dmu_50 > 0 && <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-900 font-bold border border-indigo-200">DMU 50: {r.dmu_50}</span>}
                        {r.mbu_0 > 0 && <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-200">MBU 0: {r.mbu_0}</span>}
                        {r.mbu_100 > 0 && <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-900 font-bold border border-purple-200">MBU 100: {r.mbu_100}</span>}
                        {r.new_0 > 0 && <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 font-bold border border-emerald-200">NEW 0: {r.new_0}</span>}
                      </div>
                    </td>

                    {/* Total Enrollments */}
                    <td className="py-4 px-4 text-right font-extrabold text-blue-900 text-base">
                      {r.total_enrollment.toLocaleString()}
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-800">
                      ₹{Number(r.total_amount || 0).toLocaleString()}
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">
                    No monthly station records found for the selected filter parameters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 font-semibold">
          <div>
            Showing {total > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, total)} of {total.toLocaleString()} records
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default MonthlyAnalysis;
