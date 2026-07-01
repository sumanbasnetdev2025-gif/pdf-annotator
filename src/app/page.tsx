'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Wifi, Lock, Zap, PenSquare, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { saveDocument, getAllDocuments, deleteDocument } from '@/lib/db';
import { ThemeToggle } from '@/components/theme-toggle';

interface RecentDoc {
  id: string;
  fileName: string;
  lastOpenedAt: number;
}

export default function HomePage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);

  useEffect(() => {
    async function loadRecent() {
      const docs = await getAllDocuments();
      const sorted = docs
        .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
        .slice(0, 6);
      setRecentDocs(sorted);
    }
    loadRecent();
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file.');
        return;
      }
      const fileData = await file.arrayBuffer();
      const id = crypto.randomUUID();
      await saveDocument({ id, fileName: file.name, totalPages: 0, fileData });
      router.push(`/viewer/${id}`);
    },
    [router]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteDocument(id);
    setRecentDocs((prev) => prev.filter((d) => d.id !== id));
  };

  return (
<main className="min-h-dvh bg-[#FAF9F6] text-[#1C1B1F] dark:bg-[#1C1B1F] dark:text-[#F5F3EE]">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20">
        {/* Header row */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#C8732A]" />
            <span className="font-mono text-xs uppercase tracking-widest text-[#6B6862]">
              pdf annotator
            </span>
          </div>
          <ThemeToggle />
        </div>

        {/* Hero */}
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Write on any PDF
          <br />
          <span className="text-[#C8732A]">like it&apos;s paper.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-[#6B6862] sm:text-lg">
          Draw, highlight, and annotate instantly in your browser. Nothing
          uploads anywhere — your files never leave your device.
        </p>

        {/* Badges */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Badge variant="outline" className="gap-1.5 border-[#D8D4CB] text-[#6B6862] dark:border-[#3A3833]">
            <Wifi className="h-3 w-3" /> Works offline
          </Badge>
          <Badge variant="outline" className="gap-1.5 border-[#D8D4CB] text-[#6B6862] dark:border-[#3A3833]">
            <Lock className="h-3 w-3" /> No uploads, ever
          </Badge>
          <Badge variant="outline" className="gap-1.5 border-[#D8D4CB] text-[#6B6862] dark:border-[#3A3833]">
            <Zap className="h-3 w-3" /> No account needed
          </Badge>
        </div>

        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`mt-10 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors sm:py-20 ${
            isDragging
              ? 'border-[#C8732A] bg-[#FBF0E4]'
              : 'border-[#D8D4CB] bg-white dark:border-[#3A3833] dark:bg-[#262420]'
          }`}
        >
          <Upload className="mb-4 h-10 w-10 text-[#C8732A]" />
          <p className="text-base font-medium sm:text-lg">Drop a PDF here</p>
          <p className="mt-1 text-sm text-[#6B6862]">or</p>
          <div className="mt-4">
            <input
              id="pdf-upload"
              type="file"
              accept="application/pdf"
              onChange={onFileInput}
              className="hidden"
            />
            <Button
              className="cursor-pointer bg-[#1C1B1F] hover:bg-[#3A3833] dark:bg-[#F5F3EE] dark:text-[#1C1B1F]"
              onClick={() => document.getElementById('pdf-upload')?.click()}
            >
              Choose a file
            </Button>
          </div>
          <p className="mt-6 font-mono text-xs text-[#A8A49B]">
            supports files up to 500mb · 1000+ pages
          </p>
        </div>

        {/* Whiteboard shortcut */}
        <div className="mt-6 flex items-center justify-center gap-3 text-sm text-[#6B6862]">
          <span>or</span>
          <button
            onClick={() => router.push('/whiteboard')}
            className="flex items-center gap-1.5 font-medium text-[#1C1B1F] underline underline-offset-4 hover:text-[#C8732A] dark:text-[#F5F3EE]"
          >
            <PenSquare className="h-4 w-4" />
            Start a blank whiteboard
          </button>
        </div>

        {/* Recent files */}
        {recentDocs.length > 0 && (
          <div className="mt-14">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#A8A49B]" />
              <span className="font-mono text-xs uppercase tracking-widest text-[#6B6862]">
                recent files
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => router.push(`/viewer/${doc.id}`)}
                  className="group flex cursor-pointer items-center justify-between rounded-xl border border-[#D8D4CB] bg-white px-4 py-3 transition-colors hover:border-[#C8732A] dark:border-[#3A3833] dark:bg-[#262420]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#1C1B1F] dark:text-[#F5F3EE]">
                      {doc.fileName}
                    </p>
                    <p className="font-mono text-[10px] text-[#A8A49B]">
                      {new Date(doc.lastOpenedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(doc.id, e)}
                    aria-label="Remove from recent"
                    className="ml-2 hidden text-[#D62828] group-hover:block"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}