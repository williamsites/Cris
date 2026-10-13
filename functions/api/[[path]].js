/**
 * Cloudflare Pages Functions: expõe a mesma API do Worker.
 * Assim o projeto funciona tanto em Workers (worker/index.js) quanto em Pages (functions/).
 */
import { handleApi } from '../../worker/api.js';

export const onRequest = async (context) => {
  const res = await handleApi(context.request, context.env);
  if (res) return res;
  return new Response(JSON.stringify({ error: 'not_found' }), {
    status: 404,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
