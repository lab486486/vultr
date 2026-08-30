// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { site } from './src/site.config.ts';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function tagStats() {
  return {
    name: 'tag-stats',
    hooks: {
      'astro:build:start': () => {
        execFileSync(process.execPath, [path.join(rootDir, 'scripts/generate-tag-stats.mjs')], {
          stdio: 'inherit',
        });
      },
    },
  };
}

export default defineConfig({
  site: site.baseUrl,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404') && !page.includes('/admin'),
    }),
    tagStats(),
  ],
  build: {
    inlineStylesheets: 'always',
  },
});
