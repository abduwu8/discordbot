import JSZip from 'jszip';
import { logger } from '../../utils/logger.js';

const maxChars = 24000;

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => String.fromCharCode(parseInt(code, 16)));
}

function clip(text: string): string {
  return text.split('\0').join('').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, maxChars);
}

function unescapePdf(value: string): string {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

function pdfStringRuns(data: Buffer): string {
  const raw = data.toString('latin1');
  const chunks: string[] = [];
  for (const match of raw.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) {
    const inner = match[0].slice(1, match[0].lastIndexOf(')'));
    chunks.push(unescapePdf(inner));
  }
  for (const match of raw.matchAll(/\[(?:[^\]]*)\]\s*TJ/g)) {
    for (const piece of match[0].matchAll(/\((?:\\.|[^\\)])*\)/g)) {
      chunks.push(unescapePdf(piece[0].slice(1, -1)));
    }
  }
  return clip(chunks.join(' ').replace(/ {2,}/g, ' '));
}

async function extractPdf(data: Buffer): Promise<string> {
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task = pdfjs.getDocument({
      data: new Uint8Array(data),
      disableFontFace: true,
      useSystemFonts: true,
    });
    const pdf = await task.promise;
    const pages: string[] = [];
    for (let index = 1; index <= pdf.numPages; index += 1) {
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      const line = content.items
        .map((item) => ('str' in item ? String(item.str) : ''))
        .join(' ')
        .replace(/ {2,}/g, ' ')
        .trim();
      if (line) {
        pages.push(line);
      }
    }
    const text = clip(pages.join('\n'));
    if (text.length >= 40) {
      return text;
    }
  } catch (error: unknown) {
    logger.warn(`pdf.js extract failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
  return pdfStringRuns(data);
}

async function extractDocx(data: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(data);
  const file = zip.file('word/document.xml');
  if (!file) {
    throw new Error('Could not read that Word file.');
  }
  const xml = await file.async('string');
  return clip(
    decodeEntities(
      xml
        .replace(/<w:tab\b[^/]*\/>/g, '\t')
        .replace(/<w:br\b[^/]*\/>/g, '\n')
        .replace(/<\/w:p>/g, '\n')
        .replace(/<[^>]+>/g, ''),
    ),
  );
}

export function fileKind(name: string, contentType: string | null): 'pdf' | 'docx' | 'text' | undefined {
  const lower = name.toLowerCase();
  const type = (contentType ?? '').toLowerCase();
  if (lower.endsWith('.pdf') || type === 'application/pdf') {
    return 'pdf';
  }
  if (
    lower.endsWith('.docx') ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (lower.endsWith('.txt') || lower.endsWith('.md') || type.startsWith('text/')) {
    return 'text';
  }
  return undefined;
}

export async function extractResumeText(
  data: Buffer,
  name: string,
  contentType: string | null,
): Promise<string> {
  const kind = fileKind(name, contentType);
  if (!kind) {
    throw new Error('Upload a PDF, Word (.docx), or text file.');
  }
  if (kind === 'pdf') {
    return extractPdf(data);
  }
  if (kind === 'docx') {
    return extractDocx(data);
  }
  return clip(data.toString('utf8'));
}
