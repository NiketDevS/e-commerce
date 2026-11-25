# DATABASE DESIGN
> Read before writing any Prisma schema or migration.
> Updated after schema changes.

---

## Entity Relationship Overview

```
User (1) ──────────< Order (many)
User (1) ──────────< Ticket (many)
Order (1) ──────────< Ticket (many, optional)
Ticket (1) ──────────< Message (many)
Ticket (1) ──────────< TicketNote (many, internal only)
Ticket (1) ──────────< Escalation (1, optional)
Order (1) ──────────< Refund (many, via ticket)
Escalation (1) ──────────< Refund (1, optional)
AuditEvent (append-only, references any entity)
```

---

## ER Diagram

```mermaid
erDiagram
    User {
        String id PK
        String name
        String email UK
        String passwordHash
        Role role
        DateTime createdAt
        DateTime updatedAt
    }

    Order {
        String id PK
        String customerId FK
        String orderNumber UK
        OrderStatus status
        String productName
        String category
        DateTime deliveryDate
        Decimal totalAmount
        DateTime createdAt
    }

    Ticket {
        String id PK
        String customerId FK
        String orderId FK
        String subject
        String description
        String category
        TicketStatus status
        TicketPriority priority
        Json agentContext
        DateTime createdAt
        DateTime updatedAt
    }

    Message {
        String id PK
        String ticketId FK
        SenderType senderType
        String content
        DateTime createdAt
    }

    TicketNote {
        String id PK
        String ticketId FK
        String authorId FK
        String content
        DateTime createdAt
    }

    Refund {
        String id PK
        String orderId FK
        String ticketId FK
        String requestedById FK
        String reviewedById FK
        Decimal amount
        String reason
        RefundStatus status
        String idempotencyKey UK
        DateTime createdAt
        DateTime updatedAt
    }

    Escalation {
        String id PK
        String ticketId FK
        String refundId FK
        String summary
        EscalationPriority priority
        String assignedToId FK
        EscalationStatus status
        EscalationDecision decision
        DateTime createdAt
        DateTime updatedAt
    }

    AuditEvent {
        String id PK
        String actorId FK
        String action
        String entityType
        String entityId
        Json metadata
        DateTime createdAt
    }

    User ||--o{ Order : "places"
    User ||--o{ Ticket : "opens"
    Order ||--o{ Ticket : "associated with"
    Ticket ||--o{ Message : "contains"
    Ticket ||--o{ TicketNote : "has internal notes"
    Ticket ||--o| Escalation : "may be escalated"
    Order ||--o{ Refund : "has refunds"
    Escalation ||--o| Refund : "reviews"
    User ||--o{ Refund : "requested by"
    User ||--o{ Refund : "reviewed by"
    User ||--o{ TicketNote : "authored by"
    User ||--o{ AuditEvent : "actor"
```

---

## Entity Descriptions

### User
- Primary actor in the system. Role determines access level.
- `email` has a UNIQUE constraint.
- `passwordHash` is never returned through any API.
- Roles: `CUSTOMER`, `SUPPORT_AGENT`, `ADMIN`

### Order
- Represents a purchase made by a customer.
- `orderNumber` is unique and human-readable (e.g., `ORD-1001`).
- `deliveryDate` is used by the refund return window check.
- `totalAmount` is `Decimal` — never `Float`.
- `category` matches the return policy category list.
- Status: `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`

### Ticket
- A support case opened by a customer.
- May or may not be linked to a specific order.
- `agentContext` is a JSON field storing structured state for the AI agent (e.g., `{ pendingIntent: 'REFUND', orderId: 'ORD-1001' }`).
- Status: `OPEN`, `IN_PROGRESS`, `WAITING_FOR_CUSTOMER`, `ESCALATED`, `RESOLVED`, `CLOSED`
- Priority: `LOW`, `MEDIUM`, `HIGH`, `URGENT`

### Message
- A chat message within a ticket conversation.
- Visible to both customers and staff.
- `senderType`: `CUSTOMER`, `AI`, `SUPPORT_AGENT`, `SYSTEM`
- **Never stores internal notes.** Notes go in `TicketNote`.

### TicketNote
- Internal note added by staff. **Never exposed to customers.**
- Stored in a separate table from `Message` to make the boundary explicit.

### Refund
- Represents a refund request and its processing lifecycle.
- Linked to both an `Order` and a `Ticket`.
- `idempotencyKey` has a UNIQUE constraint (database-level duplicate prevention).
- `amount` is `Decimal`.
- Status: `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `PROCESSING`, `SUCCEEDED`, `FAILED`

### Escalation
- Created when a refund exceeds the auto-approval threshold or when the agent escalates.
- Linked to a `Ticket` (and optionally a `Refund`).
- Status: `OPEN`, `UNDER_REVIEW`, `RESOLVED`
- Decision: `PENDING`, `APPROVED`, `REJECTED`, `REQUEST_INFO`

### AuditEvent
- Append-only log of significant system events.
- Never mutated or deleted.
- `entityType` + `entityId` identifies the affected record.
- `metadata` is a JSON field for event-specific details.

---

## Indexes

```prisma
@@index([customerId])          // on Order, Ticket
@@index([ticketId])            // on Message, TicketNote, Escalation
@@index([orderId])             // on Refund
@@index([status])              // on Ticket, Refund, Escalation
@@index([createdAt])           // on AuditEvent
@@index([entityType, entityId]) // on AuditEvent
```

---

## Key Design Decisions

1. **Decimal for money** — `totalAmount`, `amount` are `Decimal` / PostgreSQL `NUMERIC`, not `Float`.
2. **Separate TicketNote table** — prevents accidental exposure of internal notes through customer-facing queries.
3. **agentContext JSON** — allows the AI agent to persist minimal structured state without additional tables.
4. **Append-only AuditEvent** — no UPDATE or DELETE on this table. Only INSERT.
5. **idempotencyKey UNIQUE** — database enforces refund deduplication even under concurrent requests.
6. **Cascading deletes** — `onDelete: Cascade` for messages/notes when a ticket is deleted. Refunds and escalations should NOT be deleted (audit trail).
