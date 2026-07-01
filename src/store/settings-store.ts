import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'light' | 'dark';
  autosaveEnabled: boolean;
  autosaveIntervalMs: number;

  setTheme: (theme: 'light' | 'dark') => void;
  toggleAutosave: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      autosaveEnabled: true,
      autosaveIntervalMs: 5000,

      setTheme: (theme) => set({ theme }),
      toggleAutosave: () => set((state) => ({ autosaveEnabled: !state.autosaveEnabled })),
    }),
    { name: 'pdf-annotator-settings' }
  )
);