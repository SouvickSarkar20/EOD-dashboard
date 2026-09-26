import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Users,
  Eye,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Info,
  DollarSign,
  AlertCircle,
  Clock
} from 'lucide-react';
import { api } from '../lib/api';
import { useFilterStore } from '../store/filterStore';
import { useAuthStore } from '../store/authStore';

interface DailyRow {
  record_id: number;
  enroll_date: string;
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

interface DailyBreakdownData {
  enroll_month: number;
  station_id: string;
  station_name?: string;
  operator_code: string;
  operator_name?: string;
  records: DailyRow[];
  total_enrollment: number;
  total_amount: number;
}

export function DailyAnalysis() {
  const globalFilters = useFilterStore();

  const [records, setRecords] = useState<DailyRow[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [stationSearch, setStationSearch] = useState<string>('');
  const [operatorSearch, setOperatorSearch] = useState<string>('');

  // Breakdown Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);
  const [breakdownData, setBreakdownData] = useState<DailyBreakdownData | null>(null);

  useEffect(() => {
    fetchDailyRecords();
  }, [page, pageSize, globalFilters.month, globalFilters.districtId, globalFilters.dmId]);

  const fetchDailyRecords = async () => {
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
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (stationSearch.trim()) params.station_id = stationSearch.trim();
      if (operatorSearch.trim()) params.operator_code = operatorSearch.trim();

      const res = await api.get('/api/daily/', { params });
      setRecords(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to load daily operational logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDailyRecords();
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setStationSearch('');
    setOperatorSearch('');
    setPage(1);
    fetchDailyRecords();
  };

  // Open Operator Breakdown Drawer
  const openBreakdownDrawer = async (row: DailyRow) => {
    setIsDrawerOpen(true);
    setDrawerLoading(true);
    setBreakdownData(null);
    try {
      // derive YYYYMM from row enroll_date e.g. 2026-01-15 -> 202601
      const enrollMonth = parseInt(row.enroll_date.replace(/-/g, '').substring(0, 6), 10);
      const res = await api.get('/api/daily/breakdown', {
        params: {
          month: enrollMonth,
          station_id: row.station_id,
          operator_code: row.operator_code,
        },
      });
      setBreakdownData(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to load operator daily breakdown.');
      setIsDrawerOpen(false);
    } finally {
      setDrawerLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;
  const pageEnrollments = records.reduce((sum, r) => sum + r.total_enrollment, 0);

  return (
    <div className="space-y-8 pb-12">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center space-x-3">
          <Clock className="w-7 h-7 text-blue-900" />
          <span>Daily Operational Activity Logs</span>
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Inspect day-by-day station logs, operator registration activities, and drill through to operator daily breakdowns.
        </p>
      </div>

      {/* Guidance Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start space-x-4">
        <div className="p-2.5 rounded-xl bg-blue-900 text-white flex-shrink-0 mt-0.5">
          <Info className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-blue-950">Daily Operational Supervision</h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            Filter logs by <strong>Date Range</strong>, <strong>Station ID</strong>, or <strong>Operator Code</strong>. Click <strong>View Breakdown</strong> on any row to view full daily logs for that operator.
          </p>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Total Matching Operational Days</span>
            <div className="p-2 bg-blue-50 text-blue-900 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {total.toLocaleString()} <span className="text-xs text-slate-500 font-normal">daily log entries</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Registrations on Page</span>
            <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-blue-900">
            {pageEnrollments.toLocaleString()} <span className="text-xs text-slate-500 font-normal">registrations logged</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-4">
          
          {/* Start Date */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase text-slate-500">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          {/* End Date */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase text-slate-500">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          {/* Station Search */}
          <div className="relative flex-1 min-w-[180px]">
            <input
              type="text"
              placeholder="Station ID..."
              value={stationSearch}
              onChange={(e) => setStationSearch(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          {/* Operator Search */}
          <div className="relative flex-1 min-w-[180px]">
            <input
              type="text"
              placeholder="Operator Code..."
              value={operatorSearch}
              onChange={(e) => setOperatorSearch(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          <button
            type="submit"
            className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-slate-800 transition cursor-pointer"
          >
            Apply Filters
          </button>

          {(startDate || endDate || stationSearch || operatorSearch) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center space-x-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition border border-slate-200 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset</span>
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

      {/* Daily Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Log Date</th>
                <th className="py-3.5 px-4">Station ID & Name</th>
                <th className="py-3.5 px-4">Operator Code</th>
                <th className="py-3.5 px-4">District</th>
                <th className="py-3.5 px-4">District Manager</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">BMU @ 100</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">BMU @ 125</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">DMU @ 50</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">DMU @ 75</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">MBU @ 0</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">MBU @ 100</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">MBU @ 125</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">NEW @ 0</th>
                <th className="py-3.5 px-4 text-right">Daily Enrollments</th>
                <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={16} className="text-center py-12 text-slate-500">
                    <div className="flex items-center justify-center space-x-2 text-sm font-semibold">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-900" />
                      <span>Loading Daily Activity Logs...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length > 0 ? (
                records.map((r) => (
                  <tr key={r.record_id} className="hover:bg-slate-50 transition">
                    
                    {/* Date */}
                    <td className="py-4 px-4 font-bold text-slate-900">
                      {r.enroll_date}
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
                      {r.district_name || 'N/A'}
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

                    {/* Fee Category Breakdowns */}
                    <td className="py-4 px-2 text-center font-mono text-[11px] whitespace-nowrap">
                      {r.bmu_100 > 0 ? <span className="text-blue-900 font-bold">{r.bmu_100} (₹{(r.bmu_100 * 100).toLocaleString()})</span> : <span className="text-slate-400 font-bold">0</span>}
                    </td>
                    <td className="py-4 px-2 text-center font-mono text-[11px] whitespace-nowrap">
                      {r.bmu_125 > 0 ? <span className="text-blue-900 font-bold">{r.bmu_125} (₹{(r.bmu_125 * 125).toLocaleString()})</span> : <span className="text-slate-400 font-bold">0</span>}
                    </td>
                    <td className="py-4 px-2 text-center font-mono text-[11px] whitespace-nowrap">
                      {r.dmu_50 > 0 ? <span className="text-indigo-900 font-bold">{r.dmu_50} (₹{(r.dmu_50 * 50).toLocaleString()})</span> : <span className="text-slate-400 font-bold">0</span>}
                    </td>
                    <td className="py-4 px-2 text-center font-mono text-[11px] whitespace-nowrap">
                      {r.dmu_75 > 0 ? <span className="text-indigo-900 font-bold">{r.dmu_75} (₹{(r.dmu_75 * 75).toLocaleString()})</span> : <span className="text-slate-400 font-bold">0</span>}
                    </td>
                    <td className="py-4 px-2 text-center font-mono text-[11px] whitespace-nowrap">
                      {r.mbu_0 > 0 ? <span className="text-purple-900 font-bold">{r.mbu_0} (₹0)</span> : <span className="text-slate-400 font-bold">0</span>}
                    </td>
                    <td className="py-4 px-2 text-center font-mono text-[11px] whitespace-nowrap">
                      {r.mbu_100 > 0 ? <span className="text-purple-900 font-bold">{r.mbu_100} (₹{(r.mbu_100 * 100).toLocaleString()})</span> : <span className="text-slate-400 font-bold">0</span>}
                    </td>
                    <td className="py-4 px-2 text-center font-mono text-[11px] whitespace-nowrap">
                      {r.mbu_125 > 0 ? <span className="text-purple-900 font-bold">{r.mbu_125} (₹{(r.mbu_125 * 125).toLocaleString()})</span> : <span className="text-slate-400 font-bold">0</span>}
                    </td>
                    <td className="py-4 px-2 text-center font-mono text-[11px] whitespace-nowrap">
                      {r.new_0 > 0 ? <span className="text-emerald-900 font-bold">{r.new_0} (₹0)</span> : <span className="text-slate-400 font-bold">0</span>}
                    </td>

                    {/* Total Enrollments */}
                    <td className="py-4 px-4 text-right font-extrabold text-blue-900 text-base">
                      {r.total_enrollment}
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-4 text-right font-mono font-bold text-slate-800">
                      ₹{Number(r.total_amount || 0).toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => openBreakdownDrawer(r)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg text-xs font-semibold border border-blue-200 transition cursor-pointer"
                        title="View day-by-day logs for this operator"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Breakdown</span>
                      </button>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={16} className="text-center py-12 text-slate-400 text-sm">
                    No daily activity logs found matching the filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 font-semibold">
          <div>
            Showing {total > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, total)} of {total.toLocaleString()} daily logs
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

      {/* Operator Daily Breakdown Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl overflow-y-auto p-6 space-y-6 flex flex-col justify-between">
            
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-50 text-blue-900 rounded-xl">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Operator Daily Breakdown
                    </h3>
                    <p className="text-xs text-slate-500 font-mono">
                      Operator Code: {breakdownData?.operator_code} | Station: {breakdownData?.station_id}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {drawerLoading ? (
                <div className="flex items-center justify-center py-20 text-slate-500 text-sm font-semibold">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-900 mr-2" />
                  <span>Loading operator daily breakdown...</span>
                </div>
              ) : breakdownData ? (
                <div className="space-y-6">
                  
                  {/* Summary Strip */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-xs font-bold uppercase text-slate-500">Monthly Registration Total</span>
                      <div className="text-xl font-extrabold text-blue-900">
                        {breakdownData.total_enrollment.toLocaleString()}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-xs font-bold uppercase text-slate-500">Total Monthly Amount</span>
                      <div className="text-xl font-extrabold text-slate-900 font-mono">
                        ₹{Number(breakdownData.total_amount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Daily Log Rows */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-900">Day-by-Day Activity Logs ({breakdownData.records.length} days)</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-96 overflow-y-auto">
                      {breakdownData.records.map((r) => (
                        <div key={r.record_id} className="p-3.5 bg-white hover:bg-slate-50 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-900">{r.enroll_date}</div>
                            <div className="text-slate-500">Station: {r.station_id}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-blue-900 text-sm">{r.total_enrollment} enrollments</span>
                            <div className="font-mono font-semibold text-slate-700">₹{Number(r.total_amount || 0).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ) : null}
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Close Breakdown
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default DailyAnalysis;
