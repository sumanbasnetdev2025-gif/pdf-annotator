'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAnnotationStore } from '@/store/annotation-store';
import { useToolStore } from '@/store/tool-store';
import { TextAnnotation } from '@/types';
import { X } from 'lucide-react';
import { getToolCursor } from '@/lib/cursors';

interface TextToolLayerProps {
  pageNumber: number;
  width: number;
  height: number;
  autoCreateAt?: { x: number; y: number; arrowId: string } | null;
  onAutoCreateHandled?: () => void;
}

// Wrapper that tracks its textarea child's size and syncs the annotation
function ResizableNote({
  ann,
  isEditing,
  isSelected,
  pageNumber,
  onSelect,
  onDoubleClick,
  onDelete,
  onBlur,
  onChange,
}: {
  ann: TextAnnotation;
  isEditing: boolean;
  isSelected: boolean;
  pageNumber: number;
  onSelect: () => void;
  onDoubleClick: () => void;
  onDelete: () => void;
  onBlur: () => void;
  onChange: (text: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const updateAnnotation = useAnnotationStore((s) => s.updateAnnotation);

  // Focus when editing starts
  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [isEditing]);

  // Track textarea resize via ResizeObserver — sync to annotation + wrapper
  useEffect(() => {
    const textarea = textareaRef.current;
    const wrapper = wrapperRef.current;
    if (!textarea || !wrapper) return;

    const ro = new ResizeObserver(() => {
      const w = textarea.offsetWidth;
      const h = textarea.offsetHeight;
      wrapper.style.width = `${w}px`;
      wrapper.style.minHeight = `${h}px`;
      updateAnnotation(pageNumber, ann.id, { width: w, height: h });
    });

    ro.observe(textarea);
    return () => ro.disconnect();
  }, [isEditing, pageNumber, ann.id, updateAnnotation]);

  const lineHeight = Math.max(28, ann.fontSize * 1.5);

  return (
    <div
      ref={wrapperRef}
      data-note-root
      className="group"
      style={{
        position: 'absolute',
        left: ann.x,
        top: ann.y,
        width: ann.width,
        minHeight: ann.height,
        outline: isSelected && !isEditing ? '2px solid #C8732A' : 'none',
        outlineOffset: 2,
        borderRadius: 6,
        // important: do NOT set overflow hidden — let it grow
      }}
      onPointerDown={(e) => {
        if (!isEditing) onSelect();
        e.stopPropagation();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick();
      }}
    >
      {/* Delete button — positioned relative to wrapper which tracks size */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="Delete note"
        className={[
          'absolute -right-3 -top-3 z-50 flex h-6 w-6 items-center justify-center',
          'rounded-full bg-[#D62828] text-white shadow-md',
          'transition-opacity',
          isSelected || isEditing
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto',
        ].join(' ')}
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={ann.text}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          // Touch resize via touch-action
          style={{
            display: 'block',
            width: ann.width,
            minHeight: ann.height,
            fontFamily: ann.fontFamily,
            fontSize: ann.fontSize,
            lineHeight: `${lineHeight}px`,
            color: ann.color,
            backgroundColor: ann.backgroundColor ?? 'rgba(255,255,255,0.95)',
            fontWeight: ann.bold ? 'bold' : 'normal',
            fontStyle: ann.italic ? 'italic' : 'normal',
            textDecoration: ann.underline ? 'underline' : 'none',
            textAlign: ann.align,
            border: '1px dashed #C8732A',
            borderRadius: 4,
            padding: 8,
            resize: 'both',
            outline: 'none',
            boxSizing: 'border-box',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowY: 'auto',
            // Allow touch resize on mobile
            touchAction: 'manipulation',
          }}
        />
      ) : (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            minHeight: ann.height,
            fontSize: ann.fontSize,
            fontFamily: ann.fontFamily,
            lineHeight: `${lineHeight}px`,
            color: ann.color,
            backgroundColor: ann.backgroundColor ?? 'transparent',
            fontWeight: ann.bold ? 'bold' : 'normal',
            fontStyle: ann.italic ? 'italic' : 'normal',
            textDecoration: ann.underline ? 'underline' : 'none',
            textAlign: ann.align,
            padding: 8,
            borderRadius: 4,
            cursor: 'text',
            boxSizing: 'border-box',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {ann.text || '\u00A0'}
        </div>
      )}
    </div>
  );
}

export function TextToolLayer({
  pageNumber,
  width,
  height,
  autoCreateAt,
  onAutoCreateHandled,
}: TextToolLayerProps) {
  const activeTool = useToolStore((s) => s.activeTool);
  const color = useToolStore((s) => s.color);
  const fontSize = useToolStore((s) => s.fontSize);

  const annotationsByPage = useAnnotationStore((s) => s.annotationsByPage);
  const addAnnotation = useAnnotationStore((s) => s.addAnnotation);
  const updateAnnotation = useAnnotationStore((s) => s.updateAnnotation);
  const deleteAnnotation = useAnnotationStore((s) => s.deleteAnnotation);

  const annotations = (annotationsByPage[pageNumber] ?? []).filter(
    (a): a is TextAnnotation => a.type === 'text' || a.type === 'sticky-note'
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const linkedArrows = useRef<Record<string, string>>({});

  // Deselect when clicking outside
  useEffect(() => {
    if (!selectedId) return;
    function handleDocPointer(e: PointerEvent) {
      const t = e.target as HTMLElement | null;
      if (t?.closest('[data-note-root]')) return;
      setSelectedId(null);
    }
    document.addEventListener('pointerdown', handleDocPointer);
    return () => document.removeEventListener('pointerdown', handleDocPointer);
  }, [selectedId]);

  // Auto-create from explainer arrow
  useEffect(() => {
    if (!autoCreateAt) return;
    const id = crypto.randomUUID();
    linkedArrows.current[id] = autoCreateAt.arrowId;
    const newText: TextAnnotation = {
      id,
      pageNumber,
      type: 'text',
      x: autoCreateAt.x + 10,
      y: autoCreateAt.y - 14,
      width: 200,
      height: 60,
      text: '',
      fontSize,
      fontFamily: 'Inter',
      color,
      bold: false,
      italic: false,
      underline: false,
      align: 'left',
      rotation: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      locked: false,
      opacity: 1,
      zIndex: annotations.length,
    };
    addAnnotation(pageNumber, newText);
    setEditingId(id);
    onAutoCreateHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreateAt]);

  const handleDelete = useCallback(
    (ann: TextAnnotation) => {
      const arrowId = linkedArrows.current[ann.id];
      if (arrowId) {
        const exists = useAnnotationStore
          .getState()
          .annotationsByPage[pageNumber]?.some((a) => a.id === arrowId);
        if (exists) deleteAnnotation(pageNumber, arrowId);
        delete linkedArrows.current[ann.id];
      }
      deleteAnnotation(pageNumber, ann.id);
      setSelectedId((cur) => (cur === ann.id ? null : cur));
      setEditingId((cur) => (cur === ann.id ? null : cur));
    },
    [pageNumber, deleteAnnotation]
  );

  const handleLayerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activeTool !== 'text' && activeTool !== 'sticky-note') return;
      if (e.target !== e.currentTarget) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = crypto.randomUUID();

      const newText: TextAnnotation = {
        id,
        pageNumber,
        type: activeTool,
        x,
        y,
        width: 200,
        height: 80,
        text: '',
        fontSize,
        fontFamily: 'Inter',
        color: activeTool === 'sticky-note' ? '#1C1B1F' : color,
        backgroundColor: activeTool === 'sticky-note' ? '#FFF3B0' : undefined,
        bold: false,
        italic: false,
        underline: false,
        align: 'left',
        rotation: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        locked: false,
        opacity: 1,
        zIndex: annotations.length,
      };
      addAnnotation(pageNumber, newText);
      setEditingId(id);
      setSelectedId(id);
    },
    [activeTool, color, fontSize, pageNumber, annotations.length, addAnnotation]
  );

  const handleBlur = useCallback(
    (ann: TextAnnotation) => {
      if (ann.text.trim() === '') handleDelete(ann);
      setEditingId(null);
    },
    [handleDelete]
  );

  const isTextMode = activeTool === 'text' || activeTool === 'sticky-note';

  return (
    <div
      onPointerDown={handleLayerPointerDown}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        cursor: getToolCursor(activeTool),
        pointerEvents: isTextMode || annotations.length > 0 ? 'auto' : 'none',
        zIndex: 5,
        touchAction: isTextMode ? 'manipulation' : 'auto',
      }}
    >
      {annotations.map((ann) => (
        <ResizableNote
          key={ann.id}
          ann={ann}
          isEditing={editingId === ann.id}
          isSelected={selectedId === ann.id}
          pageNumber={pageNumber}
          onSelect={() => setSelectedId(ann.id)}
          onDoubleClick={() => { setEditingId(ann.id); setSelectedId(ann.id); }}
          onDelete={() => handleDelete(ann)}
          onBlur={() => handleBlur(ann)}
          onChange={(text) => updateAnnotation(pageNumber, ann.id, { text })}
        />
      ))}
    </div>
  );
}