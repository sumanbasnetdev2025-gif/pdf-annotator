'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ArrowLeft, Loader2,
  Pen, MousePointer2, Highlighter, Undo2, Redo2, Square,
  Circle as CircleIcon, Minus, ArrowUpRight, Type, StickyNote,
  PanelRight, PenSquare, Copy, BringToFront, SendToBack, Lock,
  Eraser, Search as SearchIcon, Trash2, MessageSquarePlus,
  Download, Monitor, Hand,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDocument, getAnnotations } from '@/lib/db';
import { useViewerStore } from '@/store/viewer-store';
import { useToolStore } from '@/store/tool-store';
import { useAnnotationStore } from '@/store/annotation-store';
import { DrawingCanvas } from '@/features/annotator/drawing-canvas';
import { TextToolLayer } from '@/features/annotator/text-tool-layer';
import { ToolSettingsPanel } from '@/features/annotator/tool-settings-panel';
import { AnnotationSidebar } from '@/features/annotator/annotation-sidebar';
import { PdfSearchBar } from '@/features/annotator/pdf-search-bar';
import { PresentationMode } from '@/features/presentation/presentation-mode';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAutosave } from '@/hooks/use-autosave';
import {FloatingViewer} from '@/features/pip/floating-viewer';
import { usePip } from '@/hooks/use-pip';
import { usePinchZoom } from '@/hooks/use-pinch-zoom';
import '@/lib/pdf-worker';

export default function ViewerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Natural page size at zoom=1 — used so canvas coords stay stable across zoom
  const naturalPageSize = useRef({ width: 0, height: 0 });
  const [canvasReady, setCanvasReady] = useState(false);

  const [showSidebar, setShowSidebar] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [pdfProxy, setPdfProxy] = useState<unknown>(null);
  const [explainerPoint, setExplainerPoint] = useState<{
    x: number; y: number; arrowId: string;
  } | null>(null);
  const [pageHeights, setPageHeights] = useState<Record<number, number>>({});
  const [searchHighlights, setSearchHighlights] = useState<DOMRect[]>([]);

  const pageWrapperRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const {
    currentPage, totalPages, zoomLevel, setFile, setCurrentPage,
    nextPage, prevPage, zoomIn, zoomOut, setLoading, isLoading,
  } = useViewerStore();
  const { showPip, setShowPip } = usePip();

  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);

  const selectedIds = useAnnotationStore((s) => s.selectedIds);
  const duplicateSelected = useAnnotationStore((s) => s.duplicateSelected);
  const bringForward = useAnnotationStore((s) => s.bringForward);
  const sendBackward = useAnnotationStore((s) => s.sendBackward);
  const toggleLock = useAnnotationStore((s) => s.toggleLock);
  const undo = useAnnotationStore((s) => s.undo);
  const redo = useAnnotationStore((s) => s.redo);
  const resetAnnotations = useAnnotationStore((s) => s.reset);
  const loadAllAnnotations = useAnnotationStore((s) => s.loadAllAnnotations);

  useAutosave(params.id);
usePinchZoom(mainScrollRef);

 useEffect(() => {
  async function load() {
    setLoading(true);
    resetAnnotations();

    const doc = await getDocument(params.id);

    if (!doc) {
      setError(
        "PDF not found. It may have been deleted or never saved correctly."
      );
      setLoading(false);
      return;
    }

    setFileData(doc.fileData);

    const blob = new Blob([doc. fileData], {
      type: "application/pdf",
    });
    setPdfUrl(URL.createObjectURL(blob));

    const url = URL.createObjectURL(blob);
    setPdfUrl(url);

    const saved = await getAnnotations(params.id);

    if (saved?.annotationsByPage) {
      loadAllAnnotations(saved.annotationsByPage);
    }

    setLoading(false);
  }

  load();

  return () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
  };
}, [
  params.id,
  setLoading,
  resetAnnotations,
  loadAllAnnotations,
]);
  
  useEffect(() => {
    setSearchHighlights([]);
    setCanvasReady(false);
  }, [currentPage]);

  useEffect(() => {
    let prevTool = useToolStore.getState().activeTool;

    function handleKeyDown(e: KeyboardEvent) {
      const isCtrl = e.ctrlKey || e.metaKey;
      const active = document.activeElement;
      const isTyping = active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT');
      if (isTyping) return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        prevTool = useToolStore.getState().activeTool;
        setActiveTool('hand');
        return;
      }
      if (isCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (isCtrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      else if (isCtrl && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(currentPage); }
      else if (isCtrl && e.key.toLowerCase() === 'f') { e.preventDefault(); setShowSearch(true); }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        setActiveTool(prevTool as typeof activeTool);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undo, redo, duplicateSelected, currentPage, setActiveTool]);

  // Memoized file object — Uint8Array is stable so this never spuriously changes
  const documentFile = useMemo(
    () => (pdfUrl ? pdfUrl : null),
    [pdfUrl]
  );

  const onDocumentLoadSuccess = useCallback(
    (pdf: unknown) => {
      setFile(fileName, params.id, (pdf as { numPages: number }).numPages);
      setPdfProxy(pdf);
    },
    [fileName, params.id, setFile]
  );

  const onDocumentLoadError = useCallback((err: Error) => {
    setError(`Could not open this PDF. (${err.message})`);
  }, []);

  const onPageRenderSuccess = useCallback(() => {
    const el = pageWrapperRef.current?.querySelector('canvas');
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;

    // Calculate natural size (zoom=1). Store once per page change.
    const naturalW = Math.round(w / zoomLevel);
    const naturalH = Math.round(h / zoomLevel);

    if (
      naturalPageSize.current.width !== naturalW ||
      naturalPageSize.current.height !== naturalH
    ) {
      naturalPageSize.current = { width: naturalW, height: naturalH };
    }

    setPageHeights((prev) => ({ ...prev, [currentPage]: h }));
    setCanvasReady(true);
  }, [zoomLevel, currentPage]);

  // Reset canvas ready flag when page changes
  useEffect(() => {
    setCanvasReady(false);
  }, [currentPage]);

  const handleClearAll = () => {
    if (confirm('Delete ALL annotations? This cannot be undone.')) {
      resetAnnotations();
    }
  };

  const handleExplainerDrawn = useCallback(
    (data: { x: number; y: number; arrowId: string }) => {
      setExplainerPoint(data);
    },
    []
  );

const handleExport = useCallback(async () => {
  if (!fileData) return;
  // Lazy-load pdf-lib only when the user actually exports.
  const { exportAnnotatedPdf } = await import('@/lib/export-pdf');
  const annotationsByPage = useAnnotationStore.getState().annotationsByPage;
  const bytes = await exportAnnotatedPdf(
    fileData.slice(0),
    annotationsByPage,
    pageHeights
  );
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.replace('.pdf', '') + '_annotated.pdf';
  a.click();
  URL.revokeObjectURL(url);
}, [fileData, fileName, pageHeights]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FAF9F6] dark:bg-[#1C1B1F] px-6 text-center">
        <p className="max-w-md text-[#1C1B1F] dark:text-[#F5F3EE]">{error}</p>
        <Button onClick={() => router.push('/')} className="bg-[#1C1B1F]">Back to upload</Button>
      </div>
    );
  }

const tools = [
    { id: 'select',      icon: <MousePointer2 className="h-4 w-4" />,     label: 'Select (V)' },
    { id: 'hand',        icon: <Hand className="h-4 w-4" />,              label: 'Pan / Move (spacebar)' },
    { id: 'pen',         icon: <Pen className="h-4 w-4" />,               label: 'Pen (P)' },
    { id: 'highlighter', icon: <Highlighter className="h-4 w-4" />,       label: 'Highlighter (H)' },
    { id: 'eraser',      icon: <Eraser className="h-4 w-4" />,            label: 'Eraser (E)' },
    { id: 'rectangle',   icon: <Square className="h-4 w-4" />,            label: 'Rectangle (R)' },
    { id: 'circle',      icon: <CircleIcon className="h-4 w-4" />,        label: 'Circle (C)' },
    { id: 'line',        icon: <Minus className="h-4 w-4" />,             label: 'Line (L)' },
    { id: 'arrow',       icon: <ArrowUpRight className="h-4 w-4" />,      label: 'Arrow (A)' },
    { id: 'text',        icon: <Type className="h-4 w-4" />,              label: 'Text (T)' },
    { id: 'sticky-note', icon: <StickyNote className="h-4 w-4" />,        label: 'Sticky Note (S)' },
    { id: 'explainer',   icon: <MessageSquarePlus className="h-4 w-4" />, label: 'Explainer — draw arrow → auto note' },
  ] as const;

  const nat = naturalPageSize.current;

  return (
<div className="flex h-dvh flex-col overflow-hidden bg-[#E8E6E0] dark:bg-[#1C1B1F]">
     {/* ── Toolbar ── */}
      <header className="sticky top-0 z-20 border-b border-[#D8D4CB] bg-white dark:border-[#3A3833] dark:bg-[#262420]">
        {/* Row 1: back, filename, utils */}
        <div className="flex items-center gap-1 px-2 py-1.5">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} aria-label="Back" className="h-7 w-7 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#1C1B1F] dark:text-[#F5F3EE]">
            {fileName}
          </span>
          {/* Page nav */}
          <Button variant="ghost" size="icon" onClick={prevPage} aria-label="Prev" className="h-7 w-7 shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="number" min={1} max={totalPages || 1} value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            className="w-8 rounded border border-[#D8D4CB] bg-transparent text-center font-mono text-xs dark:border-[#3A3833] dark:text-[#F5F3EE]"
          />
          <span className="font-mono text-xs text-[#6B6862] shrink-0">/{totalPages || '–'}</span>
          <Button variant="ghost" size="icon" onClick={nextPage} aria-label="Next" className="h-7 w-7 shrink-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
          {/* Zoom */}
          <Button variant="ghost" size="icon" onClick={zoomOut} aria-label="Zoom out" className="h-7 w-7 shrink-0">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="w-9 shrink-0 text-center font-mono text-xs text-[#6B6862]">
            {Math.round(zoomLevel * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={zoomIn} aria-label="Zoom in" className="h-7 w-7 shrink-0">
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Row 2: tools — horizontal scroll */}
        <div className="flex items-center gap-0.5 overflow-x-auto border-t border-[#F0EEE8] px-2 py-1 scrollbar-none dark:border-[#3A3833]">
          {tools.map((t) => (
            <Button
              key={t.id}
              variant={activeTool === t.id ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setActiveTool(t.id as typeof activeTool)}
              aria-label={t.label}
              title={t.label}
              className={`h-7 w-7 shrink-0 ${
                t.id === 'explainer' && activeTool !== 'explainer'
                  ? 'text-[#C8732A]'
                  : ''
              }`}
            >
              {t.icon}
            </Button>
          ))}
          <div className="mx-1 h-5 w-px shrink-0 bg-[#D8D4CB] dark:bg-[#3A3833]" />
          <Button variant="ghost" size="icon" onClick={undo} aria-label="Undo" title="Undo (Ctrl+Z)" className="h-7 w-7 shrink-0">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={redo} aria-label="Redo" title="Redo (Ctrl+Y)" className="h-7 w-7 shrink-0">
            <Redo2 className="h-4 w-4" />
          </Button>
          <div className="mx-1 h-5 w-px shrink-0 bg-[#D8D4CB] dark:bg-[#3A3833]" />
          <Button variant="ghost" size="icon" onClick={() => window.open('/whiteboard', '_blank')} aria-label="Whiteboard" title="Open Whiteboard" className="h-7 w-7 shrink-0">
            <PenSquare className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowSearch((v) => !v)} aria-label="Search" title="Search (Ctrl+F)" className="h-7 w-7 shrink-0">
            <SearchIcon className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowSidebar((v) => !v)} aria-label="Sidebar" title="Annotations sidebar" className="h-7 w-7 shrink-0">
            <PanelRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleExport} aria-label="Export PDF" title="Export annotated PDF" className="h-7 w-7 shrink-0">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsPresentationMode(true)} aria-label="Presentation" title="Presentation mode" className="h-7 w-7 shrink-0">
            <Monitor className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClearAll} aria-label="Clear all" title="Clear all annotations" className="h-7 w-7 shrink-0">
            <Trash2 className="h-4 w-4 text-[#D62828]" />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <ToolSettingsPanel />

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 border-b border-[#D8D4CB] bg-[#FBF0E4] px-4 py-1.5 dark:border-[#3A3833] dark:bg-[#2A2318]">
          <span className="mr-2 font-mono text-[10px] uppercase text-[#A8A49B]">
            {selectedIds.length} selected
          </span>
          <Button variant="ghost" size="icon" onClick={() => duplicateSelected(currentPage)} aria-label="Duplicate" className="h-6 w-6">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => selectedIds.forEach((id) => bringForward(currentPage, id))} aria-label="Bring forward" className="h-6 w-6">
            <BringToFront className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => selectedIds.forEach((id) => sendBackward(currentPage, id))} aria-label="Send backward" className="h-6 w-6">
            <SendToBack className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => selectedIds.forEach((id) => toggleLock(currentPage, id))} aria-label="Lock" className="h-6 w-6">
            <Lock className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {showSearch && (
        <PdfSearchBar
          pdfProxy={pdfProxy}
          totalPages={totalPages}
          onJumpToPage={setCurrentPage}
          onHighlights={setSearchHighlights}
          onClose={() => {setShowSearch(false); setSearchHighlights([]);}}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
<main
  ref={mainScrollRef}
  className="flex flex-1 overflow-auto px-2 py-4 sm:px-8 sm:py-8"
  style={{ overscrollBehavior: 'contain' }}
>
            {isLoading && (
              <div className="flex w-full items-center justify-center gap-2 text-[#6B6862]">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading PDF…
              </div>
            )}

            <div className="mx-auto min-w-fit">
              <Document
                file={documentFile}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={
                  <div className="flex items-center gap-2 text-[#6B6862]">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Rendering…
                  </div>
                }
              >
                <div ref={pageWrapperRef} className="relative mx-auto rounded-md bg-white shadow-md">
<Page
  pageNumber={currentPage}
  scale={zoomLevel}
  renderAnnotationLayer
  renderTextLayer
  onRenderSuccess={onPageRenderSuccess}
/>

                  {searchHighlights.length > 0 && nat.width > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: nat.width * zoomLevel,
                        height: nat.height * zoomLevel,
                        pointerEvents: 'none',
                        zIndex: 3,
                      }}
                    >
                      {searchHighlights.map((rect, i) => (
                        <div
                          key={i}
                          style={{
                            position: 'absolute',
                            left: rect.x * zoomLevel,
                            top: rect.y * zoomLevel,
                            width: rect.width * zoomLevel,
                            height: rect.height * zoomLevel,
                            backgroundColor: 'rgba(255, 200, 0, 0.45)',
                            borderRadius: 2,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {canvasReady && nat.width > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: nat.width * zoomLevel,
                        height: nat.height * zoomLevel,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          transformOrigin: 'top left',
                          transform: `scale(${zoomLevel})`,
                          width: nat.width,
                          height: nat.height,
                        }}
                      >
                        <DrawingCanvas
                          pageNumber={currentPage}
                          width={nat.width}
                          height={nat.height}
                          onExplainerDrawn={handleExplainerDrawn}
                        />
                        <TextToolLayer
                          pageNumber={currentPage}
                          width={nat.width}
                          height={nat.height}
                          autoCreateAt={explainerPoint}
                          onAutoCreateHandled={() => setExplainerPoint(null)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Document>
            </div>
          </main>

        {showSidebar && (
          <AnnotationSidebar onClose={() => setShowSidebar(false)} />
        )}
      </div>

      {/* Presentation mode — uses stable pdfBytes, never slices ArrayBuffer in render */}
      {isPresentationMode && documentFile && (
        <PresentationMode
          documentFile={documentFile}
          totalPages={totalPages}
          startPage={currentPage}
          onClose={() => setIsPresentationMode(false)}
        />
      )}
      {/* Floating PiP — shows when user switches to another app */}
      {showPip && pdfUrl && (
        <FloatingViewer
          documentFile={pdfUrl}
          onExpand={() => {
            setShowPip(false);
            window.focus();
          }}
          onClose={() => setShowPip(false)}
        />
      )}
    </div>
  );
}