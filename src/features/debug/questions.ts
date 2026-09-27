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
    'Your API suddenly returns **500 Internal Server Error**.',
    'What would you check first?',
    ['Application logs', 'Database', 'Frontend', 'DNS'],
    0,
    'A 500 means the server encountered an unexpected error. Before changing infrastructure or querying the database, you would normally inspect the application logs to identify what actually failed.',
    'Logs give you direct evidence about the failure instead of guessing.',
    'The database, frontend, or DNS might be involved later — but a 500 is a server-side exception. Start with the logs so you know *what* broke before you start changing systems.',
  ),
  q(
    'Users say the site is down. On your machine it loads fine.',
    'What would you check first?',
    ['Your local cache only', 'Status page, uptime, and who is affected', 'Rewrite the homepage', 'Delete the database'],
    1,
    'Confirm the incident is real and how wide it is. Check status, error rates, and whether it is one region, one ISP, or everyone.',
    'You cannot debug a “down” report until you know if it is global, partial, or just one user.',
    'Rewriting UI or wiping data is not a first step. Scope the outage first: is production actually failing, and for whom?',
  ),
  q(
    'The login API returns 200, but the web app still shows “failed to log in”.',
    'Where would you look first?',
    ['Database indexes', 'Browser network tab and frontend error handling', 'DNS TTL', 'Load balancer SSL certs'],
    1,
    'The backend already succeeded. The mismatch is almost always how the frontend reads the response, stores the token, or handles a CORS/network error.',
    'If the API is healthy, the next evidence is on the client: status, body, and console errors.',
    'Indexes and DNS would matter if the API itself failed. Here the API is fine, so the client path is the first place to look.',
  ),
  q(
    'A feature that worked yesterday now 404s on one endpoint after a deploy.',
    'What would you check first?',
    ['Recent commit, routing, and the deployed path', 'Buy a new domain', 'Increase RAM on the database', 'Disable HTTPS'],
    0,
    'A sudden 404 after a deploy usually means a renamed route, a missing rewrite, or an old client hitting a path that no longer exists.',
    'The deploy is the change. Compare what shipped with what the client is calling.',
    'Hardware and TLS are unrelated to a single-path 404. Start with the route and the diff you just shipped.',
  ),
  q(
    'The browser console shows a CORS error when calling your API from the app.',
    'What would you check first?',
    ['Postgres vacuum', 'API CORS allowlist and the request Origin', 'CDN image compression', 'Git branch names'],
    1,
    'CORS is enforced by the browser based on the `Origin` header and the API’s Access-Control-* responses. Confirm the frontend origin is allowed and that preflight (OPTIONS) succeeds.',
    'The error message already points at cross-origin policy, not storage or images.',
    'Database maintenance will not fix a browser blocking the response. Align Origin and CORS headers first.',
  ),
  q(
    'The app cannot connect to the database locally. Production is fine.',
    'What would you check first?',
    ['Local env vars, host, port, and that the DB is running', 'Production CDN', 'App Store listing', 'Discord permissions'],
    0,
    'Local-only connection failures are almost always config: wrong `.env`, DB not running, or host `localhost` vs Docker service name.',
    'If production works, the code path is probably fine. Your machine’s connection string is the first evidence.',
    'CDN and store listings do not open a local Postgres socket. Check env and that the database process is actually up.',
  ),
  q(
    'Password reset emails stopped arriving. The rest of the app works.',
    'What would you check first?',
    ['Mail provider dashboard, queue, and app mail logs', 'CSS theme', 'Kubernetes node count', 'Favicon'],
    0,
    'Email is a side channel. Check whether jobs are queued, the provider rejected them, or logs show a send error — before touching unrelated infra.',
    'A working app with missing mail means the mail path failed, not the whole site.',
    'Themes and extra nodes will not deliver mail. Inspect the provider and the send logs first.',
  ),
  q(
    'A config change in the admin panel is not showing up for users.',
    'What would you check first?',
    ['Cache, CDN, and whether the app still has the old value loaded', 'WHOIS records', 'Monitor refresh rate', 'SSH keys'],
    0,
    'Stale config is usually cache: in-memory settings, Redis, or a CDN edge still serving the old payload.',
    'If the write succeeded, the next question is what still holds the previous value.',
    'DNS ownership and SSH keys are not how feature flags reach browsers. Check caches and process config first.',
  ),
  q(
    'After a small code change, the API hangs and never returns.',
    'What would you check first?',
    ['Recent code for blocking calls, infinite loops, or a lock wait', 'Buy more domains', 'Change the logo', 'Disable logging forever'],
    0,
    'A hang after a code change is often an unbounded wait: deadlock, missing `await`, or a loop that never ends. Reproduce it and read the stack while it is stuck.',
    'The last diff is the cheapest place to look when behavior flipped immediately after a change.',
    'Branding and DNS will not unblock a stuck thread. Capture a stack trace / logs around the new code first.',
  ),
  q(
    'Users report “this page is slow” but you do not know if it is the API, the DB, or the frontend.',
    'What would you check first?',
    ['Guess and rewrite everything', 'Measure: timings in logs, network waterfall, and DB query time', 'Restart Discord', 'Turn off backups'],
    1,
    'Slowness is a measurement problem. Split the request: TTFB vs download vs query time vs client render, then fix the slowest part.',
    'Without timings you are guessing, and guessing is how you “optimize” the wrong layer.',
    'Restarting chat apps or disabling backups does not tell you which hop is slow. Measure first.',
  ),
];

const mediumQuestions: DebugQuestion[] = [
  q(
    'Clients get **502 Bad Gateway** in bursts. Your app process looks alive.',
    'What would you check first?',
    ['Upstream timeouts, crash loops, and proxy error logs', 'Change the button color', 'Increase image quality', 'Edit README'],
    0,
    'A 502 usually means the proxy could not get a valid response from the app: crash, timeout, or it never bound the port. Proxy and process logs are the first evidence.',
    'The gateway already told you the hop behind it failed. Confirm that hop before touching UI.',
    'Frontend polish will not fix a proxy that cannot talk to the app. Read nginx/ALB and application restart logs first.',
  ),
  q(
    'p50 latency is fine, but p99 is 8 seconds.',
    'What would you check first?',
    ['Average CPU only', 'Slow outliers: locks, cold cache, GC, or a few heavy queries', 'Delete indexes', 'Disable HTTPS'],
    1,
    'Tail latency lives in rare events. Look at the slow traces, not the average. Common causes: lock waits, N+1, GC pauses, or a noisy neighbor.',
    'Averages hide the incidents users feel. p99 is where production pain shows up.',
    'Dropping indexes or TLS usually makes things worse. Isolate the slow subset of requests first.',
  ),
  q(
    'The API starts returning “too many connections” from the database.',
    'What would you check first?',
    ['Connection pool size, leaks, and who is opening extra clients', 'Add another frontend framework', 'Lower log level only', 'Change the company name'],
    0,
    'The database is refusing new clients. Count open connections per app instance, look for pools created per request, and whether you scaled pods without shrinking pool size.',
    'This is a finite resource. Find who is holding connections before you add more of them blindly.',
    'A new UI library will not close sockets. Inspect pools and connection leaks first.',
  ),
  q(
    'Writes succeed on the primary, but some reads immediately after still show old data.',
    'What would you check first?',
    ['Replica lag and whether reads hit replicas', 'CSS minification', 'Favicon cache', 'Git tags'],
    0,
    'Read-after-write bugs often mean you read from a replica that has not caught up, or from a cache that was not invalidated.',
    'If the write is durable on the primary, the next question is which node served the read.',
    'Frontend assets do not explain stale rows. Check replication delay and read routing first.',
  ),
  q(
    'Memory use climbs for days until the process is killed, then it starts over.',
    'What would you check first?',
    ['Heap / allocation growth (caches, listeners, unbounded queues)', 'Buy a bigger domain', 'Disable health checks forever', 'Rewrite SQL to use SELECT *'],
    0,
    'A sawtooth that only dies on OOM is a leak or an unbounded cache. Capture heap growth, watch listener and map sizes, and look for queues that never drain.',
    'A restart that “fixes” memory is a clue, not a solution. Find what grows across requests.',
    'Hiding health checks just delays the crash. Profile what is retained first.',
  ),
  q(
    'A rate limiter starts blocking real users who share a school or office network.',
    'What would you check first?',
    ['You are keying on IP; many users share one NAT address', 'Database collation', 'Docker Hub rate limits', 'The office printer'],
    0,
    'IP-based limits treat a whole NAT as one client. Confirm how you identify users and whether you should key on account, token, or a better fingerprint.',
    'The symptom is “lots of people, one address.” That is a limiter design issue, not a SQL collation issue.',
    'Printers and image registries are unrelated. Inspect the rate-limit key and the shared IP first.',
  ),
  q(
    'A nightly job sometimes creates duplicate orders when it runs long and overlaps the next run.',
    'What would you check first?',
    ['Job locking / idempotency so only one run mutates data', 'Increase font size', 'Add more banner images', 'Change Discord nicknames'],
    0,
    'Overlapping cron is a classic double-write. Use a lock, skip if the previous run is alive, and make the write idempotent (unique constraint or upsert).',
    'The schedule is the race. Prevent two workers from applying the same side effect.',
    'UI tweaks will not stop a second worker. Add mutual exclusion and idempotency first.',
  ),
  q(
    'After deploy, some users get 401 on APIs that still work for others.',
    'What would you check first?',
    ['Token version, clock skew, and mixed old/new instances', 'The landing page gradient', 'WHOIS privacy', 'Monitor brightness'],
    0,
    'Partial 401s after a release often mean rolling deploys with incompatible tokens, a secret rotation, or servers with drifted clocks rejecting `exp`.',
    'If only some traffic fails, compare healthy vs failing instances and the tokens they reject.',
    'Visuals do not mint JWTs. Check auth code, secrets, and instance mix first.',
  ),
  q(
    'A list endpoint got much slower after switching to an ORM “include” for related rows.',
    'What would you check first?',
    ['Query logs for N+1 or a huge JOIN, then batch or index', 'Add more replicas immediately with no measurement', 'Minify HTML comments', 'Turn off error tracking'],
    0,
    'ORMs hide extra queries. Turn on query logging: you will often see one query per row. Fix with a join, preload, or pagination — then index what you filter.',
    'The change you made is the ORM include. Measure the queries it now emits.',
    'Blindly adding replicas copies the same bad query. Read the query log first.',
  ),
  q(
    'Payment webhooks retried and some customers were charged twice.',
    'What would you check first?',
    ['Idempotency keys / unique payment intent on the provider event id', 'CDN purge', 'New color palette', 'Larger EC2 for the blog'],
    0,
    'Providers retry. Charge once per event id with a unique constraint or idempotency key, then return 200 so retries are no-ops.',
    'Retries are expected. The bug is treating the same event as a new payment.',
    'CDNs and blog servers do not settle cards. Make the webhook handler idempotent first.',
  ),
];

const hardQuestions: DebugQuestion[] = [
  q(
    'After a network partition, two nodes both think they are the leader and both accepted writes.',
    'What would you check first?',
    ['Fencing, quorum, and whether split-brain writes can be identified', 'Add more frontend spinners', 'Lower DNS TTL to 1 second', 'Delete all metrics'],
    0,
    'Two leaders is split-brain. You need fencing (only the current epoch can write), quorum, and a way to detect conflicting writes before you “fix” data blindly.',
    'Availability theater is dangerous here. Correctness depends on who was allowed to write.',
    'UI and DNS TTL will not reconcile two writers. Restore a single leader and fence the stale one first.',
  ),
  q(
    'Requests time out in waves every few minutes. CPU is not pegged, but pause time is high.',
    'What would you check first?',
    ['GC / runtime pauses and heap pressure, not “add more load balancers” first', 'Buy another domain', 'Disable all indexes', 'Rewrite CSS'],
    0,
    'Periodic timeouts with high pause time often mean stop-the-world GC (or similar). Heap dumps, GC logs, and allocation rate beat adding more LBs that all pause together.',
    'Load balancers spread traffic; they do not shrink pause times on each process.',
    'More frontends copy the same pause. Prove it is GC (or another stop-the-world) before scaling out.',
  ),
  q(
    'A hot cache key expires and the database is instantly slammed by every instance.',
    'What would you check first?',
    ['Thundering herd: lock, singleflight, or jittered expiry — not 10x the DB first', 'Increase JPEG quality', 'Change the logo font', 'Turn off backups'],
    0,
    'This is cache stampede. Collapse duplicate misses (lock/singleflight), stagger TTLs, and keep a stale fallback so one expiry does not become N identical queries.',
    'The database is the victim, not the first lever. Stop the herd, then size the DB if you still must.',
    'Media tweaks will not serialize cache fills. Coordinate misses before you scale the database.',
  ),
  q(
    'TLS handshakes fail for some corporate clients, but curl from your laptop works.',
    'What would you check first?',
    ['SNI, intermediate chain, and cipher/TLS version mismatch', 'Postgres autovacuum', 'Kubernetes dashboard theme', 'Git commit emojis'],
    0,
    'Partial TLS failure is usually chain completeness, SNI, or an old client that cannot do TLS 1.2+/your ciphers. Compare a failing handshake dump with a working one.',
    'Your laptop is a modern client. The failing fleet is the evidence.',
    'Database vacuum does not complete a certificate chain. Capture the handshake from a failing client first.',
  ),
  q(
    'A Kubernetes pod is CrashLoopBackOff. Events say OOMKilled.',
    'What would you check first?',
    ['Memory limit vs actual usage, leaks, and whether the limit is too low', 'Change Ingress to HTTP only', 'Shuffle node labels at random', 'Disable liveness probes forever'],
    0,
    'OOMKilled means the cgroup limit was hit. Compare RSS to the limit, look for a leak, and only then raise the limit with a reason — not by turning off probes so it dies quietly.',
    'The kube event already named the cause. Treat it as a memory budget problem first.',
    'Random label changes do not raise a memory cap. Inspect usage vs limit first.',
  ),
  q(
    'A distributed lock expired while the holder was still working, and a second worker wrote the same row.',
    'What would you check first?',
    ['Lock TTL vs work time, and fencing tokens so a stale holder cannot write', 'Add React Strict Mode', 'Minify JSON keys', 'Increase Discord volume'],
    0,
    'Expiry-based locks are not enough. Use a fencing token / compare-and-set so a late holder’s write is rejected after it lost the lock.',
    'The race is “I still think I own this.” TTL expiry must invalidate the writer, not just the lock key.',
    'Frontend flags will not fence a stale worker. Fix lock semantics first.',
  ),
  q(
    'JWT `exp` checks fail for one region around clock-change weekends. Other regions are fine.',
    'What would you check first?',
    ['NTP / clock drift on those nodes vs token lifetime leeway', 'CSS grid gaps', 'S3 bucket names', 'The office Wi-Fi password'],
    0,
    'Auth that depends on wall clock breaks when NTP is wrong. Check time on the bad region, add small leeway, and alert on drift — do not rebuild the SPA.',
    'Region-scoped time bugs are clocks, not tokens “randomly rotting.”',
    'Bucket names do not skew `exp`. Sync time and verify skew first.',
  ),
  q(
    'A retrying client plus a failing dependency turns a small error into a full outage.',
    'What would you check first?',
    ['Retry amplification: backoff, jitter, and a circuit breaker', 'Add more pods that all retry harder', 'Disable all timeouts', 'Log less so disks fill slower'],
    0,
    'Retries multiply load on a sick dependency. Use exponential backoff with jitter, cap attempts, and open a circuit so you fail fast instead of a retry storm.',
    'More replicas retrying in parallel is how you DDoS yourself.',
    'Removing timeouts hides hangs. Contain retries first, then repair the dependency.',
  ),
  q(
    'Under READ COMMITTED, a report sometimes counts a row that a concurrent transaction later rolled back — or misses a row that committed mid-scan.',
    'What would you check first?',
    ['Isolation / snapshot reads for a consistent report', 'CDN image formats', 'The marketing banner', 'Pod restart count only'],
    0,
    'This is isolation, not “the ORM is haunted.” A consistent report usually needs REPEATABLE READ / a snapshot, or a dedicated reporting replica frozen at a timestamp.',
    'The anomaly matches the isolation guarantee you asked for. Change the guarantee, not the banner.',
    'Images do not freeze a transaction snapshot. Pick the right isolation (or snapshot) first.',
  ),
  q(
    'HTTP/1.1 clients stall behind one slow response on a shared connection, while HTTP/2 clients on the same host look fine.',
    'What would you check first?',
    ['Head-of-line blocking on the connection; connection reuse vs multiplexing', 'SQL CHECK constraints', 'The TLS certificate country field', 'Kubernetes liveness path spelling only'],
    0,
    'HTTP/1.1 reuses a connection but does not multiplex. One slow response blocks the queue. HTTP/2 multiplexes streams. Confirm connection reuse and whether you need more connections or HTTP/2.',
    'Protocol behavior explains “only some clients.” It is not a random SQL check.',
    'Certificate country codes do not unblock a head-of-line queue. Inspect how connections are reused first.',
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
