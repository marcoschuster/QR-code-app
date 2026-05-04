import { z } from 'zod';

type Env = Record<string, string | undefined>;
type HeaderMap = Record<string, string | string[] | undefined>;
type FetchLike = typeof fetch;

declare const process: { env: Env } | undefined;

const DEFAULT_SUPPORT_FROM = 'noreply@ourdomain.de';
const DEFAULT_SUPPORT_TO = 'support@ourdomain.de';
const DEFAULT_SMTP2GO_API_URL = 'https://api.smtp2go.com/v3/email/send';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MIN_RECAPTCHA_SCORE = 0.5;

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const getRuntimeEnv = (env?: Env): Env => env ?? (typeof process !== 'undefined' ? process.env : {});

export const stripHtml = (value: string) =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

const cleanedString = (maxLength: number, minLength = 1) =>
  z.string().transform(stripHtml).pipe(z.string().min(minLength).max(maxLength));

export const supportPayloadSchema = z.object({
  name: cleanedString(120),
  email: z.string().transform(stripHtml).pipe(z.string().email().max(254)),
  subject: cleanedString(140, 3),
  message: z.string().transform(stripHtml).pipe(z.string().min(10).max(2000)),
  app_version: cleanedString(64).default('unknown'),
  user_id: cleanedString(128),
  recaptchaToken: z.string().min(1).max(4096),
}).strict();

export type SupportPayload = z.infer<typeof supportPayloadSchema>;

export interface SupportResult {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

interface HandleSupportOptions {
  method?: string;
  headers?: HeaderMap;
  body?: unknown;
  env?: Env;
  fetchImpl?: FetchLike;
  now?: number;
}

const safeJsonParse = (body: unknown) => {
  if (typeof body !== 'string') {
    return body;
  }

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
};

const getHeader = (headers: HeaderMap | undefined, key: string) => {
  if (!headers) {
    return undefined;
  }

  const lowerKey = key.toLowerCase();
  const match = Object.entries(headers).find(([headerKey]) => headerKey.toLowerCase() === lowerKey);
  const value = match?.[1];

  return Array.isArray(value) ? value[0] : value;
};

const getClientIp = (headers?: HeaderMap) => {
  const forwardedFor = getHeader(headers, 'x-forwarded-for');
  const realIp = getHeader(headers, 'x-real-ip');
  const candidate = forwardedFor?.split(',')[0]?.trim() || realIp?.trim();

  return candidate || 'unknown';
};

export function checkSupportRateLimit(ip: string, now = Date.now()) {
  const bucket = rateLimitBuckets.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - bucket.count,
    retryAfterSeconds: 0,
  };
}

export function resetSupportRateLimit() {
  rateLimitBuckets.clear();
}

export function getSupportPublicConfig(env?: Env) {
  const runtimeEnv = getRuntimeEnv(env);

  return {
    supportApiConfigured: Boolean(runtimeEnv.SMTP2GO_API_KEY || runtimeEnv.BREVO_API_KEY),
    supportFromEmail: runtimeEnv.SUPPORT_FROM_EMAIL || DEFAULT_SUPPORT_FROM,
    supportToEmail: runtimeEnv.SUPPORT_TO_EMAIL || DEFAULT_SUPPORT_TO,
    recaptchaSiteKeyConfigured: Boolean(runtimeEnv.EXPO_PUBLIC_RECAPTCHA_SITE_KEY),
  };
}

async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoded);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function createTicketId() {
  const randomId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `SUP-${randomId.slice(0, 8).toUpperCase()}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailContent(payload: SupportPayload, ticketId: string) {
  const supportSubject = `[Support] ${payload.subject} - ${payload.user_id}`;
  const rows = [
    ['Ticket ID', ticketId],
    ['Name', payload.name],
    ['Email', payload.email],
    ['Subject', payload.subject],
    ['App Version', payload.app_version],
    ['User ID', payload.user_id],
    ['Message', payload.message],
  ] as const;

  const textBody = rows.map(([label, value]) => `${label}: ${value}`).join('\n\n');
  const htmlRows = rows
    .map(([label, value]) => {
      const formattedValue = escapeHtml(value).replace(/\n/g, '<br />');
      return `<tr><th align="left" style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(label)}</th><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${formattedValue}</td></tr>`;
    })
    .join('');

  return {
    subject: supportSubject,
    textBody,
    htmlBody: `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px;">${htmlRows}</table>`,
  };
}

async function verifyRecaptcha(token: string, env: Env, fetchImpl: FetchLike) {
  const secret = env.RECAPTCHA_SECRET_KEY;

  if (!secret) {
    throw new Error('reCAPTCHA is not configured');
  }

  const formData = new URLSearchParams();
  formData.set('secret', secret);
  formData.set('response', token);

  const response = await fetchImpl('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });
  const result = await response.json() as { success?: boolean; score?: number };

  return Boolean(result.success) && typeof result.score === 'number' && result.score > MIN_RECAPTCHA_SCORE;
}

async function sendViaSmtp2Go(payload: SupportPayload, ticketId: string, env: Env, fetchImpl: FetchLike) {
  const { subject, textBody, htmlBody } = buildEmailContent(payload, ticketId);
  const response = await fetchImpl(env.SMTP2GO_API_URL || DEFAULT_SMTP2GO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-SMTP2GO-API-KEY': env.SMTP2GO_API_KEY || '',
    },
    body: JSON.stringify({
      sender: env.SUPPORT_FROM_EMAIL || DEFAULT_SUPPORT_FROM,
      to: [env.SUPPORT_TO_EMAIL || DEFAULT_SUPPORT_TO],
      reply_to: payload.email,
      subject,
      text_body: textBody,
      html_body: htmlBody,
      custom_headers: [{ header: 'X-Ticket-ID', value: ticketId }],
    }),
  });

  if (!response.ok) {
    throw new Error('SMTP2GO send failed');
  }
}

async function sendViaBrevo(payload: SupportPayload, ticketId: string, env: Env, fetchImpl: FetchLike) {
  const { subject, textBody, htmlBody } = buildEmailContent(payload, ticketId);
  const fromEmail = env.SUPPORT_FROM_EMAIL || DEFAULT_SUPPORT_FROM;
  const toEmail = env.SUPPORT_TO_EMAIL || DEFAULT_SUPPORT_TO;
  const response = await fetchImpl(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': env.BREVO_API_KEY || '',
    },
    body: JSON.stringify({
      sender: { email: fromEmail },
      to: [{ email: toEmail }],
      replyTo: { email: payload.email },
      subject,
      textContent: textBody,
      htmlContent: htmlBody,
      headers: { 'X-Ticket-ID': ticketId },
    }),
  });

  if (!response.ok) {
    throw new Error('Brevo send failed');
  }
}

export async function sendSupportEmail(payload: SupportPayload, ticketId: string, env?: Env, fetchImpl: FetchLike = fetch) {
  const runtimeEnv = getRuntimeEnv(env);

  if (runtimeEnv.SMTP2GO_API_KEY) {
    await sendViaSmtp2Go(payload, ticketId, runtimeEnv, fetchImpl);
    return 'smtp2go';
  }

  if (runtimeEnv.BREVO_API_KEY) {
    await sendViaBrevo(payload, ticketId, runtimeEnv, fetchImpl);
    return 'brevo';
  }

  throw new Error('No support email provider configured');
}

async function logSupportTicket(payload: SupportPayload, ticketId: string) {
  const userIdHash = await sha256(payload.user_id);

  console.info('[support_ticket]', {
    timestamp: new Date().toISOString(),
    user_id_hash: userIdHash,
    ticket_id: ticketId,
  });
}

export async function handleSupportRequest({
  method = 'POST',
  headers,
  body,
  env,
  fetchImpl = fetch,
  now = Date.now(),
}: HandleSupportOptions): Promise<SupportResult> {
  if (method.toUpperCase() !== 'POST') {
    return {
      status: 405,
      body: { error: 'Method not allowed.' },
      headers: { Allow: 'POST' },
    };
  }

  const rateLimit = checkSupportRateLimit(getClientIp(headers), now);

  if (!rateLimit.allowed) {
    return {
      status: 429,
      body: { error: 'Too many support requests. Please try again later.' },
      headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
    };
  }

  const parsedPayload = supportPayloadSchema.safeParse(safeJsonParse(body));

  if (!parsedPayload.success) {
    return {
      status: 400,
      body: { error: 'Please check the support form and try again.' },
    };
  }

  const runtimeEnv = getRuntimeEnv(env);
  const ticketId = createTicketId();

  try {
    const verified = await verifyRecaptcha(parsedPayload.data.recaptchaToken, runtimeEnv, fetchImpl);

    if (!verified) {
      return {
        status: 400,
        body: { error: 'Support verification failed. Please try again.' },
      };
    }

    await sendSupportEmail(parsedPayload.data, ticketId, runtimeEnv, fetchImpl);
    await logSupportTicket(parsedPayload.data, ticketId);

    return {
      status: 200,
      body: { ticketId },
    };
  } catch {
    return {
      status: 500,
      body: { error: 'Support request could not be sent right now.' },
    };
  }
}
