export const interviewRoles = {
  software: { id: 'software', label: 'Software Developer' },
  frontend: { id: 'frontend', label: 'Frontend Engineer' },
  backend: { id: 'backend', label: 'Backend Engineer' },
} as const;

export type InterviewRoleId = keyof typeof interviewRoles;

export type InterviewOption = {
  value: string;
  label: string;
};

export type InterviewQuestion = {
  prompt: string;
  options: InterviewOption[];
  correctValue: string;
};

export const questionsPerRound = 5;
export const secondsPerQuestion = 30;

function q(
  prompt: string,
  options: [string, string, string, string],
  correctIndex: 0 | 1 | 2 | 3,
): InterviewQuestion {
  const letters = ['a', 'b', 'c', 'd'] as const;
  return {
    prompt,
    options: options.map((label, index) => {
      const value = letters[index];
      if (!value) {
        throw new Error('Interview options must have four choices.');
      }
      return { value, label };
    }),
    correctValue: letters[correctIndex],
  };
}

export function isInterviewRoleId(value: string): value is InterviewRoleId {
  return value in interviewRoles;
}

const softwareQuestions: InterviewQuestion[] = [
  q(
    'Why is a HashMap usually faster than searching an array?',
    [
      'It always uses less memory than an array',
      'Average lookup is O(1) via hashing instead of scanning O(n)',
      'It keeps keys sorted so binary search is automatic',
      'The CPU caches arrays poorly compared with maps',
    ],
    1,
  ),
  q(
    'What is the difference between a stack and a queue?',
    [
      'Stack is FIFO (line); queue is LIFO (undo)',
      'They are the same; only the name changes',
      'Stack is LIFO (undo/back); queue is FIFO (line/printer)',
      'A stack can only store numbers; a queue stores strings',
    ],
    2,
  ),
  q(
    'When would you choose a linked list over an array?',
    [
      'When you need O(1) random access by index',
      'When you insert/delete often in the middle and do not need index access',
      'When you want the data packed tightly in memory for cache speed',
      'When you must sort the collection every write',
    ],
    1,
  ),
  q(
    'What happens when you type a URL into your browser?',
    [
      'The browser only reads a file from your disk with that name',
      'DNS finds the IP, the browser connects (often TLS), then requests and renders the page',
      'The OS emails the website owner and waits for a reply',
      'JavaScript runs first, then DNS, then HTML',
    ],
    1,
  ),
  q(
    'Why do we use Git branches?',
    [
      'To store passwords separately from source code',
      'To compile code faster on CI',
      'To isolate work (features/fixes) without breaking the main line until merge',
      'To replace the need for commits',
    ],
    2,
  ),
  q(
    'What is the difference between compiling and interpreting code?',
    [
      'Compiling translates ahead of time to machine code; interpreting executes source as it goes',
      'Interpreting always produces a .exe; compiling never does',
      'They are identical; compilers are just slower interpreters',
      'Compiling only works for HTML; interpreting only works for C',
    ],
    0,
  ),
  q(
    'How would you start debugging an application that suddenly became slow?',
    [
      'Rewrite the entire app in a new language first',
      'Measure: reproduce, profile CPU/IO/queries, then fix the hottest bottleneck',
      'Delete logs so the disk is less busy',
      'Add more UI animations so users notice lag less',
    ],
    1,
  ),
  q(
    'What is the purpose of caching?',
    [
      'To store a faster copy of expensive results and avoid repeating the same work',
      'To encrypt every database row automatically',
      'To replace unit tests',
      'To make Git commits smaller',
    ],
    0,
  ),
  q(
    'What is the time complexity of reading an array element by index?',
    ['O(n)', 'O(log n)', 'O(1)', 'O(n log n)'],
    2,
  ),
  q(
    'What does an API mainly provide?',
    [
      'A graphical theme pack for the operating system',
      'A defined way for programs to talk to each other (requests and responses)',
      'A replacement for a database',
      'A compiler flag that removes bugs',
    ],
    1,
  ),
];

const backendQuestions: InterviewQuestion[] = [
  q(
    'Why should passwords not be stored as plain text?',
    [
      'Plain text takes more disk space than hashes',
      'If the database leaks, attackers can use the passwords immediately',
      'SQL cannot store strings without hashing',
      'Browsers refuse to send plain text passwords',
    ],
    1,
  ),
  q(
    'When should an API return 401 instead of 403?',
    [
      '401: authenticated but not allowed; 403: not logged in',
      '401: not authenticated (or bad/missing credentials); 403: authenticated but forbidden',
      'They are interchangeable for every error',
      '401 is only for GET; 403 is only for POST',
    ],
    1,
  ),
  q(
    'PUT vs PATCH — when would you use each?',
    [
      'PUT replaces the whole resource; PATCH applies a partial update',
      'PATCH always deletes the resource; PUT never does',
      'PUT is only for files; PATCH is only for JSON lists',
      'They are the same verb with two names',
    ],
    0,
  ),
  q(
    'What is a core difference between SQL and NoSQL databases?',
    [
      'SQL is only for mobile apps; NoSQL is only for desktop',
      'SQL databases are relational with structured schemas; NoSQL models are more flexible (docs, kv, etc.)',
      'NoSQL cannot store any data permanently',
      'SQL cannot run on Linux',
    ],
    1,
  ),
  q(
    'What is database indexing, and why does it help?',
    [
      'An extra lookup structure that speeds reads/filters at the cost of write/storage overhead',
      'A backup copy of the entire database on another continent',
      'A way to hide columns from SELECT *',
      'A GUI theme for database tools',
    ],
    0,
  ),
  q(
    'Why would you use Redis?',
    [
      'As a fast in-memory store for cache, sessions, queues, and short-lived data',
      'As a replacement for HTML templates',
      'To compile TypeScript',
      'To draw CSS layouts',
    ],
    0,
  ),
  q(
    'What problem does Docker mainly solve?',
    [
      'It writes unit tests for you',
      'It packages an app with its runtime so it runs the same across machines',
      'It replaces Git history',
      'It makes SQL queries case-insensitive',
    ],
    1,
  ),
  q(
    'How would you prevent duplicate requests from creating two payments?',
    [
      'Ignore all POST requests after the first deploy',
      'Use idempotency keys (or unique constraints) so retries reuse the same payment',
      'Return 500 until the user refreshes',
      'Store the card number in a cookie',
    ],
    1,
  ),
  q(
    'What does it mean for an HTTP method like GET to be idempotent?',
    [
      'Repeating the same request should not change server state further',
      'The response body must be empty',
      'The request can only be sent once ever',
      'The server must sleep for one second',
    ],
    0,
  ),
  q(
    'What is a primary key used for?',
    [
      'Encrypting a column with AES',
      'Uniquely identifying each row in a table',
      'Sorting CSS classes',
      'Naming Docker images',
    ],
    1,
  ),
];

const frontendQuestions: InterviewQuestion[] = [
  q(
    'What is the difference between Flexbox and Grid?',
    [
      'Flexbox is for two-dimensional layouts; Grid is only for a single row',
      'Flexbox is one-dimensional (row or column); Grid is two-dimensional (rows and columns)',
      'Grid cannot wrap items; Flexbox cannot align items',
      'They are identical; Grid is just a Flexbox alias',
    ],
    1,
  ),
  q(
    'Why are React keys important?',
    [
      'They style the component with CSS',
      'They help React match list items across renders so state and DOM stay correct',
      'They encrypt props before render',
      'They replace the need for useState',
    ],
    1,
  ),
  q(
    'What is event bubbling in JavaScript?',
    [
      'The event travels from the target up through ancestors unless stopped',
      'The event only fires on the window object',
      'React disables all native events',
      'The browser downloads JavaScript twice',
    ],
    0,
  ),
  q(
    'What is the difference between == and === in JavaScript?',
    [
      '== compares types strictly; === coerces types',
      'They are the same in every case',
      '=== compares without coercion; == may coerce types before comparing',
      '=== only works on numbers',
    ],
    2,
  ),
  q(
    'Why is semantic HTML important?',
    [
      'It makes files larger so CDNs cache better',
      'It describes meaning (headings, buttons, nav) for accessibility, SEO, and maintainability',
      'Browsers refuse to render <div>',
      'It disables CSS',
    ],
    1,
  ),
  q(
    'How would you start improving a slow-loading webpage?',
    [
      'Add more hero videos at the top of the page',
      'Measure: cut heavy assets, cache, code-split, optimize images, reduce blocking JS',
      'Inline every library into one 20 MB file',
      'Remove the <html> tag',
    ],
    1,
  ),
  q(
    'What is the purpose of useMemo in React?',
    [
      'To skip recomputing an expensive value unless its dependencies change',
      'To fetch from the network on every keystroke',
      'To replace CSS modules',
      'To mutate the DOM node directly',
    ],
    0,
  ),
  q(
    'Why should you avoid manipulating the DOM directly in React?',
    [
      'The browser has no DOM',
      'React owns the UI tree; manual DOM edits get overwritten and fight its updates',
      'Direct DOM access is illegal in JavaScript',
      'React cannot render HTML without jQuery',
    ],
    1,
  ),
  q(
    'What does the virtual DOM help React do?',
    [
      'Replace HTTPS',
      'Diff UI descriptions and apply a smaller set of real DOM updates',
      'Compile TypeScript',
      'Store passwords in localStorage safely',
    ],
    1,
  ),
  q(
    'What is a practical difference between localStorage and sessionStorage?',
    [
      'localStorage survives browser restarts; sessionStorage lasts for that tab/session',
      'sessionStorage is shared with every website on the internet',
      'localStorage can only store numbers',
      'They are network databases, not browser APIs',
    ],
    0,
  ),
];

export const interviewQuestionBank: Record<InterviewRoleId, InterviewQuestion[]> = {
  software: softwareQuestions,
  backend: backendQuestions,
  frontend: frontendQuestions,
};

export function shufflePickQuestions(role: InterviewRoleId): InterviewQuestion[] {
  const pool = [...interviewQuestionBank[role]];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(Math.random() * (index + 1));
    const current = pool[index];
    const other = pool[swapWith];
    if (!current || !other) {
      continue;
    }
    pool[index] = other;
    pool[swapWith] = current;
  }
  return pool.slice(0, questionsPerRound);
}

export function optionLetter(value: string): string {
  return value.toUpperCase();
}

export function correctOption(question: InterviewQuestion): InterviewOption | undefined {
  return question.options.find((option) => option.value === question.correctValue);
}
