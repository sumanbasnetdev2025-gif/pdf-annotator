'use client';

import { MathInputBox } from '../math-input-box';
import { useMathWorksheetStore } from '@/store/math-worksheet-store';
import type { MathQuestion } from '../types';

interface Props {
  questions: MathQuestion[];
}

const CELL = 34;
const GAP = 4;
const ROW_H = 34;
const BOX_H = 34;

interface DivStep {
  product: number;
  working: number;
  result: number;
  isFinal: boolean;
  bringDown: number | null;
}
interface DivWalk {
  dividend: number;
  divisor: number;
  quotient: number;
  remainder: number;
  quotientDigits: number[];
  steps: DivStep[];
  dividendStr: string;
  divisorStr: string;
  quotientStr: string;
}

export function DivisionBoxesRenderer({ questions }: Props) {
  const updateBox = useMathWorksheetStore((s) => s.updateBox);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-6">
      {questions.map((q, idx) => (
        <DivisionBoxesRow
          key={q.id}
          question={q}
          index={idx}
          onChange={(boxId, value) => updateBox(q.id, boxId, value)}
        />
      ))}
    </div>
  );
}

function DivisionBoxesRow({
  question,
  index,
  onChange,
}: {
  question: MathQuestion;
  index: number;
  onChange: (boxId: string, value: string) => void;
}) {
  const meta = question.meta as { walk: DivWalk };
  const walk = meta.walk;
  const {
    dividendStr,
    divisorStr,
    quotientStr,
    steps,
    remainder,
  } = walk;

  // Group boxes by row for easy lookup.
  const boxesByRow = new Map<number, typeof question.boxes>();
  for (const bx of question.boxes) {
    const arr = boxesByRow.get(bx.row) ?? [];
    arr.push(bx);
    boxesByRow.set(bx.row, arr);
  }
  const quotientBoxes = (boxesByRow.get(0) ?? []).sort((a, b) => a.col - b.col);
  const remainderBoxes = (boxesByRow.get(10) ?? []).sort(
    (a, b) => a.col - b.col
  );

  // Left offset for the divisor block.
  const divisorW = Math.max(1, divisorStr.length);
  const LEFT_W = divisorW * CELL + GAP * 2;

  // Dividend grid width in pixels.
  const dividendCols = dividendStr.length;
  const dividendGridW = dividendCols * CELL + (dividendCols - 1) * GAP;

  // Total content width of one question.
  const totalW = LEFT_W + dividendGridW;

  // ---- Vertical layout ----
  // We reserve fixed row heights and stack them:
  //   quotient row (boxes)               ROW_H
  //   dividend row (printed)             ROW_H
  //   for each step:                     ROW_H (product) + rule + ROW_H (result)
  //   final remainder row (boxes)        ROW_H
  const quotientTop = 0;
  const dividendTop = quotientTop + ROW_H + 4;

  // Precompute the top offset for every step.
  const stepTops: number[] = [];
  let cursorY = dividendTop + ROW_H + 6;
  steps.forEach((s) => {
    stepTops.push(cursorY);
    // product row
    cursorY += ROW_H + 2;
    // rule line spacing
    cursorY += 6;
    // bring-down row (only if not final)
    if (!s.isFinal) {
      cursorY += ROW_H + 4;
    }
  });
  const remainderTop = cursorY + 4;
  const totalH = remainderTop + ROW_H + 4;

  return (
    <div className="rounded-2xl border border-[#D8D4CB] bg-white p-3 sm:p-4 dark:border-[#3A3833] dark:bg-[#26242A]">
      <div className="mb-2 text-xs font-medium text-[#6B6760] dark:text-[#A8A29A]">
        Q{index + 1}
      </div>

      <div className="overflow-x-auto">
        <div className="relative" style={{ width: totalW, height: totalH }}>
          {/* ---------- Quotient row (boxes, right-aligned) ---------- */}
          <div
            className="absolute flex"
            style={{
              top: quotientTop,
              left: LEFT_W + (dividendCols - quotientStr.length) * (CELL + GAP),
              gap: GAP,
              height: BOX_H,
            }}
          >
            {quotientBoxes.map((bx) => (
              <div key={bx.id} style={{ width: CELL }}>
                <MathInputBox
                  value={bx.value}
                  onChange={(v) => onChange(bx.id, v)}
                  width={CELL}
                  height={BOX_H}
                  ariaLabel="Quotient digit"
                />
              </div>
            ))}
          </div>

          {/* ---------- Bracket top bar ---------- */}
          <div
            className="absolute"
            style={{
              top: dividendTop - 2,
              left: LEFT_W - 4,
              width: dividendGridW + 10,
              height: 2,
              background: '#1C1B1F',
            }}
          />

          {/* ---------- Divisor (printed) ---------- */}
          <div
            className="absolute flex items-center justify-end font-semibold tabular-nums text-[#1C1B1F] dark:text-[#E8E6E0]"
            style={{
              top: dividendTop,
              left: 0,
              width: divisorW * CELL,
              height: ROW_H,
              fontSize: 22,
              paddingRight: 6,
            }}
          >
            {divisorStr}
          </div>

          {/* ---------- Bracket left edge (curve) ---------- */}
          <div
            className="absolute"
            style={{
              top: dividendTop - 2,
              left: LEFT_W - 4,
              width: 2,
              height: totalH - dividendTop - 4,
              background: '#1C1B1F',
            }}
          />
          {/* Small bracket "hook" between divisor and dividend */}
          <div
            className="absolute"
            style={{
              top: dividendTop - 2,
              left: LEFT_W - 8,
              width: 8,
              height: 2,
              background: '#1C1B1F',
            }}
          />

          {/* ---------- Dividend (printed) ---------- */}
          <div
            className="absolute flex"
            style={{
              top: dividendTop,
              left: LEFT_W,
              gap: GAP,
              height: ROW_H,
            }}
          >
            {dividendStr.split('').map((d, i) => (
              <div
                key={`d-${i}`}
                className="flex items-center justify-center font-semibold tabular-nums text-[#1C1B1F] dark:text-[#E8E6E0]"
                style={{ width: CELL, height: ROW_H, fontSize: 22 }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* ---------- Steps ---------- */}
          {steps.map((step, s) => {
            const top = stepTops[s];

            const prodStr = String(step.product);
            const prodOffset =
              (dividendCols - prodStr.length) * (CELL + GAP);

            const prodBoxes = (boxesByRow.get(100 + s * 10 + 0) ?? []).sort(
              (a, b) => a.col - b.col
            );
            const resultBoxes = (boxesByRow.get(100 + s * 10 + 1) ?? []).sort(
              (a, b) => a.col - b.col
            );

            return (
              <div key={`step-${s}`}>
                {/* Product row (boxes, right-aligned) */}
                <div
                  className="absolute flex"
                  style={{
                    top,
                    left: LEFT_W + prodOffset,
                    gap: GAP,
                    height: BOX_H,
                  }}
                >
                  {prodBoxes.map((bx) => (
                    <div key={bx.id} style={{ width: CELL }}>
                      <MathInputBox
                        value={bx.value}
                        onChange={(v) => onChange(bx.id, v)}
                        width={CELL}
                        height={BOX_H}
                        ariaLabel={`Step ${s + 1} product digit`}
                      />
                    </div>
                  ))}
                </div>

                {/* Rule under the product row */}
                <div
                  className="absolute"
                  style={{
                    top: top + ROW_H + 2,
                    left: LEFT_W + prodOffset,
                    width: prodStr.length * CELL + (prodStr.length - 1) * GAP,
                    height: 2,
                    background: '#1C1B1F',
                  }}
                />

                {/* Bring-down / result row (boxes, right-aligned, skip final) */}
                {!step.isFinal && (
                  <div
                    className="absolute flex"
                    style={{
                      top: top + ROW_H + 6,
                      left:
                        LEFT_W +
                        (dividendCols - String(step.result).length) *
                          (CELL + GAP),
                      gap: GAP,
                      height: BOX_H,
                    }}
                  >
                    {resultBoxes.map((bx) => (
                      <div key={bx.id} style={{ width: CELL }}>
                        <MathInputBox
                          value={bx.value}
                          onChange={(v) => onChange(bx.id, v)}
                          width={CELL}
                          height={BOX_H}
                          ariaLabel={`Step ${s + 1} result digit`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* ---------- Final remainder row (boxes) ---------- */}
          <div
            className="absolute flex"
            style={{
              top: remainderTop,
              left:
                LEFT_W +
                (dividendCols - String(remainder).length) * (CELL + GAP),
              gap: GAP,
              height: BOX_H,
            }}
          >
            {remainderBoxes.map((bx) => (
              <div key={bx.id} style={{ width: CELL }}>
                <MathInputBox
                  value={bx.value}
                  onChange={(v) => onChange(bx.id, v)}
                  width={CELL}
                  height={BOX_H}
                  ariaLabel="Remainder digit"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}