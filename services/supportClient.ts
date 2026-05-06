import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { sendSupport } from '../lib/support';

const SUPPORT_USER_ID_KEY = 'support_user_id';

type SupportRequestFields = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

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

export async function submitSupportRequest(fields: SupportRequestFields) {
  const userId = await getOrCreateSupportUserId();

  const result = await sendSupport({
    name: fields.name,
    email: fields.email,
    subject: fields.subject,
    message: fields.message,
    appVersion: getSupportAppVersion(),
    userId,
  });

  if (!result.success) {
    throw new Error(result.error || 'Support request could not be sent right now.');
  }

  return { ticketId: result.ticketId };
}
