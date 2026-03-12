/**
 * Strip markdown formatting from text to get plain text
 * Useful for generating summaries from markdown content
 */
export function stripMarkdown(markdown: string): string {
  if (!markdown) return '';

  let text = markdown;

  // Remove code blocks first (to avoid processing their content)
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`[^`]+`/g, '');

  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // Remove headers (# ## ###)
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove bold and italic
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');

  // Remove strikethrough
  text = text.replace(/~~(.*?)~~/g, '$1');

  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove images
  text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');

  // Remove blockquotes
  text = text.replace(/^\s*>\s+/gm, '');

  // Remove horizontal rules
  text = text.replace(/^(-{3,}|_{3,}|\*{3,})$/gm, '');

  // Remove list markers
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');

  // Remove task list markers
  text = text.replace(/^\s*-\s+\[[ x]\]\s+/gm, '');

  // Remove tables (simple approach - remove pipe characters and clean up)
  text = text.replace(/\|/g, ' ');
  text = text.replace(/^[-:\s|]+$/gm, '');

  // Clean up multiple spaces and newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]{2,}/g, ' ');

  // Trim each line
  text = text.split('\n').map(line => line.trim()).join('\n');

  // Final trim
  text = text.trim();

  return text;
}
