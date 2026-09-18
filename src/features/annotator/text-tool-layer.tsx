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

  const annotations = (annotationsByPage[pageNumber] || []).filter(
    (a): a is TextAnnotation => a.type === 'text' || a.type === 'sticky-note'
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const linkedArrows = useRef<Record<string, string>>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus();
  }, [editingId]);

  useEffect(() => {
    if (!selectedId) return;
    const handleDocPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('[data-note-root]')) return;
      setSelectedId(null);
    };
    document.addEventListener('pointerdown', handleDocPointerDown);
    return () =>
      document.removeEventListener('pointerdown', handleDocPointerDown);
  }, [selectedId]);

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
        deleteAnnotation(pageNumber, arrowId);
        delete linkedArrows.current[ann.id];
      }
      deleteAnnotation(pageNumber, ann.id);
      setSelectedId((cur) => (cur === ann.id ? null : cur));
    },
    [pageNumber, deleteAnnotation]
  );

  const handleLayerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
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
        width: 180,
        height: 60,
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
      onClick={handleLayerClick}
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
      {annotations.map((ann) => {
        const isSelected = selectedId === ann.id;
        const isEditing = editingId === ann.id;

        return (
          <div
            key={ann.id}
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
            }}
            onPointerDown={(e) => {
              if (!isEditing) {
                setSelectedId(ann.id);
              }
              e.stopPropagation();
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditingId(ann.id);
              setSelectedId(ann.id);
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(ann);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              aria-label="Delete note"
              className={[
                'absolute -right-2 -top-2 z-10 h-6 w-6 items-center justify-center rounded-full bg-[#D62828] text-white shadow-md transition-opacity',
                'opacity-0 pointer-events-none',
                'group-hover:opacity-100 group-hover:pointer-events-auto',
                isSelected ? '!opacity-100 !pointer-events-auto' : '',
                'flex',
              ].join(' ')}
              style={{
                transform: 'translateZ(0)',
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>

            {isEditing ? (
              <textarea
                ref={inputRef}
                value={ann.text}
                onChange={(e) =>
                  updateAnnotation(pageNumber, ann.id, { text: e.target.value })
                }
                onBlur={() => handleBlur(ann)}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
  width: '100%',
  minHeight: ann.height,
  fontFamily: ann.fontFamily,
  color: ann.color,
  backgroundColor:
    ann.backgroundColor || 'rgba(255,255,255,0.9)',
  fontWeight: ann.bold ? 'bold' : 'normal',
  fontStyle: ann.italic ? 'italic' : 'normal',
  textDecoration: ann.underline ? 'underline' : 'none',
  textAlign: ann.align,
  border: '1px dashed #C8732A',
  borderRadius: 4,
  padding: 6,
  resize: 'both',
  outline: 'none',
  fontSize: ann.fontSize < 16 ? 16 : ann.fontSize,
  lineHeight: `${Math.max(28, ann.fontSize * 1.5)}px`,
  boxSizing: 'border-box',
  whiteSpace: 'pre',
  overflowX: 'auto',
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
    color: ann.color,
    backgroundColor: ann.backgroundColor || 'transparent',
    fontWeight: ann.bold ? 'bold' : 'normal',
    fontStyle: ann.italic ? 'italic' : 'normal',
    textDecoration: ann.underline ? 'underline' : 'none',
    textAlign: ann.align,
    padding: 6,
    borderRadius: 4,
    cursor: 'text',
    boxSizing: 'border-box',
    overflow: 'visible',
  }}
>
  {(ann.text || ' ').split('\n').map((line, index) => (
    <div
      key={`${ann.id}-line-${index}`}
      style={{
        height: `${Math.max(28, ann.fontSize * 1.5)}px`,
        lineHeight: `${Math.max(28, ann.fontSize * 1.5)}px`,
        whiteSpace: 'pre',
        overflow: 'visible',
      }}
    >
      {line || '\u00A0'}
    </div>
  ))}
</div>
            )}
          </div>
        );
      })}
    </div>
  );
}