# TECHNICAL DECISIONS LOG
> Record every significant architectural and engineering decision here.
> Do not revisit already-decided questions without a genuine technical reason.
> Both agents must consult this before proposing a change to established patterns.

---

## D1 — Modular Monolith over Microservices

**Decision:** Use a single Express.js backend as a modular monolith.

**Reason:** The two-day deadline makes distributed systems coordination (service discovery, inter-service auth, network retries) an unnecessary risk. A monolith with clearly separated modules delivers the same feature set with far less operational complexity. If the application needs to scale, the modular structure makes extraction into services straightforward later.

**Rejected alternative:** Microservices (Auth service, Ticket service, Refund service, Agent service).

**Reference:** Master Prompt § Technology restrictions.

---

## D2 — Separate Frontend and Backend Processes

**Decision:** Next.js (port 3000) and Express.js (port 4000) run as separate processes.

**Reason:**
1. The developer already has a background in both React/Next.js and Express.js separately — keeping them separate matches existing mental models.
2. Backend can be developed, tested, and reasoned about independently without Next.js complicating the picture.
3. Backend tests (Vitest + Supertest) work cleanly against Express without Next.js involvement.
4. Future deployment flexibility: the frontend could be hosted on a CDN while the backend runs on a VM.

**Tradeoff:** Requires CORS configuration and `credentials: true` on cross-origin cookie requests. Managed through explicit CORS middleware.

**Reference:** Master Prompt § Technology Stack.

---

## D3 — PostgreSQL + Prisma ORM

**Decision:** PostgreSQL as the relational database, Prisma as the ORM.

**Reason:**
- PostgreSQL is the strongest open-source relational DB for financial-adjacent data (refunds, audit logs) due to full ACID compliance and strong transaction support.
- Prisma gives a type-safe query layer that matches TypeScript well, and auto-generates migrations.
- The developer has existing PostgreSQL and Prisma experience.

**Rejected alternative:** MongoDB (inappropriate for relational data with foreign keys and monetary precision requirements).

**Reference:** Master Prompt § Database Design.

---

## D4 — JWT in HttpOnly Cookies (not localStorage)

**Decision:** JWT tokens are stored exclusively in HttpOnly, SameSite=Lax cookies.

**Reason:**
- localStorage is accessible to any JavaScript running on the page, making it vulnerable to XSS attacks.
- HttpOnly cookies are inaccessible to JavaScript entirely; the browser manages them automatically.
- SameSite=Lax prevents the cookie from being sent on cross-site POST requests (CSRF mitigation).
- For local development with separate frontend/backend origins, `credentials: true` on the frontend fetch and `credentials: 'include'` on CORS config enables cross-origin cookie sharing.

**Security note:** In production, `Secure: true` must be added to the cookie so it is only sent over HTTPS.

**Reference:** Master Prompt § Authentication and Authorization.

---

## D5 — Deterministic Mock LLM as the Default Intent Provider

**Decision:** The AI agent uses a keyword/pattern-based mock intent classifier rather than a real LLM API by default.

**Reason:**
- The mandatory requirement is a working AI agent workflow — not a sophisticated language model.
- A real LLM API (OpenAI, Gemini, Anthropic) requires a paid key, violating the "must work without a paid API" constraint.
- A deterministic mock makes testing reliable and reproducible (no flaky LLM responses).
- The mock is replaceable: a clean `ILLMAdapter` interface means a real provider can be plugged in by swapping one implementation.

**Interface design:**
```typescript
interface ILLMAdapter {
  classifyIntent(messages: Message[]): Promise<IntentResult>;
  generateResponse(context: AgentContext, toolResults: ToolResult[]): Promise<string>;
}
```

**Reference:** Master Prompt § AI Customer Support Agent.

---

## D6 — Refund Execution Separated from the AI Agent

**Decision:** The AI agent NEVER makes eligibility decisions or directly executes refunds. All refund logic is in `RefundService`.

**Reason:**
- The LLM (even a mock) is an untrusted, non-deterministic component. It must never control financial outcomes.
- If a real LLM were injected and prompt-injected, the refund guardrails must still hold.
- `RefundService` is deterministic, testable, and has no dependency on the AI layer.
- The agent's `process_refund` tool is a thin bridge: it passes the authenticated user ID and extracted parameters to `RefundService` and returns the result.

**Security consequence:** Even a successful prompt injection attack that convinces the agent to call `process_refund` with arbitrary parameters will be stopped at the `RefundService` layer by ownership validation, return window checks, and amount validation.

**Reference:** Master Prompt §§ 11, 13, 14.

---

## D7 — Keyword Policy Retrieval (No Vector Database)

**Decision:** Return policy retrieval uses keyword/section matching against a local `docs/RETURN_POLICY.md` file.

**Reason:**
- A vector database (Pinecone, pgvector, Chroma) is explicitly excluded from the technology restrictions.
- The return policy document is small and static. Keyword matching over a few policy sections is entirely sufficient.
- This approach is inspectable, debuggable, and requires no external infrastructure.
- The retrieved policy text is passed to the response generator as *data*, not as executable instructions.

**Security note:** Retrieved policy content is treated as untrusted data in the agent context — it cannot override system-level instructions.

**Reference:** Master Prompt § Tool 2: search_return_policy.

---

## D8 — Idempotency Strategy for Refunds

**Decision:** Use a client-generated `idempotencyKey` (UUID) stored with a database UNIQUE constraint.

**Reason:**
- Prevents duplicate refund transactions on network retries.
- Database-level uniqueness is the strongest guarantee (no race condition between application-level checks).
- Same key + same payload → return the existing refund record (idempotent success).
- Same key + different payload → 409 Conflict (protects against payload tampering on retry).
- Concurrent requests: wrapped in a Prisma transaction with appropriate isolation to prevent two requests simultaneously draining the same refundable balance.

**Reference:** Master Prompt § Rule 6: Idempotency.

---

## D9 — Monetary Values as Decimal (Not Float)

**Decision:** All monetary values in the database use `Decimal` (Prisma `Decimal` type, PostgreSQL `NUMERIC`). Never `Float` or JavaScript `number` for money arithmetic.

**Reason:**
- IEEE 754 floating-point arithmetic introduces rounding errors (0.1 + 0.2 = 0.30000000000000004).
- Financial calculations must be exact.
- Prisma's `Decimal` type maps to PostgreSQL `NUMERIC`, which uses arbitrary-precision arithmetic.
- In application code, use the `Decimal.js` library (bundled with Prisma) for arithmetic.

**Reference:** Master Prompt § Database engineering requirements.

---

## D10 — Internal Notes Never Exposed to Customers

**Decision:** `TicketNote` records are stored in a separate table (not the `Message` table) and are never returned from customer-facing API endpoints.

**Reason:**
- If notes were stored in the Message table with a flag, a bug or missing WHERE clause could accidentally expose them.
- Storing in a separate table makes the access control boundary explicit and enforceable at the database query level.
- Customer message endpoints query only the `Message` table. The `TicketNote` table is queried only by staff endpoints.

**Reference:** Master Prompt § Messages (Sender types), § Internal notes.

---

## D11 — Human Review Threshold: ₹5,000

**Decision:** Refunds ≤ ₹5,000 are automatically processed when eligible. Refunds >₹5,000 require human review and are never automatically executed.

**Value is configured via:** `REFUND_AUTO_APPROVE_LIMIT` environment variable (default: 5000).

**Reason:** The threshold is a business rule, not a technical constraint. Making it configurable means it can be changed without a code deployment.

**Reference:** Master Prompt § Rule 4: Human-review threshold.

---

## D12 — Return Window: 7 Calendar Days

**Decision:** The return window is 7 calendar days from the order's `deliveryDate`. Configurable via `RETURN_WINDOW_DAYS` env var (default: 7).

**Mock policy assumption:** Since this is a demo application, the seed data includes orders both within and outside the return window to demonstrate both paths.

**Reference:** Master Prompt § Rule 2: Return window.

---

## D13 — API Response Envelope

**Decision:** All API responses use a consistent envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "Human-readable message", "code": "MACHINE_READABLE_CODE" }
```

**Reason:** Consistent structure allows the frontend to handle errors uniformly without endpoint-specific parsing logic. The `code` field enables the frontend to handle specific error types (e.g., `RETURN_WINDOW_EXPIRED`, `REFUND_AMOUNT_EXCEEDED`).

---

## D14 — Prisma for All Database Access (No Raw Queries in Business Logic)

**Decision:** All database access goes through the Prisma client. Raw SQL is only permitted in migrations.

**Reason:** Prevents SQL injection by construction. Keeps the codebase type-safe. If a query cannot be expressed in Prisma, it should be reconsidered for complexity before resorting to raw SQL.
