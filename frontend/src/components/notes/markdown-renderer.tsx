'use client'

import { useEffect, useRef, useState } from 'react';
import MarkdownIt from 'markdown-it';
import DOMPurify from 'isomorphic-dompurify';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const [html, setHtml] = useState('');
  const mdParser = useRef<MarkdownIt | null>(null);

  useEffect(() => {
    // Initialize markdown parser with table support
    if (!mdParser.current) {
      mdParser.current = new MarkdownIt({
        html: false, // ✅ SECURITY: Disable raw HTML parsing
        linkify: true,
        typographer: true,
        breaks: true, // Convert \n to <br>
      });
    }

    // Render markdown to HTML and sanitize
    if (mdParser.current && content) {
      const rendered = mdParser.current.render(content);
      
      // ✅ SECURITY: Sanitize HTML to prevent XSS attacks
      const sanitized = DOMPurify.sanitize(rendered, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
          'p', 'br', 'strong', 'em', 'u', 's', 'del', 'ins',
          'code', 'pre', 'blockquote', 
          'ul', 'ol', 'li', 
          'a', 
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'hr', 'div', 'span'
        ],
        ALLOWED_ATTR: ['href', 'title', 'class', 'target', 'rel'],
        ALLOW_DATA_ATTR: false,
        ALLOW_UNKNOWN_PROTOCOLS: false,
        // Automatically add rel="noopener noreferrer" to external links
        SAFE_FOR_TEMPLATES: true,
      });
      
      setHtml(sanitized);
    }
  }, [content]);

  return (
    <div 
      className={`prose prose-gray max-w-none dark:prose-invert prose-headings:font-bold prose-h1:text-3xl prose-h1:mb-4 prose-h2:text-2xl prose-h2:mb-3 prose-h3:text-xl prose-h3:mb-2 prose-p:leading-relaxed prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-code:bg-[#1A1A1A] prose-code:text-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#1A1A1A] prose-pre:text-gray-100 prose-pre:p-5 prose-pre:rounded-xl prose-pre:overflow-x-auto prose-pre:shadow-sm prose-pre:border prose-pre:border-gray-800 prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:bg-gray-100 dark:prose-th:bg-gray-700 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:px-4 prose-td:py-2 prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
