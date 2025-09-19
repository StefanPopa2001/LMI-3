const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface FrontendLogPayload {
  level?: 'info' | 'error';
  message: string;
  meta?: any;
}

async function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : undefined;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export async function logFrontend(payload: FrontendLogPayload) {
  try {
    await fetch(`${API_BASE_URL}/admin/logs/frontend`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(payload)
    });
  } catch (e) {
    // Avoid recursive loops; only warn in console
    // eslint-disable-next-line no-console
    console.warn('Failed to send frontend log', e);
  }
}

export function logInfo(message: string, meta?: any) {
  return logFrontend({ level: 'info', message, meta });
}

export function logError(message: string, meta?: any) {
  return logFrontend({ level: 'error', message, meta });
}
