import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
  ShieldAlert,
  Info,
  Loader2,
  FileText,
  Check
} from 'lucide-react';
import { api } from '../lib/api';
import { useFilterStore } from '../store/filterStore';

export function Reports() {
  const globalFilters = useFilterStore();
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (reportType: 'monthly' | 'daily' | 'anomalies', format: 'xlsx' | 'csv') => {
    const key = `${reportType}-${format}`;
    setDownloading(key);
    try {
      const params: any = { format };
      if (globalFilters.month) params.month = globalFilters.month;
      if (globalFilters.districtId) params.district_id = globalFilters.districtId;
      if (globalFilters.dmId) params.dm_id = globalFilters.dmId;

      const response = await api.get(`/api/exports/${reportType}`, {
        params,
        responseType: 'blob',
      });

      // Trigger browser download
      const blob = new Blob([response.data], {
        type: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const monthStr = globalFilters.month ? `_${globalFilters.month}` : '';
      link.setAttribute('download', `EOD_${reportType}_Report${monthStr}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to generate export file. Please check server logs.');
    } finally {
      setDownloading(null);
    }
  };

  const formatMonthLabel = (m: number | null) => {
    if (!m) return 'All Available Months';
    const s = m.toString();
    if (s.length === 6) {
      const yr = s.substring(0, 4);
      const mo = parseInt(s.substring(4, 6), 10);
      const dateObj = new Date(parseInt(yr, 10), mo - 1, 1);
      return dateObj.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    }
    return s;
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center space-x-3">
          <FileSpreadsheet className="w-7 h-7 text-emerald-700" />
          <span>Reports & Data Export Center</span>
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Generate and download official Excel spreadsheets (.xlsx) or CSV data files pre-filtered by your active dashboard selections.
        </p>
      </div>

      {/* Active Filter Scope Info Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-start space-x-4">
        <div className="p-2.5 rounded-xl bg-emerald-700 text-white flex-shrink-0 mt-0.5">
          <Info className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-emerald-950">Active Export Filter Scope</h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            All reports downloaded from this page will automatically apply your active filter selections: 
            <strong className="text-emerald-950"> Month: {formatMonthLabel(globalFilters.month)}</strong> | 
            <strong className="text-emerald-950"> District ID: {globalFilters.districtId || 'All Districts'}</strong> | 
            <strong className="text-emerald-950"> DM ID: {globalFilters.dmId || 'All DMs'}</strong>.
          </p>
        </div>
      </div>

      {/* Export Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Card 1: Monthly Summary Report */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 text-blue-900 w-fit rounded-xl">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Monthly Production Summary</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Consolidated monthly station summaries featuring total enrollment volume, operator codes, district assignments, fee tier breakdowns, and total amounts (`₹`).
            </p>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleDownload('monthly', 'xlsx')}
              disabled={!!downloading}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {downloading === 'monthly-xlsx' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Excel...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Excel Spreadsheet (.xlsx)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleDownload('monthly', 'csv')}
              disabled={!!downloading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer"
            >
              {downloading === 'monthly-csv' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating CSV...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>Download CSV File (.csv)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 2: Daily Operational Logs Report */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="p-3 bg-slate-100 text-slate-800 w-fit rounded-xl">
              <Clock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Daily Operational Activity Logs</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Granular day-by-day operational logs for station operators, showing daily enrollment counts, fee categories, and revenue logs.
            </p>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleDownload('daily', 'xlsx')}
              disabled={!!downloading}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {downloading === 'daily-xlsx' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Excel...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Excel Spreadsheet (.xlsx)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleDownload('daily', 'csv')}
              disabled={!!downloading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer"
            >
              {downloading === 'daily-csv' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating CSV...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>Download CSV File (.csv)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 3: Anomaly & Red Flags Report */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 text-amber-800 w-fit rounded-xl">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Anomaly & Red Flags Report</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Early warning operational audit report capturing flagged silent stations (&ge;7 days), DM performance declines (&ge;20%), and zero-activity operational units.
            </p>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => handleDownload('anomalies', 'xlsx')}
              disabled={!!downloading}
              className="w-full flex items-center justify-center space-x-2 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {downloading === 'anomalies-xlsx' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Excel...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Excel Spreadsheet (.xlsx)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleDownload('anomalies', 'csv')}
              disabled={!!downloading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition disabled:opacity-50 cursor-pointer"
            >
              {downloading === 'anomalies-csv' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating CSV...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>Download CSV File (.csv)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}

export default Reports;
