interface Env {
  BREVO_API_KEY: string;
  SUPPORT_FROM_EMAIL: string;
  SUPPORT_TO_EMAIL: string;
  RATE_LIMIT_KV: KVNamespace;
}

interface SupportPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
  appVersion: string;
  userId: string;
}

const MONTHLY_LIMIT = 5; // 5 emails per month per user
const MONTH_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function checkUserRateLimit(userId: string, env: Env): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const now = Date.now();
  const key = `user_limit:${userId}`;
  
  const existing = await env.RATE_LIMIT_KV.get(key, 'json');
  
  if (!existing) {
    // First request this month
    await env.RATE_LIMIT_KV.put(key, JSON.stringify({
      count: 1,
      resetAt: now + MONTH_MS,
    }), { expirationTtl: Math.ceil(MONTH_MS / 1000) });
    
    return { allowed: true, remaining: MONTHLY_LIMIT - 1, retryAfter: 0 };
  }

  const data = existing as { count: number; resetAt: number };
  
  if (data.resetAt <= now) {
    // Month has passed, reset counter
    await env.RATE_LIMIT_KV.put(key, JSON.stringify({
      count: 1,
      resetAt: now + MONTH_MS,
    }), { expirationTtl: Math.ceil(MONTH_MS / 1000) });
    
    return { allowed: true, remaining: MONTHLY_LIMIT - 1, retryAfter: 0 };
  }

  if (data.count >= MONTHLY_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((data.resetAt - now) / 1000),
    };
  }

  // Increment counter
  data.count += 1;
  await env.RATE_LIMIT_KV.put(key, JSON.stringify(data), { expirationTtl: Math.ceil((data.resetAt - now) / 1000) });
  
  return {
    allowed: true,
    remaining: MONTHLY_LIMIT - data.count,
    retryAfter: 0,
  };
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createTicketId(): string {
  const randomId = crypto.randomUUID();
  return `SUP-${randomId.slice(0, 8).toUpperCase()}`;
}

function buildEmailContent(payload: SupportPayload, ticketId: string) {
  const supportSubject = `[Support] ${payload.subject} - ${payload.userId}`;
  const rows = [
    ['Ticket ID', ticketId],
    ['Name', payload.name],
    ['Email', payload.email],
    ['Subject', payload.subject],
    ['App Version', payload.appVersion],
    ['User ID', payload.userId],
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

async function sendViaBrevo(payload: SupportPayload, ticketId: string, env: Env): Promise<void> {
  const { subject, textBody, htmlBody } = buildEmailContent(payload, ticketId);
  
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { email: env.SUPPORT_FROM_EMAIL },
      to: [{ email: env.SUPPORT_TO_EMAIL }],
      replyTo: { email: payload.email },
      subject,
      textContent: textBody,
      htmlContent: htmlBody,
      headers: { 'X-Ticket-ID': ticketId },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Brevo API error:', errorText);
    throw new Error('Failed to send email via Brevo');
  }
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { 
            ...corsHeaders(),
            'Content-Type': 'application/json',
            'Allow': 'POST'
          } 
        }
      );
    }

    try {
      const body = await request.json() as SupportPayload;

      // User-based rate limiting (5 emails per month)
      const rateLimit = await checkUserRateLimit(body.userId, env);
      if (!rateLimit.allowed) {
        return new Response(
          JSON.stringify({ error: 'You have reached your monthly support request limit. Please try again later.' }),
          { 
            status: 429, 
            headers: { 
              ...corsHeaders(),
              'Content-Type': 'application/json',
              'Retry-After': String(rateLimit.retryAfter)
            } 
          }
        );
      }

      // Validation
      if (!body.name || typeof body.name !== 'string' || body.name.length > 120) {
        return new Response(
          JSON.stringify({ error: 'Invalid name' }),
          { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      if (!body.email || !validateEmail(body.email) || body.email.length > 254) {
        return new Response(
          JSON.stringify({ error: 'Invalid email address' }),
          { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      if (!body.subject || typeof body.subject !== 'string' || body.subject.length < 3 || body.subject.length > 140) {
        return new Response(
          JSON.stringify({ error: 'Subject must be between 3 and 140 characters' }),
          { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      if (!body.message || typeof body.message !== 'string' || body.message.length < 10 || body.message.length > 2000) {
        return new Response(
          JSON.stringify({ error: 'Message must be between 10 and 2000 characters' }),
          { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      if (!body.appVersion || typeof body.appVersion !== 'string' || body.appVersion.length > 64) {
        return new Response(
          JSON.stringify({ error: 'Invalid app version' }),
          { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      if (!body.userId || typeof body.userId !== 'string' || body.userId.length > 128) {
        return new Response(
          JSON.stringify({ error: 'Invalid user ID' }),
          { status: 400, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
        );
      }

      // Send email
      const ticketId = createTicketId();
      await sendViaBrevo(body, ticketId, env);

      // Log ticket (for monitoring)
      console.info('[support_ticket]', {
        timestamp: new Date().toISOString(),
        ticket_id: ticketId,
        user_id: body.userId,
      });

      return new Response(
        JSON.stringify({ success: true, ticketId }),
        { 
          status: 201, 
          headers: { ...corsHeaders(), 'Content-Type': 'application/json' } 
        }
      );

    } catch (error) {
      console.error('Support request error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
      );
    }
  },
};
