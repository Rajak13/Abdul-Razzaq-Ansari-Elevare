/**
 * Jest mock for @chenglou/pretext (ESM-only package).
 * Simulates the prepare/layout API with simple arithmetic so tests run in jsdom.
 */

export type PreparedText = { _text: string; _font: string };
export type PreparedTextWithSegments = PreparedText & { segments: string[] };
export type LayoutResult = { lineCount: number; height: number };
export type LayoutLine = { text: string; width: number; start: any; end: any };
export type LayoutLinesResult = LayoutResult & { lines: LayoutLine[] };

// Rough char-width estimate: fontSize * 0.6 per character
function estimateCharWidth(font: string): number {
  const match = font.match(/(\d+)px/);
  return match ? parseInt(match[1], 10) * 0.6 : 9.6;
}

export function prepare(text: string, font: string): PreparedText {
  return { _text: text, _font: font };
}

export function prepareWithSegments(text: string, font: string): PreparedTextWithSegments {
  return { _text: text, _font: font, segments: text.split(' ') };
}

export function layout(prepared: PreparedText, maxWidth: number, lineHeight: number): LayoutResult {
  const charWidth = estimateCharWidth(prepared._font);
  const charsPerLine = Math.max(1, Math.floor(maxWidth / charWidth));
  const lineCount = Math.ceil(prepared._text.length / charsPerLine);
  return { lineCount, height: lineCount * lineHeight };
}

export function layoutWithLines(
  prepared: PreparedTextWithSegments,
  maxWidth: number,
  lineHeight: number,
): LayoutLinesResult {
  const charWidth = estimateCharWidth(prepared._font);
  const lines: LayoutLine[] = [];
  const words = prepared._text.split(' ');
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length * charWidth > maxWidth && current) {
      lines.push({ text: current, width: current.length * charWidth, start: null, end: null });
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) {
    lines.push({ text: current, width: current.length * charWidth, start: null, end: null });
  }

  return {
    lineCount: lines.length,
    height: lines.length * lineHeight,
    lines,
  };
}

export function clearCache(): void {}
export function setLocale(_locale?: string): void {}
