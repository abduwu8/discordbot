import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function winAnsi(value: string): string {
  return value.replace(/[^\t\n\r\x20-\x7E]/g, ' ').replace(/  +/g, ' ');
}

function wrap(text: string, widthOf: (line: string) => number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [''];
  }

  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (widthOf(next) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

export async function buildRoadmapPdf(title: string, meta: string, body: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [612, 792];
  const margin = 48;
  const maxWidth = pageSize[0] - margin * 2;
  const lineHeight = 15;
  let page = doc.addPage(pageSize);
  let y = pageSize[1] - margin;

  function ensureSpace(needed: number): void {
    if (y - needed >= margin) {
      return;
    }
    page = doc.addPage(pageSize);
    y = pageSize[1] - margin;
  }

  function paint(text: string, size: number, isBold: boolean): void {
    const font = isBold ? bold : regular;
    const cleaned = winAnsi(text);
    const lines = wrap(cleaned, (line) => font.widthOfTextAtSize(line, size), maxWidth);
    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line, {
        x: margin,
        y,
        size,
        font,
        color: rgb(0.12, 0.12, 0.14),
      });
      y -= lineHeight;
    }
  }

  paint(title, 18, true);
  y -= 6;
  paint(meta, 11, false);
  y -= 10;

  for (const raw of body.split('\n')) {
    const line = raw
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)')
      .replace(/\*\*/g, '')
      .replace(/__/g, '')
      .replace(/`/g, '')
      .replace(/^[-*]\s+/, '- ')
      .replace(/^#+\s*/, '')
      .trimEnd();
    if (!line.trim()) {
      y -= 8;
      continue;
    }
    paint(line.trim(), 11, false);
  }

  return Buffer.from(await doc.save());
}
