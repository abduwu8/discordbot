export type ResourceSubject = {
  id: string;
  label: string;
};

export type ResourceCategory = {
  id: string;
  label: string;
  emoji: string;
  subjects: ResourceSubject[];
};

export const resourceCategories: ResourceCategory[] = [
  {
    id: 'programming',
    label: 'Programming',
    emoji: '💻',
    subjects: [
      { id: 'programming-fundamentals', label: 'Programming Fundamentals' },
      { id: 'c', label: 'C Programming' },
      { id: 'cpp', label: 'C++' },
      { id: 'java', label: 'Java' },
      { id: 'python', label: 'Python' },
      { id: 'oop', label: 'Object-Oriented Programming' },
    ],
  },
  {
    id: 'dsa-cs',
    label: 'DSA & Computer Science',
    emoji: '🧠',
    subjects: [
      { id: 'data-structures', label: 'Data Structures' },
      { id: 'algorithms', label: 'Algorithms' },
      { id: 'toc', label: 'Theory of Computation' },
      { id: 'compiler', label: 'Compiler Design' },
      { id: 'coa', label: 'Computer Organization & Architecture' },
      { id: 'os', label: 'Operating Systems' },
      { id: 'networks', label: 'Computer Networks' },
      { id: 'distributed', label: 'Distributed Systems' },
    ],
  },
  {
    id: 'databases',
    label: 'Databases',
    emoji: '🗄️',
    subjects: [
      { id: 'dbms', label: 'Database Management Systems' },
      { id: 'sql', label: 'SQL' },
      { id: 'data-mining', label: 'Data Mining' },
      { id: 'big-data', label: 'Big Data' },
    ],
  },
  {
    id: 'web-app',
    label: 'Web & Application Development',
    emoji: '🌐',
    subjects: [
      { id: 'web', label: 'Web Development' },
      { id: 'internet', label: 'Internet Technologies' },
      { id: 'mobile', label: 'Mobile Application Development' },
      { id: 'hci', label: 'Human-Computer Interaction' },
    ],
  },
  {
    id: 'ai-data',
    label: 'AI & Data',
    emoji: '🤖',
    subjects: [
      { id: 'ai', label: 'Artificial Intelligence' },
      { id: 'ml', label: 'Machine Learning' },
      { id: 'data-science', label: 'Data Science' },
      { id: 'nlp', label: 'Natural Language Processing' },
      { id: 'graphics', label: 'Computer Graphics' },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    emoji: '🔐',
    subjects: [
      { id: 'cyber', label: 'Cyber Security' },
      { id: 'crypto', label: 'Cryptography' },
      { id: 'info-sec', label: 'Information Security' },
    ],
  },
  {
    id: 'modern',
    label: 'Modern Technologies',
    emoji: '☁️',
    subjects: [
      { id: 'cloud', label: 'Cloud Computing' },
      { id: 'devops', label: 'DevOps' },
      { id: 'blockchain', label: 'Blockchain Technology' },
      { id: 'iot', label: 'Internet of Things (IoT)' },
    ],
  },
  {
    id: 'math',
    label: 'Mathematics',
    emoji: '📐',
    subjects: [
      { id: 'discrete-math', label: 'Discrete Mathematics' },
      { id: 'probability', label: 'Probability & Statistics' },
      { id: 'linear-algebra', label: 'Linear Algebra' },
      { id: 'numerical', label: 'Numerical Methods' },
    ],
  },
  {
    id: 'mgmt',
    label: 'Management & Business',
    emoji: '🏢',
    subjects: [
      { id: 'mis', label: 'Management Information Systems' },
      { id: 'it-pm', label: 'IT Project Management' },
      { id: 'ecommerce', label: 'E-Commerce' },
      { id: 'entrepreneurship', label: 'Entrepreneurship' },
      { id: 'business-comm', label: 'Business Communication' },
      { id: 'ethics', label: 'Computer Ethics' },
    ],
  },
  {
    id: 'academic',
    label: 'Academic & Professional',
    emoji: '🔬',
    subjects: [
      { id: 'research', label: 'Research Methodology' },
      { id: 'it', label: 'Information Technology' },
      { id: 'se', label: 'Software Engineering' },
    ],
  },
];

export function findResourceCategory(id: string): ResourceCategory | undefined {
  return resourceCategories.find((category) => category.id === id);
}

export function findResourceSubject(
  categoryId: string,
  subjectId: string,
): ResourceSubject | undefined {
  return findResourceCategory(categoryId)?.subjects.find((subject) => subject.id === subjectId);
}
