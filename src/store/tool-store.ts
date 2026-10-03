import { create } from 'zustand';
import type { ToolType } from '@/types';

interface ToolState {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;

  color: string;
  setColor: (color: string) => void;

  recentColors: string[];
  addRecentColor: (color: string) => void;

  fontSize: number;
  setFontSize: (size: number) => void;

  strokeWidth: number;
  setStrokeWidth: (width: number) => void;

  opacity: number;
  setOpacity: (opacity: number) => void;

  isFilled: boolean;
  setIsFilled: (filled: boolean) => void;
  toggleFilled: () => void;

  // Whiteboard background color
  whiteboardBg: string;
  setWhiteboardBg: (bg: string) => void;

  // Settings mirror — used by any component that reads settings object
  settings: {
    color: string;
    recentColors: string[];
    opacity: number;
    strokeWidth: number;
    filled: boolean;
    fontSize: number;
  };
}

const DEFAULT_COLORS = [
  '#1C1B1F',
  '#C8732A',
  '#D62828',
  '#2A7DE1',
  '#2F9E44',
  '#F4C430',
];

export const useToolStore = create<ToolState>((set, get) => ({
  activeTool: 'pen',

  color: '#1C1B1F',
  recentColors: [],
  fontSize: 20,
  strokeWidth: 3,
  opacity: 1,
  isFilled: false,

  whiteboardBg: '#ffffff',

  settings: {
    color: '#1C1B1F',
    recentColors: [],
    opacity: 1,
    strokeWidth: 3,
    filled: false,
    fontSize: 20,
  },

  setActiveTool: (activeTool) => set({ activeTool }),

  setColor: (color) => {
    set({
      color,
      settings: { ...get().settings, color },
    });
  },

  addRecentColor: (color) => {
    const filtered = get().recentColors.filter((c) => c !== color);
    const recentColors = [color, ...filtered].slice(0, 8);
    set({
      recentColors,
      settings: { ...get().settings, recentColors },
    });
  },

  setFontSize: (fontSize) =>
    set({ fontSize, settings: { ...get().settings, fontSize } }),

  setStrokeWidth: (strokeWidth) =>
    set({ strokeWidth, settings: { ...get().settings, strokeWidth } }),

  setOpacity: (opacity) =>
    set({ opacity, settings: { ...get().settings, opacity } }),

  setIsFilled: (isFilled) =>
    set({ isFilled, settings: { ...get().settings, filled: isFilled } }),

  toggleFilled: () => {
    const isFilled = !get().isFilled;
    set({ isFilled, settings: { ...get().settings, filled: isFilled } });
  },

  setWhiteboardBg: (whiteboardBg) => set({ whiteboardBg }),
}));