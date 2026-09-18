'use client';

import {
  MousePointer2,
  Pen,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Type,
} from 'lucide-react';
import { useToolStore } from '@/store/tool-store';
import { useAnnotationStore } from '@/store/annotation-store';
import { Button } from '@/components/ui/button';
import { brightenHex } from '@/lib/utils';
import { Divide } from 'lucide-react';

interface Props {
  pageNumber: number;
    onDivisionTextOpen?: () => void;   // ← new

}

const DRAW_TOOLS = [
  { id: 'select', label: 'Select', Icon: MousePointer2 },
  { id: 'pen', label: 'Pen', Icon: Pen },
  { id: 'highlighter', label: 'Highlighter', Icon: Highlighter },
  { id: 'text', label: 'Text', Icon: Type },
  { id: 'eraser', label: 'Eraser', Icon: Eraser },
  { id: 'division-text', label: 'Division text', Icon: Divide },  // ← new
] as const;

const PALETTE = [
  { name: 'Black', value: '#1C1B1F' },
  { name: 'Red', value: '#D62828' },
  { name: 'Orange', value: '#E07B39' },
  { name: 'Blue', value: '#1E6FEB' },
  { name: 'Green', value: '#2E9E4F' },
  { name: 'Purple', value: '#8B5CF6' },
];

// Pen keeps its true colour. Highlighter is only lightly brightened.
const PEN_BRIGHTEN = 0;
const HIGHLIGHT_BRIGHTEN = 0.15;

export function MathToolbar({ pageNumber, onDivisionTextOpen }: Props) {
  const activeTool = useToolStore((s) => s.activeTool);
  const setActiveTool = useToolStore((s) => s.setActiveTool);
  const color = useToolStore((s) => s.color);
  const setColor = useToolStore((s) => s.setColor);
  const setStrokeWidth = useToolStore((s) => s.setStrokeWidth);

  const undo = useAnnotationStore((s) => s.undo);
  const redo = useAnnotationStore((s) => s.redo);
  const setAnnotationsForPage = useAnnotationStore(
    (s) => s.setAnnotationsForPage
  );

  const clearStrokes = () => {
    if (confirm('Clear all pen strokes on this worksheet?')) {
      setAnnotationsForPage(pageNumber, []);
    }
  };

  const brightenAmount =
    activeTool === 'highlighter' ? HIGHLIGHT_BRIGHTEN : PEN_BRIGHTEN;

  const pickColor = (raw: string) => {
    setColor(brightenHex(raw, brightenAmount));
  };

const handleToolClick = (id: (typeof DRAW_TOOLS)[number]['id']) => {
  setActiveTool(id);
  if (id === 'pen') setStrokeWidth(4);
  if (id === 'highlighter') setStrokeWidth(4);
  if (id === 'division-text') onDivisionTextOpen?.();
};

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-40 flex justify-center px-3">
      <div className="pointer-events-auto flex w-full max-w-2xl flex-col gap-1 rounded-2xl border border-[#D8D4CB] bg-white/95 px-1.5 py-1.5 shadow-lg backdrop-blur dark:border-[#3A3833] dark:bg-[#26242A]/95">
        {/* Tool row */}
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {DRAW_TOOLS.map(({ id, label, Icon }) => (
            <Button
              key={id}
              variant={activeTool === id ? 'default' : 'ghost'}
              size="icon"
              onClick={() => handleToolClick(id)}
              aria-label={label}
              className="shrink-0"
            >
              <Icon className="h-4 w-4" />
            </Button>
          ))}

          <div className="mx-1 h-6 w-px shrink-0 bg-[#D8D4CB] dark:bg-[#3A3833]" />

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

          <div className="mx-1 h-6 w-px shrink-0 bg-[#D8D4CB] dark:bg-[#3A3833]" />

          <Button
            variant="ghost"
            size="icon"
            onClick={clearStrokes}
            aria-label="Clear pen strokes"
            className="shrink-0"
          >
            <Trash2 className="h-4 w-4 text-[#D62828]" />
          </Button>
        </div>

        {/* Colour picker row */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-none">
          <span className="shrink-0 pr-1 text-[10px] font-medium uppercase tracking-wide text-[#6B6760] dark:text-[#A8A29A]">
            Colour
          </span>

          {PALETTE.map((c) => {
            const preview = brightenHex(c.value, brightenAmount);
            const isActive = color.toLowerCase() === preview.toLowerCase();
            return (
              <button
                key={c.value}
                type="button"
                aria-label={c.name}
                onClick={() => pickColor(c.value)}
                className={[
                  'h-6 w-6 shrink-0 rounded-full border-2 transition-transform',
                  isActive
                    ? 'scale-110 border-[#1C1B1F] dark:border-[#E8E6E0]'
                    : 'border-transparent hover:scale-105',
                ].join(' ')}
                style={{ backgroundColor: preview }}
              />
            );
          })}

          <label className="ml-1 flex shrink-0 cursor-pointer items-center gap-1 text-[10px] font-medium text-[#6B6760] dark:text-[#A8A29A]">
            <input
              type="color"
              value={color}
              onChange={(e) => pickColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
              aria-label="Custom colour"
            />
            Custom
          </label>
        </div>
      </div>
    </div>
  );
}