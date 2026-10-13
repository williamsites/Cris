import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Apenas no servidor de desenvolvimento: entrega o pacote .zip do projeto
 * (arquivo na raiz, fora do build) para download pelo navegador.
 */
function downloadDoPacote() {
  return {
    name: 'cris-barber-download-pacote',
    apply: 'serve' as const,
    configureServer(server: { middlewares: { use: (route: string, handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) {
      server.middlewares.use('/download', (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const nome = decodeURIComponent((req.url || '').split('?')[0].replace(/^\/+/, ''));
        if (!nome || !nome.endsWith('.zip') || nome.includes('..')) return next();
        const arquivo = path.join(process.cwd(), nome);
        if (!fs.existsSync(arquivo)) return next();
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
        fs.createReadStream(arquivo).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), downloadDoPacote()],
  server: {
    host: '0.0.0.0',
    port: 3001,
    strictPort: true,
    // em desenvolvimento a API do SaaS roda no Worker local (npx wrangler dev)
    proxy: {
      '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true },
    },
    allowedHosts: [
      'pv-081c73c00cfb-9b0ed122-6506-4f1b-9d0c-e5d07c3240bf.style.dev',
    ],
  },
  preview: {
    host: '0.0.0.0',
    port: 3001,
    strictPort: true,
  },
});
