import request from 'supertest';
import type { Express } from 'express';

export async function loginAs(app: Express, email: string, password = 'password123'): Promise<string[]> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  const cookies = res.headers['set-cookie'];
  if (!cookies) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return Array.isArray(cookies) ? cookies : [cookies];
}
