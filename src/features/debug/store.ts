import type { Message } from 'discord.js';
import type { DebugDifficultyId, DebugQuestion } from './questions.js';

export type DebugSession = {
  id: string;
  userId: string;
  difficulty: DebugDifficultyId;
  questions: DebugQuestion[];
  index: number;
  score: number;
  feedback: string | undefined;
  message: Message | undefined;
};

const sessionsByUser = new Map<string, DebugSession>();

export function getDebugSession(userId: string): DebugSession | undefined {
  return sessionsByUser.get(userId);
}

export function setDebugSession(session: DebugSession): void {
  sessionsByUser.set(session.userId, session);
}

export function deleteDebugSession(userId: string): void {
  sessionsByUser.delete(userId);
}
