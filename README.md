# ShopAI — AI-Powered E-commerce & Voice Support

A demo storefront with an AI support agent ("Sarah") that talks to customers over
**text, browser voice, and phone**, understands business context, retrieves company
knowledge, calls backend tools, and performs approved actions — with full admin
visibility into every conversation.

Built to showcase the recurring capabilities clients ask for: real-time voice, tool
calling, knowledge bases / RAG, business-system integration, multi-step workflows,
logging, testing, and conversation summaries.

---

## What it does

- **Storefront** — 102 products across 10 categories, search + filters, product detail
  pages (highlights, specs, reviews, related products), cart, and checkout.
- **AI support agent (Sarah)** — a single [ElevenLabs](https://elevenlabs.io)
  Conversational AI agent available over **text chat** and **browser voice** (WebRTC),
  with markdown-formatted replies, a typing indicator, streaming text, and a live
  transcript.
- **17 tools** — the agent can search the catalog and categories, read orders, modify
  the cart, cancel orders, check return eligibility and create returns, open support
  tickets, escalate to a human, and book expert consultations — all through
  authenticated server webhooks that **never trust a customer id from the model**.
- **Knowledge base / RAG** — six policy documents (shipping, returns, warranty, FAQ,
  support, privacy) uploaded to ElevenLabs and retrieved at conversation time for
  grounded policy answers.
- **Consultation booking** — customers can browse open slots and book/confirm/cancel,
  or ask Sarah to do it for them.
- **Admin console** — overview analytics, conversations (with transcripts + tool
  calls), tickets (with a detail modal), customers, knowledge, agent config, and a
  live **test suite**.
- **Persistence** — tool calls are captured live; the browser posts each chat/voice
  transcript to the app so conversations always appear in the admin; and a post-call
  webhook syncs phone transcripts + AI summaries.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions, Turbopack) |
| Language | TypeScript, Zod 4 |
| UI | Tailwind CSS v4, shadcn/ui, Lucide icons |
| Database | PostgreSQL ([Neon](https://neon.tech)) via Prisma 6 |
| AI agent | ElevenLabs Conversational AI (`@elevenlabs/react`) |

## Architecture at a glance

```
Browser ──► /support (text or voice)
   │            │
   │            ▼
   │      ElevenLabs Agent ──(server tool calls, signed)──► /api/ai/tools/[tool]
   │            │                                              │ verify secret + session token
   │            │                                              │ run tool → controlled services → Postgres
   │            │                                              ▼
   │            │                                         tool_calls (live capture)
   │            ├──(transcript, live)──► /api/ai/session-log ──► conversations + messages
   │            └──(phone call ends)──► /api/ai/webhooks ──► transcript + AI summary
   ▼
Storefront (products, cart, orders, consultations)  +  /admin console
```

Identity is derived server-side from a signed session token (never from the model);
see [`docs/ELEVENLABS_SETUP.md`](docs/ELEVENLABS_SETUP.md) and the spec's §21.

---

## Getting started

### 1. Prerequisites

- Node.js 20+ and npm
- A PostgreSQL database (Neon's free tier works). You need a **pooled** connection
  string for the app and a **direct** (non-pooled) one for migrations.
- An [ElevenLabs](https://elevenlabs.io) account + API key (free tier is enough to
  build and test).

### 2. Install

```bash
npm install
```

### 3. Configure `.env`

> **New to this?** [`docs/SETUP.md`](docs/SETUP.md) is a plain-language, step-by-step
> walkthrough of every key — where to get it and the order to fill them in.

Create a `.env` in the project root:

```bash
# Database (Neon: pooled for the app, direct for migrations)
DATABASE_URL="postgresql://…-pooler.../neondb?sslmode=require"
DIRECT_URL="postgresql://…/neondb?sslmode=require"

# App identity
SESSION_TOKEN_SECRET="<random 32-byte hex>"

# ElevenLabs
ELEVENLABS_API_KEY="sk_…"
ELEVENLABS_WEBHOOK_SECRET="<random 32-byte hex>"   # tool shared-secret header
ELEVENLABS_POST_CALL_SECRET="wsec_…"               # post-call webhook signing secret
APP_URL="https://<your-public-tunnel>"             # public URL ElevenLabs calls
NEXT_PUBLIC_ELEVENLABS_AGENT_ID="agent_…"          # printed by `npm run agent:setup`
ELEVENLABS_AGENT_ID="agent_…"                      # same id (used by kb:setup)

# Optional: set to "false" to enforce a strict identity gate (no demo fallback)
DEMO_IDENTITY_FALLBACK="true"
```

Generate a random secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Set up the database

```bash
npm run db:migrate     # create the schema
npm run db:seed        # 102 products, reviews, demo customer, orders, KB rows, slots
npm run seed:admin     # sample conversations, tickets, a booking (for the admin demo)
```

### 5. Set up the ElevenLabs agent

The app runs without this (the storefront + admin work fully), but the agent needs it.
See [`docs/ELEVENLABS_SETUP.md`](docs/ELEVENLABS_SETUP.md) for the full walkthrough:

```bash
npm run kb:setup       # uploads the 6 policy docs
npm run agent:setup    # creates the agent + 17 webhook tools, attaches the docs,
                       #   and writes the agent id into .env for you
```

Restart the dev server afterwards. Optionally configure a post-call webhook at
`<APP_URL>/api/ai/webhooks` (mainly for phone / AI summaries — browser conversations
are captured without it).

> The agent's tools are called server-to-server, so `APP_URL` must be publicly
> reachable — expose `localhost:3000` with a tunnel (ngrok, cloudflared, or a VS Code
> dev tunnel) and set `APP_URL` to that URL.

### 6. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

---

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply Prisma migrations (dev) |
| `npm run db:seed` | Seed catalog, customer, orders, KB rows, slots |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:reset` | Reset + re-migrate + re-seed the database |
| `npm run add:products` | Add extra products to the existing DB (no wipe) |
| `npm run agent:setup` | Create the ElevenLabs agent + 17 tools (auto-updates `.env`) |
| `npm run agent:voice` | Update just Sarah's voice/tone on the existing agent |
| `npm run agent:prompt` | Push an edited prompt (`src/lib/ai/agent-prompt.ts`) into the DB |
| `npm run kb:setup` | Upload policy docs and attach them to the agent |
| `npm run seed:admin` | Seed sample conversations/tickets/booking for the admin demo |
| `npm run seed:slots` | Refresh open consultation slots |
| `npm run test:scenarios` | Run the application-level agent scenario suite (CI-friendly) |

## Testing

`npm run test:scenarios` drives the **real tool handlers** against isolated,
self-cleaning fixtures and asserts outputs, business rules, and authorization (order
tracking, search, cart, cancel eligible/shipped, returns, escalation, booking, and a
wrong-owner identity check). The same suite renders live at **`/admin/tests`**.

## Documentation

- [`docs/SETUP.md`](docs/SETUP.md) — **start here**: plain-language guide to setting up the keys before testing
- [`docs/PROJECT_GUIDE.md`](docs/PROJECT_GUIDE.md) — plain-language overview of what the app is, how it works, and how to test it
- [`docs/ELEVENLABS_SETUP.md`](docs/ELEVENLABS_SETUP.md) — agent, tools, knowledge base, and post-call webhook setup
- [`docs/DEMO_SCRIPT.md`](docs/DEMO_SCRIPT.md) — a guided client demo walkthrough
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — deploying to Vercel + Neon and going demo → production
- [`docs/ShopAI_Detailed_Build_Specification_v2.md`](docs/ShopAI_Detailed_Build_Specification_v2.md) — the full build specification

## Notes & limitations

- **Demo checkout** takes no real payment and ships nothing.
- **Phone (Twilio)** is designed but not enabled — it requires a paid ElevenLabs tier
  for commercial use and a Twilio number (see `DEPLOYMENT.md`).
- **Identity fallback** — for a single-customer demo, tool calls fall back to the
  seeded demo customer when no session token is forwarded. Set
  `DEMO_IDENTITY_FALLBACK=false` to enforce the production-accurate identity gate.
- The `/admin` console is unauthenticated for the demo; gate it behind an admin role
  before any real deployment.
