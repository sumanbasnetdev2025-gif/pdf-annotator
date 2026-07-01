'use client';

import { useToolStore } from '@/store/tool-store';

const PRESET_COLORS = [
  '#1C1B1F', '#C8732A', '#D62828', '#2A7DE1',
  '#2F9E44', '#F4C430', '#9C5FFF', '#EC4899',
];

export function ToolSettingsPanel() {
  const color = useToolStore((s) => s.color);
  const setColor = useToolStore((s) => s.setColor);
  const recentColors = useToolStore((s) => s.recentColors);
  const addRecentColor = useToolStore((s) => s.addRecentColor);
  const strokeWidth = useToolStore((s) => s.strokeWidth);
  const setStrokeWidth = useToolStore((s) => s.setStrokeWidth);
  const opacity = useToolStore((s) => s.opacity);
  const setOpacity = useToolStore((s) => s.setOpacity);
  const isFilled = useToolStore((s) => s.isFilled);
  const toggleFilled = useToolStore((s) => s.toggleFilled);

  const handleColorClick = (c: string) => {
    setColor(c);
    addRecentColor(c);
  };

  const handleSizeInput = (val: string) => {
    const n = parseInt(val);
    if (!isNaN(n) && n >= 1 && n <= 100) setStrokeWidth(n);
  };

  return (
    <div className="flex flex-col gap-0 border-b border-[#D8D4CB] bg-white dark:border-[#3A3833] dark:bg-[#262420]">
      {/* Color row */}
      <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 scrollbar-none">
        <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-[#A8A49B]">Color</span>
        <div className="flex items-center gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => handleColorClick(c)}
              aria-label={c}
              className={`h-6 w-6 shrink-0 rounded-full border-2 transition-transform hover:scale-110 ${
                color === c ? 'border-[#1C1B1F] scale-110 dark:border-white' : 'border-transparent'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          {/* Custom color picker */}
          <label className="relative h-6 w-6 shrink-0 cursor-pointer overflow-hidden rounded-full border border-[#D8D4CB]"
            style={{ background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' }}
          >
            <input
              type="color"
              value={color}
              onChange={(e) => handleColorClick(e.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label="Custom color"
            />
          </label>
        </div>

        {recentColors.length > 0 && (
          <>
            <div className="mx-1 h-5 w-px shrink-0 bg-[#D8D4CB] dark:bg-[#3A3833]" />
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-[#A8A49B]">Recent</span>
            <div className="flex items-center gap-1">
              {recentColors.slice(0, 6).map((c, i) => (
                <button
                  key={`${c}-${i}`}
                  onClick={() => handleColorClick(c)}
                  aria-label={`Recent ${c}`}
                  className="h-5 w-5 shrink-0 rounded-full border border-[#D8D4CB]"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Size + Opacity row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[#F0EEE8] px-3 py-2 dark:border-[#3A3833]">
        {/* Brush size */}
        <div className="flex items-center gap-2">
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-[#A8A49B]">
            Size
          </span>
          <input
            type="range"
            min={1}
            max={40}
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-20 accent-[#C8732A] sm:w-28"
            aria-label="Brush size slider"
          />
          {/* Manual number input */}
          <input
            type="number"
            min={1}
            max={100}
            value={strokeWidth}
            onChange={(e) => handleSizeInput(e.target.value)}
            className="w-12 rounded border border-[#D8D4CB] bg-transparent px-1 text-center font-mono text-xs text-[#1C1B1F] outline-none focus:border-[#C8732A] dark:border-[#3A3833] dark:text-[#F5F3EE]"
            aria-label="Brush size number"
          />
        </div>

        {/* Opacity */}
        <div className="flex items-center gap-2">
          <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-[#A8A49B]">
            Opacity
          </span>
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={(e) => setOpacity(Number(e.target.value) / 100)}
            className="w-20 accent-[#C8732A] sm:w-28"
            aria-label="Opacity slider"
          />
          <input
            type="number"
            min={10}
            max={100}
            value={Math.round(opacity * 100)}
            onChange={(e) => {
              const n = parseInt(e.target.value);
              if (!isNaN(n) && n >= 10 && n <= 100) setOpacity(n / 100);
            }}
            className="w-12 rounded border border-[#D8D4CB] bg-transparent px-1 text-center font-mono text-xs text-[#1C1B1F] outline-none focus:border-[#C8732A] dark:border-[#3A3833] dark:text-[#F5F3EE]"
            aria-label="Opacity number"
          />
          <span className="font-mono text-[9px] text-[#A8A49B]">%</span>
        </div>

        {/* Filled toggle */}
        <button
          onClick={toggleFilled}
          className={`flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[9px] uppercase tracking-wider transition-colors ${
            isFilled
              ? 'border-[#1C1B1F] bg-[#1C1B1F] text-white dark:border-white dark:bg-white dark:text-[#1C1B1F]'
              : 'border-[#D8D4CB] text-[#6B6862] dark:border-[#3A3833]'
          }`}
        >
          <span
            className="inline-block h-3 w-3 rounded-sm border border-current"
            style={{ background: isFilled ? 'currentColor' : 'transparent' }}
          />
          Filled
        </button>
      </div>
    </div>
  );
}