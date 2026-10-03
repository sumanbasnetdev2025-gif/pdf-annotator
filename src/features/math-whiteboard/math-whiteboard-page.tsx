'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Settings2, Eraser } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MathQuestionForm } from './math-question-form';
import { TablesRenderer } from './renderers/tables-renderer';
import { buildWorksheet } from './worksheet-builder';
import { useMathWorksheetStore } from '@/store/math-worksheet-store';
import { useAnnotationStore } from '@/store/annotation-store';
import { DrawingCanvas } from '@/features/annotator/drawing-canvas';
import { useToolStore } from '@/store/tool-store';
import { MathToolbar } from './math-toolbar';
import type { WorksheetConfig, MathTopic } from './types';
import { AdditionRenderer } from './renderers/addition-renderer';
import { AdditionBoxesRenderer } from './renderers/addition-boxes-renderer';
import { SubtractionRenderer } from './renderers/subtraction-renderer';
import { SubtractionBoxesRenderer } from './renderers/subtraction-boxes-renderer';
import { TextToolLayer } from '@/features/annotator/text-tool-layer';
import { DivisionTextTool } from './division-text-tool';
import type { Annotation } from '@/types';

const MATH_PAGE = 9001;

const PASS_THROUGH_TOOLS = ['select', 'text', 'sticky-note'] as const;
const EMPTY_ANNOTATIONS: Annotation[] = [];

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
          className="h-5 w-5 shrink-0 rounded-full border-2 transition-transform hover:scale-110 sm:h-6 sm:w-6"
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

export function MathWhiteboardPage() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(true);
  const [config, setConfig] = useState<WorksheetConfig | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showDivisionText, setShowDivisionText] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [dotColor, setDotColor] = useState('#d1d5db');

  const worksheet = useMathWorksheetStore((s) => s.worksheet);
  const setWorksheet = useMathWorksheetStore((s) => s.setWorksheet);
  const clearAnswers = useMathWorksheetStore((s) => s.clearAnswers);

  const annotationsByPage = useAnnotationStore((s) => s.annotationsByPage);
  const addAnnotation = useAnnotationStore((s) => s.addAnnotation);
  const setAnnotationsForPage = useAnnotationStore((s) => s.setAnnotationsForPage);

  const divisionAnnotations = useMemo(
    () => annotationsByPage[MATH_PAGE] ?? EMPTY_ANNOTATIONS,
    [annotationsByPage]
  );

  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const whiteboardBg = useToolStore((s) => s.whiteboardBg);
  const setWhiteboardBg = useToolStore((s) => s.setWhiteboardBg);

  const penActive = !PASS_THROUGH_TOOLS.includes(activeTool as never);
  const textActive = activeTool === 'text' || activeTool === 'sticky-note';

  function handleGenerate(next: WorksheetConfig) {
    const ws = buildWorksheet(next);
    setWorksheet(ws);
    setConfig(next);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShowForm(false);
    }
  }

  function handleDivisionTextCommit(text: string) {
    const existing = divisionAnnotations.filter(
      (a) => a.type === 'text' && a.pageNumber === MATH_PAGE
    );

    const GAP = 24;
    const solutionWidth = Math.min(400, Math.max(180, canvasSize.width - 32));
    const solutionHeight = 240;
    const startX = 24;
    const startY = 40;

    const isSmallScreen = canvasSize.width < 700;

    let x = startX;
    let y = startY;

    if (!isSmallScreen) {
      const divisionSolutions = existing
        .filter(
          (
            a
          ): a is Annotation & {
            x: number;
            y: number;
            width: number;
            height: number;
          } => 'x' in a && 'y' in a && 'width' in a && 'height' in a
        )
        .map((a) => ({ x: a.x, y: a.y, width: a.width, height: a.height }))
        .sort((a, b) => {
          if (Math.abs(a.y - b.y) > 20) return a.y - b.y;
          return a.x - b.x;
        });

      if (divisionSolutions.length > 0) {
        const last = divisionSolutions[divisionSolutions.length - 1];
        const nextX = last.x + last.width + GAP;

        if (nextX + solutionWidth <= canvasSize.width - 24) {
          x = nextX;
          y = last.y;
        } else {
          x = startX;
          y = last.y + solutionHeight + GAP;
        }
      }
    } else {
      if (existing.length > 0) {
        const last = existing
          .filter(
            (
              a
            ): a is Annotation & {
              x: number;
              y: number;
              height: number;
            } => 'x' in a && 'y' in a && 'height' in a
          )
          .sort((a, b) => b.y - a.y)[0];

        if (last) {
          x = startX;
          y = last.y + last.height + GAP;
        }
      }
    }

    addAnnotation(MATH_PAGE, {
      id: crypto.randomUUID(),
      pageNumber: MATH_PAGE,
      type: 'text',
      x,
      y,
      width: solutionWidth,
      height: solutionHeight,
      text,
      fontSize: 20,
      fontFamily:
        'ui-monospace, "SF Mono", "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", Menlo, Consolas, "Courier New", monospace',
      color: '#1C1B1F',
      bold: false,
      italic: false,
      underline: false,
      align: 'left',
      rotation: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      locked: false,
      opacity: 1,
      zIndex: existing.length + 1,
    });

    setShowDivisionText(false);
  }

  function handleTopicChange(_next: MathTopic) {
    setWorksheet(null);
    setConfig(null);
    setAnnotationsForPage(MATH_PAGE, []);
  }

  useEffect(() => {
    function update() {
      const el = document.getElementById('math-canvas-area');
      if (!el) return;
      const r = el.getBoundingClientRect();
      setCanvasSize({
        width: Math.floor(r.width),
        height: Math.max(Math.floor(r.height), el.scrollHeight),
      });
    }

    update();
    const t = window.setTimeout(update, 50);

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    const ro = new ResizeObserver(update);
    const el = document.getElementById('math-canvas-area');
    if (el) ro.observe(el);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      ro.disconnect();
    };
  }, [worksheet]);

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setShowForm(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    setActiveTool('pen');
  }, [setActiveTool]);

  const renderer = useMemo(() => {
    if (!worksheet) return null;
    switch (worksheet.config.topic) {
      case 'tables':
        return <TablesRenderer questions={worksheet.questions} />;
      case 'addition':
        return worksheet.config.withBoxes ? (
          <AdditionBoxesRenderer questions={worksheet.questions} />
        ) : (
          <AdditionRenderer questions={worksheet.questions} />
        );
      case 'subtraction':
        return worksheet.config.withBoxes ? (
          <SubtractionBoxesRenderer questions={worksheet.questions} />
        ) : (
          <SubtractionRenderer questions={worksheet.questions} />
        );
      case 'division':
        return null;
      default:
        return (
          <div className="p-6 text-sm text-[#6B6760] dark:text-[#A8A29A]">
            Renderer for “{worksheet.config.topic}” coming next.
          </div>
        );
    }
  }, [worksheet]);

  const divisionCanvasHeight = useMemo(() => {
    if (!worksheet || worksheet.config.topic !== 'division') return 0;

    const solutions = divisionAnnotations.filter(
      (a) => a.type === 'text' && 'y' in a && 'height' in a
    );

    const maxBottom = solutions.reduce((max, ann) => {
      const y = (ann as { y: number }).y;
      const h = (ann as { height: number }).height;
      return Math.max(max, y + h);
    }, 0);

    return Math.max(canvasSize.height, maxBottom + 120);
  }, [worksheet, divisionAnnotations, canvasSize.height]);

  const isDivision = worksheet?.config.topic === 'division';

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#E8E6E0] dark:bg-[#1C1B1F]">
      {/* ── Header: back, title, eraser, settings ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-[#D8D4CB] bg-white px-2 py-2 sm:px-4 sm:py-2.5 dark:border-[#3A3833] dark:bg-[#26242A]">
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
            Math Whiteboard
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {worksheet && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearAnswers}
              aria-label="Clear typed answers"
              className="shrink-0"
            >
              <Eraser className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowForm((s) => !s)}
            aria-label="Toggle form"
            className="shrink-0"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── Background picker row: only shows when a worksheet is open
              and the sidebar is closed. Kept separate from the header so
              it doesn't crowd the icons on mobile. ── */}
      {worksheet && !showForm && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#D8D4CB] bg-white px-3 py-1.5 scrollbar-none dark:border-[#3A3833] dark:bg-[#26242A]">
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
      )}

      <div className="relative flex flex-1 overflow-hidden">
        <aside
          className={[
            'absolute inset-y-0 left-0 z-30 flex h-full w-[85%] max-w-sm flex-col overflow-hidden border-r border-[#D8D4CB] bg-white transition-transform duration-200 dark:border-[#3A3833] dark:bg-[#26242A]',
            'lg:static lg:w-full lg:z-auto lg:translate-x-0',
            showForm ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
        >
          <MathQuestionForm
            onGenerate={handleGenerate}
            onTopicChange={handleTopicChange}
          />
        </aside>

        <main
          className="relative min-h-0 min-w-0 flex-1 overflow-auto pb-24"
          style={{ overscrollBehavior: 'contain' }}
        >
          {!worksheet ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-[#6B6760] dark:text-[#A8A29A]">
              Choose a topic on the{' '}
              <span className="mx-1 font-medium">left</span>
              and tap{' '}
              <span className="mx-1 font-medium">Generate worksheet</span>.
            </div>
          ) : (
            <div className="relative p-4 sm:p-6">
              <div
                id="math-canvas-area"
                className={[
                  'relative mx-auto w-full',
                  isDivision ? 'rounded-xl shadow-inner' : 'max-w-3xl',
                ].join(' ')}
                style={{
                  backgroundColor: whiteboardBg,
                  transition: 'background-color 0.2s ease',
                  ...(isDivision
                    ? {
                        minHeight: 'calc(100dvh - 12rem)',
                        height:
                          divisionCanvasHeight || 'calc(100dvh - 12rem)',
                      }
                    : {}),
                }}
              >
                <svg
                  className="pointer-events-none absolute inset-0"
                  width="100%"
                  height="100%"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  style={{ zIndex: 1 }}
                >
                  <defs>
                    <pattern
                      id="math-grid"
                      x="0"
                      y="0"
                      width="24"
                      height="24"
                      patternUnits="userSpaceOnUse"
                    >
                      <circle cx="1" cy="1" r="0.8" fill={dotColor} />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#math-grid)" />
                </svg>

               <div
  className="relative"
  style={{ zIndex: 2, pointerEvents: 'none' }}
>
  {renderer}
</div>

                {canvasSize.width > 0 && canvasSize.height > 0 && (
                  <div
                    className="absolute inset-0"
                    style={{
                      zIndex: 11,
                      pointerEvents: textActive ? 'auto' : 'none',
                      touchAction: textActive ? 'auto' : 'none',
                    }}
                  >
                    <TextToolLayer
                      pageNumber={MATH_PAGE}
                      width={canvasSize.width}
                      height={Math.max(canvasSize.height, 800)}
                    />
                  </div>
                )}

                {canvasSize.width > 0 && canvasSize.height > 0 && (
                  <div
                    className="absolute inset-0"
                    style={{
                      zIndex: 10,
                      pointerEvents: penActive ? 'auto' : 'none',
                      touchAction: penActive ? 'none' : 'auto',
                    }}
                  >
                    <DrawingCanvas
                      pageNumber={MATH_PAGE}
                      width={canvasSize.width}
                      height={Math.max(canvasSize.height, 800)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {worksheet && (!isMobile || !showForm) && (
        <MathToolbar
          pageNumber={MATH_PAGE}
          onDivisionTextOpen={() => setShowDivisionText(true)}
        />
      )}

      {showDivisionText && (
        <DivisionTextTool
          onCommit={handleDivisionTextCommit}
          onCancel={() => setShowDivisionText(false)}
        />
      )}
    </div>
  );
}