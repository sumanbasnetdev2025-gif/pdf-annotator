export type ToolType =
  | 'select'
  | 'pen'
  | 'pencil'
  | 'highlighter'
  | 'marker'
  | 'laser'
  | 'arrow'
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'polygon'
  | 'text'
  | 'sticky-note'
  | 'stamp'
  | 'image'
  | 'signature'
  | 'eraser'
  | 'explainer';

export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  pageNumber: number;
  type: ToolType;
  createdAt: number;
  updatedAt: number;
  locked: boolean;
  opacity: number;
  zIndex: number;
}

export interface StrokeAnnotation extends BaseAnnotation {
  type: 'pen' | 'pencil' | 'highlighter' | 'marker' | 'eraser';
  points: number[];
  color: string;
  strokeWidth: number;
  dash?: number[];
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'rectangle' | 'circle' | 'ellipse' | 'line' | 'arrow' | 'polygon';
  x: number;
  y: number;
  width: number;
  height: number;
  points?: number[];
  color: string;
  strokeWidth: number;
  fill?: string;
  dash?: number[];
  rotation: number;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text' | 'sticky-note';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right';
  rotation: number;
}

export interface ImageAnnotation extends BaseAnnotation {
  type: 'image' | 'stamp' | 'signature';
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  rotation: number;
}

export type Annotation =
  | StrokeAnnotation
  | ShapeAnnotation
  | TextAnnotation
  | ImageAnnotation;

export interface PdfDocument {
  id: string;
  fileName: string;
  totalPages: number;
  fileData: ArrayBuffer;
  lastOpenedAt: number;
  createdAt: number;
}