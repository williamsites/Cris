import { handleApi } from './api.js';

/**
 * Cloudflare Worker: serve o PWA (assets) e a API do SaaS no mesmo domínio.
 * As rotas /api/* são atendidas por handleApi; o resto vem de env.ASSETS.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const res = await handleApi(request, env);
      return res || new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { 'content-type': 'application/json' } });
    }
    const res = await env.ASSETS.fetch(request);
    const headers = new Headers(res.headers);
    headers.set('x-content-type-options', 'nosniff');
    headers.set('referrer-policy', 'strict-origin-when-cross-origin');
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  },
};
