import type { Escalation, Message, Order, RefundSummary, Ticket, TicketNote, User } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include', // Required for HttpOnly JWT cookies
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const json = await res.json().catch(() => ({
    success: false,
    error: 'Invalid server response',
    code: 'PARSE_ERROR',
  }));

  if (!res.ok || !json.success) {
    throw new ApiError(
      json.error || `Request failed with status ${res.status}`,
      res.status,
      json.code || 'UNKNOWN_ERROR',
    );
  }

  return json.data as T;
}

export const api = {
  auth: {
    register: (body: { name: string; email: string; password: string }) =>
      request<User>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<User>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    logout: () => request<null>('/auth/logout', { method: 'POST' }),
    me: () => request<User>('/auth/me'),
  },

  orders: {
    list: (page = 1, limit = 20) =>
      request<{ orders: Order[]; total: number; page: number; limit: number }>(
        `/orders?page=${page}&limit=${limit}`,
      ),
    get: (id: string) => request<Order>(`/orders/${id}`),
  },

  tickets: {
    list: (params?: { status?: string; page?: number; limit?: number }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.limit) qs.set('limit', String(params.limit));
      const query = qs.toString();
      return request<{ tickets: Ticket[]; total: number }>(`/tickets${query ? `?${query}` : ''}`);
    },
    get: (id: string) => request<Ticket>(`/tickets/${id}`),
    create: (body: { subject: string; description: string; category: string; orderId?: string }) =>
      request<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(body) }),
    close: (id: string) =>
      request<Ticket>(`/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'CLOSED' }),
      }),
    getMessages: (ticketId: string) =>
      request<{ messages: Message[] }>(`/tickets/${ticketId}/messages`),
    postMessage: (ticketId: string, content: string) =>
      request<{ customerMessage: Message; agentMessage: Message }>(`/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
  },

  refunds: {
    list: () => request<{ refunds: RefundSummary[] }>('/refunds'),
    get: (id: string) => request<RefundSummary>(`/refunds/${id}`),
    create: (body: {
      orderId: string;
      ticketId: string;
      amount: string;
      reason: string;
      idempotencyKey: string;
    }) =>
      request<{
        id: string;
        status: string;
        amount: string;
        escalationId: string | null;
        isIdempotentRepeat: boolean;
      }>('/refunds', { method: 'POST', body: JSON.stringify(body) }),
  },

  staff: {
    listTickets: (params?: {
      status?: string;
      priority?: string;
      search?: string;
      page?: number;
      limit?: number;
    }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.priority) qs.set('priority', params.priority);
      if (params?.search) qs.set('search', params.search);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.limit) qs.set('limit', String(params.limit));
      const query = qs.toString();
      return request<{ tickets: Ticket[]; total: number }>(
        `/staff/tickets${query ? `?${query}` : ''}`,
      );
    },
    getTicket: (id: string) => request<Ticket>(`/staff/tickets/${id}`),
    updateTicket: (id: string, body: { status?: string; priority?: string }) =>
      request<Ticket>(`/staff/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    addNote: (id: string, content: string) =>
      request<TicketNote>(`/staff/tickets/${id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    listEscalations: (params?: { status?: string; priority?: string }) => {
      const qs = new URLSearchParams();
      if (params?.status) qs.set('status', params.status);
      if (params?.priority) qs.set('priority', params.priority);
      const query = qs.toString();
      return request<{ escalations: Escalation[]; total: number }>(
        `/staff/escalations${query ? `?${query}` : ''}`,
      );
    },
    getEscalation: (id: string) => request<Escalation>(`/staff/escalations/${id}`),
    decideEscalation: (
      id: string,
      body: { decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO'; note?: string },
    ) =>
      request<{ escalationId: string; decision: string; refundStatus: string | null }>(
        `/staff/escalations/${id}/decision`,
        { method: 'POST', body: JSON.stringify(body) },
      ),
  },
};
