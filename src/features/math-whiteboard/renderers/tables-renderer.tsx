'use client';

import { MathInputBox } from '../math-input-box';
import { useMathWorksheetStore } from '@/store/math-worksheet-store';
import type { MathQuestion } from '../types';

interface Props {
  questions: MathQuestion[];
}

export function TablesRenderer({ questions }: Props) {
  const updateBox = useMathWorksheetStore((s) => s.updateBox);

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-[#D8D4CB] bg-white p-4 sm:p-6 dark:border-[#3A3833] dark:bg-[#26242A]">
      <ul className="space-y-3 sm:space-y-4">
        {questions.map((q) => {
          const box = q.boxes[0];
          return (
            <li
              key={q.id}
              className="flex items-center justify-between gap-3 text-lg font-semibold text-[#1C1B1F] sm:text-xl dark:text-[#E8E6E0]"
            >
              <span className="tabular-nums">
                {q.operands[0]} <span className="text-[#C8732A]">×</span>{' '}
                {q.operands[1]} <span className="text-[#C8732A]">=</span>
              </span>
              <MathInputBox
                value={box.value}
                onChange={(v) => updateBox(q.id, box.id, v)}
                width={64}
                height={44}
                ariaLabel={`Answer for ${q.prompt}`}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}