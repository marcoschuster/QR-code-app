import { beforeEach, describe, expect, it } from 'bun:test';
import {
  getSupportPublicConfig,
  handleSupportRequest,
  resetSupportRateLimit,
  stripHtml,
  supportPayloadSchema,
} from './supportCore';

const validPayload = {
  name: 'Marco',
  email: 'marco@example.com',
  subject: 'Bug report',
  message: 'The scanner button stopped responding.',
  app_version: '1.0.0',
  user_id: 'user-123',
  recaptchaToken: 'token-123',
};

describe('support validation', () => {
  beforeEach(() => {
    resetSupportRateLimit();
  });

  it('strips html before validation', () => {
    expect(stripHtml('<b>Hello</b> &amp; <script>world</script>')).toBe('Hello & world');

    const parsed = supportPayloadSchema.parse({
      ...validPayload,
      message: '<p>The scanner crashed on launch.</p>',
    });

    expect(parsed.message).toBe('The scanner crashed on launch.');
  });

  it('rejects oversized messages', () => {
    const result = supportPayloadSchema.safeParse({
      ...validPayload,
      message: 'a'.repeat(2001),
    });

    expect(result.success).toBe(false);
  });

  it('does not expose provider secrets through public config', () => {
    const publicConfig = getSupportPublicConfig({
      SMTP2GO_API_KEY: 'smtp-secret',
      BREVO_API_KEY: 'brevo-secret',
      RECAPTCHA_SECRET_KEY: 'recaptcha-secret',
      SUPPORT_TO_EMAIL: 'support@example.com',
    });

    expect(JSON.stringify(publicConfig)).not.toContain('smtp-secret');
    expect(JSON.stringify(publicConfig)).not.toContain('brevo-secret');
    expect(JSON.stringify(publicConfig)).not.toContain('recaptcha-secret');
  });

  it('rate limits by ip after five requests in ten minutes', async () => {
    const originalConsoleInfo = console.info;
    const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
      fetchCalls.push({ url: String(url), init });

      if (String(url).includes('siteverify')) {
        return new Response(JSON.stringify({ success: true, score: 0.9 }), { status: 200 });
      }

      return new Response(JSON.stringify({ succeeded: 1 }), { status: 200 });
    };

    console.info = () => {};

    try {
      for (let index = 0; index < 5; index += 1) {
        const response = await handleSupportRequest({
          headers: { 'x-forwarded-for': '203.0.113.10' },
          body: validPayload,
          env: { SMTP2GO_API_KEY: 'smtp-secret', RECAPTCHA_SECRET_KEY: 'recaptcha-secret' },
          fetchImpl: fetchImpl as typeof fetch,
          now: 1000,
        });

        expect(response.status).toBe(200);
      }

      const limitedResponse = await handleSupportRequest({
        headers: { 'x-forwarded-for': '203.0.113.10' },
        body: validPayload,
        env: { SMTP2GO_API_KEY: 'smtp-secret', RECAPTCHA_SECRET_KEY: 'recaptcha-secret' },
        fetchImpl: fetchImpl as typeof fetch,
        now: 1000,
      });

      expect(limitedResponse.status).toBe(429);
      expect(fetchCalls.length).toBe(10);
    } finally {
      console.info = originalConsoleInfo;
    }
  });
});
