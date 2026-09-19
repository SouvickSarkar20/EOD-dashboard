import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Key,
  Edit2,
  UserX,
  Eye,
  X,
  Check,
  Copy,
  AlertCircle,
  Building2,
  MapPin,
  Mail,
  Shield,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '../lib/api';

interface DMListItem {
  id: string;
  dmid: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  assigned_stations_count: number;
  assigned_districts: string[];
  last_login_at: string | null;
  created_at: string;
}

interface DMStationAssignment {
  station_id: string;
  station_name?: string;
  district_id: number;
  district_name?: string;
  effective_month: number;
}

interface DMDetail {
  id: string;
  dmid: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  assigned_stations: DMStationAssignment[];
  assigned_districts: string[];
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DistrictOption {
  district_id: number;
  district_name: string;
}

interface ResetPasswordModalData {
  dmid: string;
  dmName: string;
  tempPassword: string;
}

export function DistrictManagers() {
  const [dms, setDms] = useState<DMListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState<string>('');
  const [districtFilter, setDistrictFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [districtOptions, setDistrictOptions] = useState<DistrictOption[]>([]);

  // Modals & Drawer State
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedDmForEdit, setSelectedDmForEdit] = useState<DMListItem | null>(null);
  
  const [resetModalData, setResetModalData] = useState<ResetPasswordModalData | null>(null);
  const [copiedPassword, setCopiedPassword] = useState<boolean>(false);
  
  const [selectedDmDetail, setSelectedDmDetail] = useState<DMDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [drawerLoading, setDrawerLoading] = useState<boolean>(false);

  // Form states
  const [formName, setFormName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formDmid, setFormDmid] = useState<string>('');
  const [formDistrictIds, setFormDistrictIds] = useState<number[]>([]);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch DM list & district options on mount / filter change
  useEffect(() => {
    fetchDistrictOptions();
  }, []);

  useEffect(() => {
    fetchDmList();
  }, [page, districtFilter, statusFilter]);

  const fetchDistrictOptions = async () => {
    try {
      const res = await api.get('/api/filters/options');
      setDistrictOptions(res.data.districts || []);
    } catch (err) {
      console.error('Failed to fetch district options', err);
    }
  };

  const fetchDmList = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        page_size: pageSize,
      };
      if (search.trim()) params.search = search.trim();
      if (districtFilter) params.district_id = parseInt(districtFilter, 10);
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/api/district-managers/', { params });
      setDms(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Unable to load District Managers directory.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDmList();
  };

  const handleResetFilters = () => {
    setSearch('');
    setDistrictFilter('');
    setStatusFilter('');
    setPage(1);
  };

  // Open Add Modal
  const openAddModal = () => {
    setFormName('');
    setFormEmail('');
    setFormDmid('');
    setFormDistrictIds([]);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Submit Add DM
  const handleCreateDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      setFormError('Name and Email are required.');
      return;
    }
    setFormSubmitting(true);
    setFormError(null);
    try {
      const payload: any = {
        name: formName.trim(),
        email: formEmail.trim(),
        district_ids: formDistrictIds,
      };
      if (formDmid.trim()) {
        payload.dmid = formDmid.trim();
      }

      const res = await api.post('/api/district-managers/', payload);
      setIsAddModalOpen(false);

      // Prompt generated credentials
      fetchDmList();
      alert(`District Manager '${res.data.name}' created successfully! Assigned DMID: ${res.data.dmid}`);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to create District Manager.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (dm: DMListItem) => {
    setSelectedDmForEdit(dm);
    setFormName(dm.name);
    setFormEmail(dm.email);
    setFormStatus(dm.status);
    setFormDistrictIds([]);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Submit Edit DM
  const handleUpdateDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDmForEdit) return;

    setFormSubmitting(true);
    setFormError(null);
    try {
      const payload: any = {
        name: formName.trim(),
        email: formEmail.trim(),
        status: formStatus,
      };
      if (formDistrictIds.length > 0) {
        payload.district_ids = formDistrictIds;
      }

      await api.patch(`/api/district-managers/${selectedDmForEdit.id}`, payload);
      setIsEditModalOpen(false);
      fetchDmList();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Failed to update District Manager details.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Reset Password for DM
  const handleResetPassword = async (dm: DMListItem) => {
    if (!window.confirm(`Are you sure you want to reset the password for DM ${dm.name} (${dm.dmid})?`)) {
      return;
    }

    try {
      const res = await api.post(`/api/district-managers/${dm.id}/reset-password`);
      setResetModalData({
        dmid: res.data.dmid,
        dmName: dm.name,
        tempPassword: res.data.temporary_password,
      });
      setCopiedPassword(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to reset password.');
    }
  };

  // Deactivate DM
  const handleDeactivateDm = async (dm: DMListItem) => {
    if (!window.confirm(`Are you sure you want to deactivate DM ${dm.name} (${dm.dmid})? Their account status will be set to inactive.`)) {
      return;
    }

    try {
      await api.post(`/api/district-managers/${dm.id}/deactivate`);
      fetchDmList();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to deactivate District Manager.');
    }
  };

  // View DM Details (Slide-over drawer)
  const openDmDrawer = async (dmId: string) => {
    setIsDrawerOpen(true);
    setDrawerLoading(true);
    setSelectedDmDetail(null);
    try {
      const res = await api.get(`/api/district-managers/${dmId}`);
      setSelectedDmDetail(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to load DM details.');
      setIsDrawerOpen(false);
    } finally {
      setDrawerLoading(false);
    }
  };

  // Copy password to clipboard
  const handleCopyPassword = () => {
    if (resetModalData?.tempPassword) {
      navigator.clipboard.writeText(resetModalData.tempPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 3000);
    }
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-8 pb-12">
      
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center space-x-3">
            <Users className="w-7 h-7 text-blue-900" />
            <span>District Managers Directory</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Onboard, edit, reset security credentials, and supervise District Managers across all operational regions.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="flex items-center space-x-2 px-5 py-3 bg-blue-900 text-white font-bold rounded-xl text-sm shadow-md hover:bg-blue-950 transition cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Add New District Manager</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-4">
          
          {/* Text Search */}
          <div className="relative flex-1 min-w-[260px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search DM by Name, Email, or DMID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          {/* District Filter */}
          <div className="relative min-w-[180px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <MapPin className="w-4 h-4" />
            </div>
            <select
              value={districtFilter}
              onChange={(e) => {
                setDistrictFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
            >
              <option value="">All Districts</option>
              {districtOptions.map((d) => (
                <option key={d.district_id} value={d.district_id}>
                  {d.district_name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative min-w-[150px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Filter className="w-4 h-4" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Submit Search */}
          <button
            type="submit"
            className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition cursor-pointer"
          >
            Search
          </button>

          {/* Reset Filters */}
          {(search || districtFilter || statusFilter) && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center space-x-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition border border-slate-200 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          )}

        </form>
      </div>

      {/* Error Callout */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-900 flex items-center space-x-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div className="text-sm font-medium">{error}</div>
        </div>
      )}

      {/* DM Directory Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">DM Name & ID</th>
                <th className="py-3.5 px-4">Email Address</th>
                <th className="py-3.5 px-4">Assigned Districts</th>
                <th className="py-3.5 px-4 text-center">Supervised Stations</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    <div className="flex items-center justify-center space-x-2 text-sm font-semibold">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-900" />
                      <span>Loading District Managers...</span>
                    </div>
                  </td>
                </tr>
              ) : dms.length > 0 ? (
                dms.map((dm) => (
                  <tr key={dm.id} className="hover:bg-slate-50 transition">
                    
                    {/* DM Name & ID */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-900">{dm.name}</div>
                      <div className="inline-block mt-0.5 px-2 py-0.5 rounded bg-blue-50 text-blue-900 text-xs font-mono font-bold border border-blue-200">
                        {dm.dmid}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-4 px-4 text-slate-700 font-medium">
                      <div className="flex items-center space-x-1.5">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>{dm.email}</span>
                      </div>
                    </td>

                    {/* Assigned Districts */}
                    <td className="py-4 px-4">
                      {dm.assigned_districts && dm.assigned_districts.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {dm.assigned_districts.map((dist, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {dist}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Supervised Stations */}
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{dm.assigned_stations_count} Stations</span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      {dm.status === 'active' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        
                        {/* View Stations */}
                        <button
                          type="button"
                          onClick={() => openDmDrawer(dm.id)}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-lg text-xs font-semibold border border-blue-200 transition cursor-pointer"
                          title="View Station Assignments"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Stations</span>
                        </button>

                        {/* Reset Password */}
                        <button
                          type="button"
                          onClick={() => handleResetPassword(dm)}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold border border-amber-200 transition cursor-pointer"
                          title="Generate new temporary password"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>Reset Password</span>
                        </button>

                        {/* Edit Profile */}
                        <button
                          type="button"
                          onClick={() => openEditModal(dm)}
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-300 transition cursor-pointer"
                          title="Edit Name, Email, or Status"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {/* Deactivate Account */}
                        {dm.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => handleDeactivateDm(dm)}
                            className="flex items-center space-x-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-800 rounded-lg text-xs font-semibold border border-red-200 transition cursor-pointer"
                            title="Deactivate District Manager Account"
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>Deactivate</span>
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-sm">
                    No District Managers found matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between text-xs text-slate-600 font-semibold">
          <div>
            Showing {total > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, total)} of {total} DMs
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

      {/* Add DM Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Add New District Manager</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateDm} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul.sharma@eod.gov.in"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  DMID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ClabDM06 (Leave blank to auto-generate)"
                  value={formDmid}
                  onChange={(e) => setFormDmid(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Assign District
                </label>
                <select
                  value={formDistrictIds[0] || ''}
                  onChange={(e) => setFormDistrictIds(e.target.value ? [parseInt(e.target.value, 10)] : [])}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value="">Select Primary District</option>
                  {districtOptions.map((d) => (
                    <option key={d.district_id} value={d.district_id}>
                      {d.district_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit DM Modal */}
      {isEditModalOpen && selectedDmForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">Edit DM Details - {selectedDmForEdit.dmid}</h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateDm} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Account Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 text-center">
            
            <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mx-auto">
              <Key className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Temporary Password Generated</h3>
              <p className="text-xs text-slate-600 mt-1">
                Password reset for <strong>{resetModalData.dmName}</strong> ({resetModalData.dmid})
              </p>
            </div>

            {/* Generated Password Box */}
            <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 flex items-center justify-between font-mono text-base font-bold text-slate-900">
              <span>{resetModalData.tempPassword}</span>
              <button
                type="button"
                onClick={handleCopyPassword}
                className="flex items-center space-x-1 text-xs px-2.5 py-1.5 bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition cursor-pointer"
              >
                {copiedPassword ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 leading-relaxed text-left">
              Share this temporary password with the District Manager. They will be prompted to update their password upon logging in.
            </p>

            <button
              type="button"
              onClick={() => setResetModalData(null)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* DM Detail Slide-Over Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl overflow-y-auto p-6 space-y-6 flex flex-col justify-between">
            
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 bg-blue-50 text-blue-900 rounded-xl">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {drawerLoading ? 'Loading Profile...' : selectedDmDetail?.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono font-semibold">
                      {selectedDmDetail?.dmid}
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
                  <span>Loading District Manager details...</span>
                </div>
              ) : selectedDmDetail ? (
                <div className="space-y-6">
                  
                  {/* Info Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-xs font-bold uppercase text-slate-500">Email Address</span>
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {selectedDmDetail.email}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-xs font-bold uppercase text-slate-500">Status</span>
                      <div>
                        {selectedDmDetail.status === 'active' ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Supervised Stations List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-blue-900" />
                        <span>Supervised Operational Stations</span>
                      </h4>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-900 rounded-full border border-blue-200">
                        {selectedDmDetail.assigned_stations.length} Total
                      </span>
                    </div>

                    {selectedDmDetail.assigned_stations.length > 0 ? (
                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-80 overflow-y-auto">
                        {selectedDmDetail.assigned_stations.map((st, i) => (
                          <div key={i} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-slate-900">{st.station_name || st.station_id}</div>
                              <div className="text-slate-500 font-mono">{st.station_id}</div>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold text-slate-700">{st.district_name || 'N/A'}</span>
                              <div className="text-slate-400 text-[10px]">Effective: {st.effective_month}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-400">
                        No individual station assignments recorded.
                      </div>
                    )}
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
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default DistrictManagers;
