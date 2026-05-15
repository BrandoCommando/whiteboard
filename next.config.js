/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled to prevent double canvas renders in dev
};

module.exports = nextConfig;

// #region agent log
function debugLog(hypothesisId, message, data) {
  const payload = {
    sessionId: 'ad4581',
    hypothesisId,
    location: 'next.config.js',
    message,
    data,
    timestamp: Date.now(),
  };
  console.log('[debug-ad4581]', JSON.stringify(payload));
  fetch('http://127.0.0.1:7248/ingest/6d993f84-4dca-4da8-9d91-927c6cfa435e', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'ad4581' },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

debugLog('A', 'next.config loaded', {
  NODE_ENV: process.env.NODE_ENV,
  CI: process.env.CI,
  VERCEL: process.env.VERCEL,
  hasAsyncLocalStorage: !!globalThis.AsyncLocalStorage,
});

import('@opennextjs/cloudflare')
  .then((m) => {
    debugLog('A', 'opennext module loaded', {
      hasInit: typeof m.initOpenNextCloudflareForDev === 'function',
    });
    return m.initOpenNextCloudflareForDev();
  })
  .then(() => {
    debugLog('A', 'initOpenNextCloudflareForDev completed');
  })
  .catch((err) => {
    debugLog('A', 'initOpenNextCloudflareForDev failed', {
      name: err?.name,
      code: err?.code,
      message: err?.message,
    });
  });

process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  debugLog('D', 'unhandledRejection in next.config process', {
    name: err.name,
    code: err.code,
    message: err.message,
    syscall: err.syscall,
  });
});
// #endregion
