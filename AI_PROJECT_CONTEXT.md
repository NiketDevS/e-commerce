# AI PROJECT CONTEXT
> **Treat this as the permanent project constitution.**
> Both Codex and Antigravity must read this file at the start of every session.
> Do not modify established decisions without explicit justification and updating `docs/DECISIONS.md`.

---

## Project Objective

Build a full-stack, AI-powered e-commerce customer support platform within a two-day deadline.

The platform must let customers manage orders, file support tickets, chat with an AI agent, request refunds and track their resolution. Support staff get an internal dashboard to view tickets, approve/reject refunds, handle escalations and add internal notes. The AI agent must orchestrate real backend tools — not merely generate conversational text.

---

## User Roles

| Role            | Description                                                                 |
|-----------------|-----------------------------------------------------------------------------|
| `CUSTOMER`      | Registered shopper. Accesses only their own orders, tickets, refunds.       |
| `SUPPORT_AGENT` | Internal staff. Views all tickets, approves/rejects refunds, adds notes.    |
| `ADMIN`         | Full access. Can manage users and configuration (stretch).                  |

---

## Functional Requirements

### Customer capabilities
- Register, log in, log out.
- View their own orders.
- Create support tickets.
- Chat with the AI support agent.
- View their conversation history.
- Request refunds.
- Track ticket resolution and refund status.

### Support staff capabilities
- Log in to an internal dashboard.
- View and filter tickets.
- Search customer support requests.
- Inspect order and conversation context.
- Handle escalations.
- Approve or reject eligible refund requests.
- Request additional information.
- Add internal notes (invisible to customers).
- Update ticket priority and status.
- Review relevant audit history.

---

## Technology Stack

| Layer          | Technology                                              |
|----------------|---------------------------------------------------------|
| Frontend       | Next.js 14+ (App Router), React, TypeScript, CSS Modules |
| Backend        | Node.js, Express.js, TypeScript                         |
| ORM            | Prisma                                                  |
| Database       | PostgreSQL (Docker Compose)                             |
| Auth           | JWT in HttpOnly cookies, bcrypt                         |
| Validation     | Zod                                                     |
| AI Agent       | Custom backend orchestration, deterministic mock LLM    |
| Testing        | Vitest + Supertest (backend), Playwright (e2e if time)  |
| Dev tools      | Docker Compose, .env files                              |

---

## System Architecture

```
Browser (Next.js App Router)
        │
        │  HTTPS / fetch with credentials
        ▼
Express.js REST API (backend, port 4000)
        │
        ├── Auth middleware (JWT from HttpOnly cookie)
        ├── RBAC middleware (role check)
        │
        ├── Controllers (thin HTTP handlers)
        ├── Services (business logic)
        │   ├── AuthService
        │   ├── OrderService
        │   ├── TicketService
        │   ├── MessageService
        │   ├── RefundService      ← enforces ALL refund rules
        │   ├── EscalationService
        │   ├── AuditService
        │   └── SupportAgentService  ← AI orchestration
        │       ├── IntentClassifier
        │       ├── ContextManager
        │       ├── ToolRouter
        │       └── ResponseGenerator
        │
        └── Prisma ORM
                │
                ▼
         PostgreSQL (Docker)
```

**Frontend and backend are separate processes.** The frontend never touches the database. All business logic lives in the backend.

---

## Database Design Overview

Entities and relationships (see `docs/DATABASE.md` for full schema and ER diagram):

```
User ──< Order ──< Refund
User ──< Ticket ──< Message
                └──< TicketNote  (internal only)
                └──< Escalation ──< Refund
AuditEvent (append-only log)
```

Key constraints:
- `User.email` UNIQUE
- `Refund.idempotencyKey` UNIQUE
- Monetary fields: `Decimal` (never `Float`)
- Soft deletion: not used — explicit status fields instead

---

## AI Agent Architecture

```
Customer message arrives at POST /api/tickets/:id/messages
         │
         ▼
   MessageService.saveCustomerMessage()
         │
         ▼
   SupportAgentService.processMessage(ticketId, userId)
         │
         ├─ 1. Load conversation context (ticket + recent messages)
         ├─ 2. IntentClassifier.classify(messages) → intent + entities
         │         [mock: keyword/pattern matching]
         │
         ├─ 3. Check if required entities are present
         │         If missing → ask clarification question (no tool call)
         │
         ├─ 4. ToolRouter.route(intent, entities)
         │         ├── get_order_details(orderId)
         │         ├── search_return_policy(category)
         │         ├── process_refund(orderId, amount, reason)
         │         └── escalate_to_human(ticketId, summary, priority)
         │
         ├─ 5. All tool results feed into ResponseGenerator
         │         [mock: template-based responses grounded in tool data]
         │
         └─ 6. AI response saved as Message(senderType: AI)
```

**Critical invariant:** The LLM/intent provider NEVER makes refund decisions. It only classifies intent and extracts entities. All eligibility checks happen in `RefundService`.

---

## Critical Business Rules

### Refund Rules (enforced ONLY in RefundService — backend)

| Rule | Description |
|------|-------------|
| R1 — Ownership | Order must belong to the authenticated customer (derived from JWT, never from request body) |
| R2 — Return window | Delivery date + 7 calendar days. Configurable via `RETURN_WINDOW_DAYS` env var. |
| R3 — Refund amount | Must be positive, must not exceed remaining refundable balance (paid − already refunded) |
| R4 — Human review threshold | Refunds ≤ ₹5,000 auto-process. Refunds > ₹5,000 create an Escalation and do NOT auto-execute. |
| R5 — Expired window | Return window expired → reject with clear explanation. Record outcome. |
| R6 — Idempotency | Same idempotencyKey + same payload → return existing result. Same key + different payload → 409 Conflict. |
| R7 — Human review | Authorized staff (SUPPORT_AGENT/ADMIN) may APPROVE or REJECT escalated refunds. Only approved refunds proceed to simulated execution. |
| R8 — Mock payment | No real payment rails. Simulated success/failure after all checks pass. |
| R9 — Failure safety | DB or tool failure must never report false success. Use transactions. |

### Authorization Rules

- Customers derive their identity from the **verified JWT** — never from the request body or query params.
- A customer resource endpoint always filters by `customerId === req.user.id`.
- Internal notes are only returned to `SUPPORT_AGENT` / `ADMIN` roles.
- Refund approval requires `SUPPORT_AGENT` or `ADMIN` role.

---

## Security Invariants

1. JWT stored in `HttpOnly`, `SameSite=Lax` cookie. Never in localStorage.
2. All passwords hashed with bcrypt (cost factor ≥ 10).
3. Customer IDs are NEVER trusted from the request body for resource access.
4. Customer messages are ALWAYS treated as untrusted input (prompt injection mitigation).
5. System instructions and user content are structurally separated in the agent.
6. Internal notes are NEVER exposed through customer-facing endpoints.
7. No secrets committed to git. `.env.example` contains placeholder values only.
8. No `console.log` of passwords, JWTs or API keys.
9. Errors must not leak other customers' data.
10. CORS configured for `http://localhost:3000` only (local dev). `credentials: true`.

---

## Agreed Engineering Conventions

### Project structure
```
support-platform/
├── frontend/          ← Next.js App Router
├── backend/           ← Express.js
│   ├── src/
│   │   ├── modules/   ← auth | users | orders | tickets | messages | refunds | escalations | agent | policies | audit
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── config/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── server.ts
│   └── prisma/
└── docs/
```

### Code conventions
- Controllers: HTTP handling only (parse req, call service, send res).
- Services: all business logic.
- Middleware: auth, RBAC, error handling.
- Prisma: accessed only through service layer.
- Zod: validates all external input at the controller boundary.
- API responses: always `{ success: boolean, data?: any, error?: string, message?: string }`.
- HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable, 500 Internal Server Error.
- Monetary values: always `Decimal`. Never `number` or `Float` for money.

### Git discipline
- Commit completed and verified work before switching agents.
- Do not modify the same file simultaneously from both agents.
- Always `git status` before starting a new task.

---

## Important Implementation Constraints

- The complete core workflow must function without a paid LLM API key.
- Docker Compose manages PostgreSQL. No other external infrastructure.
- Frontend runs on port 3000, backend on port 4000.
- No Redis, Kafka, vector databases or microservices.
- Prisma migrations are repeatable and version-controlled.
- Tests use deterministic seed data and mock the LLM provider.
- Two-day hard deadline. Prioritize a working vertical slice over partial feature coverage.
