'use client'

import React, { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import MarkdownIt from 'markdown-it';
import 'react-markdown-editor-lite/lib/index.css';

// Dynamically import to avoid SSR issues
const MdEditor = dynamic(() => import('react-markdown-editor-lite'), {
  ssr: false,
});

interface RichTextEditorProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing...',
  className = '',
  disabled = false,
}: RichTextEditorProps) {
  const mdParser = useRef<MarkdownIt | null>(null);

  useEffect(() => {
    // Initialize markdown parser
    mdParser.current = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });
  }, []);

  const handleEditorChange = ({ text }: { text: string }) => {
    onChange(text);
  };

  if (!mdParser.current) {
    return null;
  }

  return (
    <div className={`rich-text-editor-wrapper ${className}`}>
      <MdEditor
        value={value}
        style={{ height: '100%', minHeight: '400px' }}
        renderHTML={(text) => mdParser.current?.render(text) || ''}
        onChange={handleEditorChange}
        placeholder={placeholder}
        readOnly={disabled}
        view={{ menu: true, md: true, html: true }}
        canView={{
          menu: true,
          md: true,
          html: true,
          both: true,
          fullScreen: true,
          hideMenu: false,
        }}
        shortcuts={true}
        config={{
          view: {
            menu: true,
            md: true,
            html: true,
          },
          table: {
            maxRow: 10,
            maxCol: 10,
          },
          imageUrl: '',
          syncScrollMode: ['leftFollowRight', 'rightFollowLeft'],
        }}
      />
    </div>
  );
}
