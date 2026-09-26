import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import type { OptimizedResume, ResumeEntry } from './types.js';

const pageSize: [number, number] = [612, 792];
const margin = 54;
const ink = rgb(0.13, 0.13, 0.15);
const muted = rgb(0.38, 0.38, 0.4);
const ruleColor = rgb(0.62, 0.62, 0.64);

function winAnsi(value: string): string {
  return value.replace(/[^\t\n\r\x20-\x7E]/g, ' ').replace(/  +/g, ' ').trim();
}

function wrap(text: string, widthOf: (line: string) => number, maxWidth: number): string[] {
  const words = winAnsi(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
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

function slug(name: string): string {
  return winAnsi(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'resume';
}

export function resumeFileBase(name: string): string {
  return slug(name);
}

export async function buildResumePdf(resume: OptimizedResume): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const pageWidth = pageSize[0];
  const maxWidth = pageWidth - margin * 2;
  let page = doc.addPage(pageSize);
  let y = pageSize[1] - 50;

  function ensure(needed: number): void {
    if (y - needed >= 42) {
      return;
    }
    page = doc.addPage(pageSize);
    y = pageSize[1] - 50;
  }

  function rule(thickness = 0.9): void {
    ensure(10);
    page.drawLine({
      start: { x: margin, y: y + 2 },
      end: { x: pageWidth - margin, y: y + 2 },
      thickness,
      color: ruleColor,
    });
    y -= 12;
  }

  function centered(text: string, size: number, font: PDFFont, color = ink, tracking = 0): void {
    const cleaned = winAnsi(text);
    if (!cleaned) {
      return;
    }
    if (tracking <= 0) {
      const width = font.widthOfTextAtSize(cleaned, size);
      page.drawText(cleaned, {
        x: (pageWidth - width) / 2,
        y,
        size,
        font,
        color,
      });
      y -= size + 6;
      return;
    }
    const gaps = Math.max(0, cleaned.length - 1);
    const extra = gaps * tracking;
    const width = font.widthOfTextAtSize(cleaned, size) + extra;
    let x = (pageWidth - width) / 2;
    for (const char of cleaned) {
      page.drawText(char, { x, y, size, font, color });
      x += font.widthOfTextAtSize(char, size) + tracking;
    }
    y -= size + 6;
  }

  function sectionTitle(title: string): void {
    ensure(28);
    y -= 4;
    page.drawText(title.toUpperCase(), {
      x: margin,
      y,
      size: 11.5,
      font: bold,
      color: ink,
    });
    y -= 10;
    rule(0.7);
  }

  function paragraph(text: string, size = 10, font: PDFFont = regular, leading = 13): void {
    const lines = wrap(text, (line) => font.widthOfTextAtSize(line, size), maxWidth);
    for (const line of lines) {
      ensure(leading);
      page.drawText(line, { x: margin, y, size, font, color: ink });
      y -= leading;
    }
  }

  function entryBlock(entry: ResumeEntry): void {
    const org = winAnsi(entry.organization);
    const dates = winAnsi(entry.dates);
    const heading = dates ? `${org}  |  ${dates}` : org;
    ensure(36);
    page.drawText(heading, { x: margin, y, size: 10.5, font: regular, color: ink });
    y -= 14;
    if (entry.title) {
      page.drawText(winAnsi(entry.title), { x: margin, y, size: 10.5, font: bold, color: ink });
      y -= 14;
    }
    const details = entry.details
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean);
    if (details.length > 1) {
      for (const item of details) {
        const lines = wrap(item, (line) => regular.widthOfTextAtSize(line, 10), maxWidth - 14);
        for (let index = 0; index < lines.length; index += 1) {
          ensure(13);
          const prefix = index === 0 ? '•  ' : '   ';
          page.drawText(`${prefix}${lines[index]}`, {
            x: margin,
            y,
            size: 10,
            font: regular,
            color: ink,
          });
          y -= 13;
        }
      }
    } else if (entry.details) {
      paragraph(entry.details, 10, regular, 13);
    }
    y -= 6;
  }

  function skillsGrid(skills: string[]): void {
    const cols = 3;
    const colWidth = maxWidth / cols;
    const rows = Math.ceil(skills.length / cols);
    for (let row = 0; row < rows; row += 1) {
      ensure(14);
      for (let col = 0; col < cols; col += 1) {
        const skill = skills[row * cols + col];
        if (!skill) {
          continue;
        }
        page.drawText(`•  ${winAnsi(skill)}`, {
          x: margin + col * colWidth,
          y,
          size: 10,
          font: regular,
          color: ink,
        });
      }
      y -= 14;
    }
  }

  centered(resume.name.toUpperCase(), 22, bold, ink, 1.35);
  y += 2;
  centered(resume.title, 12, italic, muted, 0);
  y -= 2;

  const contact = [resume.phone, resume.email, resume.location].map(winAnsi).filter(Boolean);
  if (contact.length) {
    centered(contact.join('     •     '), 9.5, regular, ink);
  }
  y -= 2;
  rule(1);

  if (resume.about) {
    sectionTitle('About Me');
    paragraph(resume.about, 10, regular, 13);
  }
  if (resume.education.length) {
    sectionTitle('Education');
    for (const item of resume.education) {
      entryBlock(item);
    }
  }
  if (resume.experience.length) {
    sectionTitle('Work Experience');
    for (const item of resume.experience) {
      entryBlock(item);
    }
  }
  if (resume.skills.length) {
    sectionTitle('Skills');
    skillsGrid(resume.skills);
  }

  return Buffer.from(await doc.save());
}
