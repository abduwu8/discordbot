import type { Message } from 'discord.js';
import type { InterviewQuestion, InterviewRoleId } from './questions.js';

export type InterviewSession = {
  id: string;
  userId: string;
  role: InterviewRoleId;
  questions: InterviewQuestion[];
  index: number;
  score: number;
  round: number;
  feedback: string | undefined;
  timer: ReturnType<typeof setTimeout> | undefined;
  message: Message | undefined;
};

const sessionsByUser = new Map<string, InterviewSession>();

export function getInterviewSession(userId: string): InterviewSession | undefined {
  return sessionsByUser.get(userId);
}

export function setInterviewSession(session: InterviewSession): void {
  const previous = sessionsByUser.get(session.userId);
  if (previous?.timer) {
    clearTimeout(previous.timer);
  }
  sessionsByUser.set(session.userId, session);
}

export function deleteInterviewSession(userId: string): void {
  const session = sessionsByUser.get(userId);
  if (session?.timer) {
    clearTimeout(session.timer);
  }
  sessionsByUser.delete(userId);
}
