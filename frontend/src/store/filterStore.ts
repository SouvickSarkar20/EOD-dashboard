import { create } from 'zustand';

interface FilterState {
  month: number | null; // e.g. 202601
  districtId: number | null;
  dmId: string | null;
  startDate: string | null;
  endDate: string | null;
  setMonth: (month: number | null) => void;
  setDistrictId: (districtId: number | null) => void;
  setDmId: (dmId: string | null) => void;
  setDateRange: (startDate: string | null, endDate: string | null) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  month: null,
  districtId: null,
  dmId: null,
  startDate: null,
  endDate: null,

  setMonth: (month) => set({ month }),
  setDistrictId: (districtId) => set({ districtId }),
  setDmId: (dmId) => set({ dmId }),
  setDateRange: (startDate, endDate) => set({ startDate, endDate }),
  resetFilters: () => set({ month: null, districtId: null, dmId: null, startDate: null, endDate: null }),
}));
