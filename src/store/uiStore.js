import { create } from 'zustand';

/**
 * uiStore — transient UI state. Not persisted.
 */
export const useUIStore = create((set) => ({
  activeTab: 'boxes', // 'boxes' | 'materials' | 'cut-settings' | 'output'
  selectedBoxId: null,
  showCutSequence: false,
  isExportingPDF: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedBox: (id) => set({ selectedBoxId: id }),
  toggleCutSequence: () => set((s) => ({ showCutSequence: !s.showCutSequence })),
  setExportingPDF: (val) => set({ isExportingPDF: val }),
}));