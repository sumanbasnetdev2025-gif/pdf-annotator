import { create } from 'zustand';
import { Annotation } from '@/types';

interface HistoryEntry {
  annotations: Annotation[];
}

interface AnnotationState {
  // pageNumber -> annotations on that page
  annotationsByPage: Record<number, Annotation[]>;
  selectedIds: string[];

  // History (undo/redo) - stores full snapshots, keyed by nothing (global across all pages)
  history: HistoryEntry[];
  historyIndex: number;

  // Actions
  addAnnotation: (pageNumber: number, annotation: Annotation) => void;
  updateAnnotation: (pageNumber: number, id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (pageNumber: number, id: string) => void;
  deleteSelected: () => void;
  setAnnotationsForPage: (pageNumber: number, annotations: Annotation[]) => void;
  getAnnotationsForPage: (pageNumber: number) => Annotation[];

  selectAnnotation: (id: string, multi?: boolean) => void;
  clearSelection: () => void;

  duplicateSelected: (pageNumber: number) => void;
  bringForward: (pageNumber: number, id: string) => void;
  sendBackward: (pageNumber: number, id: string) => void;
  toggleLock: (pageNumber: number, id: string) => void;

  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  loadAllAnnotations: (data: Record<number, Annotation[]>) => void;
  reset: () => void;
}

const MAX_HISTORY = 50;

function flattenAll(annotationsByPage: Record<number, Annotation[]>): Annotation[] {
  return Object.values(annotationsByPage).flat();
}

function rebuildByPage(annotations: Annotation[]): Record<number, Annotation[]> {
  const result: Record<number, Annotation[]> = {};
  for (const ann of annotations) {
    if (!result[ann.pageNumber]) result[ann.pageNumber] = [];
    result[ann.pageNumber].push(ann);
  }
  return result;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotationsByPage: {},
  selectedIds: [],
  history: [{ annotations: [] }],
  historyIndex: 0,

  addAnnotation: (pageNumber, annotation) => {
    set((state) => {
      const pageAnns = state.annotationsByPage[pageNumber] || [];
      return {
        annotationsByPage: {
          ...state.annotationsByPage,
          [pageNumber]: [...pageAnns, annotation],
        },
      };
    });
    get().pushHistory();
  },

  updateAnnotation: (pageNumber, id, updates) => {
    set((state) => {
      const pageAnns = state.annotationsByPage[pageNumber] || [];
      return {
        annotationsByPage: {
          ...state.annotationsByPage,
          [pageNumber]: pageAnns.map((a) =>
            a.id === id ? ({ ...a, ...updates, updatedAt: Date.now() } as Annotation) : a
          ),
        },
      };
    });
  },

  deleteAnnotation: (pageNumber, id) => {
    set((state) => {
      const pageAnns = state.annotationsByPage[pageNumber] || [];
      return {
        annotationsByPage: {
          ...state.annotationsByPage,
          [pageNumber]: pageAnns.filter((a) => a.id !== id),
        },
        selectedIds: state.selectedIds.filter((sid) => sid !== id),
      };
    });
    get().pushHistory();
  },

  deleteSelected: () => {
    const { selectedIds, annotationsByPage } = get();
    if (selectedIds.length === 0) return;
    const updated: Record<number, Annotation[]> = {};
    for (const [page, anns] of Object.entries(annotationsByPage)) {
      updated[Number(page)] = anns.filter((a) => !selectedIds.includes(a.id));
    }
    set({ annotationsByPage: updated, selectedIds: [] });
    get().pushHistory();
  },

  setAnnotationsForPage: (pageNumber, annotations) => {
    set((state) => ({
      annotationsByPage: {
        ...state.annotationsByPage,
        [pageNumber]: annotations,
      },
    }));
  },

  getAnnotationsForPage: (pageNumber) => {
    return get().annotationsByPage[pageNumber] || [];
  },

  selectAnnotation: (id, multi = false) => {
    set((state) => {
      if (multi) {
        const exists = state.selectedIds.includes(id);
        return {
          selectedIds: exists
            ? state.selectedIds.filter((sid) => sid !== id)
            : [...state.selectedIds, id],
        };
      }
      return { selectedIds: [id] };
    });
  },

  clearSelection: () => set({ selectedIds: [] }),

  duplicateSelected: (pageNumber) => {
    const { selectedIds, annotationsByPage } = get();
    const pageAnns = annotationsByPage[pageNumber] || [];
    const toDuplicate = pageAnns.filter((a) => selectedIds.includes(a.id));
    if (toDuplicate.length === 0) return;

    const duplicates = toDuplicate.map((a) => {
      const offset = 'x' in a ? { x: a.x + 20, y: a.y + 20 } : {};
      return {
        ...a,
        ...offset,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Annotation;
    });

    set((state) => ({
      annotationsByPage: {
        ...state.annotationsByPage,
        [pageNumber]: [...pageAnns, ...duplicates],
      },
      selectedIds: duplicates.map((d) => d.id),
    }));
    get().pushHistory();
  },

  bringForward: (pageNumber, id) => {
    set((state) => {
      const pageAnns = [...(state.annotationsByPage[pageNumber] || [])];
      const idx = pageAnns.findIndex((a) => a.id === id);
      if (idx === -1 || idx === pageAnns.length - 1) return state;
      [pageAnns[idx], pageAnns[idx + 1]] = [pageAnns[idx + 1], pageAnns[idx]];
      return {
        annotationsByPage: { ...state.annotationsByPage, [pageNumber]: pageAnns },
      };
    });
    get().pushHistory();
  },

  sendBackward: (pageNumber, id) => {
    set((state) => {
      const pageAnns = [...(state.annotationsByPage[pageNumber] || [])];
      const idx = pageAnns.findIndex((a) => a.id === id);
      if (idx <= 0) return state;
      [pageAnns[idx], pageAnns[idx - 1]] = [pageAnns[idx - 1], pageAnns[idx]];
      return {
        annotationsByPage: { ...state.annotationsByPage, [pageNumber]: pageAnns },
      };
    });
    get().pushHistory();
  },

  toggleLock: (pageNumber, id) => {
    set((state) => {
      const pageAnns = state.annotationsByPage[pageNumber] || [];
      return {
        annotationsByPage: {
          ...state.annotationsByPage,
          [pageNumber]: pageAnns.map((a) =>
            a.id === id ? { ...a, locked: !a.locked } : a
          ),
        },
      };
    });
  },

  pushHistory: () => {
    const { history, historyIndex, annotationsByPage } = get();
    const snapshot = flattenAll(annotationsByPage);
    const truncated = history.slice(0, historyIndex + 1);
    const newHistory = [...truncated, { annotations: snapshot }].slice(-MAX_HISTORY);
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const snapshot = history[newIndex];
    set({
      annotationsByPage: rebuildByPage(snapshot.annotations),
      historyIndex: newIndex,
      selectedIds: [],
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const snapshot = history[newIndex];
    set({
      annotationsByPage: rebuildByPage(snapshot.annotations),
      historyIndex: newIndex,
      selectedIds: [],
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  loadAllAnnotations: (data) => {
    set({
      annotationsByPage: data,
      history: [{ annotations: flattenAll(data) }],
      historyIndex: 0,
      selectedIds: [],
    });
  },

  reset: () =>
    set({
      annotationsByPage: {},
      selectedIds: [],
      history: [{ annotations: [] }],
      historyIndex: 0,
    }),
}));