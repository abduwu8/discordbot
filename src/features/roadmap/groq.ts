import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { findGoal, findLevel, findTime, type GoalId, type LevelId, type TimeId } from './options.js';

const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
const groqModel = 'openai/gpt-oss-20b';
const maxOut = 700;

export type RoadmapPlan = {
  text: string;
};

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

type GroqMessage = { role: string; content?: string | null };

async function groqOnce(key: string, prompt: string): Promise<string> {
  const response = await fetch(groqUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: groqModel,
      temperature: 0.3,
      max_completion_tokens: maxOut,
      reasoning_effort: 'low',
      messages: [{ role: 'user', content: prompt }],
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

function cleanText(raw: string): string {
  return raw.replace(/^```(?:markdown|md)?\s*/i, '').replace(/```$/u, '').trim().slice(0, 3800);
}

export async function generateRoadmap(
  goal: GoalId,
  time: TimeId,
  level: LevelId,
): Promise<RoadmapPlan | undefined> {
  const key = env.GROQ_API_KEY;
  if (!key) {
    logger.warn('GROQ_API_KEY missing; cannot generate roadmap');
    return undefined;
  }

  const goalLabel = findGoal(goal)?.label ?? goal;
  const timeLabel = findTime(time)?.label ?? time;
  const levelLabel = findLevel(level)?.label ?? level;
  const prompt = [
    `6-week ${goalLabel} roadmap. ${timeLabel}. ${levelLabel}.`,
    'Discord md only. Each week: **Week N — topic**, 1 task, 1 real https link, 1 tip.',
    'End with **Tips** (2 bullets). No intro. No outro.',
  ].join(' ');

  try {
    let raw: string;
    try {
      raw = await groqOnce(key, prompt);
    } catch (error: unknown) {
      const status = error instanceof Error ? (error as Error & { status?: number }).status : undefined;
      const detail = error instanceof Error ? ((error as Error & { detail?: string }).detail ?? error.message) : '';
      if (status !== 429) {
        throw error;
      }
      await sleep(retryMs(detail) ?? 5000);
      raw = await groqOnce(key, prompt);
    }

    const text = cleanText(raw);
    if (text.length < 40) {
      logger.warn('Groq roadmap text was too short');
      return undefined;
    }
    return { text };
  } catch (error: unknown) {
    logger.warn(
      `Groq roadmap generation failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return undefined;
  }
}
