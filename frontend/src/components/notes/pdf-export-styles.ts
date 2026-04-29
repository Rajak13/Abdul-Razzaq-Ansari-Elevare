/**
 * Enhanced PDF export styles with smart page breaks
 * Prevents awkward content splitting in tables, code blocks, and lists
 */
export function buildPdfHtml(
  title: string,
  content: string,
  summary: string | null,
  tags: string[],
  folderName: string | null,
  folderColor: string | null,
  updatedAt: Date
): string {
  const tagsHtml = tags.length
    ? tags.map(t => `<span class="tag">#${t}</span>`).join('')
    : '';
  
  const summaryHtml = summary
    ? `<div class="summary"><div class="summary-label">Summary</div><p>${summary}</p></div>`
    : '';
  
  const folderHtml = folderName
    ? `<span class="folder-badge"><span class="folder-dot" style="background:${folderColor || '#6b7280'}"></span>${folderName}</span>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title || 'Note'}</title>
  <style>
    /* ===== BASE STYLES ===== */
    *, *::before, *::after { 
      box-sizing: border-box; 
      margin: 0; 
      padding: 0; 
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.75;
      padding: 32px 20px;
    }
    
    .page {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
      overflow: hidden;
    }
    
    /* ===== HEADER SECTION ===== */
    .header {
      background: #ffffff;
      padding: 32px 40px 24px;
      border-bottom: 1px solid #e2e8f0;
      page-break-after: avoid;
    }
    
    .title-row { 
      display: flex; 
      align-items: center; 
      gap: 12px; 
      margin-bottom: 8px; 
    }
    
    .icon {
      width: 40px; 
      height: 40px;
      background: #0f172a;
      border-radius: 10px;
      display: flex; 
      align-items: center; 
      justify-content: center;
      flex-shrink: 0;
    }
    
    .icon svg { 
      width: 20px; 
      height: 20px; 
      stroke: white; 
      fill: none; 
      stroke-width: 2; 
      stroke-linecap: round; 
      stroke-linejoin: round; 
    }
    
    .header h1 {
      font-size: 1.875rem;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    
    .meta {
      font-size: 0.825rem;
      color: #64748b;
      margin-top: 6px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    .folder-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.825rem;
      color: #64748b;
    }
    
    .folder-dot {
      width: 10px; 
      height: 10px;
      border-radius: 3px;
      display: inline-block;
    }
    
    .tags { 
      display: flex; 
      flex-wrap: wrap; 
      gap: 6px; 
      margin-top: 12px; 
    }
    
    .tag {
      background: #f1f5f9;
      color: #475569;
      border-radius: 9999px;
      padding: 2px 10px;
      font-size: 0.775rem;
      font-weight: 500;
    }
    
    /* ===== BODY SECTION ===== */
    .body { 
      padding: 32px 40px; 
    }
    
    .summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #64748b;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 28px;
      page-break-inside: avoid;
    }
    
    .summary-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #94a3b8;
      margin-bottom: 6px;
    }
    
    .summary p { 
      color: #374151; 
      font-size: 0.9rem; 
      line-height: 1.6; 
    }
    
    /* ===== CONTENT STYLES WITH PAGE BREAK CONTROL ===== */
    .content h1 { 
      font-size: 1.75rem; 
      font-weight: 700; 
      margin: 1.4em 0 0.5em; 
      color: #111827;
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    
    .content h2 { 
      font-size: 1.4rem; 
      font-weight: 600; 
      margin: 1.3em 0 0.4em; 
      color: #1f2937; 
      border-bottom: 1px solid #e5e7eb; 
      padding-bottom: 5px;
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    
    .content h3 { 
      font-size: 1.15rem; 
      font-weight: 600; 
      margin: 1.1em 0 0.3em; 
      color: #374151;
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    
    .content h4, 
    .content h5, 
    .content h6 { 
      font-size: 1rem; 
      font-weight: 600; 
      margin: 1em 0 0.3em; 
      color: #4b5563;
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    
    .content p { 
      margin: 0.75em 0; 
      color: #374151; 
      line-height: 1.75;
      orphans: 3;
      widows: 3;
    }
    
    .content a { 
      color: #2563eb; 
      text-decoration: none; 
    }
    
    .content a:hover { 
      text-decoration: underline; 
    }
    
    /* Lists with smart page breaks */
    .content ul, 
    .content ol { 
      list-style-position: outside;
      padding-left: 1.5em; 
      margin: 0.75em 0;
      page-break-inside: auto;
    }
    
    .content li { 
      margin: 0.3em 0; 
      color: #374151; 
      margin-left: 1rem;
      page-break-inside: avoid;
    }
    
    .content blockquote {
      border-left: 4px solid #d1d5db;
      padding: 8px 16px;
      margin: 1em 0;
      color: #6b7280;
      background: #f9fafb;
      border-radius: 0 6px 6px 0;
      page-break-inside: avoid;
    }
    
    /* Code blocks - avoid breaking */
    .content code {
      background: #1a1a1a;
      color: #f3f4f6;
      padding: 2px 6px;
      border-radius: 5px;
      font-family: 'Fira Code', 'Cascadia Code', Consolas, monospace;
      font-size: 0.85em;
    }
    
    .content pre {
      background: #1a1a1a;
      color: #f3f4f6;
      padding: 20px 24px;
      border-radius: 12px;
      overflow-x: auto;
      margin: 1em 0;
      font-family: 'Fira Code', 'Cascadia Code', Consolas, monospace;
      font-size: 0.875rem;
      line-height: 1.6;
      border: 1px solid #1f2937;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      page-break-inside: avoid;
    }
    
    .content pre code { 
      background: none; 
      padding: 0; 
      color: inherit; 
      font-size: inherit; 
    }
    
    /* Tables - smart page breaks */
    .content table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 1em 0; 
      font-size: 0.9rem;
      page-break-inside: auto;
    }
    
    .content thead {
      display: table-header-group;
      page-break-after: avoid;
    }
    
    .content tbody {
      display: table-row-group;
    }
    
    .content tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    
    .content th {
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      padding: 10px 14px;
      text-align: left;
      font-weight: 600;
      color: #374151;
    }
    
    .content td { 
      border: 1px solid #e5e7eb; 
      padding: 9px 14px; 
      color: #4b5563; 
    }
    
    .content tr:nth-child(even) td { 
      background: #f9fafb; 
    }
    
    .content hr { 
      border: none; 
      border-top: 1px solid #e5e7eb; 
      margin: 2em 0;
      page-break-after: avoid;
    }
    
    .content img { 
      max-width: 100%; 
      border-radius: 8px; 
      margin: 1em 0;
      page-break-inside: avoid;
    }
    
    /* ===== FOOTER ===== */
    .footer {
      text-align: center;
      padding: 16px 40px;
      font-size: 0.75rem;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      page-break-before: avoid;
    }
    
    /* ===== PRINT STYLES ===== */
    @media print {
      @page { 
        margin: 1.5cm 1cm; 
        size: A4;
      }
      
      body { 
        background: white !important; 
        padding: 0 !important; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
      }
      
      .page { 
        box-shadow: none !important; 
        border: none !important; 
        border-radius: 0 !important; 
        max-width: 100% !important; 
      }
      
      /* Ensure colors are preserved */
      .content pre, 
      .content code,
      .summary,
      .tag,
      .folder-dot { 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
      }
      
      /* Prevent orphans and widows */
      p, li {
        orphans: 3;
        widows: 3;
      }
      
      /* Keep headers with following content */
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid;
      }
      
      /* Avoid breaking these elements */
      table, figure, img, pre, blockquote {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="title-row">
        <div class="icon">
          <svg viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <h1>${title || 'Untitled Note'}</h1>
      </div>
      <div class="meta">
        <span>Updated ${new Date(updatedAt).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</span>
        ${folderHtml}
      </div>
      ${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ''}
    </div>
    <div class="body">
      ${summaryHtml}
      <div class="content">${content}</div>
    </div>
    <div class="footer">Exported from Elevare</div>
  </div>
</body>
</html>`;
}
