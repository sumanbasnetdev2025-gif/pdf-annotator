import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PDF Annotator',
  description: 'Annotate PDFs offline in your browser',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#C8732A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}