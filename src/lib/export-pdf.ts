import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Annotation, StrokeAnnotation, ShapeAnnotation, TextAnnotation } from '@/types';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const val = parseInt(clean, 16);
  return {
    r: ((val >> 16) & 255) / 255,
    g: ((val >> 8) & 255) / 255,
    b: (val & 255) / 255,
  };
}

export async function exportAnnotatedPdf(
  originalFileData: ArrayBuffer,
  annotationsByPage: Record<number, Annotation[]>,
  pageHeightsByPage: Record<number, number>
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(originalFileData);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const [pageNumStr, annotations] of Object.entries(annotationsByPage)) {
    const pageNum = Number(pageNumStr);
    const page = pages[pageNum - 1];
    if (!page) continue;

    const { width, height } = page.getSize();
    const renderedHeight = pageHeightsByPage[pageNum] || height;
    const scale = height / renderedHeight;

    for (const ann of annotations) {
      const opac = ann.opacity ?? 1;

      if (ann.type === 'pen' || ann.type === 'pencil') {
        const stroke = ann as StrokeAnnotation;
        const { r, g, b } = hexToRgb(stroke.color);
        const pts = stroke.points;
        for (let i = 0; i < pts.length - 2; i += 2) {
          const x1 = pts[i] * scale;
          const y1 = height - pts[i + 1] * scale;
          const x2 = pts[i + 2] * scale;
          const y2 = height - pts[i + 3] * scale;
          page.drawLine({
            start: { x: x1, y: y1 },
            end: { x: x2, y: y2 },
            thickness: stroke.strokeWidth * scale,
            color: rgb(r, g, b),
            opacity: opac,
          });
        }
      }

      if (ann.type === 'highlighter') {
        const stroke = ann as StrokeAnnotation;
        const { r, g, b } = hexToRgb(stroke.color);
        const pts = stroke.points;
        for (let i = 0; i < pts.length - 2; i += 2) {
          page.drawLine({
            start: { x: pts[i] * scale, y: height - pts[i + 1] * scale },
            end: { x: pts[i + 2] * scale, y: height - pts[i + 3] * scale },
            thickness: stroke.strokeWidth * scale,
            color: rgb(r, g, b),
            opacity: 0.4,
          });
        }
      }

      if (ann.type === 'rectangle') {
        const shape = ann as ShapeAnnotation;
        const { r, g, b } = hexToRgb(shape.color);
        const fc = shape.fill ? hexToRgb(shape.fill) : null;
        page.drawRectangle({
          x: shape.x * scale,
          y: height - (shape.y + shape.height) * scale,
          width: shape.width * scale,
          height: shape.height * scale,
          borderColor: rgb(r, g, b),
          borderWidth: shape.strokeWidth * scale,
          color: fc ? rgb(fc.r, fc.g, fc.b) : undefined,
          opacity: opac,
        });
      }

      if (ann.type === 'circle' || ann.type === 'ellipse') {
        const shape = ann as ShapeAnnotation;
        const { r, g, b } = hexToRgb(shape.color);
        const fc = shape.fill ? hexToRgb(shape.fill) : null;
        const cx = (shape.x + shape.width / 2) * scale;
        const cy = height - (shape.y + shape.height / 2) * scale;
        const radius = (Math.max(shape.width, shape.height) / 2) * scale;
        page.drawCircle({
          x: cx,
          y: cy,
          size: radius,
          borderColor: rgb(r, g, b),
          borderWidth: shape.strokeWidth * scale,
          color: fc ? rgb(fc.r, fc.g, fc.b) : undefined,
          opacity: opac,
        });
      }

      if (ann.type === 'text' || ann.type === 'sticky-note') {
        const ta = ann as TextAnnotation;
        if (!ta.text.trim()) continue;
        const { r, g, b } = hexToRgb(ta.color);
        const lines = ta.text.split('\n');
        let yOffset = 0;
        for (const line of lines) {
          if (!line.trim()) { yOffset += ta.fontSize * scale; continue; }
          page.drawText(line, {
            x: ta.x * scale,
            y: height - (ta.y + ta.fontSize + yOffset) * scale,
            size: ta.fontSize * scale,
            font,
            color: rgb(r, g, b),
            opacity: opac,
          });
          yOffset += ta.fontSize * 1.4 * scale;
        }
      }

      if (ann.type === 'line' && 'points' in ann) {
        const shape = ann as ShapeAnnotation;
        if (!shape.points || shape.points.length < 4) continue;
        const { r, g, b } = hexToRgb(shape.color);
        page.drawLine({
          start: { x: shape.points[0] * scale, y: height - shape.points[1] * scale },
          end: { x: shape.points[2] * scale, y: height - shape.points[3] * scale },
          thickness: shape.strokeWidth * scale,
          color: rgb(r, g, b),
          opacity: opac,
        });
      }
    }
  }

  return pdfDoc.save();
}