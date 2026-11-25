export type Role = 'CUSTOMER' | 'SUPPORT_AGENT' | 'ADMIN';

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_CUSTOMER'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';

export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type SenderType = 'CUSTOMER' | 'AI' | 'SUPPORT_AGENT' | 'SYSTEM';

export type RefundStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED';

export type EscalationStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED';
export type EscalationDecision = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REQUEST_INFO';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface RefundSummary {
  id: string;
  amount: string;
  status: RefundStatus;
  reason?: string;
  createdAt: string;
  order?: {
    orderNumber: string;
    productName: string;
  };
  escalation?: {
    status: EscalationStatus;
    decision: EscalationDecision;
    priority: string;
  } | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  productName: string;
  category: string;
  deliveryDate: string | null;
  totalAmount: string;
  createdAt: string;
  refunds?: RefundSummary[];
}

export interface Message {
  id: string;
  ticketId: string;
  senderType: SenderType;
  content: string;
  createdAt: string;
}

export interface TicketNote {
  id: string;
  ticketId: string;
  authorId: string;
  content: string;
  createdAt: string;
  author?: {
    id: string;
    name: string;
  };
}

export interface Ticket {
  id: string;
  customerId: string;
  orderId: string | null;
  subject: string;
  description: string;
  category: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  order?: Partial<Order> | null;
  messages?: Message[];
  notes?: TicketNote[];
  escalation?: {
    id: string;
    status: EscalationStatus;
    decision: EscalationDecision;
    priority: string;
    summary?: string;
  } | null;
  refunds?: RefundSummary[];
  _count?: {
    messages: number;
    notes?: number;
  };
}

export interface Escalation {
  id: string;
  ticketId: string;
  refundId: string | null;
  summary: string;
  priority: TicketPriority;
  assignedToId: string | null;
  status: EscalationStatus;
  decision: EscalationDecision;
  createdAt: string;
  updatedAt: string;
  ticket: Ticket;
  refund: RefundSummary | null;
  assignedTo?: {
    id: string;
    name: string;
    email: string;
  } | null;
}
