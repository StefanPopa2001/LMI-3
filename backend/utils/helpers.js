// Generic retry helper for transient errors (DNS EAI_AGAIN, networking)
async function withRetry(fn, { retries = 3, delayMs = 300 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try { return await fn(); } catch (e) {
      lastErr = e;
      const code = e && (e.code || e.errno);
      // Retry only transient network/dns errors
      if (!['EAI_AGAIN','ECONNRESET','ENOTFOUND','ETIMEDOUT'].includes(code) || attempt === retries) {
        throw e;
      }
      await new Promise(r=>setTimeout(r, delayMs * (attempt + 1))); // simple backoff
    }
  }
  throw lastErr;
}

function normalizePrefix(prefixRaw) {
  if (!prefixRaw) return '';
  let p = prefixRaw.trim();
  if (p.startsWith('/')) p = p.slice(1);
  if (p === '/') return '';
  if (p && !p.endsWith('/')) p += '/';
  return p;
}

function inferTextLike(ext) {
  return [
    'txt','md','json','log','js','ts','jsx','tsx','css','scss','html','xml','yml','yaml','csv'
  ].includes(String(ext || '').toLowerCase());
}

module.exports = { withRetry, normalizePrefix, inferTextLike };