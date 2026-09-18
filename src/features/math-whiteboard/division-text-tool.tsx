'use client';

import { useState, useRef, useEffect } from 'react';
import { Plus, X, Minus, CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Row {
  id: string;
  /** The typed line, e.g. "1", "2 ) 20", "-2", "0" */
  value: string;
  /** Draw a horizontal rule underneath */
  rule: boolean;
}

interface Props {
  onCommit: (text: string) => void;
  onCancel: () => void;
}

export function DivisionTextTool({ onCommit, onCancel }: Props) {
  const [rows, setRows] = useState<Row[]>([
    { id: crypto.randomUUID(), value: '1', rule: false },
    { id: crypto.randomUUID(), value: '2 ) 20', rule: false },
    { id: crypto.randomUUID(), value: '-2', rule: true },
    { id: crypto.randomUUID(), value: '0', rule: false },
  ]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (focusId && inputsRef.current[focusId]) {
      inputsRef.current[focusId]!.focus();
      inputsRef.current[focusId]!.select();
      setFocusId(null);
    }
  }, [focusId, rows]);

  function addRowBelow(rowIdx: number) {
    const newRow: Row = {
      id: crypto.randomUUID(),
      value: '',
      rule: false,
    };
    setRows((prev) => {
      const next = [...prev];
      next.splice(rowIdx + 1, 0, newRow);
      return next;
    });
    setFocusId(newRow.id);
  }

  function addRowAtEnd() {
    const newRow: Row = {
      id: crypto.randomUUID(),
      value: '',
      rule: false,
    };
    setRows((prev) => [...prev, newRow]);
    setFocusId(newRow.id);
  }

  function deleteRow(rowIdx: number) {
    setRows((prev) => prev.filter((_, i) => i !== rowIdx));
  }

  function updateRow(rowIdx: number, value: string) {
    setRows((prev) =>
      prev.map((r, i) => (i === rowIdx ? { ...r, value } : r))
    );
  }

  function toggleRule(rowIdx: number) {
    setRows((prev) =>
      prev.map((r, i) => (i === rowIdx ? { ...r, rule: !r.rule } : r))
    );
  }

  function handleKey(
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIdx: number
  ) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRowBelow(rowIdx);
    }
  }

  function handleCommit() {
    // Align all rows by right-aligning every value to the SAME right edge.
    const cleaned = rows.filter((r) => r.value.trim() !== '' || r.rule);
    if (cleaned.length === 0) return;

    const widestValue = cleaned.reduce(
      (max, r) => Math.max(max, r.value.trim().length),
      0
    );
    const WIDTH = Math.max(widestValue, 6);

    const lines: string[] = [];
    for (const row of cleaned) {
      const value = row.value.trim();
      const pad = Math.max(0, WIDTH - value.length);
      lines.push(' '.repeat(pad) + value);
      if (row.rule) {
        const ruleLen = Math.max(2, value.length);
        const rulePad = Math.max(0, WIDTH - ruleLen);
        lines.push(' '.repeat(rulePad) + '─'.repeat(ruleLen));
      }
    }
    onCommit(lines.join('\n'));
  }

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-24 z-40 mx-auto w-full max-w-2xl px-3">
      <div className="rounded-2xl border border-[#D8D4CB] bg-white p-3 shadow-xl dark:border-[#3A3833] dark:bg-[#26242A]">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-[#1C1B1F] dark:text-[#E8E6E0]">
            Division text
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCommit}>
              Insert
            </Button>
          </div>
        </div>

        <div className="max-h-[40vh] space-y-1 overflow-y-auto font-mono text-lg">
          {rows.map((row, rowIdx) => (
            <div key={row.id} className="flex items-center gap-1">
              <span className="w-5 shrink-0 text-right text-[10px] text-[#A8A49B]">
                {rowIdx + 1}
              </span>

              <input
                ref={(el) => {
                  inputsRef.current[row.id] = el;
                }}
                value={row.value}
                onChange={(e) => updateRow(rowIdx, e.target.value)}
                onKeyDown={(e) => handleKey(e, rowIdx)}
                placeholder={rowIdx === 0 ? 'quotient' : 'e.g. 2 ) 20'}
                className="min-w-0 flex-1 rounded border border-[#D8D4CB] bg-white px-2 py-1 text-left font-mono text-base outline-none focus:border-[#C8732A] dark:border-[#3A3833] dark:bg-[#1F1D21] dark:text-[#E8E6E0]"
              />

              <button
                type="button"
                onClick={() => toggleRule(rowIdx)}
                title="Toggle horizontal rule under this row"
                className={[
                  'shrink-0 rounded border p-1.5 text-xs transition-colors',
                  row.rule
                    ? 'border-[#C8732A] bg-[#C8732A] text-white'
                    : 'border-[#D8D4CB] text-[#6B6760] dark:border-[#3A3833]',
                ].join(' ')}
                aria-label="Toggle rule"
              >
                <Minus className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={() => addRowBelow(rowIdx)}
                title="Insert a new row below"
                className="shrink-0 rounded border border-[#D8D4CB] p-1.5 text-xs text-[#6B6760] dark:border-[#3A3833]"
                aria-label="Add row below"
              >
                <CornerDownLeft className="h-3 w-3" />
              </button>

              <button
                type="button"
                onClick={() => deleteRow(rowIdx)}
                title="Delete this row"
                className="shrink-0 rounded border border-[#D8D4CB] p-1.5 text-xs text-[#D62828] dark:border-[#3A3833]"
                aria-label="Delete row"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addRowAtEnd}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#D8D4CB] py-1.5 text-xs text-[#6B6760] transition-colors hover:border-[#C8732A] hover:text-[#C8732A] dark:border-[#3A3833] dark:text-[#A8A29A]"
        >
          <Plus className="h-3 w-3" />
          Add row
        </button>
      </div>
    </div>
  );
}