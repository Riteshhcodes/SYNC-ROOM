import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function loadScript(src, id) {
  if (document.getElementById(id)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    try {
      const el = document.createElement('script');
      el.id = id;
      el.src = src;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(el);
    } catch (err) {
      reject(err);
    }
  });
}

function runAfterPaint(fn) {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

function safeInit(initFn) {
  try {
    if (typeof initFn === 'function') initFn();
  } catch {
    /* animation unsupported — page still works */
  }
}

function safeCleanup(cleanupFn) {
  try {
    if (typeof cleanupFn === 'function') cleanupFn();
  } catch {
    /* ignore */
  }
}

export function useSpiderAnimation() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!document.getElementById('web')) return;
        await loadScript('/animations/spider.js', 'sync-spider-script');
        if (!cancelled) {
          runAfterPaint(() => safeInit(() => window.SyncRoomSpider?.init()));
        }
      } catch {
        /* spider optional */
      }
    })();

    return () => {
      cancelled = true;
      safeCleanup(() => window.SyncRoomSpider?.cleanup());
    };
  }, []);
}

/** Fire reveal — Home / landing only */
export function useFireReveal() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  useEffect(() => {
    if (!isHome) {
      safeCleanup(() => window.SyncRoomFire?.cleanup());
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        if (!document.getElementById('fire-overlay')) return;
        await loadScript('/animations/fire-shader.js', 'sync-fire-script');
        if (!cancelled && document.getElementById('fire-overlay')) {
          runAfterPaint(() => safeInit(() => window.SyncRoomFire?.init()));
        }
      } catch {
        /* fire optional */
      }
    })();

    return () => {
      cancelled = true;
      safeCleanup(() => window.SyncRoomFire?.cleanup());
    };
  }, [isHome]);
}

/** Neural network — Room pages only */
export function useNeuralBackground() {
  const { pathname } = useLocation();
  const isRoom = pathname.startsWith('/room/');

  useEffect(() => {
    if (!isRoom) {
      safeCleanup(() => window.SyncRoomNeural?.cleanup());
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        if (!document.getElementById('neural-bg')) return;
        await loadScript('/animations/neural.js', 'sync-neural-script');
        if (!cancelled && document.getElementById('neural-bg')) {
          runAfterPaint(() => safeInit(() => window.SyncRoomNeural?.init()));
        }
      } catch {
        /* neural optional */
      }
    })();

    return () => {
      cancelled = true;
      safeCleanup(() => window.SyncRoomNeural?.cleanup());
    };
  }, [isRoom]);
}
