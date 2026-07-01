'use client';

import { useState, useEffect, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import {
  ChevronLeft, ChevronRight, X, Circle,
  Sun, Moon,
} from 'lucide-react';

interface PresentationModeProps {
  documentFile: string;
  totalPages: number;
  startPage: number;
  onClose: () => void;
}

export function PresentationMode({
  documentFile,
  totalPages,
  startPage,
  onClose,
}: PresentationModeProps) {
  const [page, setPage] = useState(startPage);
  const [screen, setScreen] = useState<'normal' | 'black' | 'white'>('normal');
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [showLaser, setShowLaser] = useState(false);

  const next = useCallback(() => setPage((p) => Math.min(p + 1, totalPages)), [totalPages]);
  const prev = useCallback(() => setPage((p) => Math.max(p - 1, 1)), []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'b') setScreen((s) => s === 'black' ? 'normal' : 'black');
      if (e.key === 'w') setScreen((s) => s === 'white' ? 'normal' : 'white');
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, next, prev]);

  if (screen === 'black') {
    return (
      <div
        className="fixed inset-0 z-50 flex cursor-none items-center justify-center bg-black"
        onClick={() => setScreen('normal')}
      >
        <span className="font-mono text-xs text-gray-600">click to return · press B for black · W for white</span>
      </div>
    );
  }

  if (screen === 'white') {
    return (
      <div
        className="fixed inset-0 z-50 flex cursor-none items-center justify-center bg-white"
        onClick={() => setScreen('normal')}
      >
        <span className="font-mono text-xs text-gray-300">click to return</span>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black"
      onMouseMove={(e) => {
        if (showLaser) setLaserPos({ x: e.clientX, y: e.clientY });
      }}
    >
      {/* Laser dot */}
      {showLaser && laserPos && (
        <div
          className="pointer-events-none fixed z-50 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 opacity-80 shadow-[0_0_12px_4px_rgba(255,0,0,0.6)]"
          style={{ left: laserPos.x, top: laserPos.y }}
        />
      )}

      {/* PDF page */}
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        <Document file={documentFile} loading={<span className="text-white">Loading…</span>}>
          <Page
            pageNumber={page}
            height={window.innerHeight - 80}
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />
        </Document>
      </div>

      {/* Floating controls */}
      <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-black/60 px-4 py-2 backdrop-blur">
        <button onClick={prev} aria-label="Previous" className="text-white hover:text-[#C8732A]">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-mono text-xs text-white/60">{page} / {totalPages}</span>
        <button onClick={next} aria-label="Next" className="text-white hover:text-[#C8732A]">
          <ChevronRight className="h-5 w-5" />
        </button>
        <div className="mx-1 h-4 w-px bg-white/20" />
        <button
          onClick={() => setShowLaser((v) => !v)}
          aria-label="Laser pointer"
          className={showLaser ? 'text-red-400' : 'text-white/60 hover:text-white'}
        >
          <Circle className="h-4 w-4 fill-current" />
        </button>
        <button onClick={() => setScreen('black')} aria-label="Black screen" className="text-white/60 hover:text-white">
          <Moon className="h-4 w-4" />
        </button>
        <button onClick={() => setScreen('white')} aria-label="White screen" className="text-white/60 hover:text-white">
          <Sun className="h-4 w-4" />
        </button>
        <div className="mx-1 h-4 w-px bg-white/20" />
        <button onClick={onClose} aria-label="Exit presentation" className="text-white/60 hover:text-red-400">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}