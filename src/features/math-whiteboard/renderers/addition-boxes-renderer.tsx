"use client";

import { MathInputBox } from "../math-input-box";
import { useMathWorksheetStore } from "@/store/math-worksheet-store";
import type { MathQuestion } from "../types";

interface Props {
  questions: MathQuestion[];
}

const CELL = 36;
const GAP = 6;
const ROW_H = 36;
const CARRY_H = 26;
const GUTTER = CELL + GAP;

export function AdditionBoxesRenderer({ questions }: Props) {
  const updateBox = useMathWorksheetStore((s) => s.updateBox);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-6">
      {questions.map((q, idx) => (
        <AdditionBoxesRow
          key={q.id}
          question={q}
          index={idx}
          onChange={(boxId, value) => updateBox(q.id, boxId, value)}
        />
      ))}
    </div>
  );
}

function AdditionBoxesRow({
  question,
  index,
  onChange,
}: {
  question: MathQuestion;
  index: number;
  onChange: (boxId: string, value: string) => void;
}) {
  const meta = question.meta as {
    columnCount: number; // columns needed for the operands
    answerColumns: number; // columnCount or +1 on overflow
    aStr: string; // a, right-aligned to columnCount
    bStr: string; // b, right-aligned to columnCount
  };
  const { columnCount, answerColumns, aStr, bStr } = meta;

  const carryBoxes = question.boxes
    .filter((bx) => bx.row === 0)
    .sort((x, y) => x.col - y.col);
  const answerBoxes = question.boxes
    .filter((bx) => bx.row === 3)
    .sort((x, y) => x.col - y.col);

  // Right-align operands and carry row to the answer grid's right edge.
  const operandShift = Math.max(0, answerColumns - columnCount) * (CELL + GAP);

  // Grid width (digits only, excluding the + gutter).
  const gridWidth = answerColumns * CELL + (answerColumns - 1) * GAP;

  // Vertical positions.
  const carryTop = 0;
  const aTop = CARRY_H + 4;
  const bTop = aTop + ROW_H + 2;
  const dividerTop = bTop + ROW_H + 6;
  const answerTop = dividerTop + 6;
  const totalHeight = answerTop + ROW_H + 4;

  return (
    <div className="rounded-2xl border border-[#D8D4CB] bg-white p-3 sm:p-4 dark:border-[#3A3833] dark:bg-[#26242A]">
      <div className="mb-2 text-xs font-medium text-[#6B6760] dark:text-[#A8A29A]">
        Q{index + 1}
      </div>

      <div className="overflow-x-auto py-2">
        <div
          className="relative"
          style={{
            width: GUTTER + gridWidth,
            height: totalHeight + 8,
            paddingTop: 4,
          }}
        >
          {/* Carry row — one box per operand column, including leftmost */}
          <div
            className="absolute flex"
            style={{
              top: carryTop,
              left: GUTTER + operandShift,
              gap: GAP,
              height: CARRY_H,
            }}
          >
            {Array.from({ length: columnCount }, (_, c) => c).map((c) => {
              const bx = carryBoxes.find((x) => x.col === c);
              return (
                <div key={`carry-${c}`} style={{ width: CELL }}>
                  {bx ? (
                    <MathInputBox
                      value={bx.value}
                      onChange={(v) => onChange(bx.id, v)}
                      width={CELL}
                      height={CARRY_H}
                      variant="small"
                      ariaLabel={`Carry above column ${c + 1}`}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Operand A */}
          <div
            className="absolute flex"
            style={{
              top: aTop,
              left: GUTTER + operandShift,
              gap: GAP,
              height: ROW_H,
            }}
          >
            {aStr.split("").map((ch, c) => (
              <DigitCell key={`a-${c}`} char={ch} />
            ))}
          </div>

          {/* + sign */}
          <div
            className="absolute flex items-center justify-center text-[#C8732A]"
            style={{
              top: bTop,
              left: 0,
              width: CELL,
              height: ROW_H,
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            +
          </div>

          {/* Operand B */}
          <div
            className="absolute flex"
            style={{
              top: bTop,
              left: GUTTER + operandShift,
              gap: GAP,
              height: ROW_H,
            }}
          >
            {bStr.split("").map((ch, c) => (
              <DigitCell key={`b-${c}`} char={ch} />
            ))}
          </div>

          {/* Divider */}
          <div
            className="absolute border-t-2 border-[#1C1B1F] dark:border-[#E8E6E0]"
            style={{
              top: dividerTop,
              left: GUTTER,
              width: gridWidth,
            }}
          />

          {/* Answer row */}
          <div
            className="absolute flex"
            style={{
              top: answerTop,
              left: GUTTER,
              gap: GAP,
              height: ROW_H,
            }}
          >
            {answerBoxes.map((bx) => (
              <div key={bx.id} style={{ width: CELL }}>
                <MathInputBox
                  value={bx.value}
                  onChange={(v) => onChange(bx.id, v)}
                  width={CELL}
                  height={ROW_H}
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
      {char === " " ? "\u00A0" : char}
    </div>
  );
}