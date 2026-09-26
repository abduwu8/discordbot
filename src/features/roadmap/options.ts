export const goals = [
  { id: 'aiml', label: 'AI/ML Engineer' },
  { id: 'be', label: 'Backend Developer' },
  { id: 'fs', label: 'Full Stack Developer' },
  { id: 'ds', label: 'Data Scientist' },
  { id: 'ops', label: 'DevOps Engineer' },
] as const;

export const studyTimes = [
  { id: '5', label: '5 hrs/week', hours: 5, weeks: 6 },
  { id: '10', label: '10 hrs/week', hours: 10, weeks: 6 },
  { id: '15', label: '15+ hrs/week', hours: 15, weeks: 6 },
] as const;

export const levels = [
  { id: 'beg', label: 'Beginner' },
  { id: 'some', label: 'Some experience' },
  { id: 'int', label: 'Intermediate' },
] as const;

export type GoalId = (typeof goals)[number]['id'];
export type TimeId = (typeof studyTimes)[number]['id'];
export type LevelId = (typeof levels)[number]['id'];

export type RoadmapDraft = {
  goal: GoalId | undefined;
  time: TimeId | undefined;
  level: LevelId | undefined;
};

export function findGoal(id: string): (typeof goals)[number] | undefined {
  return goals.find((item) => item.id === id);
}

export function findTime(id: string): (typeof studyTimes)[number] | undefined {
  return studyTimes.find((item) => item.id === id);
}

export function findLevel(id: string): (typeof levels)[number] | undefined {
  return levels.find((item) => item.id === id);
}
