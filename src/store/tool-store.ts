import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ToolType } from '@/types';

interface ToolState {
  activeTool: ToolType;
  color: string;
  recentColors: string[];
  strokeWidth: number;
  opacity: number;
  isDashed: boolean;
  isFilled: boolean;
  fontSize: number;
  fontFamily: string;

  setActiveTool: (tool: ToolType) => void;
  setColor: (color: string) => void;
  addRecentColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;
  toggleDashed: () => void;
  toggleFilled: () => void;
  setFontSize: (size: number) => void;
  setFontFamily: (font: string) => void;
}

const MAX_RECENT_COLORS = 8;

export const useToolStore = create<ToolState>()(
  persist(
    (set, get) => ({
      activeTool: 'select',
      color: '#FF3B30',
      recentColors: ['#FF3B30', '#34C759', '#007AFF', '#FFCC00', '#000000'],
      strokeWidth: 3,
      opacity: 1,
      isDashed: false,
      isFilled: false,
      fontSize: 16,
      fontFamily: 'Inter',

      setActiveTool: (tool) => set({ activeTool: tool }),
      setColor: (color) => set({ color }),
      addRecentColor: (color) => {
        const { recentColors } = get();
        const filtered = recentColors.filter((c) => c !== color);
        const updated = [color, ...filtered].slice(0, MAX_RECENT_COLORS);
        set({ recentColors: updated });
      },
      setStrokeWidth: (width) => set({ strokeWidth: width }),
      setOpacity: (opacity) => set({ opacity }),
      toggleDashed: () => set((state) => ({ isDashed: !state.isDashed })),
      toggleFilled: () => set((state) => ({ isFilled: !state.isFilled })),
      setFontSize: (size) => set({ fontSize: size }),
      setFontFamily: (font) => set({ fontFamily: font }),
    }),
    {
      name: 'pdf-annotator-tool-settings',
      // Persist settings (colors, sizes) but NOT the active tool,
      // because each page has its own preferred default.
      partialize: (state) => ({
        color: state.color,
        recentColors: state.recentColors,
        strokeWidth: state.strokeWidth,
        opacity: state.opacity,
        isDashed: state.isDashed,
        isFilled: state.isFilled,
        fontSize: state.fontSize,
        fontFamily: state.fontFamily,
      }),
    }
  )
);