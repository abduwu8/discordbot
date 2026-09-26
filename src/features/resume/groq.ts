import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { OptimizedResume, ResumeEntry } from './types.js';

const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
const groqModel = 'openai/gpt-oss-120b';
const maxOut = 4500;

type GroqMessage = { role: string; content?: string | null };

const systemPrompt = [
  'You are a resume optimizer. Return ONLY valid JSON, no markdown fences.',
  'Rewrite the uploaded resume into a clean one-page professional resume.',
  'Keep real facts: names, employers, schools, dates, skills, contact. Never invent jobs, degrees, or numbers.',
  'Improve wording, tighten the summary, and turn duties into strong achievement-style bullets where possible.',
  'If a target role is given, tailor language and skill order to that role without lying.',
  'JSON shape:',
  '{',
  '  "name": "FULL NAME",',
  '  "title": "Professional title",',
  '  "phone": "",',
  '  "email": "",',
  '  "location": "",',
  '  "about": "2-4 sentence professional summary",',
  '  "education": [{ "organization": "", "dates": "YYYY-YYYY", "title": "Degree or role", "details": "1-2 sentences" }],',
  '  "experience": [{ "organization": "", "dates": "YYYY-YYYY", "title": "Job title", "details": "2-4 sentences or compact bullets separated by | " }],',
  '  "skills": ["Skill"],',
  '  "improvements": ["what you changed"]',
  '}',
  'Use 4-10 skills. Keep about under 80 words. Keep each details field under 70 words.',
].join(' ');

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function retryMs(detail: string): number | undefined {
  const match = /try again in ([\d.]+)s/i.exec(detail);
  if (!match?.[1]) {
    return undefined;
  }
  return Math.min(8000, Math.ceil(Number(match[1]) * 1000) + 400);
}

async function groqOnce(key: string, userPrompt: string): Promise<string> {
  const response = await fetch(groqUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: groqModel,
      temperature: 0.25,
      max_tokens: maxOut,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (response.ok) {
    const body = (await response.json()) as { choices?: Array<{ message?: GroqMessage }> };
    const content = body.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error(`${groqModel} empty`);
    }
    return content;
  }

  const detail = (await response.text()).slice(0, 280);
  const error = new Error(`${groqModel} ${response.status} ${detail}`) as Error & {
    status?: number;
    detail?: string;
  };
  error.status = response.status;
  error.detail = detail;
  throw error;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function asEntries(value: unknown): ResumeEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return undefined;
      }
      const row = item as Record<string, unknown>;
      const organization = asString(row.organization ?? row.school ?? row.company);
      const title = asString(row.title ?? row.role ?? row.degree);
      const dates = asString(row.dates ?? row.date ?? row.period);
      const details = asString(row.details ?? row.summary ?? row.description);
      if (!organization && !title) {
        return undefined;
      }
      return { organization, dates, title, details };
    })
    .filter((item): item is ResumeEntry => Boolean(item));
}

function parseResumeJson(raw: string): OptimizedResume | undefined {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```$/u, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== 'object') {
    return undefined;
  }
  const data = parsed as Record<string, unknown>;
  const name = asString(data.name);
  if (name.length < 2) {
    return undefined;
  }
  const skills = Array.isArray(data.skills)
    ? data.skills.map((item) => asString(item)).filter(Boolean).slice(0, 12)
    : [];
  const improvements = Array.isArray(data.improvements)
    ? data.improvements.map((item) => asString(item)).filter(Boolean).slice(0, 6)
    : [];
  return {
    name,
    title: asString(data.title) || 'Professional',
    phone: asString(data.phone),
    email: asString(data.email),
    location: asString(data.location),
    about: asString(data.about),
    education: asEntries(data.education).slice(0, 4),
    experience: asEntries(data.experience).slice(0, 5),
    skills,
    improvements,
  };
}

export async function optimizeResume(
  resumeText: string,
  targetRole?: string,
): Promise<OptimizedResume | undefined> {
  const key = env.GROQ_AI_API_KEY;
  if (!key) {
    logger.warn('GROQ_AI_API_KEY missing; cannot optimize resume');
    return undefined;
  }

  const userPrompt = [
    targetRole ? `Target role: ${targetRole}` : 'Target role: general professional, keep their current direction.',
    'Resume text:',
    resumeText.slice(0, 18000),
  ].join('\n');

  try {
    let raw: string;
    try {
      raw = await groqOnce(key, userPrompt);
    } catch (error: unknown) {
      const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined;
      const detail = error instanceof Error ? ((error as Error & { detail?: string }).detail ?? error.message) : '';
      if (status !== 429 && status !== 400) {
        throw error;
      }
      if (status === 400) {
        raw = await groqOnceNoJsonMode(key, userPrompt);
      } else {
        await sleep(retryMs(detail) ?? 4000);
        raw = await groqOnce(key, userPrompt);
      }
    }
    const parsed = parseResumeJson(raw);
    if (!parsed) {
      logger.warn('Groq resume JSON could not be parsed');
      return undefined;
    }
    return parsed;
  } catch (error: unknown) {
    logger.warn(`Groq resume optimize failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    return undefined;
  }
}

async function groqOnceNoJsonMode(key: string, userPrompt: string): Promise<string> {
  const response = await fetch(groqUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: groqModel,
      temperature: 0.25,
      max_tokens: maxOut,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 280);
    throw new Error(`${groqModel} ${response.status} ${detail}`);
  }
  const body = (await response.json()) as { choices?: Array<{ message?: GroqMessage }> };
  const content = body.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error(`${groqModel} empty`);
  }
  return content;
}
