'use client';

import { useState, useCallback, useRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

interface TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

interface MatchLocation {
  pageNum: number;
  items: TextItem[];
  viewport: { width: number; height: number; scale: number };
}

interface PdfSearchBarProps {
  pdfProxy: unknown;
  totalPages: number;
  onJumpToPage: (page: number) => void;
  onHighlights: (rects: DOMRect[]) => void;
  onClose: () => void;
}

export function PdfSearchBar({
  pdfProxy,
  totalPages,
  onJumpToPage,
  onHighlights,
  onClose,
}: PdfSearchBarProps) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<MatchLocation[]>([]);
  const [matchIndex, setMatchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runSearch = useCallback(async () => {
    if (!(pdfProxy as { getPage?: unknown })?.getPage || !query.trim()) {
      setMatches([]);
      onHighlights([]);
      return;
    }
    setIsSearching(true);
    const found: MatchLocation[] = [];
    const pdf = pdfProxy as {
      getPage: (n: number) => Promise<{
        getTextContent: () => Promise<{ items: TextItem[] }>;
        getViewport: (opts: { scale: number }) => { width: number; height: number; scale: number };
      }>;
    };

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const lc = query.toLowerCase();
      const matchingItems = (content.items as TextItem[]).filter((item) =>
        item.str.toLowerCase().includes(lc)
      );
      if (matchingItems.length > 0) {
        found.push({ pageNum: i, items: matchingItems, viewport });
      }
    }

    setMatches(found);
    setMatchIndex(0);
    setIsSearching(false);

    if (found.length > 0) {
      onJumpToPage(found[0].pageNum);
      showHighlights(found[0]);
    } else {
      onHighlights([]);
    }
  }, [pdfProxy, query, totalPages, onJumpToPage, onHighlights]);

  const showHighlights = useCallback(
    (match: MatchLocation) => {
      // Build approximate rects from text item transforms
      // PDF transform: [scaleX, skewX, skewY, scaleY, translateX, translateY]
      const rects: DOMRect[] = match.items.map((item) => {
        const [, , , scaleY, tx, ty] = item.transform;
        const x = tx;
        const y = match.viewport.height - ty - Math.abs(scaleY);
        return new DOMRect(x, y, item.width, Math.abs(scaleY) * 1.2);
      });
      onHighlights(rects);
    },
    [onHighlights]
  );

  const goToMatch = useCallback(
    (dir: 1 | -1) => {
      if (matches.length === 0) return;
      const next = (matchIndex + dir + matches.length) % matches.length;
      setMatchIndex(next);
      onJumpToPage(matches[next].pageNum);
      showHighlights(matches[next]);
    },
    [matches, matchIndex, onJumpToPage, showHighlights]
  );

  const handleClose = () => {
    onHighlights([]);
    onClose();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#D8D4CB] bg-white px-4 py-2 dark:border-[#3A3833] dark:bg-[#262420]">
      <Search className="h-3.5 w-3.5 shrink-0 text-[#A8A49B]" />
      <input
        ref={inputRef}
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && runSearch()}
        placeholder="Search in document… (Enter)"
        className="min-w-[140px] flex-1 bg-transparent text-sm outline-none placeholder:text-[#A8A49B] dark:text-[#F5F3EE]"
      />
      {isSearching && (
        <span className="font-mono text-[10px] text-[#A8A49B]">searching…</span>
      )}
      {!isSearching && matches.length > 0 && (
        <span className="font-mono text-[10px] text-[#6B6862] dark:text-[#A8A49B]">
          {matchIndex + 1} / {matches.length} pages
        </span>
      )}
      {!isSearching && query && matches.length === 0 && (
        <span className="font-mono text-[10px] text-[#D62828]">no results</span>
      )}
      <button onClick={() => goToMatch(-1)} disabled={matches.length === 0} aria-label="Previous">
        <ChevronUp className="h-4 w-4 text-[#6B6862]" />
      </button>
      <button onClick={() => goToMatch(1)} disabled={matches.length === 0} aria-label="Next">
        <ChevronDown className="h-4 w-4 text-[#6B6862]" />
      </button>
      <button onClick={handleClose} aria-label="Close search">
        <X className="h-4 w-4 text-[#6B6862]" />
      </button>
    </div>
  );
}