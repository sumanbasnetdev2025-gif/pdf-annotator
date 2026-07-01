import { useEffect, useRef } from 'react';
import { useAnnotationStore } from '@/store/annotation-store';
import { useSettingsStore } from '@/store/settings-store';
import { saveAnnotations } from '@/lib/db';

export function useAutosave(documentId: string | null) {
  const annotationsByPage = useAnnotationStore((s) => s.annotationsByPage);
  const autosaveEnabled = useSettingsStore((s) => s.autosaveEnabled);
  const intervalMs = useSettingsStore((s) => s.autosaveIntervalMs);
  const lastSaved = useRef<string>('');

  useEffect(() => {
    if (!documentId || !autosaveEnabled) return;

    const interval = setInterval(async () => {
      const snapshot = JSON.stringify(annotationsByPage);
      if (snapshot === lastSaved.current) return; // nothing changed
      lastSaved.current = snapshot;
      await saveAnnotations(documentId, annotationsByPage);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [documentId, annotationsByPage, autosaveEnabled, intervalMs]);
}