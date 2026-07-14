import { create } from 'zustand';
import { maybeDevtools } from './devtools.js';

/**
 * uiStore — transient UI state. Not persisted.
 * Wrapped with devtools for debugging (dev only).
 */
export const useUIStore = create(
  maybeDevtools(
    (set) => ({
      activeTab: 'boxes', // 'boxes' | 'materials' | 'cut-settings' | 'cut-list' | 'sheet-layout' | 'output'
      selectedBoxId: null,
      showCutSequence: false,
      isExportingPDF: false,

      setActiveTab: (tab) => set({ activeTab: tab }),
      setSelectedBox: (id) => set({ selectedBoxId: id }),
      toggleCutSequence: () => set((s) => ({ showCutSequence: !s.showCutSequence })),
      setExportingPDF: (val) => set({ isExportingPDF: val }),
    }),
    { name: 'UIStore' }
  )
);