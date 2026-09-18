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

const WHITEBOARD_PAGE = 1;

const PASS_THROUGH_TOOLS = [
  'select',
  'text',
  'sticky-note',
  'hand',
];

export default function WhiteboardPage() {
  const router = useRouter();

  const [size, setSize] = useState({
    width: 0,
    height: 0,
  });

  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);

  const undo = useAnnotationStore((s) => s.undo);
  const redo = useAnnotationStore((s) => s.redo);

  const setAnnotationsForPage = useAnnotationStore(
    (s) => s.setAnnotationsForPage
  );

  const penActive = !PASS_THROUGH_TOOLS.includes(activeTool);

  const textActive =
    activeTool === 'text' || activeTool === 'sticky-note';

  // ------------------------------------------------------------
  // Calculate whiteboard size
  // ------------------------------------------------------------
  useEffect(() => {
    function updateSize() {
      const vv = window.visualViewport;

      const viewportWidth = vv
        ? vv.width
        : window.innerWidth;

      const viewportHeight = vv
        ? vv.height
        : window.innerHeight;

      const header = document.querySelector('header');

      const headerHeight = header
        ? header.getBoundingClientRect().height
        : 56;

      const settingsPanel = document.querySelector(
        '[data-tool-settings-panel]'
      ) as HTMLElement | null;

      const settingsHeight = settingsPanel
        ? settingsPanel.getBoundingClientRect().height
        : 0;

      setSize({
        width: Math.floor(viewportWidth),
        height: Math.max(
          0,
          Math.floor(
            viewportHeight -
              headerHeight -
              settingsHeight
          )
        ),
      });
    }

    updateSize();

    let raf = 0;

    function scheduleUpdate() {
      cancelAnimationFrame(raf);

      raf = requestAnimationFrame(() => {
        updateSize();
      });
    }

    window.addEventListener(
      'resize',
      scheduleUpdate
    );

    window.addEventListener(
      'orientationchange',
      scheduleUpdate
    );

    window.visualViewport?.addEventListener(
      'resize',
      scheduleUpdate
    );

    const ro = new ResizeObserver(scheduleUpdate);

    const settingsPanel = document.querySelector(
      '[data-tool-settings-panel]'
    ) as HTMLElement | null;

    if (settingsPanel) {
      ro.observe(settingsPanel);
    }

    return () => {
      cancelAnimationFrame(raf);

      window.removeEventListener(
        'resize',
        scheduleUpdate
      );

      window.removeEventListener(
        'orientationchange',
        scheduleUpdate
      );

      window.visualViewport?.removeEventListener(
        'resize',
        scheduleUpdate
      );

      ro.disconnect();
    };
  }, []);

  // ------------------------------------------------------------
  // Keyboard shortcuts
  // ------------------------------------------------------------
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (
        isCtrl &&
        key === 'z' &&
        !e.shiftKey
      ) {
        e.preventDefault();
        undo();
        return;
      }

      if (
        isCtrl &&
        (
          key === 'y' ||
          (key === 'z' && e.shiftKey)
        )
      ) {
        e.preventDefault();
        redo();
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [undo, redo]);
// Reset the active tool to a sane default every time this page mounts.
useEffect(() => {
  setActiveTool('pen');
}, [setActiveTool]);
  // ------------------------------------------------------------
  // Clear board
  // ------------------------------------------------------------
  const clearBoard = () => {
    if (
      confirm(
        'Clear the whole whiteboard? This cannot be undone.'
      )
    ) {
      setAnnotationsForPage(
        WHITEBOARD_PAGE,
        []
      );
    }
  };

  return (
    <div
      className="
        flex
        h-dvh
        flex-col
        overflow-hidden
        bg-[#E8E6E0]
        dark:bg-[#1C1B1F]
      "
    >
      {/* Header */}
      <header
        className="
          sticky
          top-0
          z-30
          flex
          flex-col
          gap-2
          border-b
          border-[#D8D4CB]
          bg-white
          px-2
          py-2
          sm:px-4
          sm:py-2.5
          dark:border-[#3A3833]
          dark:bg-[#26242A]
        "
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/')}
              aria-label="Back"
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <span
              className="
                truncate
                text-sm
                font-medium
                text-[#1C1B1F]
                dark:text-[#E8E6E0]
              "
            >
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

        <div className="w-full overflow-x-auto scrollbar-none">
          <div
            className="
              flex
              w-max
              items-center
              gap-0.5
              rounded-lg
              border
              border-[#D8D4CB]
              p-0.5
              dark:border-[#3A3833]
            "
          >
            <Button
              variant={
                activeTool === 'select'
                  ? 'default'
                  : 'ghost'
              }
              size="icon"
              onClick={() => setActiveTool('select')}
              aria-label="Select"
              className="shrink-0"
            >
              <MousePointer2 className="h-4 w-4" />
            </Button>

            <Button
              variant={
                activeTool === 'pen'
                  ? 'default'
                  : 'ghost'
              }
              size="icon"
              onClick={() => setActiveTool('pen')}
              aria-label="Pen"
              className="shrink-0"
            >
              <Pen className="h-4 w-4" />
            </Button>

            <Button
              variant={
                activeTool === 'highlighter'
                  ? 'default'
                  : 'ghost'
              }
              size="icon"
              onClick={() =>
                setActiveTool('highlighter')
              }
              aria-label="Highlighter"
              className="shrink-0"
            >
              <Highlighter className="h-4 w-4" />
            </Button>

            <Button
              variant={
                activeTool === 'rectangle'
                  ? 'default'
                  : 'ghost'
              }
              size="icon"
              onClick={() =>
                setActiveTool('rectangle')
              }
              aria-label="Rectangle"
              className="shrink-0"
            >
              <Square className="h-4 w-4" />
            </Button>

            <Button
              variant={
                activeTool === 'circle'
                  ? 'default'
                  : 'ghost'
              }
              size="icon"
              onClick={() =>
                setActiveTool('circle')
              }
              aria-label="Circle"
              className="shrink-0"
            >
              <CircleIcon className="h-4 w-4" />
            </Button>

            <Button
              variant={
                activeTool === 'line'
                  ? 'default'
                  : 'ghost'
              }
              size="icon"
              onClick={() => setActiveTool('line')}
              aria-label="Line"
              className="shrink-0"
            >
              <Minus className="h-4 w-4" />
            </Button>

            <Button
              variant={
                activeTool === 'arrow'
                  ? 'default'
                  : 'ghost'
              }
              size="icon"
              onClick={() => setActiveTool('arrow')}
              aria-label="Arrow"
              className="shrink-0"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Button>

            <Button
              variant={
                activeTool === 'text'
                  ? 'default'
                  : 'ghost'
              }
              size="icon"
              onClick={() => setActiveTool('text')}
              aria-label="Text"
              className="shrink-0"
            >
              <Type className="h-4 w-4" />
            </Button>

            <Button
              variant={
                activeTool === 'sticky-note'
                  ? 'default'
                  : 'ghost'
              }
              size="icon"
              onClick={() =>
                setActiveTool('sticky-note')
              }
              aria-label="Sticky note"
              className="shrink-0"
            >
              <StickyNote className="h-4 w-4" />
            </Button>

            <div
              className="
                mx-1
                h-5
                w-px
                shrink-0
                bg-[#D8D4CB]
                dark:bg-[#3A3833]
              "
            />

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
      </header>

      {/* Settings */}
      <div data-tool-settings-panel>
        <ToolSettingsPanel />
      </div>

      {/* Whiteboard */}
      <main
        className="relative flex-1 overflow-hidden"
        style={{
          touchAction: penActive
            ? 'none'
            : 'auto',
        }}
      >
        {size.width > 0 &&
          size.height > 0 && (
            <div
              className="
                relative
                mx-auto
                overflow-hidden
                bg-white
                shadow-inner
                dark:bg-white
              "
              style={{
                width: size.width,
                height: size.height,
              }}
            >
              {/* ------------------------------------------------
                  TEXT LAYER
                  ------------------------------------------------ */}
              <div
                className="absolute inset-0"
                style={{
                  zIndex: textActive ? 20 : 5,
                  pointerEvents: textActive
                    ? 'auto'
                    : 'none',
                }}
              >
                <TextToolLayer
                  pageNumber={WHITEBOARD_PAGE}
                  width={size.width}
                  height={size.height}
                />
              </div>

              {/* ------------------------------------------------
                  DRAWING CANVAS
                  ------------------------------------------------ */}
              <div
                className="absolute inset-0"
                style={{
                  zIndex: 10,
                  pointerEvents: penActive
                    ? 'auto'
                    : 'none',
                  touchAction: penActive
                    ? 'none'
                    : 'auto',
                }}
              >
                <DrawingCanvas
                  pageNumber={WHITEBOARD_PAGE}
                  width={size.width}
                  height={size.height}
                />
              </div>
            </div>
          )}
      </main>
    </div>
  );
}
