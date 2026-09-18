'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Approx width in px. Small boxes for carries, larger for answers. */
  width?: number;
  height?: number;
  /** 'small' renders carry/borrow boxes with a lighter border. */
  variant?: 'default' | 'small';
  ariaLabel?: string;
}

export function MathInputBox({
  value,
  onChange,
  width = 44,
  height = 44,
  variant = 'default',
  ariaLabel,
}: Props) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const isSmall = variant === 'small';

  return (
    <div
      // stop the parent whiteboard layer from interpreting taps as "create note"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{ width, height }}
      className="relative inline-flex items-center justify-center"
    >
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              e.preventDefault();
              setEditing(false);
            }
          }}
          aria-label={ariaLabel}
          className={[
            'h-full w-full rounded-md border-2 bg-white text-center font-semibold text-[#1C1B1F] outline-none',
            'border-[#C8732A] caret-[#C8732A]',
            isSmall ? 'text-xs' : 'text-base',
          ].join(' ')}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={ariaLabel}
          className={[
            'h-full w-full rounded-md border-2 bg-white text-center font-semibold text-[#1C1B1F] transition-colors',
            isSmall
              ? 'border-[#D8D4CB] text-xs hover:border-[#C8732A] dark:border-[#3A3833] dark:bg-[#26242A] dark:text-[#E8E6E0]'
              : 'border-[#1C1B1F] text-base hover:border-[#C8732A] dark:border-[#E8E6E0] dark:bg-[#26242A] dark:text-[#E8E6E0]',
          ].join(' ')}
        >
          {value || '\u00A0'}
        </button>
      )}
    </div>
  );
}