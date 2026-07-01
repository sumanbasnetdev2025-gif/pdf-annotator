// SVG-based custom cursors for drawing tools

const encodeSvg = (svg: string) =>
  `data:image/svg+xml;base64,${btoa(svg)}`;

const PENCIL = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <line x1="18" y1="2" x2="22" y2="6" stroke="#1C1B1F" stroke-width="2" stroke-linecap="round"/>
  <path d="M2 22 L3.5 16.5 L16 4 L20 8 L7.5 20.5 Z" fill="white" stroke="#1C1B1F" stroke-width="1.5"/>
  <path d="M3.5 16.5 L7.5 20.5" stroke="#1C1B1F" stroke-width="1.5"/>
</svg>`);

const HIGHLIGHTER = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <rect x="6" y="2" width="12" height="14" rx="2" fill="#FFE066" stroke="#1C1B1F" stroke-width="1.5"/>
  <rect x="9" y="16" width="6" height="4" rx="1" fill="#1C1B1F"/>
  <line x1="12" y1="20" x2="12" y2="23" stroke="#1C1B1F" stroke-width="1.5" stroke-linecap="round"/>
</svg>`);

const ERASER = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <rect x="2" y="10" width="20" height="10" rx="2" fill="white" stroke="#1C1B1F" stroke-width="1.5"/>
  <path d="M2 14 L10 6 L18 14" fill="#FFAAAA" stroke="#1C1B1F" stroke-width="1.5"/>
  <line x1="2" y1="20" x2="22" y2="20" stroke="#1C1B1F" stroke-width="1.5"/>
</svg>`);

const MARKER = encodeSvg(`
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <rect x="8" y="2" width="8" height="16" rx="2" fill="#555" stroke="#1C1B1F" stroke-width="1.5"/>
  <path d="M10 18 L12 23 L14 18 Z" fill="#1C1B1F"/>
</svg>`);

const CROSSHAIR = 'crosshair';
const DEFAULT = 'default';
const TEXT_CURSOR = 'text';

export function getToolCursor(tool: string): string {
  switch (tool) {
    case 'pen':
    case 'pencil':
      return `url("${PENCIL}") 0 24, ${CROSSHAIR}`;
    case 'highlighter':
      return `url("${HIGHLIGHTER}") 4 20, ${CROSSHAIR}`;
    case 'eraser':
      return `url("${ERASER}") 4 20, cell`;
    case 'marker':
      return `url("${MARKER}") 4 20, ${CROSSHAIR}`;
    case 'rectangle':
    case 'circle':
    case 'ellipse':
    case 'line':
    case 'arrow':
    case 'explainer':
      return CROSSHAIR;
    case 'text':
    case 'sticky-note':
      return TEXT_CURSOR;
    case 'hand':
      return 'grab';
    case 'select':
      return DEFAULT;
    default:
      return CROSSHAIR;
  }
}