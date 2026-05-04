import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SUPPORT_USER_ID_KEY = 'support_user_id';

type SupportRequestFields = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type Grecaptcha = {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

const getPublicEnv = (key: string) =>
  ((globalThis as any).process?.env?.[key] as string | undefined) || '';

const createSupportUserId = () => {
  const randomId = globalThis.crypto?.randomUUID?.();

  if (randomId) {
    return randomId;
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export function getSupportAppVersion() {
  return Constants.expoConfig?.version || 'unknown';
}

export async function getOrCreateSupportUserId() {
  try {
    const existingId = await SecureStore.getItemAsync(SUPPORT_USER_ID_KEY);

    if (existingId) {
      return existingId;
    }

    const nextId = createSupportUserId();
    await SecureStore.setItemAsync(SUPPORT_USER_ID_KEY, nextId);
    return nextId;
  } catch {
    return createSupportUserId();
  }
}

function getSupportApiUrl() {
  const configuredUrl = getPublicEnv('EXPO_PUBLIC_SUPPORT_API_URL');

  if (configuredUrl) {
    return configuredUrl;
  }

  if (Platform.OS === 'web') {
    return '/api/support';
  }

  throw new Error('Support API URL is not configured for this build.');
}

async function getRecaptchaToken() {
  const siteKey = getPublicEnv('EXPO_PUBLIC_RECAPTCHA_SITE_KEY');

  if (!siteKey) {
    throw new Error('Support verification is not configured for this build.');
  }

  if (Platform.OS !== 'web') {
    throw new Error('Native reCAPTCHA verification is not configured for this build.');
  }

  const grecaptcha = (globalThis as any).grecaptcha as Grecaptcha | undefined;

  if (!grecaptcha) {
    throw new Error('Support verification is not ready yet.');
  }

  await new Promise<void>((resolve) => grecaptcha.ready(resolve));
  return grecaptcha.execute(siteKey, { action: 'support' });
}

export async function submitSupportRequest(fields: SupportRequestFields) {
  const [userId, recaptchaToken] = await Promise.all([
    getOrCreateSupportUserId(),
    getRecaptchaToken(),
  ]);

  const response = await fetch(getSupportApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...fields,
      app_version: getSupportAppVersion(),
      user_id: userId,
      recaptchaToken,
    }),
  });
  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof responseBody.error === 'string'
        ? responseBody.error
        : 'Support request could not be sent right now.'
    );
  }

  return responseBody as { ticketId: string };
}
