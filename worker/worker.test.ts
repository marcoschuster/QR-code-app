import { describe, expect, it } from 'bun:test';
import worker from './worker';

const env = {
  BREVO_API_KEY: 'test-key',
  SUPPORT_FROM_EMAIL: 'sender@example.com',
  SUPPORT_TO_EMAIL: 'support@example.com',
  RATE_LIMIT_KV: {
    get: async () => null,
    put: async () => undefined,
  },
};

const validPayload = {
  name: 'Marco',
  email: 'marco@example.com',
  subject: 'Scanning',
  message: 'The scanner needs help with a code.',
  appVersion: '1.0.0',
  userId: 'user-123',
};

describe('support worker', () => {
  it('rejects custom subjects longer than 20 characters', async () => {
    const response = await worker.fetch(
      new Request('https://support.example.com/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validPayload,
          subject: 'This subject is too long',
        }),
      }),
      env as any
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Subject must be between 3 and 20 characters',
    });
  });
});
