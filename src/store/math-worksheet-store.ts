import { create } from 'zustand';
import type { Worksheet, MathQuestion, AnswerBox } from '@/features/math-whiteboard/types';

interface MathWorksheetState {
  worksheet: Worksheet | null;
  setWorksheet: (ws: Worksheet | null) => void;
  updateBox: (questionId: string, boxId: string, value: string) => void;
  clearAnswers: () => void;
}

export const useMathWorksheetStore = create<MathWorksheetState>((set) => ({
  worksheet: null,
  setWorksheet: (worksheet) => set({ worksheet }),
  updateBox: (questionId, boxId, value) =>
    set((state) => {
      if (!state.worksheet) return state;
      const questions = state.worksheet.questions.map((q) => {
        if (q.id !== questionId) return q;
        const boxes = q.boxes.map((b: AnswerBox) =>
          b.id === boxId ? { ...b, value: value.replace(/[^0-9]/g, '') } : b
        );
        return { ...q, boxes } as MathQuestion;
      });
      return { worksheet: { ...state.worksheet, questions } };
    }),
  clearAnswers: () =>
    set((state) => {
      if (!state.worksheet) return state;
      const questions = state.worksheet.questions.map((q) => ({
        ...q,
        boxes: q.boxes.map((b) => ({ ...b, value: '' })),
      }));
      return { worksheet: { ...state.worksheet, questions } };
    }),
}));