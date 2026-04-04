import { useCallback, useRef } from 'react';
import { prepare, layout, prepareWithSegments, layoutWithLines } from '@chenglou/pretext';
import type { PreparedText, PreparedTextWithSegments, LayoutLinesResult, LayoutResult } from '@chenglou/pretext';

/**
 * Hook that wraps Pretext for DOM-free text measurement.
 * Caches prepared handles by `text+font` key to avoid redundant prepare() calls.
 */
export function usePretext() {
  const cache = useRef<Map<string, PreparedText>>(new Map());
  const segCache = useRef<Map<string, PreparedTextWithSegments>>(new Map());

  /** Measure text height at a given container width. Returns { height, lineCount }. */
  const measureText = useCallback((
    text: string,
    font: string,
    maxWidth: number,
    lineHeight: number,
  ) => {
    const key = `${text}||${font}`;
    if (!cache.current.has(key)) {
      cache.current.set(key, prepare(text, font));
    }
    return layout(cache.current.get(key)!, maxWidth, lineHeight);
  }, []);

  /** Get individual line strings for manual canvas rendering. */
  const getLines = useCallback((
    text: string,
    font: string,
    maxWidth: number,
    lineHeight: number,
  ) => {
    const key = `${text}||${font}`;
    if (!segCache.current.has(key)) {
      segCache.current.set(key, prepareWithSegments(text, font));
    }
    return layoutWithLines(segCache.current.get(key)!, maxWidth, lineHeight);
  }, []);

  return { measureText, getLines };
}
