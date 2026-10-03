'use client';

import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import type Konva from 'konva';
import { Stage, Layer, Line, Rect, Circle, Arrow, Transformer } from 'react-konva';
import { useAnnotationStore } from '@/store/annotation-store';
import { useToolStore } from '@/store/tool-store';
import { StrokeAnnotation, ShapeAnnotation, Annotation } from '@/types';
import { getToolCursor } from '@/lib/cursors';

function distPointToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

interface DrawingCanvasProps {
  pageNumber: number;
  width: number;
  height: number;
  onExplainerDrawn?: (data: { x: number; y: number; arrowId: string }) => void;
}

const STROKE_TOOLS = ['pen', 'pencil', 'highlighter'];
const BOX_SHAPE_TOOLS = ['rectangle', 'circle', 'ellipse'];
const LINE_SHAPE_TOOLS = ['line', 'arrow', 'explainer'];

export function DrawingCanvas({
  pageNumber,
  width,
  height,
  onExplainerDrawn,
}: DrawingCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const shapeRefs = useRef<Record<string, Konva.Node>>({});
  const isDrawing = useRef(false);
  const startPoint = useRef({ x: 0, y: 0 });

  // Live stroke — bypasses React. Points live in a ref, drawn directly to Konva.
  const liveStrokeRef = useRef<Konva.Line>(null);
  const liveShapeRef = useRef<Konva.Rect | Konva.Circle | null>(null);
  const liveLineRef = useRef<Konva.Line | Konva.Arrow | null>(null);
  const pointsRef = useRef<number[]>([]);
  const liveShapeData = useRef<{
    x: number; y: number; width: number; height: number;
  } | null>(null);
  const liveLineData = useRef<number[] | null>(null);

  // Only used to know when to show/hide the live layer container
  const [hasLive, setHasLive] = useState(false);

  const activeTool = useToolStore((s) => s.activeTool);
  const color = useToolStore((s) => s.color);
  const strokeWidth = useToolStore((s) => s.strokeWidth);
  const opacity = useToolStore((s) => s.opacity);
  const isFilled = useToolStore((s) => s.isFilled);

  const annotationsByPage = useAnnotationStore((s) => s.annotationsByPage);
  const annotations = useMemo(
    () =>
      (annotationsByPage[pageNumber] || []).filter(
        (a) => a.type !== 'text' && a.type !== 'sticky-note'
      ),
    [annotationsByPage, pageNumber]
  );

  const addAnnotation = useAnnotationStore((s) => s.addAnnotation);
  const updateAnnotation = useAnnotationStore((s) => s.updateAnnotation);
  const deleteAnnotation = useAnnotationStore((s) => s.deleteAnnotation);
  const deleteSelected = useAnnotationStore((s) => s.deleteSelected);
  const selectAnnotation = useAnnotationStore((s) => s.selectAnnotation);
  const clearSelection = useAnnotationStore((s) => s.clearSelection);
  const selectedIds = useAnnotationStore((s) => s.selectedIds);
  const pushHistory = useAnnotationStore((s) => s.pushHistory);

  const isStrokeTool = STROKE_TOOLS.includes(activeTool);
  const isBoxShapeTool = BOX_SHAPE_TOOLS.includes(activeTool);
  const isLineShapeTool = LINE_SHAPE_TOOLS.includes(activeTool);
  const isSelectTool = activeTool === 'select';
  const isEraserTool = activeTool === 'eraser';
  const isHandTool = activeTool === 'hand';
  const canDraw =
    isStrokeTool || isBoxShapeTool || isLineShapeTool || isEraserTool;

  // ── Transformer sync ──────────────────────────────────────────────────
  // NOTE: dep array is only [selectedIds] — NOT annotations. We don't want
  // to re-sync on every new stroke added during a session.
  useEffect(() => {
    if (!transformerRef.current) return;
    const nodes = selectedIds
      .map((id) => shapeRefs.current[id])
      .filter((n): n is Konva.Node => Boolean(n));
    transformerRef.current.nodes(nodes);
    transformerRef.current.getLayer()?.batchDraw();
  }, [selectedIds]);

  // ── Delete key ────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedIds.length > 0
      ) {
        const active = document.activeElement;
        const isTyping =
          active &&
          (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT');
        if (!isTyping) {
          e.preventDefault();
          deleteSelected();
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, deleteSelected]);

  // ── Eraser ────────────────────────────────────────────────────────────
  const eraseAtPointer = useCallback(() => {
    const stage = stageRef.current;
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    const RADIUS = Math.max(12, strokeWidth * 4);
    const pageAnns =
      useAnnotationStore.getState().annotationsByPage[pageNumber] ?? [];

    for (const ann of pageAnns) {
      if (ann.locked) continue;

      if ('points' in ann && Array.isArray((ann as StrokeAnnotation).points)) {
        const pts = (ann as StrokeAnnotation).points;
        for (let i = 0; i < pts.length - 2; i += 2) {
          const dist = distPointToSegment(
            pos,
            { x: pts[i], y: pts[i + 1] },
            { x: pts[i + 2], y: pts[i + 3] }
          );
          if (dist <= RADIUS) {
            deleteAnnotation(pageNumber, ann.id);
            return;
          }
        }
      }

      if (
        'x' in ann &&
        'width' in ann &&
        ann.type !== 'text' &&
        ann.type !== 'sticky-note'
      ) {
        const s = ann as ShapeAnnotation;
        const inBox =
          pos.x >= s.x - RADIUS &&
          pos.x <= s.x + s.width + RADIUS &&
          pos.y >= s.y - RADIUS &&
          pos.y <= s.y + s.height + RADIUS;
        if (inBox) {
          deleteAnnotation(pageNumber, ann.id);
          return;
        }
      }
    }
  }, [pageNumber, strokeWidth, deleteAnnotation]);

  // ── Pointer down ──────────────────────────────────────────────────────
  const handleStageMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (isSelectTool) {
        if (e.target === e.target.getStage()) clearSelection();
        return;
      }
      if (isEraserTool) {
        isDrawing.current = true;
        eraseAtPointer();
        return;
      }
      if (!canDraw) return;

      const stage = stageRef.current;
      const pos = stage?.getPointerPosition();
      if (!pos) return;
      isDrawing.current = true;
      startPoint.current = pos;

      if (isStrokeTool) {
        pointsRef.current = [pos.x, pos.y];
        setHasLive(true);
        // points() and batchDraw() happen in a rAF after the layer mounts
        requestAnimationFrame(() => {
          liveStrokeRef.current?.points(pointsRef.current);
          liveStrokeRef.current?.getLayer()?.batchDraw();
        });
      } else if (isBoxShapeTool) {
        liveShapeData.current = { x: pos.x, y: pos.y, width: 0, height: 0 };
        setHasLive(true);
      } else if (isLineShapeTool) {
        liveLineData.current = [pos.x, pos.y, pos.x, pos.y];
        setHasLive(true);
      }
    },
    [
      isSelectTool, isEraserTool, canDraw,
      isStrokeTool, isBoxShapeTool, isLineShapeTool,
      clearSelection, eraseAtPointer,
    ]
  );

  // ── Pointer move ──────────────────────────────────────────────────────
  const handlePointerMove = useCallback(() => {
    if (!isDrawing.current) return;
    if (isEraserTool) { eraseAtPointer(); return; }

    const stage = stageRef.current;
    const pos = stage?.getPointerPosition();
    if (!pos) return;

    if (isStrokeTool) {
      pointsRef.current.push(pos.x, pos.y);
      // Imperative update — no React state, no re-render
      const line = liveStrokeRef.current;
      if (line) {
        line.points(pointsRef.current);
        line.getLayer()?.batchDraw();
      }
    } else if (isBoxShapeTool) {
      liveShapeData.current = {
        x: Math.min(startPoint.current.x, pos.x),
        y: Math.min(startPoint.current.y, pos.y),
        width: Math.abs(pos.x - startPoint.current.x),
        height: Math.abs(pos.y - startPoint.current.y),
      };
      const shape = liveShapeRef.current;
      if (shape) {
        const data = liveShapeData.current;
        if (shape.className === 'Circle') {
          (shape as Konva.Circle).x(data.x + data.width / 2);
          (shape as Konva.Circle).y(data.y + data.height / 2);
          (shape as Konva.Circle).radius(Math.max(data.width, data.height) / 2);
        } else {
          (shape as Konva.Rect).x(data.x);
          (shape as Konva.Rect).y(data.y);
          (shape as Konva.Rect).width(data.width);
          (shape as Konva.Rect).height(data.height);
        }
        shape.getLayer()?.batchDraw();
      }
    } else if (isLineShapeTool) {
      liveLineData.current = [
        startPoint.current.x, startPoint.current.y,
        pos.x, pos.y,
      ];
      const line = liveLineRef.current;
      if (line) {
        line.points(liveLineData.current);
        line.getLayer()?.batchDraw();
      }
    }
  }, [isEraserTool, isStrokeTool, isBoxShapeTool, isLineShapeTool, eraseAtPointer]);

  // ── Pointer up ────────────────────────────────────────────────────────
  const handlePointerUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    if (isEraserTool) {
      setHasLive(false);
      return;
    }

    if (isStrokeTool && pointsRef.current.length >= 4) {
      const newStroke: StrokeAnnotation = {
        id: crypto.randomUUID(),
        pageNumber,
        type: activeTool as 'pen' | 'pencil' | 'highlighter',
        points: [...pointsRef.current],
        color,
        strokeWidth: activeTool === 'highlighter' ? strokeWidth * 4 : strokeWidth,
        opacity: activeTool === 'highlighter' ? 0.4 : opacity,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        locked: false,
        zIndex: annotations.length,
      };
      addAnnotation(pageNumber, newStroke);
    } else if (
      isBoxShapeTool &&
      liveShapeData.current &&
      (liveShapeData.current.width > 2 || liveShapeData.current.height > 2)
    ) {
      const s = liveShapeData.current;
      const newShape: ShapeAnnotation = {
        id: crypto.randomUUID(),
        pageNumber,
        type: activeTool as 'rectangle' | 'circle' | 'ellipse',
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
        color,
        strokeWidth,
        fill: isFilled ? color : undefined,
        rotation: 0,
        opacity,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        locked: false,
        zIndex: annotations.length,
      };
      addAnnotation(pageNumber, newShape);
    } else if (isLineShapeTool && liveLineData.current) {
      const ln = liveLineData.current;
      const dx = ln[2] - ln[0];
      const dy = ln[3] - ln[1];
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        const shapeType =
          activeTool === 'explainer' ? 'arrow' : (activeTool as 'line' | 'arrow');
        const newShape: ShapeAnnotation = {
          id: crypto.randomUUID(),
          pageNumber,
          type: shapeType,
          x: Math.min(ln[0], ln[2]),
          y: Math.min(ln[1], ln[3]),
          width: Math.abs(dx),
          height: Math.abs(dy),
          points: ln,
          color,
          strokeWidth,
          rotation: 0,
          opacity,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          locked: false,
          zIndex: annotations.length,
        };
        addAnnotation(pageNumber, newShape);

        if (activeTool === 'explainer' && onExplainerDrawn) {
          onExplainerDrawn({ x: ln[2], y: ln[3], arrowId: newShape.id });
        }
      }
    }

    // Clear live data
    pointsRef.current = [];
    liveShapeData.current = null;
    liveLineData.current = null;
    setHasLive(false);
  }, [
    pageNumber, activeTool, color, strokeWidth, opacity, isFilled,
    isEraserTool, isStrokeTool, isBoxShapeTool, isLineShapeTool,
    annotations.length, addAnnotation, onExplainerDrawn,
  ]);

  // ── Shape interactions ────────────────────────────────────────────────
  const handleShapeClick = useCallback(
    (id: string, e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isSelectTool) return;
      e.cancelBubble = true;
      selectAnnotation(id, e.evt.shiftKey);
    },
    [isSelectTool, selectAnnotation]
  );

  const handleDragEnd = useCallback(
    (id: string, e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      updateAnnotation(pageNumber, id, {
        x: node.x(),
        y: node.y(),
      } as Partial<Annotation>);
      pushHistory();
    },
    [pageNumber, updateAnnotation, pushHistory]
  );

  const handleTransformEnd = useCallback(
    (id: string, e: Konva.KonvaEventObject<Event>) => {
      const node = e.target as Konva.Shape;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);

      if (node.className === 'Circle') {
        const radius = Math.max(
          5,
          (node as unknown as Konva.Circle).radius() * scaleX
        );
        (node as unknown as Konva.Circle).radius(radius);
        updateAnnotation(pageNumber, id, {
          x: node.x() - radius,
          y: node.y() - radius,
          width: radius * 2,
          height: radius * 2,
          rotation: node.rotation(),
        } as Partial<Annotation>);
      } else {
        updateAnnotation(pageNumber, id, {
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * scaleX),
          height: Math.max(5, node.height() * scaleY),
          rotation: node.rotation(),
        } as Partial<Annotation>);
      }
      pushHistory();
    },
    [pageNumber, updateAnnotation, pushHistory]
  );

  const registerRef =
    (id: string) => (node: Konva.Node | null) => {
      if (node) shapeRefs.current[id] = node;
      else delete shapeRefs.current[id];
    };

  // ── Render committed annotations ──────────────────────────────────────
  const renderAnnotation = (ann: Annotation) => {
    const isSelected = selectedIds.includes(ann.id);
    const draggable = isSelectTool && !ann.locked;

    if (STROKE_TOOLS.includes(ann.type) && 'points' in ann) {
      const stroke = ann as StrokeAnnotation;
      return (
        <Line
          key={stroke.id}
          id={stroke.id}
          ref={registerRef(stroke.id)}
          points={stroke.points}
          stroke={isSelected ? '#C8732A' : stroke.color}
          strokeWidth={stroke.strokeWidth}
          opacity={stroke.opacity}
          tension={0.4}
          lineCap="round"
          lineJoin="round"
          draggable={draggable}
          onClick={(e) => handleShapeClick(stroke.id, e)}
          onTap={(e) =>
            handleShapeClick(
              stroke.id,
              e as unknown as Konva.KonvaEventObject<MouseEvent>
            )
          }
          onDragEnd={(e) => handleDragEnd(stroke.id, e)}
          globalCompositeOperation={
            stroke.type === 'highlighter' ? 'multiply' : 'source-over'
          }
        />
      );
    }

    if (
      'x' in ann &&
      'width' in ann &&
      ['rectangle', 'circle', 'ellipse', 'line', 'arrow'].includes(ann.type)
    ) {
      const shape = ann as ShapeAnnotation;
      const commonProps = {
        id: shape.id,
        ref: registerRef(shape.id),
        draggable,
        onClick: (e: Konva.KonvaEventObject<MouseEvent>) =>
          handleShapeClick(shape.id, e),
        onTap: (e: Konva.KonvaEventObject<TouchEvent>) =>
          handleShapeClick(
            shape.id,
            e as unknown as Konva.KonvaEventObject<MouseEvent>
          ),
        onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) =>
          handleDragEnd(shape.id, e),
        onTransformEnd: (e: Konva.KonvaEventObject<Event>) =>
          handleTransformEnd(shape.id, e),
      };

      if (shape.type === 'rectangle') {
        return (
          <Rect
            key={shape.id}
            {...commonProps}
            x={shape.x} y={shape.y}
            width={shape.width} height={shape.height}
            rotation={shape.rotation}
            stroke={isSelected ? '#C8732A' : shape.color}
            strokeWidth={shape.strokeWidth}
            fill={shape.fill}
            opacity={shape.opacity}
          />
        );
      }
      if (shape.type === 'circle' || shape.type === 'ellipse') {
        return (
          <Circle
            key={shape.id}
            {...commonProps}
            x={shape.x + shape.width / 2}
            y={shape.y + shape.height / 2}
            radius={Math.max(shape.width, shape.height) / 2}
            rotation={shape.rotation}
            stroke={isSelected ? '#C8732A' : shape.color}
            strokeWidth={shape.strokeWidth}
            fill={shape.fill}
            opacity={shape.opacity}
          />
        );
      }
      if (shape.type === 'line' && shape.points) {
        return (
          <Line
            key={shape.id}
            {...commonProps}
            points={shape.points}
            stroke={isSelected ? '#C8732A' : shape.color}
            strokeWidth={shape.strokeWidth}
            opacity={shape.opacity}
            lineCap="round"
          />
        );
      }
      if (shape.type === 'arrow' && shape.points) {
        return (
          <Arrow
            key={shape.id}
            {...commonProps}
            points={shape.points}
            stroke={isSelected ? '#C8732A' : shape.color}
            fill={isSelected ? '#C8732A' : shape.color}
            strokeWidth={shape.strokeWidth}
            opacity={shape.opacity}
          />
        );
      }
    }
    return null;
  };

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handleStageMouseDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        cursor: isHandTool ? 'grab' : getToolCursor(activeTool),
        touchAction: canDraw || isSelectTool ? 'none' : 'pan-x pan-y',
        pointerEvents: isHandTool ? 'none' : 'auto',
      }}
    >
      {/* Committed annotations */}
      <Layer>
        {annotations.map(renderAnnotation)}

        {isSelectTool && (
          <Transformer
            ref={transformerRef}
            rotateEnabled
            boundBoxFunc={(oldBox, newBox) =>
              newBox.width < 5 || newBox.height < 5 ? oldBox : newBox
            }
          />
        )}
      </Layer>

      {/* Live layer — only redraws during an active stroke */}
      <Layer listening={false}>
        {isStrokeTool && (
          <Line
            ref={liveStrokeRef}
            points={[]}
            stroke={color}
            strokeWidth={
              activeTool === 'highlighter' ? strokeWidth * 4 : strokeWidth
            }
            opacity={activeTool === 'highlighter' ? 0.4 : opacity}
            tension={0.4}
            lineCap="round"
            lineJoin="round"
            visible={hasLive}
          />
        )}
        {isBoxShapeTool && hasLive && (
          <LiveBoxShape
            ref={liveShapeRef}
            tool={activeTool}
            color={color}
            strokeWidth={strokeWidth}
          />
        )}
        {isLineShapeTool && hasLive && (
          <LiveLineShape
            ref={liveLineRef}
            tool={activeTool}
            color={color}
            strokeWidth={strokeWidth}
          />
        )}
      </Layer>
    </Stage>
  );
}

// Small wrappers so we can attach refs to the correct Konva node types.
const LiveBoxShape = ({
  ref,
  tool,
  color,
  strokeWidth,
}: {
  ref: React.Ref<Konva.Rect | Konva.Circle>;
  tool: string;
  color: string;
  strokeWidth: number;
}) => {
  if (tool === 'rectangle') {
    return (
      <Rect
        ref={ref as React.Ref<Konva.Rect>}
        x={0} y={0} width={0} height={0}
        stroke={color} strokeWidth={strokeWidth} dash={[6, 4]}
      />
    );
  }
  return (
    <Circle
      ref={ref as React.Ref<Konva.Circle>}
      x={0} y={0} radius={0}
      stroke={color} strokeWidth={strokeWidth} dash={[6, 4]}
    />
  );
};
LiveBoxShape.displayName = 'LiveBoxShape';

const LiveLineShape = ({
  ref,
  tool,
  color,
  strokeWidth,
}: {
  ref: React.Ref<Konva.Line | Konva.Arrow>;
  tool: string;
  color: string;
  strokeWidth: number;
}) => {
  if (tool === 'arrow' || tool === 'explainer') {
    return (
      <Arrow
        ref={ref as React.Ref<Konva.Arrow>}
        points={[]}
        stroke={color} fill={color}
        strokeWidth={strokeWidth} dash={[6, 4]}
      />
    );
  }
  return (
    <Line
      ref={ref as React.Ref<Konva.Line>}
      points={[]}
      stroke={color} strokeWidth={strokeWidth}
      dash={[6, 4]} lineCap="round"
    />
  );
};
LiveLineShape.displayName = 'LiveLineShape';