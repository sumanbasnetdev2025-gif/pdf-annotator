import { useEffect, useRef } from 'react';
import { useViewerStore } from '@/store/viewer-store';

export function usePinchZoom(containerRef: React.RefObject<HTMLElement | null>) {
  const zoomLevel = useViewerStore((s) => s.zoomLevel);
  const setZoomLevel = useViewerStore((s) => s.setZoomLevel);
  const lastDist = useRef<number | null>(null);
  const lastZoom = useRef(zoomLevel);

  useEffect(() => {
    lastZoom.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function getDistance(touches: TouchList): number {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.hypot(dx, dy);
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        lastDist.current = getDistance(e.touches);
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2) {
        e.preventDefault(); // stops browser zoom
        if (lastDist.current === null) {
          lastDist.current = getDistance(e.touches);
          return;
        }
        const dist = getDistance(e.touches);
        const delta = dist / lastDist.current;
        lastDist.current = dist;
        const newZoom = Math.min(4, Math.max(0.25, lastZoom.current * delta));
        lastZoom.current = newZoom;
        setZoomLevel(newZoom);
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) {
        lastDist.current = null;
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [containerRef, setZoomLevel]);
}