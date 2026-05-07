import Constants from 'expo-constants';

export interface SupportData {
  name: string;
  email: string;
  subject: string;
  message: string;
  appVersion: string;
  userId: string;
}

export interface SupportResponse {
  success: boolean;
  ticketId?: string;
  error?: string;
}

const TIMEOUT_MS = 10000; // 10 seconds

export async function sendSupport(data: SupportData): Promise<SupportResponse> {
  const workerUrl = Constants.expoConfig?.extra?.supportWorkerUrl as string;
  
  if (!workerUrl) {
    return { success: false, error: 'Support worker URL not configured' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${workerUrl}/support`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const result = await response.json() as SupportResponse;

    if (!response.ok) {
      return { 
        success: false, 
        error: result.error || 'Failed to send support request' 
      };
    }

    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Request timeout' };
    }
    
    return { success: false, error: 'Network error' };
  }
}

