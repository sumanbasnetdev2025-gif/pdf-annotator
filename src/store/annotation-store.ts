import { create } from 'zustand';
import type { Annotation } from '@/types';

type PageMap = Record<number, Annotation[]>;

const MAX_HISTORY = 50;

interface AnnotationState {
  annotationsByPage: PageMap;
  selectedIds: string[];
  past: PageMap[];
  future: PageMap[];

  // CRUD
  addAnnotation: (pageNumber: number, annotation: Annotation) => void;
  updateAnnotation: (pageNumber: number, id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (pageNumber: number, id: string) => void;
  setAnnotationsForPage: (pageNumber: number, annotations: Annotation[]) => void;

  // Selection
  selectedId: string | null;
  selectAnnotation: (id: string, addToSelection?: boolean) => void;
  clearSelection: () => void;
  deleteSelected: () => void;

  // Per-item actions — match viewer/[id]/page.tsx call signatures
  duplicateSelected: (pageNumber: number) => void;
  bringForward: (pageNumber: number, id: string) => void;
  sendBackward: (pageNumber: number, id: string) => void;
  toggleLock: (pageNumber: number, id: string) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Helpers
  getAnnotationsForPage: (pageNumber: number) => Annotation[];
  clearAll: () => void;

  // Viewer page
  reset: () => void;
  loadAllAnnotations: (data: PageMap) => void;
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

  // ── Per-item actions (pageNumber-scoped, matching viewer signatures) ──
  duplicateSelected: (pageNumber) => {
    const { selectedIds, annotationsByPage } = get();
    if (selectedIds.length === 0) return;

    const OFFSET = 16;
    const pageAnns = annotationsByPage[pageNumber] ?? [];
    const selectedOnPage = pageAnns.filter((a) => selectedIds.includes(a.id));
    if (selectedOnPage.length === 0) return;

    const newIds: string[] = [];
    const clones: Annotation[] = selectedOnPage.map((a) => {
      const id = crypto.randomUUID();
      newIds.push(id);
      const ax = (a as { x?: number }).x;
      const ay = (a as { y?: number }).y;
      return {
        ...a,
        id,
        x: ax != null ? ax + OFFSET : ax,
        y: ay != null ? ay + OFFSET : ay,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Annotation;
    });

    get().pushHistory();
    set({
      annotationsByPage: {
        ...annotationsByPage,
        [pageNumber]: [...pageAnns, ...clones],
      },
      selectedIds: newIds,
      selectedId: newIds[0] ?? null,
    });
  },

  bringForward: (pageNumber, id) => {
    const { annotationsByPage } = get();
    const pageAnns = annotationsByPage[pageNumber] ?? [];
    if (!pageAnns.some((a) => a.id === id)) return;

    const sorted = [...pageAnns].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    const idx = sorted.findIndex((a) => a.id === id);
    if (idx < 0 || idx === sorted.length - 1) return;

    // swap with the next item
    [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
    const reindexed = sorted.map((a, i) => ({ ...a, zIndex: i }));

    get().pushHistory();
    set({
      annotationsByPage: {
        ...annotationsByPage,
        [pageNumber]: reindexed,
      },
    });
  },

  sendBackward: (pageNumber, id) => {
    const { annotationsByPage } = get();
    const pageAnns = annotationsByPage[pageNumber] ?? [];
    if (!pageAnns.some((a) => a.id === id)) return;

    const sorted = [...pageAnns].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    const idx = sorted.findIndex((a) => a.id === id);
    if (idx <= 0) return;

    // swap with the previous item
    [sorted[idx], sorted[idx - 1]] = [sorted[idx - 1], sorted[idx]];
    const reindexed = sorted.map((a, i) => ({ ...a, zIndex: i }));

    get().pushHistory();
    set({
      annotationsByPage: {
        ...annotationsByPage,
        [pageNumber]: reindexed,
      },
    });
  },

  toggleLock: (pageNumber, id) => {
    const { annotationsByPage } = get();
    const pageAnns = annotationsByPage[pageNumber] ?? [];
    const target = pageAnns.find((a) => a.id === id);
    if (!target) return;

    get().pushHistory();
    set({
      annotationsByPage: {
        ...annotationsByPage,
        [pageNumber]: pageAnns.map((a) =>
          a.id === id
            ? { ...a, locked: !a.locked, updatedAt: Date.now() }
            : a
        ),
      },
    });
  },

  // ── Helpers ───────────────────────────────────────────────────────────
  getAnnotationsForPage: (pageNumber) =>
    get().annotationsByPage[pageNumber] ?? [],

  clearAll: () =>
    set({ annotationsByPage: {}, selectedIds: [], selectedId: null, past: [], future: [] }),

  reset: () =>
    set({
      annotationsByPage: {},
      selectedIds: [],
      selectedId: null,
      past: [],
      future: [],
    }),

  loadAllAnnotations: (data) => {
    set({
      annotationsByPage: data ?? {},
      selectedIds: [],
      selectedId: null,
      past: [],
      future: [],
    });
  },
}));