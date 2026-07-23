export const profile = {
  name: "Sambit Ghosh",
  role: "Backend Engineer / AI Developer Tools",
  tagline:
    "Most portfolios tell you what someone knows. Mine lets you break it.",
  email: "sambitghosh56@gmail.com",
  location: "Bengaluru, India",
  linkedin: "https://www.linkedin.com/in/samcoder",
  github: "https://github.com/Sam123336",
  bio: [
    "I build production backend systems and AI-powered developer tools — REST APIs, event-driven pipelines, caching layers, and the infrastructure that keeps them alive under load.",
    "Currently building backend services for Belivmart, a hyperlocal delivery platform live in 10+ cities, and Contextifly, a compiler-inspired Software Knowledge Graph that lets AI coding assistants understand a codebase without repeatedly reading its source.",
    "This site is a working simulator, not a slideshow — every metric on the playground canvas is computed from the components you place, not pre-recorded.",
  ],
};

export interface WorkStory {
  id: string;
  number: string;
  title: string;
  stat: string;
  context: string;
  summary: string;
  sections: { heading: string; body: string }[];
}

export const workStories: WorkStory[] = [
  {
    id: "latency",
    number: "01",
    title: "The 900ms API",
    stat: "900ms → 100ms",
    context: "BelivMart · NestJS · Redis · Postgres",
    summary: "The route serviceability check hit Postgres on every single request.",
    sections: [
      {
        heading: "The problem",
        body: "Before BelivMart can show you a menu, it has to answer one question: do we even deliver to where you're standing? That check ran on every app open, every address change, every cart refresh — and every time it went all the way to Postgres, pulled serviceability polygons stored as JSONB, and did the point-in-polygon math from scratch. p95 was sitting around 900ms for what is essentially a yes/no question.",
      },
      {
        heading: "What I tried first",
        body: "The obvious move was caching, so I put Redis in front of the check. That helped, but profiling showed the polygon query itself was still ~800ms on a cold path — the real cost was Postgres parsing JSONB geometry on every read. Caching a slow query just hides it until the cache misses.",
      },
      {
        heading: "The actual fix",
        body: "I redesigned the storage: polygons moved out of JSONB into plain coordinate arrays that Postgres can return without any parsing ceremony. The query dropped from ~800ms to ~110ms on its own. With Redis in front — keyed by geohash cell, invalidated when ops edit a zone — the whole endpoint settles at ~100ms p95.",
      },
      {
        heading: "What I'd tell you about it",
        body: "No new hardware, no rewrite, no exotic tech. The win came from looking at where the time actually went instead of assuming. The cache was the headline; the storage redesign was the fix.",
      },
    ],
  },
  {
    id: "reliability",
    number: "02",
    title: "Two requests, one order",
    stat: "race → Redis lock",
    context: "BelivMart · Redis · SQL",
    summary: "Concurrent requests were racing on shared order state and N+1 queries were multiplying DB load.",
    sections: [
      {
        heading: "The problem",
        body: "Tap a button twice on a slow connection and two identical requests land a few milliseconds apart. Both read the same order, both think they're the only one, both write. We saw orders processed twice, refunds computed twice, and states that made no sense. Separately, the order list endpoints had classic N+1 patterns — one query for the orders, then one more per order for its items — quietly multiplying database load at peak hours.",
      },
      {
        heading: "The fix",
        body: "For the races: a Redis-based distributed lock around the order-state transitions, keyed by order id, with a TTL so a crashed worker can't wedge an order forever. Second request either waits or bounces — it never operates on stale state. For the N+1s: the per-row queries collapsed into single SQL joins. Nothing clever, just reading the query log honestly.",
      },
      {
        heading: "The result",
        body: "The double-processing bug reports stopped. Not slowed down — stopped. And peak-hour DB load dropped enough that we deferred a planned instance upgrade. The most boring fixes are the ones that hold.",
      },
    ],
  },
  {
    id: "payments",
    number: "03",
    title: "Refunds without a human",
    stat: "webhook → refund engine",
    context: "BelivMart · payment gateways",
    summary: "Every cancellation used to mean someone computing a refund by hand.",
    sections: [
      {
        heading: "The problem",
        body: "A cancelled order sounds simple until you enumerate it. Who cancelled — the customer, the merchant, the rider? Before or after the food was being prepared? Was it prepaid or cash-on-delivery? Each combination pays back a different amount to a different party. A human was working this out case by case, which doesn't scale past a handful of cities.",
      },
      {
        heading: "The integration",
        body: "First the plumbing: payment gateways integrated end to end — initiating the charge, verifying webhook signatures when the async confirmation comes back, and issuing refunds through the gateway API. Gateways retry webhooks aggressively, so every handler is idempotent: each event id is processed exactly once, and a redelivery is acknowledged and dropped.",
      },
      {
        heading: "The refund engine",
        body: "On top of that sits a rules engine. It takes the order lifecycle event, the cancellation reason, and configurable business rules, and computes the customer refund and the merchant payout in one pass. Ops can adjust the rules; nobody computes money by hand anymore. When finance asks why a refund was what it was, the answer is a rule, not a guess.",
      },
    ],
  },
  {
    id: "contextifly",
    number: "04",
    title: "Contextifly",
    stat: "AST → knowledge graph",
    context: "Side project · TypeScript Compiler API · MCP",
    summary: "AI assistants re-read your codebase every conversation. Mine doesn't have to.",
    sections: [
      {
        heading: "The itch",
        body: "Every conversation with an AI coding assistant starts the same way: it greps around, opens ten files, rebuilds a mental model it had already built yesterday, and burns a pile of tokens doing it. The code didn't change that much. Why is the understanding thrown away?",
      },
      {
        heading: "The idea",
        body: "Treat it like a compiler problem. Contextifly parses React, Next.js and Flutter projects with the TypeScript Compiler API and compiles them into a knowledge graph — components, routes, hooks, API calls, and how they connect. The assistant queries the graph over MCP instead of re-reading source. Ask \"what breaks if I change CheckoutForm?\" and it answers from the graph in one hop.",
      },
      {
        heading: "The engineering",
        body: "The graph stays live the way a compiler's incremental build does: per-file symbol caching means a re-index with no changes costs ~17ms. Screenshot understanding maps UI images to the components that render them, cutting vision-token usage by 90–95%. And it's local-first — the indexer runs on your machine and source never leaves it.",
      },
      {
        heading: "Where it is now",
        body: "Live at contextifly.in, installable as a Claude plugin. This portfolio was partly built with it watching its own codebase — the knowledge graph answering questions about the site you're reading.",
      },
    ],
  },
];

export const experience = [
  {
    role: "Full Stack Developer",
    org: "Kuvi Technomart LLP",
    period: "Jun 2026 — Present",
    bullets: [
      "Develop and maintain backend services and REST APIs (NestJS, Node.js, PostgreSQL, Redis) for Belivmart, a hyperlocal delivery platform live in 10+ cities.",
      "Integrated third-party payment gateways and built an automated refund/cancellation engine driven by order-lifecycle events and configurable business rules.",
      "Cut route serviceability API latency from ~900ms to ~100ms with Redis caching, and serviceability polygon query time from ~800ms to ~110ms via a JSONB → array storage redesign.",
      "Implemented RabbitMQ event-driven communication, eliminated N+1 query patterns with SQL joins, and resolved concurrent-request race conditions with Redis-based distributed locking.",
    ],
  },
  {
    role: "Full Stack Developer Intern",
    org: "Kuvi Networks",
    period: "Dec 2025 — May 2026",
    bullets: [
      "Built backend modules and REST APIs (Node.js, Express.js, MongoDB) including auth, schema design, and third-party integrations.",
      "Contributed to API optimization, debugging, and production issue resolution using Git workflows.",
      "Worked cross-functionally to ship production-ready features in an Agile environment.",
    ],
  },
] as const;

export const education = {
  school: "Lovely Professional University",
  location: "Phagwara, Punjab",
  degree: "B.Tech, Computer Science and Engineering",
  period: "Aug 2022 — Jul 2026",
};

// grouped plain text, deliberately not a badge wall
export const stack = [
  ["backend", "TypeScript · Node.js · NestJS · Express"],
  ["data", "PostgreSQL · Redis · MongoDB"],
  ["messaging", "RabbitMQ · WebSockets · webhooks"],
  ["infra", "Docker · Kubernetes · AWS · Terraform"],
  ["tooling", "MCP · TypeScript Compiler API · Git"],
] as const;
