import React, { useEffect, useState } from 'react';
import { Filter, Calendar, MapPin, User, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import { useFilterStore } from '../store/filterStore';
import { useAuthStore } from '../store/authStore';

interface DistrictOption {
  district_id: number;
  district_name: string;
}

interface DmOption {
  dm_user_id: string;
  dm_name: string;
  dmid: string;
}

interface FilterOptionsResponse {
  available_months: number[];
  districts: DistrictOption[];
  district_managers: DmOption[];
}

export function FilterBar() {
  const currentUser = useAuthStore((s) => s.user);
  const { month, districtId, dmId, setMonth, setDistrictId, setDmId, resetFilters } = useFilterStore();

  const [options, setOptions] = useState<FilterOptionsResponse>({
    available_months: [],
    districts: [],
    district_managers: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFilterOptions();
  }, [month, districtId, dmId]);

  const fetchFilterOptions = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (month) params.month = month;
      if (districtId) params.district_id = districtId;
      if (dmId) params.dm_id = dmId;

      const response = await api.get('/api/filters/options', { params });
      const data: FilterOptionsResponse = response.data;
      setOptions(data);

      if (!month && data.available_months.length > 0) {
        setMonth(data.available_months[0]);
      }
    } catch (err) {
      console.error('Failed to load filter options:', err);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="bg-white border-b border-slate-200 px-8 py-4 shadow-sm sticky top-0 z-20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        
        {/* Left Label */}
        <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm tracking-wide">
          <Filter className="w-5 h-5 text-blue-900" />
          <span>Filter Records:</span>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Month Selector */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Calendar className="w-4 h-4" />
            </div>
            <select
              value={month || ''}
              onChange={(e) => setMonth(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer shadow-sm"
            >
              <option value="">All Available Months</option>
              {options.available_months.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          {/* District Selector */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <MapPin className="w-4 h-4" />
            </div>
            <select
              value={districtId || ''}
              onChange={(e) => setDistrictId(e.target.value ? parseInt(e.target.value, 10) : null)}
              className="pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer shadow-sm"
            >
              <option value="">All Districts ({options.districts.length})</option>
              {options.districts.map((d) => (
                <option key={d.district_id} value={d.district_id}>
                  {d.district_name}
                </option>
              ))}
            </select>
          </div>

          {/* DM Selector */}
          {currentUser?.role === 'admin' && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <select
                value={dmId || ''}
                onChange={(e) => setDmId(e.target.value || null)}
                className="pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer shadow-sm"
              >
                <option value="">All District Managers</option>
                {options.district_managers.map((dm) => (
                  <option key={dm.dm_user_id} value={dm.dm_user_id}>
                    {dm.dm_name} ({dm.dmid})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Reset Filters Button */}
          {(month || districtId || dmId) && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition border border-slate-200"
              title="Reset all filters to default"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Filters</span>
            </button>
          )}

        </div>

      </div>
    </div>
  );
}
