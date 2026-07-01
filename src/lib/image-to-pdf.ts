import { PDFDocument } from 'pdf-lib';

type ImageType = 'jpg' | 'png';

function getImageType(file: File): ImageType | null {
  const mime = file.type.toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  return null;
}

export async function imageToPdf(file: File): Promise<ArrayBuffer> {
  const imageType = getImageType(file);
  if (!imageType) throw new Error('Unsupported image type');

  const imageData = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.create();

  const image =
    imageType === 'jpg'
      ? await pdfDoc.embedJpg(imageData)
      : await pdfDoc.embedPng(imageData);

  const { width, height } = image.scale(1);

  // Fit image to A4-ish page — max 800px wide
  const maxWidth = 800;
  const scale = width > maxWidth ? maxWidth / width : 1;
  const pageWidth = width * scale;
  const pageHeight = height * scale;

  const page = pdfDoc.addPage([pageWidth, pageHeight]);
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer as ArrayBuffer;
}