'use client';

import { MathInputBox } from '../math-input-box';
import { useMathWorksheetStore } from '@/store/math-worksheet-store';
import type { MathQuestion } from '../types';

interface Props {
  questions: MathQuestion[];
}

export function DivisionRenderer({ questions }: Props) {
  const updateBox = useMathWorksheetStore((s) => s.updateBox);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 sm:space-y-6">
      {questions.map((q, idx) => {
        const box = q.boxes[0];
        const walk = q.meta?.walk as { quotientStr?: string } | undefined;
        const expectedLen = walk?.quotientStr?.length ?? 2;
        return (
          <div
            key={q.id}
            className="rounded-2xl border border-[#D8D4CB] bg-white p-3 sm:p-4 dark:border-[#3A3833] dark:bg-[#26242A]"
          >
            <div className="mb-2 text-xs font-medium text-[#6B6760] dark:text-[#A8A29A]">
              Q{idx + 1}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-lg font-semibold text-[#1C1B1F] sm:text-xl dark:text-[#E8E6E0]">
              <span className="tabular-nums">
                {q.dividend} <span className="text-[#C8732A]">÷</span>{' '}
                {q.divisor} <span className="text-[#C8732A]">=</span>
              </span>
              <MathInputBox
                value={box.value}
                onChange={(v) => updateBox(q.id, box.id, v)}
                width={Math.max(72, 22 * expectedLen)}
                height={44}
                ariaLabel={`Answer for ${q.prompt}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}