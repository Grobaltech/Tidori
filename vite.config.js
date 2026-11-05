import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// The original Helpz source is intentionally kept in /original in the repository.
// Copy it into Vite's public directory so its styles and plugin scripts are present
// in both development and the production Cloudflare build.
function publishOriginalTemplate() {
  const source = resolve(process.cwd(), 'original');
  const target = resolve(process.cwd(), 'public/original');
  const copy = () => {
    if (!existsSync(source)) return;
    mkdirSync(resolve(process.cwd(), 'public'), { recursive: true });
    cpSync(source, target, { recursive: true, force: true });
  };
  return {
    name: 'publish-original-template-assets',
    buildStart() { copy(); },
    configureServer() { copy(); },
  };
}

export default defineConfig({
  plugins: [react(), publishOriginalTemplate()],
  build: { outDir: 'dist', sourcemap: false },
});
