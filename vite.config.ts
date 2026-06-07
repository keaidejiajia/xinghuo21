import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { BAT_CONTENT, PS1_CONTENT } from './src/data/deploy-scripts'

// Post-build: clean up HTML, embed parent data, write deploy scripts
const postBuildFix = (): Plugin => ({
  name: 'post-build-fix',
  apply: 'build',
  async closeBundle() {
    const fs = await import('fs');
    const path = await import('path');
    const distDir = path.resolve(__dirname, 'dist');
    const htmlPath = path.join(distDir, 'index.html');

    if (!fs.existsSync(htmlPath)) return;

    let html = fs.readFileSync(htmlPath, 'utf-8');

    // Remove external favicon
    html = html.replace(/<link rel="icon"[^>]*\/?>/g, '');

    // Embed parent data if parent-data.json exists
    const parentDataPath = path.resolve(__dirname, 'parent-data.json');
    if (fs.existsSync(parentDataPath)) {
      const parentData = fs.readFileSync(parentDataPath, 'utf-8');
      const embedScript = `<script>window.__EMBEDDED_DATA__=${parentData};</script>`;
      html = html.replace('</head>', `${embedScript}\n</head>`);
      console.log('[parent-build] Embedded parent-data.json into index.html');
    }

    fs.writeFileSync(htmlPath, html);

    // Write deploy scripts with CRLF line endings
    fs.writeFileSync(path.join(distDir, '星火燎原.bat'), BAT_CONTENT);
    fs.writeFileSync(path.join(distDir, 'server.ps1'), PS1_CONTENT);
  },
});

export default defineConfig({
  plugins: [react(), postBuildFix()],
  base: './',
})
