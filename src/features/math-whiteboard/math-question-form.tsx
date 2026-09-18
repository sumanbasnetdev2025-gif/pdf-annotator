'use client';

import { useState } from 'react';
import { Sparkles, Plus, Minus, X, Divide, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Digits, MathTopic, WorksheetConfig } from './types';

interface Props {
  onGenerate: (config: WorksheetConfig) => void;
  onTopicChange?: (topic: MathTopic) => void;
}

const TOPICS: { value: MathTopic; label: string; icon: React.ReactNode }[] = [
  { value: 'tables', label: 'Tables', icon: <Grid3x3 className="h-4 w-4" /> },
  { value: 'addition', label: 'Addition', icon: <Plus className="h-4 w-4" /> },
  { value: 'subtraction', label: 'Subtraction', icon: <Minus className="h-4 w-4" /> },
  { value: 'division', label: 'Division', icon: <Divide className="h-4 w-4" /> },
];

export function MathQuestionForm({ onGenerate, onTopicChange }: Props) {
  const [topic, setTopic] = useState<MathTopic>('tables');
  const [digits, setDigits] = useState<Digits>(2);
  const [withBoxes, setWithBoxes] = useState(true);
  const [mode, setMode] = useState<'random' | 'manual'>('random');
  const [manualNumbers, setManualNumbers] = useState<string[]>(['']);

  // Raw string state so the input can be empty while typing.
  const [tableNumberInput, setTableNumberInput] = useState('2');
  const [questionCountInput, setQuestionCountInput] = useState('10');

  // Numeric state used by the builder. Kept in sync only when the raw
  // string is a valid in-range number.
  const [tableNumber, setTableNumber] = useState(2);
  const [questionCount, setQuestionCount] = useState(10);

  const isDigitTopic = topic === 'addition' || topic === 'subtraction';
  const isTables = topic === 'tables';
  const isDivision = topic === 'division';

  function updateManual(idx: number, value: string) {
    setManualNumbers((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Final clamp before generating, in case the user never blurred.
    const tRaw = Number(tableNumberInput);
    const tFinal =
      Number.isFinite(tRaw) && tRaw >= 1 ? Math.min(20, Math.floor(tRaw)) : 2;
    const qRaw = Number(questionCountInput);
    const qFinal =
      Number.isFinite(qRaw) && qRaw >= 1 ? Math.min(20, Math.floor(qRaw)) : 10;

    setTableNumber(tFinal);
    setTableNumberInput(String(tFinal));
    setQuestionCount(qFinal);
    setQuestionCountInput(String(qFinal));

    const config: WorksheetConfig = {
      topic,
      digits,
      withBoxes,
      tableNumber: tFinal,
      questionCount: qFinal,
      mode,
      manualNumbers,
    };
    onGenerate(config);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full w-full flex-col overflow-hidden"
    >
      {/* Scrollable content */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        <div>
          <h2 className="text-base font-semibold text-[#1C1B1F] dark:text-[#E8E6E0]">
            Create Worksheet
          </h2>
          <p className="mt-0.5 text-xs text-[#6B6760] dark:text-[#A8A29A]">
            Pick a topic and generate questions.
          </p>
        </div>

        {/* Topic */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#1C1B1F] dark:text-[#E8E6E0]">
            Topic
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TOPICS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setTopic(t.value);
                  onTopicChange?.(t.value);
                }}
                className={[
                  'flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                  topic === t.value
                    ? 'border-[#C8732A] bg-[#C8732A] text-white'
                    : 'border-[#D8D4CB] bg-white text-[#1C1B1F] hover:bg-[#F5F2EC] dark:border-[#3A3833] dark:bg-[#26242A] dark:text-[#E8E6E0] dark:hover:bg-[#2F2D33]',
                ].join(' ')}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Division notice */}
        {isDivision && (
          <div className="rounded-lg border border-dashed border-[#D8D4CB] bg-[#F5F2EC] px-3 py-3 text-xs text-[#6B6760] dark:border-[#3A3833] dark:bg-[#2F2D33] dark:text-[#A8A29A]">
            <p className="font-medium text-[#1C1B1F] dark:text-[#E8E6E0]">
              Draw division by hand
            </p>
            <p className="mt-1">
              Tap <b>Generate</b> to open a blank whiteboard. Use the pen or the
              text tool to write the question and solution.
            </p>
          </div>
        )}

        {/* Tables: table number */}
        {isTables && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#1C1B1F] dark:text-[#E8E6E0]">
              Table of
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={tableNumberInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                setTableNumberInput(raw);
                const n = Number(raw);
                if (raw !== '' && n >= 1 && n <= 20) setTableNumber(n);
              }}
onBlur={() => {
  const raw = questionCountInput.trim();

  if (raw === '') {
    return;
  }

  const n = Number(raw);
  const clamped = Math.min(20, Math.max(1, Math.floor(n)));

  setQuestionCount(clamped);
  setQuestionCountInput(String(clamped));
}}
              className="w-full rounded-lg border border-[#D8D4CB] bg-white px-3 py-2 text-sm outline-none focus:border-[#C8732A] dark:border-[#3A3833] dark:bg-[#26242A] dark:text-[#E8E6E0]"
            />
          </div>
        )}

        {/* Digits (add/sub) */}
        {isDigitTopic && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#1C1B1F] dark:text-[#E8E6E0]">
              Digits
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([2, 3, 4] as Digits[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDigits(d)}
                  className={[
                    'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    digits === d
                      ? 'border-[#C8732A] bg-[#C8732A] text-white'
                      : 'border-[#D8D4CB] bg-white text-[#1C1B1F] hover:bg-[#F5F2EC] dark:border-[#3A3833] dark:bg-[#26242A] dark:text-[#E8E6E0]',
                  ].join(' ')}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* With boxes (add/sub) */}
        {isDigitTopic && (
          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-[#D8D4CB] bg-white px-3 py-2.5 dark:border-[#3A3833] dark:bg-[#26242A]">
            <span className="text-sm font-medium text-[#1C1B1F] dark:text-[#E8E6E0]">
              With carry/borrow boxes
            </span>
            <input
              type="checkbox"
              checked={withBoxes}
              onChange={(e) => setWithBoxes(e.target.checked)}
              className="h-4 w-4 accent-[#C8732A]"
            />
          </label>
        )}

        {/* Number of questions (hidden for division) */}
        {!isDivision && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#1C1B1F] dark:text-[#E8E6E0]">
              Number of questions
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={questionCountInput}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, '');
                setQuestionCountInput(raw);
                const n = Number(raw);
                if (raw !== '' && n >= 1 && n <= 20) setQuestionCount(n);
              }}
            onBlur={() => {
  const raw = questionCountInput.trim();

  if (raw === '') {
    return;
  }

  const n = Number(raw);
  const clamped = Math.min(20, Math.max(1, Math.floor(n)));

  setQuestionCount(clamped);
  setQuestionCountInput(String(clamped));
}}
              className="w-full rounded-lg border border-[#D8D4CB] bg-white px-3 py-2 text-sm outline-none focus:border-[#C8732A] dark:border-[#3A3833] dark:bg-[#26242A] dark:text-[#E8E6E0]"
            />
          </div>
        )}

        {/* Random vs manual (add/sub) */}
        {isDigitTopic && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#1C1B1F] dark:text-[#E8E6E0]">
              Numbers
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('random')}
                className={[
                  'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  mode === 'random'
                    ? 'border-[#C8732A] bg-[#C8732A] text-white'
                    : 'border-[#D8D4CB] bg-white text-[#1C1B1F] hover:bg-[#F5F2EC] dark:border-[#3A3833] dark:bg-[#26242A] dark:text-[#E8E6E0]',
                ].join(' ')}
              >
                Auto (random)
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className={[
                  'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  mode === 'manual'
                    ? 'border-[#C8732A] bg-[#C8732A] text-white'
                    : 'border-[#D8D4CB] bg-white text-[#1C1B1F] hover:bg-[#F5F2EC] dark:border-[#3A3833] dark:bg-[#26242A] dark:text-[#E8E6E0]',
                ].join(' ')}
              >
                Manual
              </button>
            </div>
          </div>
        )}

        {/* Manual numbers list (add/sub) */}
        {mode === 'manual' && isDigitTopic && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#1C1B1F] dark:text-[#E8E6E0]">
              Operands per question
            </label>
            <div className="space-y-2">
              {manualNumbers.map((val, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={val}
                    placeholder="e.g. 653 364"
                    onChange={(e) => updateManual(idx, e.target.value)}
                    className="flex-1 rounded-lg border border-[#D8D4CB] bg-white px-3 py-2 text-sm outline-none focus:border-[#C8732A] dark:border-[#3A3833] dark:bg-[#26242A] dark:text-[#E8E6E0]"
                  />
                  {manualNumbers.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setManualNumbers((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="rounded-lg border border-[#D8D4CB] p-2 text-[#D62828] dark:border-[#3A3833]"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setManualNumbers((prev) => [...prev, ''])}
              className="w-full"
            >
              <Plus className="h-4 w-4" /> Add another
            </Button>
          </div>
        )}
      </div>

      {/* Sticky footer */}
      <div className="border-t border-[#D8D4CB] bg-white p-3 dark:border-[#3A3833] dark:bg-[#26242A]">
        <Button type="submit" className="w-full">
          <Sparkles className="h-4 w-4" /> Generate worksheet
        </Button>
      </div>
    </form>
  );
}