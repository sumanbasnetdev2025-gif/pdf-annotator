import { create } from 'zustand';

export type FitMode = 'width' | 'page' | 'custom';

interface ViewerState {
  // Current PDF file info
  fileName: string | null;
  fileId: string | null;
  totalPages: number;

  // Navigation
  currentPage: number;

  // Zoom & fit
  zoomLevel: number;
  fitMode: FitMode;
  rotation: number;

  // UI state
  isThumbnailSidebarOpen: boolean;
  isLoading: boolean;
  isFullscreen: boolean;
  isPresentationMode: boolean;

  // Actions
  setFile: (fileName: string, fileId: string, totalPages: number) => void;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setZoomLevel: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setFitMode: (mode: FitMode) => void;
  rotateClockwise: () => void;
  rotateCounterClockwise: () => void;
  toggleThumbnailSidebar: () => void;
  setLoading: (loading: boolean) => void;
  toggleFullscreen: () => void;
  togglePresentationMode: () => void;
  reset: () => void;
}

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.1;

const initialState = {
  fileName: null,
  fileId: null,
  totalPages: 0,
  currentPage: 1,
  zoomLevel: 1,
  fitMode: 'width' as FitMode,
  rotation: 0,
  isThumbnailSidebarOpen: true,
  isLoading: false,
  isFullscreen: false,
  isPresentationMode: false,
};

export const useViewerStore = create<ViewerState>((set, get) => ({
  ...initialState,

  setFile: (fileName, fileId, totalPages) =>
    set({ fileName, fileId, totalPages, currentPage: 1 }),

  setCurrentPage: (page) => {
    const { totalPages } = get();
    const clamped = Math.min(Math.max(1, page), Math.max(totalPages, 1));
    set({ currentPage: clamped });
  },

  nextPage: () => {
    const { currentPage, totalPages } = get();
    if (currentPage < totalPages) set({ currentPage: currentPage + 1 });
  },

  prevPage: () => {
    const { currentPage } = get();
    if (currentPage > 1) set({ currentPage: currentPage - 1 });
  },

  setZoomLevel: (zoom) =>
    set({ zoomLevel: Math.min(Math.max(zoom, ZOOM_MIN), ZOOM_MAX), fitMode: 'custom' }),

  zoomIn: () => {
    const { zoomLevel } = get();
    set({
      zoomLevel: Math.min(zoomLevel + ZOOM_STEP, ZOOM_MAX),
      fitMode: 'custom',
    });
  },

  zoomOut: () => {
    const { zoomLevel } = get();
    set({
      zoomLevel: Math.max(zoomLevel - ZOOM_STEP, ZOOM_MIN),
      fitMode: 'custom',
    });
  },

  setFitMode: (mode) => set({ fitMode: mode }),

  rotateClockwise: () => {
    const { rotation } = get();
    set({ rotation: (rotation + 90) % 360 });
  },

  rotateCounterClockwise: () => {
    const { rotation } = get();
    set({ rotation: (rotation - 90 + 360) % 360 });
  },

  toggleThumbnailSidebar: () =>
    set((state) => ({ isThumbnailSidebarOpen: !state.isThumbnailSidebarOpen })),

  setLoading: (loading) => set({ isLoading: loading }),

  toggleFullscreen: () =>
    set((state) => ({ isFullscreen: !state.isFullscreen })),

  togglePresentationMode: () =>
    set((state) => ({ isPresentationMode: !state.isPresentationMode })),

  reset: () => set(initialState),
}));