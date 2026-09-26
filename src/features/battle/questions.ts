export type BattleQuestion = {
  prompt: string;
  options: { label: string; value: string }[];
  correctValue: string;
};

export const battleQuestions: BattleQuestion[] = [
  {
    prompt: 'What does SQL stand for?',
    options: [
      { label: 'Structured Query Language', value: 'sql' },
      { label: 'Simple Question List', value: 'list' },
      { label: 'System Queue Logic', value: 'queue' },
      { label: 'Sequential Query Loop', value: 'loop' },
    ],
    correctValue: 'sql',
  },
  {
    prompt: 'Which data structure works on LIFO (Last In, First Out)?',
    options: [
      { label: 'Queue', value: 'queue' },
      { label: 'Stack', value: 'stack' },
      { label: 'Linked list', value: 'list' },
      { label: 'Hash table', value: 'hash' },
    ],
    correctValue: 'stack',
  },
  {
    prompt: 'What is the time complexity of binary search on a sorted array?',
    options: [
      { label: 'O(n)', value: 'n' },
      { label: 'O(n log n)', value: 'nlogn' },
      { label: 'O(log n)', value: 'logn' },
      { label: 'O(1)', value: 'one' },
    ],
    correctValue: 'logn',
  },
];
