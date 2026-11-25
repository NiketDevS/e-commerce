# IMPLEMENTATION PLAN
> Updated by both agents after every meaningful task.
> Statuses: NOT_STARTED | IN_PROGRESS | COMPLETED | BLOCKED | PARTIALLY_COMPLETED

---

## PHASE 0 — Architecture and Setup
*Goal: Empty repo → documented architecture + initialized project scaffolding.*

| # | Task | Owner | Status | Complexity | Dependencies | Acceptance Criteria |
|---|------|-------|--------|------------|--------------|---------------------|
| 0.1 | Inspect repository state | Antigravity | COMPLETED | Low | — | Repo state documented |
| 0.2 | Create shared memory documents | Antigravity | COMPLETED | Low | 0.1 | AI_PROJECT_CONTEXT.md, IMPLEMENTATION_PLAN.md, HANDOFF.md, PROGRESS.md, docs/ created |
| 0.3 | Initialize backend (Node/Express/TypeScript) | Codex | COMPLETED | Medium | 0.2 | `backend/package.json`, `tsconfig.json`, `src/app.ts`, `src/server.ts`, basic health route; compile/start verified |
| 0.4 | Initialize frontend (Next.js/TypeScript) | Antigravity | NOT_STARTED | Low | 0.2 | `frontend/` scaffolded with App Router, TypeScript, CSS Modules |
| 0.5 | Configure Docker Compose for PostgreSQL | Codex | COMPLETED | Low | 0.2 | Compose defined; Neon PostgreSQL provisioned for dev & test |
| 0.6 | Configure `.env.example` and `.gitignore` | Codex | COMPLETED | Low | 0.3, 0.5 | `.env.example` documents app/test URLs and placeholders; secrets/build artifacts ignored |

---

## PHASE 1 — Database Schema and Seed Data
*Goal: Complete Prisma schema → migrations → seed data → verified DB connectivity.*

| # | Task | Owner | Status | Complexity | Dependencies | Acceptance Criteria |
|---|------|-------|--------|------------|--------------|---------------------|
| 1.1 | Design and implement Prisma schema | Codex | COMPLETED | High | 0.5, 0.6 | All documented entities, relations, indexes, constraints modeled & validated |
| 1.2 | Run initial migration | Codex | COMPLETED | Low | 1.1 | Initial SQL migration applied to Neon dev & test DBs |
| 1.3 | Write seed script with realistic data | Codex | COMPLETED | Medium | 1.2 | Repeatable upserts cover 2 customers, 1 staff, orders, tickets, messages, notes, refund, escalation and audit event |
| 1.4 | Verify DB connectivity and seed | Antigravity | COMPLETED | Low | 1.3 | Neon DB connectivity, migrations, and seed verified |
| 1.5 | Document schema in docs/DATABASE.md with ER diagram | Codex | COMPLETED | Low | 1.1 | DATABASE.md describes entities, relations, indexes, deletion and seed behavior |

---

## PHASE 2 — Authentication
*Goal: Register → Login → JWT cookie → Protected routes → RBAC.*

| # | Task | Owner | Status | Complexity | Dependencies | Acceptance Criteria |
|---|------|-------|--------|------------|--------------|---------------------|
| 2.1 | AuthService: register (hash password, create user) | Antigravity | COMPLETED | Medium | 1.2 | POST /api/auth/register creates user, returns 201 |
| 2.2 | AuthService: login (verify password, issue JWT cookie) | Antigravity | COMPLETED | Medium | 2.1 | POST /api/auth/login sets HttpOnly cookie |
| 2.3 | AuthService: logout (clear cookie) | Antigravity | COMPLETED | Low | 2.2 | POST /api/auth/logout clears cookie |
| 2.4 | GET /api/auth/me (return current user from JWT) | Antigravity | COMPLETED | Low | 2.2 | Returns user without passwordHash |
| 2.5 | Auth middleware (verify JWT, attach req.user) | Antigravity | COMPLETED | Medium | 2.2 | Unauthenticated requests return 401 |
| 2.6 | RBAC middleware (role-based route guard) | Antigravity | COMPLETED | Medium | 2.5 | Customer cannot hit staff routes (403) |
| 2.7 | Auth integration tests | Antigravity | COMPLETED | Medium | 2.6 | Tests: register, login, 401 on protected routes, role guard |

---

## PHASE 3 — Core Backend APIs
*Goal: Orders, Tickets, Messages, Staff operations — with authorization.*

| # | Task | Owner | Status | Complexity | Dependencies | Acceptance Criteria |
|---|------|-------|--------|------------|--------------|---------------------|
| 3.1 | OrderService + GET /api/orders, GET /api/orders/:id | Antigravity | COMPLETED | Medium | 2.5 | Customer sees only their orders; 404 for others |
| 3.2 | TicketService + POST /api/tickets, GET /api/tickets | Antigravity | COMPLETED | Medium | 2.5 | Customer creates/reads their tickets |
| 3.3 | GET /api/tickets/:id, PATCH /api/tickets/:id | Antigravity | COMPLETED | Medium | 3.2 | Ownership enforced; status/priority update validated |
| 3.4 | MessageService + GET/POST /api/tickets/:id/messages | Antigravity | COMPLETED | Medium | 3.2 | Messages persisted and returned; customer messages trigger agent |
| 3.5 | Staff routes: GET /api/staff/tickets (filter/search) | Antigravity | COMPLETED | Medium | 2.6, 3.2 | Staff can see all tickets with filtering |
| 3.6 | Staff routes: ticket detail, notes, status update | Antigravity | COMPLETED | Medium | 3.5 | PATCH + POST notes; notes not visible to customers |
| 3.7 | Document all routes in docs/API_CONTRACT.md | Antigravity | COMPLETED | Low | 3.6 | Complete API contract document |

---

## PHASE 4 — Refund Engine
*Goal: All refund business rules enforced server-side.*

| # | Task | Owner | Status | Complexity | Dependencies | Acceptance Criteria |
|---|------|-------|--------|------------|--------------|---------------------|
| 4.1 | RefundService: ownership + return window check | Antigravity | COMPLETED | High | 3.1 | Expired orders rejected with explanation |
| 4.2 | RefundService: amount validation + idempotency | Antigravity | COMPLETED | High | 4.1 | Duplicate key → same result; different payload → 409 |
| 4.3 | RefundService: threshold check → auto-process or escalate | Antigravity | COMPLETED | High | 4.2 | ≤₹5000 → PROCESSING/SUCCEEDED; >₹5000 → Escalation created |
| 4.4 | MockPaymentService: simulated refund execution | Antigravity | COMPLETED | Medium | 4.3 | Returns success/failure, updates refund status |
| 4.5 | AuditService: record all refund lifecycle events | Antigravity | COMPLETED | Medium | 4.3 | AuditEvent created for each state change |
| 4.6 | POST /api/refunds + GET /api/refunds/:id | Antigravity | COMPLETED | Medium | 4.4 | Endpoints use RefundService; authorization enforced |
| 4.7 | Refund engine integration tests (all 18 mandatory cases) | Antigravity | COMPLETED | High | 4.6 | All test cases pass with deterministic seed data |

---

## PHASE 5 — AI Support Agent
*Goal: Intent → Context → Tools → Response (no paid API required).*

| # | Task | Owner | Status | Complexity | Dependencies | Acceptance Criteria |
|---|------|-------|--------|------------|--------------|---------------------|
| 5.1 | IntentClassifier (mock: keyword/pattern matching) | Antigravity | COMPLETED | High | 3.4 | Classifies: REFUND_REQUEST, ORDER_INQUIRY, GENERAL, ESCALATION_REQUEST, POLICY_INQUIRY |
| 5.2 | ContextManager: load conversation history | Antigravity | COMPLETED | Medium | 3.4 | Returns ticket + messages + agentContext |
| 5.3 | ToolRouter: get_order_details tool | Antigravity | COMPLETED | Medium | 3.1, 5.2 | Returns order data; rejects unauthorized access |
| 5.4 | ToolRouter: search_return_policy tool | Antigravity | COMPLETED | Medium | 5.2 | Keyword retrieval from docs/RETURN_POLICY.md |
| 5.5 | ToolRouter: process_refund tool (calls RefundService) | Antigravity | COMPLETED | High | 4.6, 5.2 | Does NOT auto-process; delegates all checks to RefundService |
| 5.6 | ToolRouter: escalate_to_human tool | Antigravity | COMPLETED | Medium | 5.2 | Creates escalation; updates ticket status |
| 5.7 | ResponseGenerator: template-based grounded responses | Antigravity | COMPLETED | Medium | 5.3–5.6 | Responses reference actual tool data |
| 5.8 | SupportAgentService: orchestrate full pipeline | Antigravity | COMPLETED | High | 5.1–5.7 | End-to-end: message → intent → tools → response saved |
| 5.9 | Agent LLM adapter interface (pluggable) | Antigravity | COMPLETED | Medium | 5.8 | MockLLMAdapter satisfies interface; real adapter can replace it |
| 5.10 | Agent workflow tests | Antigravity | COMPLETED | High | 5.8 | Clarification question on missing order ID; no premature tool calls |

---

## PHASE 6 — Human Escalation and Approval
*Goal: Staff can review, approve/reject refunds and add notes.*

| # | Task | Owner | Status | Complexity | Dependencies | Acceptance Criteria |
|---|------|-------|--------|------------|--------------|---------------------|
| 6.1 | EscalationService + GET /api/staff/escalations | Antigravity | COMPLETED | Medium | 4.3, 5.6 | Staff can list escalations with ticket/order context |
| 6.2 | POST /api/staff/escalations/:id/decision | Antigravity | COMPLETED | High | 6.1, 4.4 | APPROVE triggers MockPaymentService; REJECT closes refund |
| 6.3 | Request more information workflow | Antigravity | COMPLETED | Medium | 6.2 | Decision: REQUEST_INFO updates ticket status |
| 6.4 | Audit events for all staff decisions | Antigravity | COMPLETED | Medium | 6.2 | AuditEvent with reviewerId, decision, timestamp |
| 6.5 | Escalation tests | Antigravity | COMPLETED | Medium | 6.4 | Only staff can approve; approved → simulated execution |

---

## PHASE 7 — Frontend
*Goal: All customer and staff screens connected to backend APIs.*

| # | Task | Owner | Status | Complexity | Dependencies | Acceptance Criteria |
|---|------|-------|--------|------------|--------------|---------------------|
| 7.1 | Frontend project init + API service layer | Antigravity | NOT_STARTED | Medium | 0.4 | Axios/fetch wrapper with cookie credentials |
| 7.2 | Auth pages: Register + Login | Antigravity | NOT_STARTED | Medium | 7.1, 2.2 | Form validation, error display, redirect on success |
| 7.3 | Customer dashboard layout + navigation | Antigravity | NOT_STARTED | Medium | 7.2 | Protected route, role guard, responsive layout |
| 7.4 | Orders listing + order detail pages | Antigravity | NOT_STARTED | Medium | 7.3, 3.1 | Fetches from API; customer sees only their orders |
| 7.5 | Ticket creation form | Antigravity | NOT_STARTED | Medium | 7.3, 3.2 | Submits to POST /api/tickets |
| 7.6 | Chat interface (ticket conversation) | Antigravity | NOT_STARTED | High | 7.5, 3.4 | Messages displayed with sender, timestamp, type |
| 7.7 | Refund status view | Antigravity | NOT_STARTED | Medium | 7.6, 4.6 | Shows refund lifecycle status |
| 7.8 | Staff dashboard + ticket queue | Antigravity | NOT_STARTED | Medium | 7.3, 3.5 | Staff-only layout; filter/search controls |
| 7.9 | Staff ticket detail + conversation + notes | Antigravity | NOT_STARTED | Medium | 7.8, 3.6 | Notes section hidden from customer view |
| 7.10 | Escalation review + refund decision UI | Antigravity | NOT_STARTED | High | 7.9, 6.2 | Approve/reject form with confirmation |
| 7.11 | Loading, error and empty states | Antigravity | NOT_STARTED | Medium | 7.2–7.10 | All screens handle loading/error/empty gracefully |

---

## PHASE 8 — Integration and Testing
*Goal: End-to-end verified flows, all mandatory test cases pass.*

| # | Task | Owner | Status | Complexity | Dependencies | Acceptance Criteria |
|---|------|-------|--------|------------|--------------|---------------------|
| 8.1 | Complete customer journey E2E verification | Both | NOT_STARTED | High | 7.6 | Register → order → ticket → chat → refund request |
| 8.2 | Complete staff journey E2E verification | Both | NOT_STARTED | High | 7.10 | Login → view ticket → approve refund → audit log |
| 8.3 | All 18 mandatory test cases pass | Codex | NOT_STARTED | High | 4.7, 5.10 | 100% of mandatory cases green |
| 8.4 | Security review: ownership, injection, auth bypass | Codex | NOT_STARTED | High | 8.3 | No cross-customer data leaks; no injection bypass |
| 8.5 | Integration bug fixes | Both | NOT_STARTED | Medium | 8.1–8.4 | No critical bugs in core flows |

---

## PHASE 9 — Submission Readiness
*Goal: Deliverable-quality README, docs, demo instructions.*

| # | Task | Owner | Status | Complexity | Dependencies | Acceptance Criteria |
|---|------|-------|--------|------------|--------------|---------------------|
| 9.1 | README.md (complete setup + demo instructions) | Antigravity | NOT_STARTED | Medium | 8.5 | Any reviewer can run the app from README alone |
| 9.2 | docs/ARCHITECTURE.md with diagrams | Antigravity | NOT_STARTED | Medium | 8.5 | System and agent architecture diagrams |
| 9.3 | docs/API_CONTRACT.md final verification | Codex | NOT_STARTED | Low | 8.5 | All endpoints documented accurately |
| 9.4 | Demo accounts and walkthrough script | Antigravity | NOT_STARTED | Low | 9.1 | Exact demo flow documented |
| 9.5 | Final git commit + tag | Both | NOT_STARTED | Low | 9.4 | Clean commit history, no secrets |

---

## DAY 1 TARGET (Backend focus)
Complete phases 0–6. Backend fully functional, all business rules enforced, all backend tests passing.

## DAY 2 TARGET (Frontend + Integration)
Complete phases 7–9. Full frontend connected, E2E flows verified, demo-ready.
