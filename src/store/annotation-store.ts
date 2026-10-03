import { create } from 'zustand';
import type { Annotation } from '@/types';

type PageMap = Record<number, Annotation[]>;

const MAX_HISTORY = 50;

interface AnnotationState {
  annotationsByPage: PageMap;
  selectedIds: string[];
  past: PageMap[];
  future: PageMap[];

  // CRUD — signature matches what drawing-canvas and text-tool-layer call
  addAnnotation: (pageNumber: number, annotation: Annotation) => void;
  updateAnnotation: (pageNumber: number, id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (pageNumber: number, id: string) => void;
  setAnnotationsForPage: (pageNumber: number, annotations: Annotation[]) => void;

  // Selection
  selectedId: string | null;
  selectAnnotation: (id: string, addToSelection?: boolean) => void;
  clearSelection: () => void;
  deleteSelected: () => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Helpers
  getAnnotationsForPage: (pageNumber: number) => Annotation[];
  clearAll: () => void;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  annotationsByPage: {},
  selectedIds: [],
  selectedId: null,
  past: [],
  future: [],

  // ── History ──────────────────────────────────────────────────────────
  pushHistory: () => {
    const current = get().annotationsByPage;
    set({
      past: [...get().past.slice(-MAX_HISTORY), current],
      future: [],
    });
  },

  undo: () => {
    const { past, annotationsByPage } = get();
    if (past.length === 0) return;
    set({
      annotationsByPage: past[past.length - 1],
      past: past.slice(0, -1),
      future: [annotationsByPage, ...get().future],
      selectedIds: [],
      selectedId: null,
    });
  },

  redo: () => {
    const { future, annotationsByPage } = get();
    if (future.length === 0) return;
    set({
      annotationsByPage: future[0],
      past: [...get().past, annotationsByPage],
      future: future.slice(1),
      selectedIds: [],
      selectedId: null,
    });
  },

  // ── CRUD ─────────────────────────────────────────────────────────────
  addAnnotation: (pageNumber, annotation) => {
    get().pushHistory();
    const current = get().annotationsByPage[pageNumber] ?? [];
    set({
      annotationsByPage: {
        ...get().annotationsByPage,
        [pageNumber]: [...current, annotation],
      },
    });
  },

  updateAnnotation: (pageNumber, id, updates) => {
    const current = get().annotationsByPage[pageNumber] ?? [];
    set({
      annotationsByPage: {
        ...get().annotationsByPage,
        [pageNumber]: current.map((a) =>
          a.id === id ? ({ ...a, ...updates, updatedAt: Date.now() } as Annotation) : a
        ),
      },
    });
  },

  deleteAnnotation: (pageNumber, id) => {
    get().pushHistory();
    const current = get().annotationsByPage[pageNumber] ?? [];
    set({
      annotationsByPage: {
        ...get().annotationsByPage,
        [pageNumber]: current.filter((a) => a.id !== id),
      },
      selectedIds: get().selectedIds.filter((s) => s !== id),
      selectedId: get().selectedId === id ? null : get().selectedId,
    });
  },

  setAnnotationsForPage: (pageNumber, annotations) => {
    get().pushHistory();
    set({
      annotationsByPage: {
        ...get().annotationsByPage,
        [pageNumber]: annotations,
      },
    });
  },

  // ── Selection ─────────────────────────────────────────────────────────
  selectAnnotation: (id, addToSelection = false) => {
    set({
      selectedIds: addToSelection
        ? [...get().selectedIds.filter((s) => s !== id), id]
        : [id],
      selectedId: id,
    });
  },

  clearSelection: () => set({ selectedIds: [], selectedId: null }),

  deleteSelected: () => {
    const { selectedIds, annotationsByPage } = get();
    if (selectedIds.length === 0) return;
    get().pushHistory();
    const next: PageMap = {};
    for (const [page, anns] of Object.entries(annotationsByPage)) {
      next[Number(page)] = anns.filter((a) => !selectedIds.includes(a.id));
    }
    set({ annotationsByPage: next, selectedIds: [], selectedId: null });
  },

  // ── Helpers ───────────────────────────────────────────────────────────
  getAnnotationsForPage: (pageNumber) =>
    get().annotationsByPage[pageNumber] ?? [],

  clearAll: () =>
    set({ annotationsByPage: {}, selectedIds: [], selectedId: null, past: [], future: [] }),
}));