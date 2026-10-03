'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Pen,
  MousePointer2,
  Highlighter,
  Undo2,
  Redo2,
  Square,
  Circle as CircleIcon,
  Minus,
  ArrowUpRight,
  Type,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToolStore } from '@/store/tool-store';
import { useAnnotationStore } from '@/store/annotation-store';
import { DrawingCanvas } from '@/features/annotator/drawing-canvas';
import { TextToolLayer } from '@/features/annotator/text-tool-layer';
import { ToolSettingsPanel } from '@/features/annotator/tool-settings-panel';
import type { ToolType } from '@/types';

const WHITEBOARD_PAGE = 1;
const PASS_THROUGH_TOOLS: ToolType[] = ['select', 'text', 'sticky-note', 'hand'];

interface ToolDef {
  tool: ToolType;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const TOOLS: ToolDef[] = [
  { tool: 'select',      Icon: MousePointer2, label: 'Select' },
  { tool: 'pen',         Icon: Pen,           label: 'Pen' },
  { tool: 'highlighter', Icon: Highlighter,   label: 'Highlighter' },
  { tool: 'rectangle',   Icon: Square,        label: 'Rectangle' },
  { tool: 'circle',      Icon: CircleIcon,    label: 'Circle' },
  { tool: 'line',        Icon: Minus,         label: 'Line' },
  { tool: 'arrow',       Icon: ArrowUpRight,  label: 'Arrow' },
  { tool: 'text',        Icon: Type,          label: 'Text' },
  { tool: 'sticky-note', Icon: StickyNote,    label: 'Sticky note' },
];

const BG_THEMES = [
  { id: 'white', bg: '#ffffff', dot: '#d1d5db', label: 'White' },
  { id: 'black', bg: '#0f0f0f', dot: '#374151', label: 'Black' },
  { id: 'cream', bg: '#faf7f0', dot: '#d6cfc4', label: 'Cream' },
  { id: 'navy',  bg: '#0f172a', dot: '#1e3a5f', label: 'Navy' },
  { id: 'green', bg: '#052e16', dot: '#14532d', label: 'Chalkboard' },
  { id: 'gray',  bg: '#f1f5f9', dot: '#cbd5e1', label: 'Gray' },
];

function BgPicker({
  current,
  onChange,
}: {
  current: string;
  onChange: (bg: string, dot: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {BG_THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          title={t.label}
          aria-label={`Background: ${t.label}`}
          onClick={() => onChange(t.bg, t.dot)}
          className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110"
          style={{
            backgroundColor: t.bg,
            borderColor: current === t.bg ? '#C8732A' : 'rgba(0,0,0,0.15)',
            transform: current === t.bg ? 'scale(1.2)' : 'scale(1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      ))}
    </div>
  );
}

export default function WhiteboardPage() {
  const router = useRouter();
  const [dotColor, setDotColor] = useState('#d1d5db');

  // ── Tool store ──
  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const whiteboardBg = useToolStore((s) => s.whiteboardBg);
  const setWhiteboardBg = useToolStore((s) => s.setWhiteboardBg);

  // ── Annotation store ──
  const undo = useAnnotationStore((s) => s.undo);
  const redo = useAnnotationStore((s) => s.redo);
  const setAnnotationsForPage = useAnnotationStore((s) => s.setAnnotationsForPage);

  const [viewportWidth, setViewportWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(3000);
  const scrollRef = useRef<HTMLDivElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);

  const penActive = !PASS_THROUGH_TOOLS.includes(activeTool);
  const textActive = activeTool === 'text' || activeTool === 'sticky-note';

  // ── Viewport width ────────────────────────────────────────────────────
  useEffect(() => {
    function update() {
      setViewportWidth(window.innerWidth);
    }
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // ── Infinite scroll — grow canvas as user scrolls down ───────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function handleScroll() {
      if (!el) return;
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distFromBottom < 600) {
        setCanvasHeight((prev) => prev + 2000);
      }
    }
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  // ── Reset tool on mount ───────────────────────────────────────────────
  useEffect(() => {
    setActiveTool('pen');
  }, [setActiveTool]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (isCtrl && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (isCtrl && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  function clearBoard() {
    if (confirm('Clear the whole whiteboard? This cannot be undone.')) {
      setAnnotationsForPage(WHITEBOARD_PAGE, []);
    }
  }

  const canvasWidth = Math.max(4000, viewportWidth);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#E8E6E0] dark:bg-[#1C1B1F]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 flex flex-col gap-2 border-b border-[#D8D4CB] bg-white px-2 py-2 sm:px-4 sm:py-2.5 dark:border-[#3A3833] dark:bg-[#26242A]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              aria-label="Back"
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="truncate text-sm font-medium text-[#1C1B1F] dark:text-[#E8E6E0]">
              Whiteboard
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={clearBoard}
            aria-label="Clear board"
            className="shrink-0"
          >
            <Trash2 className="h-4 w-4 text-[#D62828]" />
          </Button>
        </div>

        <div className="flex w-full items-center gap-2 overflow-x-auto scrollbar-none">
          {/* Tools */}
          <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-[#D8D4CB] p-0.5 dark:border-[#3A3833]">
            {TOOLS.map(({ tool, Icon, label }) => (
              <Button
                key={tool}
                variant={activeTool === tool ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setActiveTool(tool)}
                aria-label={label}
                title={label}
                className="shrink-0"
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}

            <div className="mx-1 h-5 w-px shrink-0 bg-[#D8D4CB] dark:bg-[#3A3833]" />

            <Button
              variant="ghost"
              size="icon"
              onClick={undo}
              aria-label="Undo"
              className="shrink-0"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={redo}
              aria-label="Redo"
              className="shrink-0"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Background picker */}
          <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#D8D4CB] px-2 py-1 dark:border-[#3A3833]">
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-[#A8A49B]">
              BG
            </span>
            <BgPicker
              current={whiteboardBg}
              onChange={(bg, dot) => {
                setWhiteboardBg(bg);
                setDotColor(dot);
              }}
            />
          </div>
        </div>
      </header>

      {/* ── Settings bar ── */}
      <div ref={settingsPanelRef} data-tool-settings-panel>
        <ToolSettingsPanel />
      </div>

      {/* ── Infinite scrollable canvas ── */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-auto bg-[#E8E6E0] dark:bg-[#1C1B1F]"
        style={{ touchAction: penActive ? 'none' : 'auto' }}
      >
        <div
          className="relative"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            backgroundColor: whiteboardBg,
            transition: 'background-color 0.2s ease',
          }}
        >
          {/* Dot grid */}
          <svg
            className="pointer-events-none absolute inset-0"
            width="100%"
            height="100%"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="wb-grid"
                x="0"
                y="0"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1" cy="1" r="0.8" fill={dotColor} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#wb-grid)" />
          </svg>

          {/* Text layer */}
          <div
            className="absolute inset-0"
            style={{
              zIndex: textActive ? 20 : 5,
              pointerEvents: textActive ? 'auto' : 'none',
            }}
          >
            {viewportWidth > 0 && (
              <TextToolLayer
                pageNumber={WHITEBOARD_PAGE}
                width={canvasWidth}
                height={canvasHeight}
              />
            )}
          </div>

          {/* Drawing canvas */}
          <div
            className="absolute inset-0"
            style={{
              zIndex: 10,
              pointerEvents: penActive ? 'auto' : 'none',
              touchAction: penActive ? 'none' : 'auto',
            }}
          >
            {viewportWidth > 0 && (
              <DrawingCanvas
                pageNumber={WHITEBOARD_PAGE}
                width={canvasWidth}
                height={canvasHeight}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}