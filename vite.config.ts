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

    // ⚠️ 不再嵌入数据！数据由 /api/load 实时拉取，嵌入会导致数据过期

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
