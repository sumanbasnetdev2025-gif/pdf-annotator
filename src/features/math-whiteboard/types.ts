export type MathTopic = 'division' | 'tables' | 'addition' | 'subtraction';

export type Digits = 2 | 3 | 4;

/** A single typeable/writable answer box position within a worksheet row/column. */
export interface AnswerBox {
  id: string;
  /** Value typed by the user (digits only). */
  value: string;
  /** Row within the question (0 = topmost). Used for carries/borrow rows. */
  row: number;
  /** Column index, left→right. */
  col: number;
  /** Width of the box in "digit units" (1 = one digit wide). */
  span?: number;
}

/** One question in the worksheet. */
export interface MathQuestion {
  id: string;
  topic: MathTopic;
  /** Human-readable prompt, e.g. "653 + 364" */
  prompt: string;
  /** Structured operands for renderers that need per-digit layout. */
  operands: number[];
  /** For tables: the number being multiplied. */
  tableNumber?: number;
  /** For division: divisor / dividend / quotient / remainder slots. */
  divisor?: number;
  dividend?: number;
  /** Free-form extra metadata renderers may need. */
  meta?: Record<string, unknown>;
  /** Answer boxes belonging to this question. */
  boxes: AnswerBox[];
}

export interface WorksheetConfig {
  topic: MathTopic;
  digits: Digits;
  withBoxes: boolean;
  tableNumber: number;
  questionCount: number;
  /** 'random' auto-generates operands; 'manual' uses the numbers typed in the form. */
  mode: 'random' | 'manual';
  /** Used only when mode === 'manual'. One entry per question. */
  manualNumbers: string[];
}

export interface Worksheet {
  id: string;
  config: WorksheetConfig;
  questions: MathQuestion[];
  createdAt: number;
}