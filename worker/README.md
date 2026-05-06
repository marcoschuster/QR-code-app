# Cloudflare Worker for Support Email

This Cloudflare Worker handles support email requests from the Expo QR Scanner app, sending emails via Brevo API.

## Architecture

- **Frontend**: Expo React Native app (no API keys)
- **Backend**: Cloudflare Worker (holds Brevo API key as secret)
- **Email Provider**: Brevo transactional API

## Setup Instructions

### 1. Brevo Setup

1. Create a Brevo account at https://www.brevo.com
2. Generate API Key:
   - Go to Settings > SMTP & API > API Keys
   - Click "Add a new API key"
   - Name it "expo-support-worker"
   - Copy the API key (you'll need it for the worker)
3. Verify Sender Domain:
   - Go to Senders > Senders & Domains
   - Add your domain (e.g., mydomain.de)
   - Follow the DNS setup instructions (SPF/DKIM)
   - Keep IP blocking deactivated for now

### 2. Cloudflare Worker Deployment

#### Prerequisites
- Install Wrangler CLI: `npm install -g wrangler`
- Login to Cloudflare: `wrangler login`

#### Configure Worker

1. Update `wrangler.toml`:
   ```toml
   name = "qr-scanner-support"
   main = "worker.ts"
   compatibility_date = "2024-01-01"

   [vars]
   SUPPORT_FROM_EMAIL = "noreply@mydomain.de"
   SUPPORT_TO_EMAIL = "support@mydomain.de"
   ```

2. Set Brevo API Key as secret:
   ```bash
   cd worker
   wrangler secret put BREVO_API_KEY
   # Paste your Brevo API key when prompted
   ```

3. Deploy to EU region:
   ```bash
   wrangler deploy
   ```

4. Note the worker URL from the output (e.g., `https://qr-scanner-support.YOUR_SUBDOMAIN.workers.dev`)

### 3. Expo App Configuration

1. Update `.env` in the Expo app:
   ```env
   EXPO_PUBLIC_SUPPORT_WORKER_URL=https://your-worker.workers.dev
   ```

2. The app will automatically pick up this URL via `Constants.expoConfig.extra.supportWorkerUrl`

### 4. Using the Support Function

In your Expo app:

```typescript
import { sendSupport } from '../lib/support';

const result = await sendSupport({
  name: 'John Doe',
  email: 'john@example.com',
  subject: 'App Issue',
  message: 'I need help with...',
  appVersion: '1.0.0',
  userId: 'user-123',
});

if (result.success) {
  console.log('Ticket ID:', result.ticketId);
} else {
  console.error('Error:', result.error);
}
```

## API Endpoint

### POST /support

**Request Body:**
```json
{
  "name": "string (max 120 chars)",
  "email": "string (valid email, max 254 chars)",
  "subject": "string (3-140 chars)",
  "message": "string (10-2000 chars)",
  "appVersion": "string (max 64 chars)",
  "userId": "string (max 128 chars)"
}
```

**Response (Success):**
```json
{
  "success": true,
  "ticketId": "SUP-ABC12345"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Rate Limiting

- 5 requests per IP per 10 minutes
- Returns 429 status with `Retry-After` header when limit exceeded

## Security

- Brevo API key stored as Cloudflare secret (never in app code)
- CORS enabled for Expo app
- Input validation on all fields
- Rate limiting to prevent abuse

## Testing

Test the worker locally:
```bash
cd worker
wrangler dev
```

Then test with curl:
```bash
curl -X POST http://localhost:8787/support \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "subject": "Test Subject",
    "message": "Test message content",
    "appVersion": "1.0.0",
    "userId": "test-user-123"
  }'
```

## Monitoring

View worker logs:
```bash
wrangler tail
```

## Troubleshooting

- **401 Unauthorized**: Check Brevo API key is set correctly
- **400 Bad Request**: Validate request body matches schema
- **429 Too Many Requests**: Rate limit exceeded, wait and retry
- **500 Internal Server Error**: Check worker logs with `wrangler tail`
