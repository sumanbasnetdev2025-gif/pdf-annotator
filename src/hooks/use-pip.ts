import { useState, useEffect } from 'react';

export function usePip() {
  const [showPip, setShowPip] = useState(false);
  const [wasHidden, setWasHidden] = useState(false);

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        setWasHidden(true);
      } else if (wasHidden) {
        // User came back — hide PiP
        setShowPip(false);
        setWasHidden(false);
      }
    }

    function handleBlur() {
      // Window lost focus (user switched to Zoom/Meet/etc)
      setTimeout(() => {
        if (document.hidden || !document.hasFocus()) {
          setShowPip(true);
        }
      }, 1500); // small delay so it doesn't flash on alt-tab
    }

    function handleFocus() {
      setShowPip(false);
      setWasHidden(false);
    }

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [wasHidden]);

  return { showPip, setShowPip };
}