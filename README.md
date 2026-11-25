# AI-Powered E-Commerce Customer Support Platform

A production-ready full-stack customer support platform with an integrated AI support agent that manages customer orders, support tickets, multi-turn chat, policy lookups, automated refund processing with business guardrails, and human escalation workflows.

---

## 🌟 Key Features

### Customer Experience
- **Authentication**: Secure registration, login, and session persistence using `HttpOnly` JWT cookies and `bcrypt` password hashing.
- **Order Management**: View personal order history, order items, delivery dates, and return eligibility windows.
- **Support Tickets**: Open tickets associated with or independent of orders.
- **AI Support Agent**:
  - Multi-turn conversation continuity.
  - Automatically asks for clarification when required details (e.g. order ID) are missing.
  - Never executes premature or unauthorized tool calls.
  - Semantic keyword retrieval from a local return policy document (`docs/RETURN_POLICY.md`).
  - Automated refund processing for eligible orders up to ₹5,000.
  - Automatic escalation to human review for refunds exceeding ₹5,000.
- **Refund Tracking**: Real-time status tracking across `PENDING_REVIEW`, `APPROVED`, `PROCESSING`, `SUCCEEDED`, and `REJECTED`.

### Staff Console
- **Ticket Queue**: Centralized dashboard to filter, search, inspect, and update priority/status of all customer tickets.
- **Customer & Order Context**: Inspect complete order details and conversation history in one view.
- **Internal Notes**: Staff-only confidential notes stored separately in `TicketNote`—never exposed to customer endpoints.
- **Escalation & High-Value Refund Review**: Review escalated tickets and refunds > ₹5,000 with one-click **Approve & Execute**, **Reject**, or **Request More Info**.

---

## 🏗️ System Architecture

```
Browser (Next.js 15 App Router :3000)
        │
        │  fetch + credentials: 'include' (HttpOnly cookie)
        ▼
Express.js REST API (:4000)
        │
        ├── Auth Middleware (JWT verification → req.user)
        ├── RBAC Middleware (Role-Based Access Control)
        │
        ├── Controllers (Thin HTTP Request/Response Handlers)
        │   ├── AuthController
        │   ├── OrderController
        │   ├── TicketController
        │   ├── MessageController
        │   ├── RefundController
        │   ├── StaffController
        │   └── EscalationController
        │
        ├── Services (Core Business Logic)
        │   ├── AuthService (Bcrypt + JWT)
        │   ├── OrderService (Customer data isolation)
        │   ├── TicketService (Ticket lifecycle & internal notes)
        │   ├── MessageService (Message persistence & agent trigger)
        │   ├── RefundService (Authoritative refund validation & idempotency)
        │   ├── EscalationService (Human review & decision workflows)
        │   ├── MockPaymentService (Simulated gateway execution)
        │   ├── AuditService (Append-only event log)
        │   └── SupportAgentService (AI Orchestration Engine)
        │       ├── MockIntentClassifier (Deterministic intent & entity extractor)
        │       ├── ContextManager (Conversation state persistence)
        │       ├── ToolRouter (Allowlisted backend tool executor)
        │       ├── PolicyService (docs/RETURN_POLICY.md keyword search)
        │       └── MockResponseGenerator (Grounded response synthesis)
        │
        └── Prisma ORM
                │
                ▼
      PostgreSQL Database
```

---

## 🔒 Security & Business Rule Invariants

1. **Authorization via JWT Only**: Customer identity is strictly derived from the verified token (`req.user.id`). User-supplied customer IDs in request bodies or query params are never trusted.
2. **Authoritative Refund Engine (`RefundService`)**: The AI agent **never** makes eligibility decisions or directly executes refunds. All requests route through `RefundService` enforcing:
   - **R1 - Ownership**: Order must belong to the authenticated customer.
   - **R2 - Return Window**: Must be within the configurable 7-day return window from delivery date.
   - **R3 - Refund Amount**: Must be positive and not exceed the remaining refundable balance using `Decimal` arithmetic.
   - **R4 - Review Threshold**: Refunds ≤ ₹5,000 auto-process; refunds > ₹5,000 are escalated for human approval.
   - **R5 - Expired Window**: Rejects requests past the return window with clear explanation.
   - **R6 - Idempotency**: Unique `idempotencyKey` prevents duplicate transactions.
   - **R7 - Human Approval**: High-value refunds only reach simulated execution upon staff approval.
   - **R8 - Simulated Gateway**: Safe mock payment execution (`MockPaymentService`).
   - **R9 - Failure Safety**: Database transactions ensure failures never report false success.
3. **Internal Notes Confidentiality**: Internal notes are stored in a dedicated `TicketNote` table and are never queried or returned on customer-facing endpoints.
4. **Prompt Injection Defense**: Customer messages are treated as untrusted text. Even if injection attempts claim admin privileges or ask to approve invalid refunds, tool arguments are validated and executed under the caller's verified JWT.

---

## 👥 Demo Accounts

The database comes pre-seeded with realistic demo accounts (password for all: `password123`):

| Role | Name | Email | Password | Pre-seeded Context |
|------|------|-------|----------|-------------------|
| **Customer** | Maya Patel | `maya@example.com` | `password123` | Has `ORD-1001` (Headphones, ₹7,499 - eligible for refund, triggers escalation) & `ORD-1002` (Backpack - expired return window) |
| **Customer** | Arjun Rao | `arjun@example.com` | `password123` | Has `ORD-2001` (Desk Lamp - shipped, not delivered yet) |
| **Support Agent** | Sam Support | `support@example.com` | `password123` | Staff account to access Ticket Queue and Escalations Review |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ (tested on Node v20/v24)
- **Database**: PostgreSQL (configured via Neon cloud PostgreSQL or local Docker)

### 1. Configure Environment Variables
Copy `.env.example` into `backend/.env` and `frontend/.env.local`:

```bash
# In project root
cp .env.example backend/.env
```

The preconfigured `backend/.env` already connects to the active Neon PostgreSQL cloud database (`neondb` for development and `ecommerce_support_test` for testing).

### 2. Start the Backend API

```bash
cd backend
npm install
npm run build
npm run db:migrate    # applies migrations to PostgreSQL
npm run db:seed       # seeds demo customers, orders, and tickets
npm run dev           # starts Express API on http://localhost:4000
```

Verify backend health:
```bash
curl http://localhost:4000/health
# Response: {"status":"ok","timestamp":"..."}
```

### 3. Start the Frontend App

In a new terminal:
```bash
cd frontend
npm install
npm run dev           # starts Next.js on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing

The backend includes a comprehensive integration test suite covering **all 18 mandatory evaluation criteria**:

```bash
cd backend
npm test
```

### Verified Test Suite Results (`backend/tests/mandatory.test.ts`):
- `1.` Rejects unauthenticated requests with `401`.
- `2.` Prevents Customer A (Alice) from accessing Customer B (Bob) order (`404/403`).
- `3.` Prevents Customer B from accessing Customer A ticket (`404/403`).
- `4.` Creates and persists support tickets in PostgreSQL.
- `5.` Persists and chronologically retrieves messages.
- `6 & 7.` Missing order ID asks for clarification and prevents premature tool calls.
- `8.` Eligible refund (≤ ₹5,000) creates exactly one refund record with `SUCCEEDED`.
- `9.` Expired return window rejects refund execution (`422 RETURN_WINDOW_EXPIRED`).
- `10 & 11.` Refund > ₹5,000 creates escalation and does **not** auto-execute.
- `12.` Authorized staff approval triggers simulated execution.
- `13.` Staff rejection prevents execution.
- `14.` Duplicate idempotency key returns existing refund without re-executing.
- `15.` Prompt injection cannot bypass ownership or refund rules.
- `16.` Payment service failure never reports false success (transaction rollback).
- `17.` Excludes internal staff notes from customer-facing endpoints.
- `18.` Blocks customers from approving or deciding escalations (`403 FORBIDDEN`).

---

## 🎬 Complete Demo Walkthrough

### Scenario 1: Customer Self-Service & AI Agent Refund Workflow
1. Navigate to [http://localhost:3000/login](http://localhost:3000/login).
2. Click the quick-fill button **Maya (Customer)** or enter `maya@example.com` / `password123`.
3. Go to **Orders**: Notice `ORD-1001` (Wireless Headphones, ₹7,499, delivered 3 days ago) and `ORD-1002` (Everyday Backpack, delivered 30 days ago).
4. Go to **Tickets & AI Chat**:
   - Create a new ticket: Category `Return / Refund`, Subject `Damaged Ear Cup`, Description `The left ear cup arrived broken.`
5. In the chat interface, test missing order clarification:
   - Type: `"I want a refund."`
   - **AI Agent Response**: `"Please share your order ID (for example, ORD-1001) so I can check the order details and refund eligibility."`
6. Provide the order ID:
   - Type: `"ORD-1001"`
   - **AI Agent Response**: Recognizes the order is ₹7,499 (> ₹5,000 threshold), initiates an escalation, and informs Maya that human review is required without moving funds.

### Scenario 2: Return Window Expiration
1. In the same chat, try asking for a refund on order `ORD-1002`:
   - Type: `"Can I get a refund for ORD-1002?"`
   - **AI Agent Response**: Confirms the order was delivered 30 days ago and explains that the 7-day return window has expired.

### Scenario 3: Staff Escalation Review & Approval
1. Log out and sign in using **Sam (Support Agent)** (`support@example.com` / `password123`).
2. Go to **Ticket Queue** (`/staff`):
   - Search tickets, filter by status (`ESCALATED`) or priority (`HIGH`).
   - Click **Inspect** on Maya's ticket: note the order context, conversation history, and confidential **Internal Staff Notes** section.
   - Add an internal note: `"Verified customer photo of transit damage."`
3. Go to **Escalations** (`/staff/escalations`):
   - Review Maya's escalated refund request of ₹6,200 / ₹7,499.
   - Enter a note and click **Approve & Execute Refund**.
   - Notice the refund status updates to `SUCCEEDED` and decision records `APPROVED`.
4. Log back in as **Maya** (`maya@example.com`):
   - Check the ticket chat and `/dashboard/refunds`: see the approved refund confirmation and status `SUCCEEDED`.

---

## 📁 Repository Directory Structure

```text
e-commerce/
├── backend/
│   ├── prisma/
│   │   ├── migrations/          # Version-controlled SQL migrations
│   │   ├── schema.prisma        # Complete database schema
│   │   └── seed.ts              # Repeatable demo data seed
│   ├── src/
│   │   ├── config/              # Validated env vars & Prisma singleton
│   │   ├── middleware/          # authenticate, authorize (RBAC), errorHandler
│   │   ├── modules/
│   │   │   ├── auth/            # Register, login, logout, me
│   │   │   ├── orders/          # Customer order isolation
│   │   │   ├── tickets/         # Customer & staff ticket CRUD, internal notes
│   │   │   ├── messages/        # Message persistence & AI trigger
│   │   │   ├── refunds/         # Business rules, idempotency, mock payment
│   │   │   ├── escalations/     # Staff escalation queue & decisions
│   │   │   ├── agent/           # AI orchestration, intent classifier, tool router
│   │   │   ├── policies/        # Keyword search on RETURN_POLICY.md
│   │   │   └── audit/           # Append-only audit logger
│   │   ├── utils/               # apiResponse envelopes & Decimal helpers
│   │   ├── app.ts               # Express configuration
│   │   └── server.ts            # Server entrypoint
│   └── tests/
│       ├── helpers/             # Test database reset, seed & auth helpers
│       └── mandatory.test.ts    # 18 mandatory test scenarios
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/          # Login & Register
│   │   │   ├── dashboard/       # Customer orders, tickets, AI chat, refunds
│   │   │   └── staff/           # Staff ticket queue, notes, escalations
│   │   ├── components/          # Navbar, RoleGuard, StatusBadge
│   │   ├── hooks/               # useAuth context hook
│   │   ├── services/            # Type-safe API client (credentials: include)
│   │   └── types/               # Shared TypeScript domain models
│   ├── next.config.mjs
│   └── tsconfig.json
│
├── docs/
│   ├── ARCHITECTURE.md          # Diagrams & critical flow lifecycles
│   ├── DATABASE.md              # ER diagram & entity specifications
│   ├── API_CONTRACT.md          # REST API request/response specifications
│   ├── RETURN_POLICY.md         # Canonical policy document for agent lookup
│   ├── DECISIONS.md             # 14 documented engineering design decisions
│   ├── SECURITY.md              # Auth, ownership & prompt injection guidelines
│   └── TESTING.md               # Mandatory test verification guide
│
├── AI_PROJECT_CONTEXT.md        # Permanent project constitution
├── IMPLEMENTATION_PLAN.md       # Full task progress tracker
├── HANDOFF.md                   # Live cross-agent handoff state
├── PROGRESS.md                  # Requirement checklist
├── docker-compose.yml           # PostgreSQL service specification
├── .env.example                 # Documented environment template
└── README.md                    # Project documentation
```

---

## 📜 Documentation Links

- [AI Project Constitution](AI_PROJECT_CONTEXT.md)
- [System Architecture & Flows](docs/ARCHITECTURE.md)
- [Database Schema & ER Diagram](docs/DATABASE.md)
- [API Contract Specification](docs/API_CONTRACT.md)
- [Return & Refund Policy](docs/RETURN_POLICY.md)
- [Technical Decisions Log](docs/DECISIONS.md)
- [Security Guidelines](docs/SECURITY.md)
- [Testing Guide](docs/TESTING.md)
- [Implementation Plan](IMPLEMENTATION_PLAN.md)
- [Progress Tracker](PROGRESS.md)
- [Current Handoff](HANDOFF.md)
