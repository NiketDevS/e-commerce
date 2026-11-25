# AI-Powered E-Commerce Customer Support Platform

> **Status:** 🚧 In Development — Day 1 of 2

A full-stack customer support platform with an AI support agent that handles orders, tickets, refunds, and human escalations.

---

## Quick Start

> Prerequisites: Node.js 18+, Docker Desktop, Git

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd support-platform

# 2. Start PostgreSQL
docker compose up -d

# 3. Set up backend
cd backend
cp ../.env.example .env          # fill in values
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev                       # starts on http://localhost:4000

# 4. Set up frontend (new terminal)
cd frontend
cp ../.env.example .env.local    # set NEXT_PUBLIC_API_URL
npm install
npm run dev                       # starts on http://localhost:3000
```

---

## Demo Accounts

> Seeded by `prisma db seed`

| Role | Email | Password |
|------|-------|----------|
| Customer (Maya) | maya@example.com | password123 |
| Customer (Arjun) | arjun@example.com | password123 |
| Support Agent (Sam) | support@example.com | password123 |

---

## Architecture

- **Frontend:** Next.js 14 (App Router), TypeScript, CSS Modules — port 3000
- **Backend:** Express.js, TypeScript, Zod — port 4000
- **Database:** PostgreSQL 15 (Docker), Prisma ORM
- **Auth:** JWT in HttpOnly cookies, bcrypt, RBAC
- **AI Agent:** Custom orchestration with deterministic mock LLM (no paid API required)

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for detailed diagrams.

---

## Running Tests

```bash
cd backend
npm test                 # all tests
npm run test:coverage    # with coverage report
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [`AI_PROJECT_CONTEXT.md`](AI_PROJECT_CONTEXT.md) | Project constitution — architecture, rules, conventions |
| [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md) | Phase-by-phase task tracker |
| [`PROGRESS.md`](PROGRESS.md) | Feature completion checklist |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System and agent architecture diagrams |
| [`docs/DATABASE.md`](docs/DATABASE.md) | Schema design and ER diagram |
| [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) | Complete REST API reference |
| [`docs/RETURN_POLICY.md`](docs/RETURN_POLICY.md) | Return and refund policy (used by AI agent) |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Engineering decision log |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Security guidelines |
| [`docs/TESTING.md`](docs/TESTING.md) | Testing guide |

---

## Key Business Rules

1. Customers access only their own data (enforced server-side from JWT).
2. Return window: 7 days from delivery date.
3. Refunds ≤ ₹5,000 auto-process when eligible.
4. Refunds > ₹5,000 require human staff approval.
5. The LLM never independently authorizes refunds.
6. All refund rules enforced in `RefundService` — not in the AI prompt.
7. Idempotency keys prevent duplicate refund transactions.

---

*Full documentation will be completed during Phase 9.*
