# API CONTRACT
> This is the single source of truth for all API endpoints.
> The frontend MUST consume this contract and never invent response shapes.
> Updated by the backend agent (Codex) whenever an endpoint changes.
> Updated timestamp must be recorded.

**Base URL:** `http://localhost:4000/api`

**Authentication:** JWT stored in HttpOnly cookie named `token`. All protected routes require the cookie to be present.

**Response Envelope:**
```json
{ "success": true, "data": { ... } }
{ "success": false, "error": "Human-readable message", "code": "MACHINE_CODE" }
```

**Common Error Codes:**
- `UNAUTHENTICATED` — 401, no valid JWT
- `FORBIDDEN` — 403, insufficient role
- `NOT_FOUND` — 404
- `VALIDATION_ERROR` — 400, Zod validation failed
- `CONFLICT` — 409, e.g., duplicate idempotency key
- `RETURN_WINDOW_EXPIRED` — 422
- `REFUND_AMOUNT_EXCEEDED` — 422
- `ALREADY_REFUNDED` — 422
- `INTERNAL_ERROR` — 500

---

## Authentication Routes

### POST /api/auth/register
**Auth required:** No
**Role required:** None
**Request:**
```json
{ "name": "string", "email": "string", "password": "string (min 8 chars)" }
```
**Response 201:**
```json
{ "success": true, "data": { "id": "string", "name": "string", "email": "string", "role": "CUSTOMER" } }
```
**Errors:** 400 VALIDATION_ERROR, 409 email already exists

---

### POST /api/auth/login
**Auth required:** No
**Role required:** None
**Request:**
```json
{ "email": "string", "password": "string" }
```
**Response 200:** Sets HttpOnly cookie `token`
```json
{ "success": true, "data": { "id": "string", "name": "string", "email": "string", "role": "CUSTOMER|SUPPORT_AGENT|ADMIN" } }
```
**Errors:** 400 VALIDATION_ERROR, 401 invalid credentials

---

### POST /api/auth/logout
**Auth required:** Yes
**Role required:** Any authenticated
**Request:** No body
**Response 200:** Clears `token` cookie
```json
{ "success": true, "message": "Logged out" }
```

---

### GET /api/auth/me
**Auth required:** Yes
**Role required:** Any authenticated
**Response 200:**
```json
{ "success": true, "data": { "id": "string", "name": "string", "email": "string", "role": "string", "createdAt": "ISO8601" } }
```

---

## Order Routes (Customer)

### GET /api/orders
**Auth required:** Yes
**Role required:** CUSTOMER
**Query params:** `page`, `limit`
**Response 200:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "string",
        "orderNumber": "string",
        "status": "DELIVERED",
        "productName": "string",
        "category": "string",
        "deliveryDate": "ISO8601",
        "totalAmount": "string (Decimal as string)",
        "createdAt": "ISO8601"
      }
    ],
    "total": 0,
    "page": 1,
    "limit": 10
  }
}
```
**Authorization:** Returns only orders where `customerId = req.user.id`

---

### GET /api/orders/:id
**Auth required:** Yes
**Role required:** CUSTOMER
**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "orderNumber": "string",
    "status": "string",
    "productName": "string",
    "category": "string",
    "deliveryDate": "ISO8601",
    "totalAmount": "string",
    "createdAt": "ISO8601",
    "refunds": [ { "id": "string", "amount": "string", "status": "string" } ]
  }
}
```
**Errors:** 403 if order belongs to another customer, 404 not found

---

## Ticket Routes (Customer)

### POST /api/tickets
**Auth required:** Yes
**Role required:** CUSTOMER
**Request:**
```json
{ "subject": "string", "description": "string", "category": "string", "orderId": "string (optional)" }
```
**Response 201:**
```json
{ "success": true, "data": { "id": "string", "subject": "string", "status": "OPEN", "priority": "MEDIUM", "createdAt": "ISO8601" } }
```

---

### GET /api/tickets
**Auth required:** Yes
**Role required:** CUSTOMER
**Query params:** `status`, `page`, `limit`
**Response 200:** Array of tickets belonging to `req.user.id`

---

### GET /api/tickets/:id
**Auth required:** Yes
**Role required:** CUSTOMER
**Response 200:** Full ticket detail including order context (if linked). **Does NOT include TicketNotes.**
**Errors:** 403 if ticket belongs to another customer

---

### PATCH /api/tickets/:id
**Auth required:** Yes
**Role required:** CUSTOMER
**Request:** `{ "status": "CLOSED" }` (customers can only close their own tickets)
**Response 200:** Updated ticket

---

## Message Routes

### GET /api/tickets/:id/messages
**Auth required:** Yes
**Role required:** CUSTOMER (own ticket) or SUPPORT_AGENT/ADMIN
**Response 200:**
```json
{
  "success": true,
  "data": {
    "messages": [
      { "id": "string", "senderType": "CUSTOMER|AI|SUPPORT_AGENT|SYSTEM", "content": "string", "createdAt": "ISO8601" }
    ]
  }
}
```
**Note:** TicketNotes are NEVER included in this response.

---

### POST /api/tickets/:id/messages
**Auth required:** Yes
**Role required:** CUSTOMER (own ticket)
**Request:** `{ "content": "string (max 2000 chars)" }`
**Response 201:** Returns both the customer message and the AI response message
```json
{
  "success": true,
  "data": {
    "customerMessage": { "id": "string", "senderType": "CUSTOMER", "content": "string", "createdAt": "ISO8601" },
    "agentMessage": { "id": "string", "senderType": "AI", "content": "string", "createdAt": "ISO8601" }
  }
}
```

---

## Refund Routes (Customer)

### POST /api/refunds
**Auth required:** Yes
**Role required:** CUSTOMER
**Request:**
```json
{
  "orderId": "string",
  "ticketId": "string",
  "amount": "string (Decimal as string)",
  "reason": "string",
  "idempotencyKey": "string (UUID v4)"
}
```
**Response 201:**
```json
{ "success": true, "data": { "id": "string", "status": "PROCESSING|PENDING_REVIEW", "escalationId": "string|null" } }
```
**Errors:** 422 RETURN_WINDOW_EXPIRED | REFUND_AMOUNT_EXCEEDED | ALREADY_REFUNDED

---

### GET /api/refunds
**Auth required:** Yes
**Role required:** CUSTOMER
**Response 200:** Array of refunds for `req.user.id`'s orders

---

### GET /api/refunds/:id
**Auth required:** Yes
**Role required:** CUSTOMER
**Response 200:** Full refund detail including status
**Errors:** 403 if refund belongs to another customer

---

## Staff Routes

### GET /api/staff/tickets
**Auth required:** Yes
**Role required:** SUPPORT_AGENT | ADMIN
**Query params:** `status`, `priority`, `search`, `page`, `limit`
**Response 200:** All tickets with customer info and order context

---

### GET /api/staff/tickets/:id
**Auth required:** Yes
**Role required:** SUPPORT_AGENT | ADMIN
**Response 200:** Full ticket including messages AND TicketNotes

---

### PATCH /api/staff/tickets/:id
**Auth required:** Yes
**Role required:** SUPPORT_AGENT | ADMIN
**Request:** `{ "status": "string", "priority": "string" }`
**Response 200:** Updated ticket

---

### POST /api/staff/tickets/:id/notes
**Auth required:** Yes
**Role required:** SUPPORT_AGENT | ADMIN
**Request:** `{ "content": "string" }`
**Response 201:** Created note (internal only, not visible in /messages endpoint)

---

## Escalation Routes (Staff)

### GET /api/staff/escalations
**Auth required:** Yes
**Role required:** SUPPORT_AGENT | ADMIN
**Query params:** `status`, `priority`, `page`, `limit`
**Response 200:** Escalations with linked ticket, order, customer, and refund context

---

### GET /api/staff/escalations/:id
**Auth required:** Yes
**Role required:** SUPPORT_AGENT | ADMIN
**Response 200:** Full escalation detail

---

### POST /api/staff/escalations/:id/decision
**Auth required:** Yes
**Role required:** SUPPORT_AGENT | ADMIN
**Request:**
```json
{
  "decision": "APPROVE | REJECT | REQUEST_INFO",
  "note": "string (optional internal note)"
}
```
**Response 200:**
```json
{ "success": true, "data": { "escalationId": "string", "decision": "string", "refundStatus": "SUCCEEDED|REJECTED|PENDING_REVIEW" } }
```
**Errors:** 400 if already decided, 403 if not staff

---

*Document status: VERIFIED & ACTIVE — All endpoints implemented, mounted in Express, and tested against live PostgreSQL.*
