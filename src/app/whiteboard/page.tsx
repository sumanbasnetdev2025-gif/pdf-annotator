'use client';

import { useEffect, useState } from 'react';
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

const WHITEBOARD_PAGE = 1; // whiteboard uses a single fixed "page" in the annotation store

export default function WhiteboardPage() {
  const router = useRouter();
  const [size, setSize] = useState({ width: 0, height: 0 });

  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const undo = useAnnotationStore((s) => s.undo);
  const redo = useAnnotationStore((s) => s.redo);
  const setAnnotationsForPage = useAnnotationStore((s) => s.setAnnotationsForPage);

  useEffect(() => {
    function updateSize() {
      setSize({ width: window.innerWidth, height: window.innerHeight - 112 });
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (isCtrl && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const clearBoard = () => {
    if (confirm('Clear the whole whiteboard? This cannot be undone.')) {
      setAnnotationsForPage(WHITEBOARD_PAGE, []);
    }
  };

  return (
<div className="flex h-dvh flex-col overflow-hidden bg-[#E8E6E0] dark:bg-[#1C1B1F]">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D8D4CB] bg-white px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-[#1C1B1F]">Whiteboard</span>
        </div>

        <div className="flex min-w-0 flex-1 items-center">
          <div className="flex w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-[#D8D4CB] p-0.5 scrollbar-none dark:border-[#3A3833]">
            <Button 
              variant={activeTool === 'select' ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => setActiveTool('select')} 
              aria-label="Select"
              className="shrink-0"
            >
              <MousePointer2 className="h-4 w-4" />
            </Button>
            <Button 
              variant={activeTool === 'pen' ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => setActiveTool('pen')} 
              aria-label="Pen"
              className="shrink-0"
            >
              <Pen className="h-4 w-4" />
            </Button>
            <Button 
              variant={activeTool === 'highlighter' ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => setActiveTool('highlighter')} 
              aria-label="Highlighter"
              className="shrink-0"
            >
              <Highlighter className="h-4 w-4" />
            </Button>
            <Button 
              variant={activeTool === 'rectangle' ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => setActiveTool('rectangle')} 
              aria-label="Rectangle"
              className="shrink-0"
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button 
              variant={activeTool === 'circle' ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => setActiveTool('circle')} 
              aria-label="Circle"
              className="shrink-0"
            >
              <CircleIcon className="h-4 w-4" />
            </Button>
            <Button 
              variant={activeTool === 'line' ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => setActiveTool('line')} 
              aria-label="Line"
              className="shrink-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button 
              variant={activeTool === 'arrow' ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => setActiveTool('arrow')} 
              aria-label="Arrow"
              className="shrink-0"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Button>
            <Button 
              variant={activeTool === 'text' ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => setActiveTool('text')} 
              aria-label="Text"
              className="shrink-0"
            >
              <Type className="h-4 w-4" />
            </Button>
            <Button 
              variant={activeTool === 'sticky-note' ? 'default' : 'ghost'} 
              size="icon" 
              onClick={() => setActiveTool('sticky-note')} 
              aria-label="Sticky note"
              className="shrink-0"
            >
              <StickyNote className="h-4 w-4" />
            </Button>
            <div className="mx-1 h-5 w-px shrink-0 bg-[#D8D4CB]" />
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
        </div>

        <Button variant="ghost" size="icon" onClick={clearBoard} aria-label="Clear board">
          <Trash2 className="h-4 w-4 text-[#D62828]" />
        </Button>
      </header>

      <ToolSettingsPanel />

      <main className="relative flex-1 overflow-hidden">
        {size.width > 0 && (
          <div
            className="relative mx-auto bg-white shadow-inner"
            style={{ width: size.width, height: size.height }}
          >
            <DrawingCanvas pageNumber={WHITEBOARD_PAGE} width={size.width} height={size.height} />
            <TextToolLayer pageNumber={WHITEBOARD_PAGE} width={size.width} height={size.height} />
          </div>
        )}
      </main>
    </div>
  );
}