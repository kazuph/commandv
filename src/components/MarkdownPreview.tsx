import React, { useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// ---- Mermaid lazy loader (same pattern as D3.js) ----
let mermaidLoading = false;
let mermaidLoaded = false;

const loadMermaid = async (): Promise<any> => {
  if (mermaidLoaded && (window as any).mermaid) {
    return (window as any).mermaid;
  }
  if (mermaidLoading) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if ((window as any).mermaid) {
          clearInterval(check);
          resolve((window as any).mermaid);
        }
      }, 50);
    });
  }
  mermaidLoading = true;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
    script.async = true;
    script.onload = () => {
      const m = (window as any).mermaid;
      if (m) {
        m.initialize({ startOnLoad: false, securityLevel: 'loose' });
        mermaidLoaded = true;
      }
      mermaidLoading = false;
      resolve(m);
    };
    script.onerror = () => {
      mermaidLoading = false;
      reject(new Error('Failed to load Mermaid'));
    };
    document.head.appendChild(script);
  });
};

// ---- KaTeX render helpers ----
const renderMathInTextNode = (node: Text): string | null => {
  const text = node.textContent || '';
  if (!text.includes('$')) return null;

  let result = text;
  let changed = false;

  // Display math: $$...$$
  result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    changed = true;
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<span class="text-red-500">$$${tex}$$</span>`;
    }
  });

  // Inline math: $...$ (avoid $$ and consecutive $)
  result = result.replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_, tex) => {
    changed = true;
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="text-red-500">$${tex}$</span>`;
    }
  });

  return changed ? result : null;
};

// ---- Props ----
interface MarkdownPreviewProps {
  content: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Step 1: Convert markdown → sanitized HTML (sync where possible)
  const safeHtml = React.useMemo(() => {
    try {
      const rawHtml = marked.parse(content, { gfm: true, breaks: true }) as string;
      return DOMPurify.sanitize(rawHtml, {
        ADD_TAGS: [
          'svg', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
          'text', 'g', 'defs', 'marker', 'tspan', 'foreignObject', 'use',
        ],
        ADD_ATTR: [
          'xmlns', 'viewBox', 'preserveAspectRatio', 'd', 'fill', 'stroke',
          'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'transform',
          'opacity', 'xmlns:xlink', 'x', 'y', 'width', 'height', 'rx', 'ry',
          'cx', 'cy', 'r', 'points', 'marker-end', 'marker-start',
        ],
      });
    } catch (e) {
      console.error('Markdown parse error:', e);
      return '<p class="text-red-500">Failed to render markdown</p>';
    }
  }, [content]);

  // Step 2: Post-process Mermaid + KaTeX inside the DOM
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const process = async () => {
      try {
        // ---- Mermaid ----
        const mermaidBlocks = container.querySelectorAll(
          'pre code.language-mermaid, pre code.lang-mermaid'
        );
        if (mermaidBlocks.length > 0) {
          const mermaid = await loadMermaid();
          for (let i = 0; i < mermaidBlocks.length; i++) {
            const block = mermaidBlocks[i] as HTMLElement;
            const code = block.textContent || '';
            const id = `mm-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`;
            try {
              const { svg } = await mermaid.render(id, code);
              const wrapper = document.createElement('div');
              wrapper.className = 'mermaid-diagram flex justify-center my-4 overflow-x-auto';
              wrapper.innerHTML = svg;
              block.parentElement?.replaceWith(wrapper);
            } catch (e) {
              console.error('Mermaid render error:', e);
              const errDiv = document.createElement('div');
              errDiv.className = 'text-red-500 text-sm p-2 border border-red-200 rounded my-2';
              errDiv.textContent = 'Mermaid diagram render error';
              block.parentElement?.replaceWith(errDiv);
            }
          }
        }

        // ---- KaTeX ----
        const walker = document.createTreeWalker(
          container,
          NodeFilter.SHOW_TEXT,
          {
            acceptNode: (node) => {
              const parent = node.parentElement;
              if (!parent) return NodeFilter.FILTER_REJECT;
              // Skip inside code, pre, already-rendered math, or mermaid
              if (parent.closest('code, pre, .katex, .mermaid-diagram')) {
                return NodeFilter.FILTER_REJECT;
              }
              if (!node.textContent?.includes('$')) return NodeFilter.FILTER_REJECT;
              return NodeFilter.FILTER_ACCEPT;
            },
          }
        );

        const replacements: { node: Text; html: string }[] = [];
        while (walker.nextNode()) {
          const node = walker.currentNode as Text;
          const rendered = renderMathInTextNode(node);
          if (rendered !== null) {
            replacements.push({ node, html: rendered });
          }
        }

        replacements.forEach(({ node, html }) => {
          const span = document.createElement('span');
          span.innerHTML = html;
          node.parentNode?.replaceChild(span, node);
        });
      } catch (e) {
        console.error('Markdown post-processing error:', e);
      }
    };

    process();
  }, [safeHtml]);

  return (
    <div className="markdown-preview bg-white rounded-lg shadow-sm border border-gray-200">
      <div
        ref={containerRef}
        className="p-6 max-w-none"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </div>
  );
};

export default MarkdownPreview;
