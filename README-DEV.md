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

## AdMob Setup

This app uses `react-native-google-mobile-ads`. Ads require an EAS development build or production build; they do not work in Expo Go.

### AdMob Account

1. Create an AdMob account.
2. Add the Android app and iOS app separately.
3. Copy the Android App ID and iOS App ID into environment variables:
   - `ADMOB_ANDROID_APP_ID`
   - `ADMOB_IOS_APP_ID`
4. Create these ad units in AdMob:
   - 1 adaptive banner
   - 1 interstitial
   - 1 rewarded
5. Put production ad unit IDs in:
   - `EXPO_PUBLIC_ADMOB_BANNER_AD_UNIT_ID`
   - `EXPO_PUBLIC_ADMOB_INTERSTITIAL_AD_UNIT_ID`
   - `EXPO_PUBLIC_ADMOB_REWARDED_AD_UNIT_ID`

Development builds automatically use Google test ad units:

- Banner: `ca-app-pub-3940256099942544/6300978111`
- Interstitial: `ca-app-pub-3940256099942544/1033173712`
- Rewarded: `ca-app-pub-3940256099942544/5224354917`

### GDPR Consent

`lib/ads.ts` runs the Google UMP consent flow before initializing the Mobile Ads SDK. Users can revisit consent in Settings > Privacy & Safety > Ad Privacy.

Do not persist real consent as your source of truth; UMP is checked on app start. The local value is informational only.

### Builds

After changing AdMob app IDs or plugin config, rebuild the native app:

```bash
eas build --profile development
```

### Store Compliance

- Android Play Console: set "Yes, my app contains ads".
- iOS App Store Connect: disclose ads and tracking usage where required.
- The iOS `NSUserTrackingUsageDescription` is configured in Expo config.
- Configure an ATT message in AdMob/UMP if you use personalized ads.

### Example Usage

The root app shell renders `AdBanner` above the tab bar on non-camera tabs:

```tsx
<AdBanner visible={activeTab !== 'scan'} bottomOffset={92} />
```

Use `useInterstitial()` for natural breaks and `useRewarded()` for opt-in rewards. Interstitial display is rate-limited to once every three minutes.
