# TESTING GUIDE
> Read before writing any test. Maintained by Codex.

---

## Testing Stack

| Tool | Purpose |
|------|---------|
| Vitest | Test runner and assertion library |
| Supertest | HTTP integration tests against Express app |
| Prisma | Real PostgreSQL test database (not mocked) |
| MockLLMAdapter | Deterministic intent classification for agent tests |

---

## Test Database Setup

- Use a **separate PostgreSQL database** for tests: `ecommerce_support_test`
- Configure via `DATABASE_URL_TEST` env var
- Run migrations before tests: `prisma migrate deploy --schema=./prisma/schema.prisma`
- Reset and seed before each test suite using `beforeAll` / `afterAll` hooks
- Never run tests against the development database

---

## Test Organization

```
backend/tests/
├── helpers/
│   ├── testDb.ts       ← DB reset/seed helpers
│   ├── testApp.ts      ← Express app instance for Supertest
│   └── authHelper.ts   ← Login helper returning cookie string
├── auth.test.ts
├── orders.test.ts
├── tickets.test.ts
├── messages.test.ts
├── refunds.test.ts
├── agent.test.ts
└── escalations.test.ts
```

---

## Mandatory Test Cases

All 18 of the following must pass before submission.

### Authentication Tests (auth.test.ts)
1. **Unauthenticated requests rejected** — GET /api/orders without cookie → 401
2. **Customer A cannot access Customer B's order** — GET /api/orders/:id with wrong user → 403 or 404
3. **Customer A cannot access Customer B's ticket** — GET /api/tickets/:id with wrong user → 403 or 404
18. **Unauthorized users cannot approve refunds** — Customer POST /api/staff/escalations/:id/decision → 403

### Ticket/Message Tests (tickets.test.ts, messages.test.ts)
4. **Ticket creation persists** — POST /api/tickets → 201, DB record exists
5. **Messages persist and retrieved** — POST then GET /api/tickets/:id/messages → correct order

### Agent Tests (agent.test.ts)
6. **Missing order ID → clarification** — "I want a refund" → AI asks for order ID
7. **No tool called before order ID available** — Agent does not call get_order_details prematurely

### Refund Engine Tests (refunds.test.ts)
8. **Eligible refund creates exactly one record** — POST /api/refunds → Refund count = 1
9. **Expired return window prevents refund** — Order delivered 10 days ago → 422 RETURN_WINDOW_EXPIRED
10. **Refund >₹5,000 creates escalation** — POST /api/refunds amount=6000 → Escalation created
11. **High-value escalated refund NOT auto-executed** — Refund status stays PENDING_REVIEW until staff approves

### Escalation Tests (escalations.test.ts)
12. **Staff approval enables simulated execution** — POST /api/staff/escalations/:id/decision APPROVE → Refund SUCCEEDED
13. **Staff rejection prevents execution** — REJECT → Refund REJECTED, MockPayment NOT called
14. **Duplicate idempotency key → no duplicate** — Identical POST twice → same refundId, Refund count stays 1

### Security Tests (across all test files)
15. **Prompt injection cannot bypass rules** — Injected message still triggers ownership check in RefundService
16. **Tool/DB failure → no false success** — MockPayment throws → Refund remains PROCESSING, no SUCCEEDED
17. **Internal notes not accessible by customers** — GET /api/tickets/:id/messages excludes notes
18. *(covered above)*

---

## Test Utilities

### `authHelper.ts`
```typescript
// Returns the Set-Cookie header value for use in Supertest requests
async function loginAs(role: 'CUSTOMER' | 'SUPPORT_AGENT', email: string): Promise<string>
```

### `testDb.ts`
```typescript
async function resetDb(): Promise<void>  // Clears all tables
async function seedTestData(): Promise<SeedResult>  // Returns typed seed IDs
```

### Seed Data for Tests (deterministic)
```
Customer 1: alice@test.com / password123
Customer 2: bob@test.com / password123
Staff 1: staff@test.com / staffpass123

Order 1 (Alice): ORD-TEST-001, delivered 2 days ago, Electronics, ₹3,000  ← eligible, auto-refund
Order 2 (Alice): ORD-TEST-002, delivered 10 days ago, Clothing, ₹1,500   ← expired window
Order 3 (Alice): ORD-TEST-003, delivered 1 day ago, Home, ₹8,000          ← eligible, needs human review
Order 4 (Bob):   ORD-TEST-004, delivered 1 day ago, Electronics, ₹2,000   ← belongs to Bob, not Alice
```

---

## Running Tests

```bash
# Run all tests
cd backend && npm test

# Run specific test file
npm test tests/refunds.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## Test Principles

1. **No external API calls** — LLM is always mocked in tests.
2. **Deterministic** — seed data is fixed; no random data in assertions.
3. **Isolated** — each test file resets the DB in `beforeAll`.
4. **Meaningful** — test business outcomes, not implementation internals.
5. **Fast** — integration tests only, no Playwright by default.
