'use client';

import { useState } from 'react';
import { useAnnotationStore } from '@/store/annotation-store';
import { useViewerStore } from '@/store/viewer-store';
import { Trash2, Search, X } from 'lucide-react';
import { Annotation } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  pen: 'Pen stroke',
  pencil: 'Pencil stroke',
  highlighter: 'Highlight',
  rectangle: 'Rectangle',
  circle: 'Circle',
  ellipse: 'Ellipse',
  line: 'Line',
  arrow: 'Arrow',
  text: 'Text',
  'sticky-note': 'Sticky note',
  stamp: 'Stamp',
  image: 'Image',
  signature: 'Signature',
};

export function AnnotationSidebar({ onClose }: { onClose: () => void }) {
  const [search, setSearch] = useState('');
  const annotationsByPage = useAnnotationStore((s) => s.annotationsByPage);
  const deleteAnnotation = useAnnotationStore((s) => s.deleteAnnotation);
  const selectAnnotation = useAnnotationStore((s) => s.selectAnnotation);
  const setCurrentPage = useViewerStore((s) => s.setCurrentPage);

  const allAnnotations: Annotation[] = Object.values(annotationsByPage).flat();

  const filtered = allAnnotations.filter((a) => {
    const label = TYPE_LABELS[a.type] || a.type;
    const textMatch = 'text' in a ? a.text?.toLowerCase().includes(search.toLowerCase()) : false;
    return label.toLowerCase().includes(search.toLowerCase()) || textMatch;
  });

  const handleJump = (ann: Annotation) => {
    setCurrentPage(ann.pageNumber);
    selectAnnotation(ann.id);
  };

  return (
    <aside className="flex h-full w-72 flex-col border-l border-[#D8D4CB] bg-white">
      <div className="flex items-center justify-between border-b border-[#D8D4CB] px-3 py-2.5">
        <span className="text-sm font-medium text-[#1C1B1F]">Annotations</span>
        <button onClick={onClose} aria-label="Close sidebar">
          <X className="h-4 w-4 text-[#6B6862]" />
        </button>
      </div>

      <div className="flex items-center gap-2 border-b border-[#D8D4CB] px-3 py-2">
        <Search className="h-3.5 w-3.5 text-[#A8A49B]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search annotations…"
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-[#A8A49B]"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="px-3 py-6 text-center text-xs text-[#A8A49B]">
            No annotations yet.
          </p>
        )}
        {filtered
          .sort((a, b) => a.pageNumber - b.pageNumber || a.createdAt - b.createdAt)
          .map((ann) => (
            <div
              key={ann.id}
              className="group flex items-center justify-between border-b border-[#F0EEE8] px-3 py-2 hover:bg-[#FAF9F6]"
            >
              <button onClick={() => handleJump(ann)} className="flex-1 text-left">
                <p className="text-xs font-medium text-[#1C1B1F]">
                  {TYPE_LABELS[ann.type] || ann.type}
                </p>
                <p className="font-mono text-[10px] text-[#A8A49B]">
                  Page {ann.pageNumber}
                  {'text' in ann && ann.text ? ` · "${ann.text.slice(0, 20)}"` : ''}
                </p>
              </button>
              <button
                onClick={() => deleteAnnotation(ann.pageNumber, ann.id)}
                className="opacity-0 group-hover:opacity-100"
                aria-label="Delete annotation"
              >
                <Trash2 className="h-3.5 w-3.5 text-[#D62828]" />
              </button>
            </div>
          ))}
      </div>
    </aside>
  );
}