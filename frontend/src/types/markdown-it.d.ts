declare module 'markdown-it' {
  interface MarkdownItOptions {
    html?: boolean;
    linkify?: boolean;
    typographer?: boolean;
    breaks?: boolean;
    langPrefix?: string;
    quotes?: string;
    highlight?: (str: string, lang: string) => string;
  }

  interface MarkdownIt {
    render(md: string, env?: any): string;
    renderInline(md: string, env?: any): string;
    parse(src: string, env?: any): any[];
    parseInline(src: string, env?: any): any[];
    use(plugin: any, ...params: any[]): MarkdownIt;
    utils: any;
    helpers: any;
    options: MarkdownItOptions;
    configure(presets: string): MarkdownIt;
    set(options: MarkdownItOptions): MarkdownIt;
    enable(list: string | string[], ignoreInvalid?: boolean): MarkdownIt;
    disable(list: string | string[], ignoreInvalid?: boolean): MarkdownIt;
  }

  interface MarkdownItConstructor {
    new (options?: MarkdownItOptions): MarkdownIt;
    (options?: MarkdownItOptions): MarkdownIt;
  }

  const MarkdownIt: MarkdownItConstructor;
  export = MarkdownIt;
}
