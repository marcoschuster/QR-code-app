# Development Environment Setup

## Preventing Windsurf Editor Timeouts

This project has been configured to prevent the development server and IDE from closing when idle or in battery save mode.

### Changes Made:

1. **Metro Configuration** (`metro.config.js`)
   - Increased server timeout to 5 minutes (300000ms)
   - Added middleware to prevent request timeouts
   - Enabled cache reset for stability

2. **Expo Configuration** (`app.config.js`)
   - Added development client settings
   - Optimized Metro bundler configuration

3. **Package Scripts** (`package.json`)
   - Added `--timeout 300000` flag to start commands
   - Extended timeout for web development

4. **Environment Variables** (`.env`)
   - Set development timeout to 5 minutes
   - Increased Node.js memory allocation
   - Disabled unnecessary validations for battery saving

5. **TypeScript Configuration** (`tsconfig.json`)
   - Fixed module resolution for better stability

### Usage:

```bash
# Start development with extended timeout
npm start

# For web development
npm run web

# For mobile development
npm run android
# or
npm run ios
```

### Additional Recommendations:

1. **System Settings:**
   - Add your IDE to battery saver exceptions
   - Prevent system sleep during development
   - Keep your device plugged in during long development sessions

2. **IDE Settings:**
   - Increase IDE timeout settings
   - Enable "Keep process alive" options
   - Disable auto-save if causing issues

3. **Development Workflow:**
   - Use `expo start --dev-client` for better stability
   - Clear cache if issues persist: `expo start -c`
   - Monitor Metro bundler logs for timeout warnings

### Troubleshooting:

If the editor still closes:

1. Check system power settings
2. Verify IDE background process permissions
3. Try `expo start --clear` to reset cache
4. Restart with elevated permissions if needed

The configuration should now keep your development environment stable during idle periods and battery save mode.

## Support Email Setup

The app sends bug reports to the server-side `/api/support` route. Do not send mail from the client and do not expose SMTP2GO or Brevo keys in `EXPO_PUBLIC_*` variables.

### Environment

Copy `.env.example` to `.env.local` for the serverless deployment and set:

- `SMTP2GO_API_KEY` for the primary provider.
- `BREVO_API_KEY` only as the fallback when SMTP2GO is not configured.
- `RECAPTCHA_SECRET_KEY` for server-side Google reCAPTCHA v3 checks.
- `EXPO_PUBLIC_RECAPTCHA_SITE_KEY` for the client-side reCAPTCHA v3 token.
- `SUPPORT_FROM_EMAIL`, default `noreply@ourdomain.de`.
- `SUPPORT_TO_EMAIL`, default `support@ourdomain.de`. Set this to a Gmail address if support mail should land there directly.

### SMTP2GO Deliverability

1. Verify `ourdomain.de` in SMTP2GO.
2. Add the SPF record requested by SMTP2GO.
3. Add the DKIM CNAME/TXT records requested by SMTP2GO.
4. Add a DMARC record, for example `v=DMARC1; p=quarantine; rua=mailto:dmarc@ourdomain.de`.
5. Disable custom tracking domains and open/click tracking for this transactional flow to avoid extra cookies.
6. Configure SMTP2GO for the EU data region if it is available on the account.

### GDPR/DPA

1. Sign the SMTP2GO data processing agreement before production use.
2. If Brevo fallback is enabled, sign Brevo's DPA too.
3. Keep support logs minimal. The route logs only timestamp, hashed user id, and ticket id.
4. Make sure the privacy policy covers support request processing, retention, and subprocessors.

### Deployment Notes

Deploy either the root `api/support.ts` serverless route or the Expo Router `app/api/support+api.ts` route, depending on the host. Native app builds need `EXPO_PUBLIC_SUPPORT_API_URL` to point to the deployed route.
