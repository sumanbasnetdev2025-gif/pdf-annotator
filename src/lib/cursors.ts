import type { ToolType } from '@/types';

export function getToolCursor(tool: ToolType): string {
  switch (tool) {
    case 'pen':
    case 'pencil':
    case 'marker':
    case 'highlighter':
    case 'rectangle':
    case 'circle':
    case 'ellipse':
    case 'line':
    case 'arrow':
    case 'explainer':
    case 'polygon':
      return 'crosshair';
    case 'eraser':
      return 'cell';
    case 'text':
    case 'sticky-note':
      return 'text';
    case 'laser':
      return 'none';
    case 'hand':
      return 'grab';
    case 'select':
      return 'default';
    default:
      return 'crosshair';
  }
}