export const debugDifficulties = {
  easy: { id: 'easy', label: 'Easy' },
  medium: { id: 'medium', label: 'Medium' },
  hard: { id: 'hard', label: 'Hard' },
} as const;

export type DebugDifficultyId = keyof typeof debugDifficulties;

export type DebugOption = {
  value: string;
  label: string;
};

export type DebugQuestion = {
  incident: string;
  prompt: string;
  options: DebugOption[];
  correctValue: string;
  good: string;
  why: string;
  miss: string;
};

export const incidentsPerRound = 5;

function q(
  incident: string,
  prompt: string,
  options: [string, string, string, string],
  correctIndex: 0 | 1 | 2 | 3,
  good: string,
  why: string,
  miss: string,
): DebugQuestion {
  const letters = ['a', 'b', 'c', 'd'] as const;
  return {
    incident,
    prompt,
    options: options.map((label, index) => {
      const value = letters[index];
      if (!value) {
        throw new Error('Debug options must have four choices.');
      }
      return { value, label };
    }),
    correctValue: letters[correctIndex],
    good,
    why,
    miss,
  };
}

export function isDebugDifficultyId(value: string): value is DebugDifficultyId {
  return value in debugDifficulties;
}

const easyQuestions: DebugQuestion[] = [
  q(
    'The browser console is full of red text after you click a button.',
    'What should you check first?',
    ['Read the red error message in the console', 'Buy a new laptop', 'Change your Wi-Fi password', 'Delete the whole project'],
    0,
    'The console is already telling you what went wrong. Read the error before changing random files.',
    'Red text is a clue. One error message can point to the exact file and line.',
    'New hardware or Wi-Fi will not explain a JavaScript error. Open the console and read it first.',
  ),
  q(
    'You open `http://localhost:3000` and the browser says it refused to connect.',
    'What should you check first?',
    ['Is your local server actually running?', 'Register a new domain', 'Turn off your monitor', 'Delete Windows'],
    0,
    'localhost only works if an app is listening on that port. Start the server, then refresh.',
    'A refused connection usually means nothing is running, or it is on a different port.',
    'A domain name is for the public internet. For local work, start the app first.',
  ),
  q(
    'You changed some code, but the page still looks exactly the same.',
    'What should you check first?',
    ['Save the file, then hard-refresh the browser', 'Rewrite the app in another language', 'Unplug the router', 'Change your Discord name'],
    0,
    'Unsaved files and a cached page are the usual reasons. Save, then refresh (Ctrl+Shift+R).',
    'The browser can only show what it last loaded. Make sure the new code is saved and fetched.',
    'Rewriting the project is not a first step. Confirm the change actually reached the browser.',
  ),
  q(
    'An image shows as a broken icon on the page.',
    'What should you check first?',
    ['The image path and filename', 'Database indexes', 'Kubernetes', 'The office printer'],
    0,
    'Broken images are almost always a wrong path, a typo in the filename, or the file not being in that folder.',
    'The browser tried to load a file and could not find it. Check the `src` path.',
    'Printers and clusters do not load `<img>` tags. Fix the file path first.',
  ),
  q(
    'A button does nothing when you click it.',
    'What should you check first?',
    ['The console, and whether a click handler is attached', 'Increase RAM', 'Change the logo', 'Disable HTTPS'],
    0,
    'If a click does nothing, the handler is missing, the selector is wrong, or there is a JS error. Console first.',
    'The click has to be connected to a function. Prove that the function even runs.',
    'More RAM will not wire up a button. Check the handler and the console.',
  ),
  q(
    'You visit a page and get **404 Not Found**.',
    'What should you check first?',
    ['The URL or route spelling', 'Format the disk', 'Add more CSS', 'Change your GitHub username'],
    0,
    'A 404 means that path does not exist. Check for typos, a missing page, or a route you never created.',
    'The server looked for that URL and found nothing. Start with the path.',
    'CSS and usernames do not create routes. Confirm the URL first.',
  ),
  q(
    '`npm start` fails with a missing module error.',
    'What should you check first?',
    ['Run `npm install` in the project folder', 'Rewrite the app in Java', 'Delete the git repo', 'Change the font'],
    0,
    'Missing modules usually mean dependencies were never installed. Run install, then try start again.',
    'The error names a package that is not on disk yet.',
    'A new language will not install `node_modules`. Install first.',
  ),
  q(
    'A form reloads the page and the typed data disappears.',
    'What should you check first?',
    ['Handle submit in JavaScript and stop the default reload', 'Buy an SSL certificate', 'Change the wallpaper', 'Unplug the router'],
    0,
    'HTML forms reload by default. Catch the submit event, call `preventDefault()`, then send the data yourself.',
    'If the page reloads, your JS never kept the values. Stop the default submit first.',
    'Certificates and wallpapers do not keep form state. Fix the submit handler.',
  ),
  q(
    'You think you sent code to GitHub, but GitHub still shows the old files.',
    'What should you check first?',
    ['Did you `git add`, `commit`, and `push`?', 'Restart Discord', 'Only edit the README on your laptop', 'Delete the remote repo'],
    0,
    'GitHub only updates after a commit is pushed. Check `git status` and push the branch.',
    'Saving a file locally is not the same as publishing it.',
    'Restarting chat apps will not upload commits. Check add, commit, and push.',
  ),
  q(
    'The site works on your computer. A friend says they cannot open it.',
    'What should you check first?',
    ['Are they using localhost, or do they need a deployed / shared URL?', 'Rewrite all the CSS', 'Change your display name', 'Turn off backups'],
    0,
    '`localhost` is only on your machine. Share a deployed link, or run a tunnel, if you want someone else to see it.',
    'Your computer is not their computer. They need a URL that reaches your app.',
    'CSS rewrites will not publish a local server. Share a real URL first.',
  ),
];

const mediumQuestions: DebugQuestion[] = [
  q(
    'The API works in Postman, but the website shows a CORS error in the console.',
    'What should you check first?',
    ['CORS settings on the API (allowed origin)', 'Postgres vacuum', 'CDN image quality', 'Git branch names'],
    0,
    'CORS is a browser rule. Postman is not a browser, so it can succeed while the site is blocked. Allow your frontend origin on the API.',
    'The console already named CORS. Match the site origin to the API allowlist.',
    'Database cleanup will not add CORS headers. Fix the API origin settings first.',
  ),
  q(
    'The app worked yesterday. After a restart it cannot connect to the database.',
    'What should you check first?',
    ['`.env` values: host, port, user, password, and that the DB is running', 'The production CDN', 'The App Store listing', 'Discord permissions'],
    0,
    'Local DB failures are usually config. Confirm `.env` is loaded and the database process is up.',
    'If the code did not change, the connection string or the DB being off is the first suspect.',
    'Store listings do not open a database socket. Check env and that the DB is running.',
  ),
  q(
    'The login API returns **200**, but the web app still shows “failed to log in”.',
    'What should you check first?',
    ['Browser Network tab and how the frontend reads the response', 'Database indexes', 'DNS TTL', 'Load balancer certificates'],
    0,
    'The backend already succeeded. The bug is likely how the frontend stores the token or handles the JSON.',
    'If the API is fine, the next evidence is on the client: status, body, and console.',
    'Indexes matter if login itself failed. Here the API is fine, so look at the frontend next.',
  ),
  q(
    'A page that worked yesterday is a **404** after you deployed.',
    'What should you check first?',
    ['The route or filename you just shipped', 'Buy a new domain', 'Give the database more RAM', 'Turn off HTTPS'],
    0,
    'A 404 right after a deploy usually means a renamed path, a missing file, or the client calling an old URL.',
    'The last change is the cheapest place to look.',
    'Hardware and TLS do not explain one missing path. Check the route you deployed.',
  ),
  q(
    'You added a CSS class, but nothing on the page changes.',
    'What should you check first?',
    ['Spelling of the class in HTML vs CSS, and that the CSS file is linked', 'WHOIS records', 'Monitor refresh rate', 'SSH keys'],
    0,
    'A typo (`btn` vs `button`) or a CSS file that never loaded will look like “CSS is broken”.',
    'The browser can only style classes it actually finds.',
    'DNS and SSH are unrelated. Match the class name and confirm the stylesheet loaded.',
  ),
  q(
    'The frontend `fetch` fails with **404**, but you thought the API was ready.',
    'What should you check first?',
    ['The URL in the frontend vs the real API route', 'The company name', 'Favicon cache', 'Git tags'],
    0,
    'A 404 on fetch means that exact URL is wrong: missing `/api`, wrong port, or a typo.',
    'Compare the Network tab URL with the route your server actually has.',
    'Favicons do not define API paths. Align the two URLs first.',
  ),
  q(
    'Password reset emails stopped arriving. The rest of the app still works.',
    'What should you check first?',
    ['Mail logs and the email provider dashboard', 'The CSS theme', 'How many Kubernetes nodes you have', 'The favicon'],
    0,
    'If only email is missing, inspect the send path: queue, provider errors, and spam folder tests.',
    'A working app with missing mail means the mail step failed, not the whole site.',
    'Themes and extra servers will not deliver mail. Check the provider and logs first.',
  ),
  q(
    'You updated a setting, but users still see the old value.',
    'What should you check first?',
    ['Cache, hard refresh, and whether the app still has the old value loaded', 'WHOIS records', 'Monitor brightness', 'SSH keys'],
    0,
    'Stale UI is often cache: browser cache, CDN, or a server that never reloaded config.',
    'If the save worked, something is still serving the previous value.',
    'DNS ownership is not how settings reach users. Check cache and reload first.',
  ),
  q(
    'It works on your PC. Your teammate gets “missing environment variable”.',
    'What should you check first?',
    ['They need a `.env` (from `.env.example`) with the same keys', 'Rewrite SQL to use SELECT *', 'Disable health checks', 'Buy a bigger domain'],
    0,
    'Env files are local and usually not in git. Share the required keys, not your secrets, via `.env.example`.',
    'Their machine never received the variables yours already has.',
    'SQL style will not create env vars. Copy the expected keys first.',
  ),
  q(
    'The frontend crashes with a JSON parse error after calling the API.',
    'What should you check first?',
    ['Network tab: what body did the API actually return?', 'Restart Discord', 'Turn off backups', 'Guess and rewrite everything'],
    0,
    'JSON.parse fails when the response is HTML, empty, or an error page. Read the real body first.',
    'Do not assume the API returned JSON. Prove it in the Network tab.',
    'Guessing the whole stack wastes time. Inspect the response body first.',
  ),
];

const hardQuestions: DebugQuestion[] = [
  q(
    'Users get **502 Bad Gateway**. Your terminal still shows the app “running”.',
    'What should you check first?',
    ['Did the app crash or is the proxy pointing at the wrong port?', 'Change the button color', 'Increase image quality', 'Edit the README'],
    0,
    'A 502 means the proxy could not get a valid response. Check crash logs, the port, and that the process is really listening.',
    'The gateway is the clue: the hop behind it failed.',
    'UI polish will not fix a proxy that cannot talk to the app. Read the process and proxy logs first.',
  ),
  q(
    'The database error is “too many connections”.',
    'What should you check first?',
    ['Are you opening a new DB client on every request?', 'Add another frontend framework', 'Lower the log level only', 'Change the company name'],
    0,
    'Each request should reuse a pool, not `new Client()` every time. Count connections and look for leaks.',
    'Databases have a limit. Find who is opening extras.',
    'A new UI library will not close sockets. Inspect how you connect first.',
  ),
  q(
    'A nightly job sometimes creates the same order twice.',
    'What should you check first?',
    ['Did two runs overlap, or did the job run twice with no lock?', 'Increase the font size', 'Add more banner images', 'Change Discord nicknames'],
    0,
    'If a job is still running when the next one starts, you can write twice. Use a lock or skip if the last run is alive.',
    'Two workers doing the same write is a classic duplicate.',
    'UI tweaks will not stop a second run. Prevent overlap first.',
  ),
  q(
    'A rate limit starts blocking a whole classroom on shared Wi-Fi.',
    'What should you check first?',
    ['You are limiting by IP, and they all share one address', 'Database collation', 'Docker Hub limits', 'The office printer'],
    0,
    'IP limits treat a whole network as one user. Key on account or user id when you can.',
    'Many people, one Wi-Fi, one IP. That is a limiter design issue.',
    'Printers are unrelated. Inspect the rate-limit key first.',
  ),
  q(
    'Memory use climbs for hours until the app is killed, then it starts over.',
    'What should you check first?',
    ['A list or cache that grows forever and never clears', 'Buy a bigger domain', 'Disable health checks forever', 'Use SELECT * everywhere'],
    0,
    'If memory only drops after a crash, something is storing data without bound. Find the growing array or cache.',
    'A restart that “fixes” memory is a clue, not a solution.',
    'Hiding health checks just delays the crash. Find what is growing first.',
  ),
  q(
    'A payment webhook retried and a customer was charged twice.',
    'What should you check first?',
    ['The same event was processed twice. Ignore duplicates (idempotency)', 'CDN purge', 'A new color palette', 'A bigger server for the blog'],
    0,
    'Providers retry. Save the event id and skip it the second time so a retry is a no-op.',
    'Retries are normal. Charging again for the same event is the bug.',
    'CDNs do not settle cards. Make the handler ignore duplicate events first.',
  ),
  q(
    'A save works, but a read right after still shows the old value.',
    'What should you check first?',
    ['Cache, or a replica that has not caught up yet', 'CSS minification', 'Favicon cache', 'Git tags'],
    0,
    'The write may be on one place while the read hits a cache or a slower copy. Read from the same source you just wrote, or wait for it.',
    'If the write succeeded, the next question is which copy you read.',
    'Frontend assets do not explain stale rows. Check cache and read routing first.',
  ),
  q(
    'After a deploy, some users get **401** on APIs that still work for others.',
    'What should you check first?',
    ['Old tokens vs new auth, or mixed old and new servers', 'The landing page gradient', 'WHOIS privacy', 'Monitor brightness'],
    0,
    'Partial 401s often mean some servers have new secrets while others do not, or tokens from before the deploy.',
    'If only some traffic fails, compare a working user with a failing one.',
    'Visuals do not mint tokens. Check auth and the mix of servers first.',
  ),
  q(
    'Users say “this page is slow”, but you do not know if it is the API, the database, or the frontend.',
    'What should you check first?',
    ['Measure: Network tab timings, then the slowest request', 'Guess and rewrite everything', 'Restart Discord', 'Turn off backups'],
    0,
    'Slowness is a measurement problem. See which request is slow, then fix that layer.',
    'Without timings you are guessing, and guessing targets the wrong place.',
    'Restarting chat apps does not tell you which hop is slow. Measure first.',
  ),
  q(
    'After a small code change, the API hangs and never returns.',
    'What should you check first?',
    ['The new code: infinite loop, missing `await`, or a wait that never ends', 'Buy more domains', 'Change the logo', 'Disable logging forever'],
    0,
    'A hang right after a change is often a loop or a forgotten `await`. Reproduce it and read the new lines.',
    'The last diff is the cheapest place to look.',
    'Branding will not unblock a stuck function. Read the new code first.',
  ),
];

export const debugQuestionBank: Record<DebugDifficultyId, DebugQuestion[]> = {
  easy: easyQuestions,
  medium: mediumQuestions,
  hard: hardQuestions,
};

function isoWeekKey(date = new Date()): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWith<T>(items: T[], random: () => number): T[] {
  const pool = [...items];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(random() * (index + 1));
    const current = pool[index];
    const other = pool[swapWith];
    if (!current || !other) {
      continue;
    }
    pool[index] = other;
    pool[swapWith] = current;
  }
  return pool;
}

export function shufflePickIncidents(difficulty: DebugDifficultyId): DebugQuestion[] {
  const random = mulberry32(hashSeed(`${difficulty}:${isoWeekKey()}`));
  return shuffleWith(debugQuestionBank[difficulty], random).slice(0, incidentsPerRound);
}

export function optionLetter(value: string): string {
  return value.toUpperCase();
}

export function correctOption(question: DebugQuestion): DebugOption | undefined {
  return question.options.find((option) => option.value === question.correctValue);
}
