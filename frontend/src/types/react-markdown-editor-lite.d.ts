declare module 'react-markdown-editor-lite' {
  import { Component } from 'react';

  export interface EditorConfig {
    view?: {
      menu?: boolean;
      md?: boolean;
      html?: boolean;
    };
    table?: {
      maxRow?: number;
      maxCol?: number;
    };
    imageUrl?: string;
    imageAccept?: string;
    linkUrl?: string;
    loggerMaxSize?: number;
    loggerInterval?: number;
    syncScrollMode?: string[];
    allowPasteImage?: boolean;
    onImageUpload?: (file: File) => Promise<string>;
    onCustomImageUpload?: () => Promise<string>;
  }

  export interface EditorProps<T = any> {
    value?: string;
    style?: React.CSSProperties;
    renderHTML: (text: string) => string;
    onChange?: (data: { text: string; html: string }, event?: any) => void;
    onImageUpload?: (file: File, callback: (url: string) => void) => void;
    onCustomImageUpload?: (event: any) => Promise<{ url: string; text?: string }>;
    placeholder?: string;
    readOnly?: boolean;
    view?: {
      menu?: boolean;
      md?: boolean;
      html?: boolean;
    };
    canView?: {
      menu?: boolean;
      md?: boolean;
      html?: boolean;
      both?: boolean;
      fullScreen?: boolean;
      hideMenu?: boolean;
    };
    htmlClass?: string;
    markdownClass?: string;
    imageUrl?: string;
    imageAccept?: string;
    linkUrl?: string;
    table?: {
      maxRow?: number;
      maxCol?: number;
    };
    syncScrollMode?: string[];
    allowPasteImage?: boolean;
    shortcuts?: boolean;
    config?: EditorConfig;
    plugins?: string[];
    name?: string;
  }

  export default class MdEditor extends Component<EditorProps> {}
}
