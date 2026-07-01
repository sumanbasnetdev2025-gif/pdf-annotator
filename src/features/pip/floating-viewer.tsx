'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import { ChevronLeft, ChevronRight, X, Maximize2, GripHorizontal } from 'lucide-react';
import { useViewerStore } from '@/store/viewer-store';

interface FloatingViewerProps {
  documentFile: string;
  onExpand: () => void;
  onClose: () => void;
}

export function FloatingViewer({ documentFile, onExpand, onClose }: FloatingViewerProps) {
  const { currentPage, totalPages, nextPage, prevPage } = useViewerStore();
  const [pos, setPos] = useState({ x: -1, y: -1 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Default: bottom-right corner
    setPos({
      x: window.innerWidth - 236,
      y: window.innerHeight - 210,
    });
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const newX = Math.min(Math.max(0, e.clientX - dragOffset.current.x), window.innerWidth - 236);
    const newY = Math.min(Math.max(0, e.clientY - dragOffset.current.y), window.innerHeight - 180);
    setPos({ x: newX, y: newY });
  }, [isDragging]);

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (pos.x === -1) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        width: 236,
      }}
      className="overflow-hidden rounded-2xl bg-[#1C1B1F] shadow-2xl ring-1 ring-white/10"
    >
      {/* Drag handle */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex cursor-grab items-center justify-between bg-[#2A2824] px-2 py-1.5 active:cursor-grabbing"
      >
        <div className="flex items-center gap-1">
          <GripHorizontal className="h-3.5 w-3.5 text-white/30" />
          <button onClick={prevPage} className="rounded p-0.5 text-white/60 hover:text-white" aria-label="Previous page">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-[10px] text-white/50">{currentPage}/{totalPages}</span>
          <button onClick={nextPage} className="rounded p-0.5 text-white/60 hover:text-white" aria-label="Next page">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onExpand} className="rounded p-0.5 text-white/60 hover:text-white" aria-label="Expand">
            <Maximize2 className="h-3 w-3" />
          </button>
          <button onClick={onClose} className="rounded p-0.5 text-white/60 hover:text-red-400" aria-label="Close">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* PDF thumbnail */}
      <div
        className="flex cursor-pointer items-center justify-center bg-[#1C1B1F] p-1"
        onDoubleClick={onExpand}
      >
        <Document
          file={documentFile}
          loading={
            <div className="flex h-28 items-center justify-center">
              <span className="font-mono text-[10px] text-white/30">loading…</span>
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            width={220}
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />
        </Document>
      </div>

      <div className="bg-[#2A2824] px-3 py-1 text-center">
        <span className="font-mono text-[9px] text-white/30">double-tap to expand</span>
      </div>
    </div>
  );
}