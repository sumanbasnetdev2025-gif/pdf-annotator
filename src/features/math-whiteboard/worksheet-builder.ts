import type {
  MathQuestion,
  Worksheet,
  WorksheetConfig,
  AnswerBox,
} from './types';

export function buildWorksheet(config: WorksheetConfig): Worksheet {
  let questions: MathQuestion[] = [];

  switch (config.topic) {
    case 'tables':
      questions = buildTables(config);
      break;
    case 'addition':
      questions = buildAddition(config);
      break;
    case 'subtraction':
      questions = buildSubtraction(config);
      break;
    case 'division':
      questions = [];
      break;
    default:
      questions = [];
  }

  return {
    id: crypto.randomUUID(),
    config,
    questions,
    createdAt: Date.now(),
  };
}

/* -------------------------------------------------------------------------- */
/*                                 Shared                                     */
/* -------------------------------------------------------------------------- */

/** Pull manual operands for question `i` from config.manualNumbers.
 *  Accepts either:
 *    - a flat array [a0, b0, a1, b1, ...]   (two entries per question)
 *    - a single string "a b" per question   (one entry per question, space-separated)
 */
function getManualPair(
  manualNumbers: string[],
  questionIndex: number
): [number, number] | null {
  const single = manualNumbers[questionIndex];
  if (single && single.trim().split(/\s+/).length >= 2) {
    const [a, b] = single.trim().split(/\s+/).map((s) => parseInt(s, 10));
    if (!isNaN(a) && !isNaN(b)) return [a, b];
  }

  const ai = questionIndex * 2;
  const bi = questionIndex * 2 + 1;
  const a = parseInt(manualNumbers[ai] ?? '', 10);
  const b = parseInt(manualNumbers[bi] ?? '', 10);
  if (!isNaN(a) && !isNaN(b)) return [a, b];

  return null;
}

/** Random N-digit number (no leading zero). */
function randomNDigit(n: number): number {
  const min = 10 ** (n - 1);
  const max = 10 ** n - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* -------------------------------------------------------------------------- */
/*                                 Tables                                     */
/* -------------------------------------------------------------------------- */

function buildTables(config: WorksheetConfig): MathQuestion[] {
  const n = config.tableNumber;
  const count = config.questionCount;
  const out: MathQuestion[] = [];

  for (let i = 1; i <= count; i++) {
    out.push({
      id: crypto.randomUUID(),
      topic: 'tables',
      prompt: `${n} × ${i} =`,
      operands: [n, i],
      tableNumber: n,
      boxes: [
        {
          id: crypto.randomUUID(),
          value: '',
          row: 0,
          col: 0,
          span: 1,
        },
      ],
    });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*                                 Addition                                   */
/* -------------------------------------------------------------------------- */

/**
 * Random N-digit no-carry pair. Every column sums to <= 9.
 * Guaranteed: sum has exactly N digits.
 */
function randomNoCarryPair(n: number): [number, number] {
  let a = '';
  let b = '';
  for (let i = 0; i < n; i++) {
    const minDigit = i === 0 ? 1 : 0;
    const maxDigitSum = 9;
    const da =
      Math.floor(Math.random() * (maxDigitSum - 2 * minDigit + 1)) + minDigit;
    const dbMax = maxDigitSum - da;
    const db = Math.floor(Math.random() * (dbMax - minDigit + 1)) + minDigit;
    a += da;
    b += db;
  }
  return [parseInt(a, 10), parseInt(b, 10)];
}

function buildAddition(config: WorksheetConfig): MathQuestion[] {
  const count = config.questionCount;
  const digits = config.digits;
  const withBoxes = config.withBoxes;
  const out: MathQuestion[] = [];

  for (let i = 0; i < count; i++) {
    let a: number;
    let b: number;

    if (config.mode === 'manual') {
      const pair = getManualPair(config.manualNumbers, i);
      if (pair) {
        [a, b] = pair;
      } else {
        [a, b] = withBoxes
          ? [randomNDigit(digits), randomNDigit(digits)]
          : randomNoCarryPair(digits);
      }
    } else {
      [a, b] = withBoxes
        ? [randomNDigit(digits), randomNDigit(digits)]
        : randomNoCarryPair(digits);
    }

    if (b > a) [a, b] = [b, a];

    const columnCount = Math.max(String(a).length, String(b).length);
    const sum = a + b;
    const hasOverflow = String(sum).length > columnCount;
    const answerColumns = columnCount;

    const aStr = String(a).padStart(columnCount, ' ');
    const bStr = String(b).padStart(columnCount, ' ');

    const boxes: AnswerBox[] = [];

    if (withBoxes) {
      for (let c = 0; c < columnCount; c++) {
        boxes.push({
          id: crypto.randomUUID(),
          value: '',
          row: 0,
          col: c,
          span: 1,
        });
      }
    }

    for (let c = 0; c < answerColumns; c++) {
      boxes.push({
        id: crypto.randomUUID(),
        value: '',
        row: 3,
        col: c,
        span: 1,
      });
    }

    out.push({
      id: crypto.randomUUID(),
      topic: 'addition',
      prompt: `${a} + ${b}`,
      operands: [a, b],
      boxes,
      meta: {
        columnCount,
        answerColumns,
        hasOverflow,
        withBoxes,
        a,
        b,
        aStr,
        bStr,
      },
    });
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/*                               Subtraction                                  */
/* -------------------------------------------------------------------------- */

/**
 * Random N-digit subtraction pair, a >= b, with NO borrowing.
 * Every digit of `a` is >= the matching digit of `b`.
 */
function randomNoBorrowPair(n: number): [number, number] {
  let a = '';
  let b = '';
  for (let i = 0; i < n; i++) {
    const isLeading = i === 0;
    const da = Math.floor(Math.random() * 8) + (isLeading ? 1 : 1);
    const db = Math.floor(Math.random() * da) + (isLeading ? 1 : 0);
    const dbSafe = isLeading && db === 0 ? 1 : db;
    const daFinal = Math.max(da, dbSafe);
    a += daFinal;
    b += dbSafe;
  }
  return [parseInt(a, 10), parseInt(b, 10)];
}

function buildSubtraction(config: WorksheetConfig): MathQuestion[] {
  const count = config.questionCount;
  const digits = config.digits;
  const withBoxes = config.withBoxes;
  const out: MathQuestion[] = [];

  for (let i = 0; i < count; i++) {
    let a: number;
    let b: number;

    if (config.mode === 'manual') {
      const pair = getManualPair(config.manualNumbers, i);
      if (pair) {
        [a, b] = pair;
      } else {
        [a, b] = withBoxes
          ? [randomNDigit(digits), randomNDigit(digits)]
          : randomNoBorrowPair(digits);
      }
    } else {
      [a, b] = withBoxes
        ? [randomNDigit(digits), randomNDigit(digits)]
        : randomNoBorrowPair(digits);
    }

    if (b > a) [a, b] = [b, a];

    const columnCount = Math.max(String(a).length, String(b).length);
    const answerColumns = columnCount;

    const aStr = String(a).padStart(columnCount, ' ');
    const bStr = String(b).padStart(columnCount, ' ');

    const boxes: AnswerBox[] = [];

    if (withBoxes) {
      for (let c = 0; c < columnCount; c++) {
        boxes.push({
          id: crypto.randomUUID(),
          value: '',
          row: 0,
          col: c,
          span: 1,
        });
      }
    }

    for (let c = 0; c < answerColumns; c++) {
      boxes.push({
        id: crypto.randomUUID(),
        value: '',
        row: 3,
        col: c,
        span: 1,
      });
    }

    out.push({
      id: crypto.randomUUID(),
      topic: 'subtraction',
      prompt: `${a} − ${b}`,
      operands: [a, b],
      boxes,
      meta: {
        columnCount,
        answerColumns,
        withBoxes,
        a,
        b,
        aStr,
        bStr,
      },
    });
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/*                                 Division                                   */
/* -------------------------------------------------------------------------- */

/** Random divisor: single-digit (2-9) or double-digit (10-99). */
function randomDivisor(): number {
  // ~60% single-digit, 40% double-digit
  if (Math.random() < 0.6) return Math.floor(Math.random() * 8) + 2; // 2..9
  return Math.floor(Math.random() * 90) + 10; // 10..99
}

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

function longDivide(dividend: number, divisor: number): DivWalk {
  const dividendStr = String(dividend);
  const divisorStr = String(divisor);
  const digits = dividendStr.split('').map((d) => parseInt(d, 10));

  const quotientDigits: number[] = [];
  const steps: DivStep[] = [];

  let i = 0;
  let working = 0;

  while (i < digits.length) {
    while (i < digits.length && working < divisor) {
      working = working * 10 + digits[i];
      i++;
    }

    if (working < divisor) break;

    const qd = Math.floor(working / divisor);
    quotientDigits.push(qd);

    const product = qd * divisor;
    const result = working - product;

    const bringDown = i < digits.length ? digits[i] : null;
    if (bringDown !== null) i++;

    const isFinal = i >= digits.length;

    steps.push({
      product,
      working,
      result: bringDown !== null ? result * 10 + bringDown : result,
      isFinal,
      bringDown,
    });

    working = steps[steps.length - 1].result;
  }

  if (quotientDigits.length === 0) {
    quotientDigits.push(0);
  }

  const quotient = parseInt(quotientDigits.join(''), 10) || 0;
  const remainder = working;

  return {
    dividend,
    divisor,
    quotient,
    remainder,
    quotientDigits,
    steps,
    dividendStr,
    divisorStr,
    quotientStr: String(quotient),
  };
}

function buildDivision(config: WorksheetConfig): MathQuestion[] {
  const count = config.questionCount;
  const digits = config.digits;
  const withBoxes = config.withBoxes;
  const out: MathQuestion[] = [];

  for (let i = 0; i < count; i++) {
    let dividend: number;
    let divisor: number;

    if (config.mode === 'manual') {
      const pair = getManualPair(config.manualNumbers, i);
      if (pair) {
        [dividend, divisor] = pair;
        if (!divisor || divisor <= 0) divisor = 2;
        if (dividend < divisor) [dividend, divisor] = [divisor, dividend];
      } else {
        divisor = randomDivisor();
        const minD = 10 ** (digits - 1);
        const maxD = 10 ** digits - 1;
        dividend = Math.floor(Math.random() * (maxD - minD + 1)) + minD;
        if (dividend < divisor) dividend = divisor * 2 + 1;
      }
    } else {
      divisor = randomDivisor();
      const minD = 10 ** (digits - 1);
      const maxD = 10 ** digits - 1;
      dividend = Math.floor(Math.random() * (maxD - minD + 1)) + minD;
      if (dividend < divisor) dividend = divisor * 2 + 1;
    }

    const walk = longDivide(dividend, divisor);
    const boxes: AnswerBox[] = [];

    if (!withBoxes) {
      // Horizontal: one wide answer box for the whole quotient.
      boxes.push({
        id: crypto.randomUUID(),
        value: '',
        row: 0,
        col: 0,
        span: walk.quotientStr.length,
      });
    } else {
      // Long-division layout.
      //  row 0  = quotient digits
      //  row 10 = final remainder digits
      //  row 100 + s*10 + 0 = per-step product row
      //  row 100 + s*10 + 1 = per-step result (bring-down) row
      for (let c = 0; c < walk.quotientStr.length; c++) {
        boxes.push({
          id: crypto.randomUUID(),
          value: '',
          row: 0,
          col: c,
          span: 1,
        });
      }

      const remainderStr = String(walk.remainder);
      for (let c = 0; c < remainderStr.length; c++) {
        boxes.push({
          id: crypto.randomUUID(),
          value: '',
          row: 10,
          col: c,
          span: 1,
        });
      }

      walk.steps.forEach((step, s) => {
        const prodStr = String(step.product);
        for (let c = 0; c < prodStr.length; c++) {
          boxes.push({
            id: crypto.randomUUID(),
            value: '',
            row: 100 + s * 10 + 0,
            col: c,
            span: 1,
          });
        }
        if (!step.isFinal) {
          const resStr = String(step.result);
          for (let c = 0; c < resStr.length; c++) {
            boxes.push({
              id: crypto.randomUUID(),
              value: '',
              row: 100 + s * 10 + 1,
              col: c,
              span: 1,
            });
          }
        }
      });
    }

    out.push({
      id: crypto.randomUUID(),
      topic: 'division',
      prompt: `${dividend} ÷ ${divisor}`,
      operands: [dividend, divisor],
      dividend,
      divisor,
      boxes,
      meta: {
        withBoxes,
        walk: walk as unknown as Record<string, unknown>,
      },
    });
  }

  return out;
}