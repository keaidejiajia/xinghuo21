/**
 * Vercel Serverless Function — 从 GitHub 读取最新数据（绕过浏览器 CORS）
 */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }
  try {
    const ghRes = await fetch(
      'https://raw.githubusercontent.com/keaidejiajia/xinghuo21/pages/data.json',
      { headers: { 'Cache-Control': 'max-age=0' } }
    );
    if (!ghRes.ok) return res.status(502).json({ error: 'GitHub not reachable' });
    const data = await ghRes.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
