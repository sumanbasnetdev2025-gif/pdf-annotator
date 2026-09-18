'use client';

interface Props {
  value: string;
  onChange: (value: string) => void;
  width?: number;
  height?: number;
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
  const isSmall = variant === 'small';

  return (
      <div style={{ position: 'relative', zIndex: 20, width, height }}>
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      enterKeyHint="done"
      maxLength={2}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onFocus={(e) => {
        // Scroll the box into view when the keyboard opens on mobile.
        setTimeout(() => e.target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 250);
      }}
      aria-label={ariaLabel}
      style={{ width, height }}
      className={[
        'rounded-md border-2 bg-white text-center font-semibold text-[#1C1B1F] outline-none',
        'focus:border-[#C8732A] caret-[#C8732A]',
        isSmall
          ? 'border-[#D8D4CB] text-xs dark:border-[#3A3833] dark:bg-[#26242A] dark:text-[#E8E6E0]'
          : 'border-[#1C1B1F] text-base dark:border-[#E8E6E0] dark:bg-[#26242A] dark:text-[#E8E6E0]',
      ].join(' ')}
    />
    </div>
  );
}