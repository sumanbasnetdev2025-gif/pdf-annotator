'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import {
  ChevronLeft, ChevronRight, X, Maximize2,
} from 'lucide-react';
import { useViewerStore } from '@/store/viewer-store';

interface FloatingViewerProps {
  documentFile: string;
  onExpand: () => void;
}

export function FloatingViewer({ documentFile, onExpand }: FloatingViewerProps) {
  const { currentPage, totalPages, nextPage, prevPage } = useViewerStore();

  const [pos, setPos] = useState({ x: 16, y: -1 }); // -1 means "snap to bottom"
  const [isDragging, setIsDragging] = useState(false);
  const [visible, setVisible] = useState(true);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Snap to bottom on first render
  useEffect(() => {
    setPos({ x: 16, y: window.innerHeight - 220 });
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  }, [pos]);

  useEffect(() => {
    if (!isDragging) return;
    function onMove(e: MouseEvent) {
      const newX = Math.min(Math.max(0, e.clientX - dragOffset.current.x), window.innerWidth - 220);
      const newY = Math.min(Math.max(0, e.clientY - dragOffset.current.y), window.innerHeight - 180);
      setPos({ x: newX, y: newY });
    }
    function onUp() { setIsDragging(false); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging]);

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        width: 220,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      className="overflow-hidden rounded-xl bg-[#1C1B1F] shadow-2xl ring-1 ring-white/10"
    >
      {/* Drag handle + controls */}
      <div
        onMouseDown={onMouseDown}
        className="flex items-center justify-between bg-[#262420] px-2 py-1.5"
      >
        <div className="flex items-center gap-1">
          <button
            onClick={prevPage}
            className="rounded p-0.5 text-white/60 hover:text-white"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="font-mono text-[10px] text-white/50">
            {currentPage}/{totalPages}
          </span>
          <button
            onClick={nextPage}
            className="rounded p-0.5 text-white/60 hover:text-white"
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onExpand}
            className="rounded p-0.5 text-white/60 hover:text-white"
            aria-label="Expand"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
          <button
            onClick={() => setVisible(false)}
            className="rounded p-0.5 text-white/60 hover:text-red-400"
            aria-label="Close pip"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Mini PDF */}
      <div className="flex items-center justify-center bg-[#1C1B1F] p-1">
        <Document
          file={documentFile}
          loading={
            <div className="flex h-32 items-center justify-center text-white/40">
              <span className="font-mono text-[10px]">loading…</span>
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            width={208}
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />
        </Document>
      </div>
    </div>
  );
}