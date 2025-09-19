// Simple email service hitting backend admin route
// Assumes auth token (JWT) is stored in localStorage under 'token'

export interface SendEmailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SendEmailResponse {
  message: string;
  id?: string;
  previewUrl?: string;
  error?: string;
  details?: string;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export async function sendTestEmail(payload: SendEmailPayload): Promise<SendEmailResponse> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${BACKEND_URL}/admin/email/test`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    let errorMsg = 'Failed to send email';
    try { const j = await res.json(); errorMsg = j.error || errorMsg; return j; } catch {}
    return { message: 'error', error: errorMsg };
  }
  return res.json();
}
