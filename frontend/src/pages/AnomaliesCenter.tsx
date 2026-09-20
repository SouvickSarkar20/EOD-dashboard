import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Filter,
  RefreshCw,
  Building2,
  Users,
  Info,
  Loader2,
  Sliders,
  ShieldAlert,
  ArrowDownRight,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { api } from '../lib/api';
import { useFilterStore } from '../store/filterStore';

interface AnomalyItem {
  id: string;
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  district_id?: number;
  district_name?: string;
  dm_user_id?: string;
  dm_name?: string;
  station_id?: number;
  station_code?: string;
  station_name?: string;
  metrics: Record<string, any>;
  detected_at: string;
}

interface AnomalyListResponse {
  total_anomalies: number;
  dm_decline_count: number;
  silent_station_count: number;
  low_performer_count: number;
  zero_activity_count: number;
  high_severity_count: number;
  medium_severity_count: number;
  low_severity_count: number;
  items: AnomalyItem[];
}

export function AnomaliesCenter() {
  const globalFilters = useFilterStore();

  const [anomaliesData, setAnomaliesData] = useState<AnomalyListResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Thresholds
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [declineThreshold, setDeclineThreshold] = useState<number>(20);
  const [silentDaysThreshold, setSilentDaysThreshold] = useState<number>(7);

  useEffect(() => {
    fetchAnomalies();
  }, [
    globalFilters.month,
    globalFilters.districtId,
    globalFilters.dmId,
    severityFilter,
    typeFilter,
    declineThreshold,
    silentDaysThreshold
  ]);

  const fetchAnomalies = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        threshold_decline_pct: declineThreshold,
        silent_days_threshold: silentDaysThreshold,
      };
      if (globalFilters.month) params.month = globalFilters.month;
      if (globalFilters.districtId) params.district_id = globalFilters.districtId;
      if (globalFilters.dmId) params.dm_id = globalFilters.dmId;
      if (severityFilter) params.severity = severityFilter;
      if (typeFilter) params.anomaly_type = typeFilter;

      const res = await api.get('/api/anomalies/', { params });
      setAnomaliesData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to load operational anomaly reports.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSeverityFilter('');
    setTypeFilter('');
    setDeclineThreshold(20);
    setSilentDaysThreshold(7);
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center space-x-3">
          <ShieldAlert className="w-7 h-7 text-amber-600" />
          <span>Anomaly Warning Center</span>
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Real-time early warning engine detecting DM performance declines (&ge;20%), silent stations (&ge;7 days), low performers, and zero-activity operational days.
        </p>
      </div>

      {/* Non-Tech Guidance Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start space-x-4 text-amber-950">
        <div className="p-2.5 rounded-xl bg-amber-600 text-white flex-shrink-0 mt-0.5">
          <Info className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold text-amber-950">Operational Red Flag Detection</h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            Flags highlighted below indicate stations or district managers requiring immediate operational attention. Use the <strong>Severity Tabs</strong> or <strong>Threshold Sliders</strong> below to adjust sensitivity.
          </p>
        </div>
      </div>

      {/* Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* High Severity */}
        <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">High Severity Flags</span>
            <div className="p-2 bg-red-100 text-red-800 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-red-900">
            {anomaliesData?.high_severity_count || 0}
          </div>
          <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            Requires immediate management action.
          </p>
        </div>

        {/* Medium Severity */}
        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Medium Severity Flags</span>
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-900">
            {anomaliesData?.medium_severity_count || 0}
          </div>
          <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            Operational drops requiring review.
          </p>
        </div>

        {/* Low Severity */}
        <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Low Severity Flags</span>
            <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
              <Info className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-blue-900">
            {anomaliesData?.low_severity_count || 0}
          </div>
          <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            Minor operational warnings.
          </p>
        </div>

        {/* Total Anomalies */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Flagged Anomalies</span>
            <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">
            {anomaliesData?.total_anomalies || 0}
          </div>
          <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            Combined active anomaly conditions.
          </p>
        </div>

      </div>

      {/* Filter Controls & Threshold Sliders */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        
        {/* Severity Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Filter by Severity:</span>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              {[
                { label: 'All Severities', value: '' },
                { label: 'High', value: 'HIGH' },
                { label: 'Medium', value: 'MEDIUM' },
                { label: 'Low', value: 'LOW' }
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setSeverityFilter(tab.value)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    severityFilter === tab.value
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Anomaly Type Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Anomaly Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
            >
              <option value="">All Anomaly Types</option>
              <option value="DM_DECLINE">DM Performance Drop (&ge;20%)</option>
              <option value="SILENT_STATION">Silent Station (&ge;7 Days)</option>
              <option value="LOW_PERFORMER">Low Performing Station</option>
              <option value="ZERO_ACTIVITY">Zero Activity Day</option>
            </select>
          </div>
        </div>

        {/* Threshold Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          
          {/* DM Decline % Slider */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Sliders className="w-4 h-4 text-blue-900" />
                <span>DM Decline Sensitivity Threshold:</span>
              </label>
              <span className="px-2.5 py-0.5 bg-blue-900 text-white text-xs font-bold rounded-full">
                &ge; {declineThreshold}% MoM Drop
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={50}
              step={5}
              value={declineThreshold}
              onChange={(e) => setDeclineThreshold(parseInt(e.target.value, 10))}
              className="w-full accent-blue-900 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>10% (Sensitive)</span>
              <span>20% (Default)</span>
              <span>50% (Strict)</span>
            </div>
          </div>

          {/* Silent Days Slider */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-amber-700" />
                <span>Silent Station Threshold:</span>
              </label>
              <span className="px-2.5 py-0.5 bg-amber-700 text-white text-xs font-bold rounded-full">
                &ge; {silentDaysThreshold} Inactive Days
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={30}
              step={1}
              value={silentDaysThreshold}
              onChange={(e) => setSilentDaysThreshold(parseInt(e.target.value, 10))}
              className="w-full accent-amber-700 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-500 font-medium">
              <span>3 Days</span>
              <span>7 Days (Default)</span>
              <span>30 Days</span>
            </div>
          </div>

        </div>

      </div>

      {/* Error Callout */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-900 flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      {/* Flagged Anomaly List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 text-center">Severity</th>
                <th className="py-3.5 px-4">Anomaly Title & Type</th>
                <th className="py-3.5 px-4">Operational Explanation</th>
                <th className="py-3.5 px-4">District</th>
                <th className="py-3.5 px-4">District Manager</th>
                <th className="py-3.5 px-4">Target Unit / Station</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <div className="flex items-center justify-center space-x-2 text-sm font-semibold">
                      <Loader2 className="w-5 h-5 animate-spin text-amber-700" />
                      <span>Running early warning anomaly detection...</span>
                    </div>
                  </td>
                </tr>
              ) : anomaliesData?.items && anomaliesData.items.length > 0 ? (
                anomaliesData.items.map((anom) => (
                  <tr key={anom.id} className="hover:bg-slate-50 transition">
                    
                    {/* Severity Badge */}
                    <td className="py-4 px-4 text-center">
                      {anom.severity === 'HIGH' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-extrabold bg-red-100 text-red-800 border border-red-200">
                          HIGH
                        </span>
                      ) : anom.severity === 'MEDIUM' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          MEDIUM
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          LOW
                        </span>
                      )}
                    </td>

                    {/* Title & Type */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900">{anom.title}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">{anom.type}</div>
                    </td>

                    {/* Explanation */}
                    <td className="py-4 px-4 text-xs text-slate-700 leading-relaxed max-w-sm">
                      {anom.description}
                    </td>

                    {/* District */}
                    <td className="py-4 px-4 font-semibold text-slate-800">
                      {anom.district_name || 'N/A'}
                    </td>

                    {/* DM */}
                    <td className="py-4 px-4">
                      {anom.dm_name ? (
                        <div className="font-semibold text-slate-800">{anom.dm_name}</div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Target Station */}
                    <td className="py-4 px-4">
                      {anom.station_code || anom.station_name ? (
                        <>
                          <div className="font-bold text-slate-900">{anom.station_name || `Station ${anom.station_code}`}</div>
                          <div className="text-xs text-slate-500 font-mono">{anom.station_code}</div>
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 italic">District-wide</span>
                      )}
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      <span className="font-semibold text-slate-700">No Operational Anomalies Detected</span>
                      <span className="text-xs text-slate-400">All stations and district managers are operating within expected thresholds.</span>
                    </div>
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

export default AnomaliesCenter;
