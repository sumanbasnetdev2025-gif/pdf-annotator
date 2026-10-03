'use client';

import { MathInputBox } from '../math-input-box';
import { useMathWorksheetStore } from '@/store/math-worksheet-store';
import type { MathQuestion } from '../types';

interface Props {
  questions: MathQuestion[];
}

const CELL = 36;
const GAP = 6;
const ROW_H = 36;

export function AdditionRenderer({ questions }: Props) {
  const updateBox = useMathWorksheetStore((s) => s.updateBox);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-6">
      {questions.map((q, idx) => (
        <AdditionPlainRow
          key={q.id}
          question={q}
          index={idx}
          onChange={(boxId, value) => updateBox(q.id, boxId, value)}
        />
      ))}
    </div>
  );
}

function AdditionPlainRow({
  question,
  index,
  onChange,
}: {
  question: MathQuestion;
  index: number;
  onChange: (boxId: string, value: string) => void;
}) {
  const meta = question.meta as {
    columnCount: number;
    answerColumns: number;
    aStr: string;
    bStr: string;
  };
  const { answerColumns, aStr, bStr } = meta;

  const answerBoxes = question.boxes
    .filter((bx) => bx.row === 3)
    .sort((x, y) => x.col - y.col);

  // Right-align operands to the answer width.
  const operandOffset = (answerColumns - meta.columnCount) * (CELL + GAP);

  return (
    <div className="rounded-2xl border border-[#D8D4CB] bg-white p-3 sm:p-4 dark:border-[#3A3833] dark:bg-[#26242A]">
      <div className="mb-2 text-xs font-medium text-[#6B6760] dark:text-[#A8A29A]">
        Q{index + 1}
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-max">
          {/* Operand A */}
          <div className="flex" style={{ gap: GAP }}>
            <div style={{ width: CELL }} />
            <div style={{ width: operandOffset }} />
            {aStr.split('').map((ch, c) => (
              <DigitCell key={`a-${c}`} char={ch} />
            ))}
          </div>

          {/* + Operand B */}
          <div className="mt-1 flex" style={{ gap: GAP }}>
            <div
              className="flex items-center justify-center text-[#C8732A]"
              style={{ width: CELL, height: ROW_H, fontSize: 22, fontWeight: 700 }}
            >
              +
            </div>
            <div style={{ width: (answerColumns - bStr.length) * (CELL + GAP) }} />
            {bStr.split('').map((ch, c) => (
              <DigitCell key={`b-${c}`} char={ch} />
            ))}
          </div>

          {/* Divider */}
          <div
            className="mt-1 border-t-2 border-[#1C1B1F] dark:border-[#E8E6E0]"
            style={{ marginLeft: CELL + GAP }}
          />

          {/* Answer row */}
          <div className="mt-1 flex" style={{ gap: GAP }}>
            <div style={{ width: CELL }} />
            {answerBoxes.map((bx) => (
              <div key={bx.id} style={{ width: CELL }}>
                <MathInputBox
                  value={bx.value}
                  onChange={(v) => onChange(bx.id, v)}
                  width={CELL}
                  height={ROW_H + 2}
                  ariaLabel="Answer digit"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DigitCell({ char }: { char: string }) {
  return (
    <div
      className="flex items-center justify-center font-semibold text-[#1C1B1F] tabular-nums dark:text-[#E8E6E0]"
      style={{ width: CELL, height: ROW_H, fontSize: 22 }}
    >
      {char === ' ' ? '\u00A0' : char}
    </div>
  );
}