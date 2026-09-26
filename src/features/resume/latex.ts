import type { OptimizedResume, ResumeEntry } from './types.js';

function escapeLatex(value: string): string {
  return value
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[{}$&#%_]/g, (char) => `\\${char}`)
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

function entryBlock(entry: ResumeEntry): string {
  const org = escapeLatex(entry.organization);
  const dates = escapeLatex(entry.dates);
  const title = escapeLatex(entry.title);
  const heading = dates ? `${org} $|$ ${dates}` : org;
  const details = entry.details
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
  const body =
    details.length > 1
      ? [
          '\\begin{itemize}[leftmargin=1.1em,itemsep=1pt,parsep=0pt,topsep=2pt]',
          ...details.map((item) => `  \\item ${escapeLatex(item)}`),
          '\\end{itemize}',
        ].join('\n')
      : details[0]
        ? `{\\small ${escapeLatex(details[0])}\\par}`
        : '';
  return [`{\\normalsize ${heading}\\\\}`, `{\\textbf{${title}}\\par}`, body, '\\vspace{6pt}'].join('\n');
}

export function buildResumeLatex(resume: OptimizedResume): string {
  const contact = [resume.phone, resume.email, resume.location]
    .filter(Boolean)
    .map((item) => escapeLatex(item))
    .join(' \\,\\textbullet\\, ');

  const skills = resume.skills.map((skill) => `\\textbullet\\ ${escapeLatex(skill)}`);
  const skillRows: string[] = [];
  for (let index = 0; index < skills.length; index += 3) {
    const cells = [skills[index], skills[index + 1], skills[index + 2]].map((cell) => cell ?? '');
    skillRows.push(cells.join(' & ') + ' \\\\');
  }

  return [
    '\\documentclass[11pt,letterpaper]{article}',
    '\\usepackage[margin=0.7in]{geometry}',
    '\\usepackage{titlesec}',
    '\\usepackage{enumitem}',
    '\\usepackage{tabularx}',
    '\\usepackage{setspace}',
    '\\usepackage[T1]{fontenc}',
    '\\usepackage{lmodern}',
    '\\pagestyle{empty}',
    '\\setlength{\\parindent}{0pt}',
    '\\setlength{\\parskip}{0pt}',
    '\\titleformat{\\section}{\\large\\bfseries\\uppercase}{}{0pt}{}[\\titlerule]',
    '\\titlespacing*{\\section}{0pt}{10pt}{6pt}',
    '\\begin{document}',
    '',
    '\\begin{center}',
    `{\\LARGE\\bfseries\\MakeUppercase{${escapeLatex(resume.name)}}}\\\\[4pt]`,
    `{\\large\\textit{${escapeLatex(resume.title)}}}\\\\[6pt]`,
    contact ? `{\\small ${contact}}\\\\[4pt]` : '',
    '\\end{center}',
    '\\vspace{2pt}\\hrule\\vspace{8pt}',
    '',
    resume.about
      ? ['\\section*{About Me}', `{\\small ${escapeLatex(resume.about)}\\par}`, ''].join('\n')
      : '',
    resume.education.length
      ? ['\\section*{Education}', ...resume.education.map(entryBlock), ''].join('\n')
      : '',
    resume.experience.length
      ? ['\\section*{Work Experience}', ...resume.experience.map(entryBlock), ''].join('\n')
      : '',
    resume.skills.length
      ? [
          '\\section*{Skills}',
          '\\begin{tabularx}{\\textwidth}{XXX}',
          ...skillRows,
          '\\end{tabularx}',
        ].join('\n')
      : '',
    '',
    '\\end{document}',
    '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}
