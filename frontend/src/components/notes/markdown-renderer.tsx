'use client'

import { useEffect, useRef, useState } from 'react';
import MarkdownIt from 'markdown-it';

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
        html: true,
        linkify: true,
        typographer: true,
        breaks: true, // Convert \n to <br>
      });
    }

    // Render markdown to HTML
    if (mdParser.current && content) {
      const rendered = mdParser.current.render(content);
      setHtml(rendered);
    }
  }, [content]);

  return (
    <div 
      className={`prose prose-gray max-w-none dark:prose-invert prose-headings:font-bold prose-h1:text-3xl prose-h1:mb-4 prose-h2:text-2xl prose-h2:mb-3 prose-h3:text-xl prose-h3:mb-2 prose-p:leading-relaxed prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-code:bg-[#1A1A1A] prose-code:text-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none prose-pre:bg-[#1A1A1A] prose-pre:text-gray-100 prose-pre:p-5 prose-pre:rounded-xl prose-pre:overflow-x-auto prose-pre:shadow-sm prose-pre:border prose-pre:border-gray-800 prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:bg-gray-100 dark:prose-th:bg-gray-700 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:px-4 prose-td:py-2 prose-ul:list-disc prose-ol:list-decimal prose-li:ml-4 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
