/**
 * Vercel Serverless Function — 从 GitHub 读取最新数据
 * 使用 GitHub Contents API（Base64 解码，避免中文编码问题）
 * 数据存储在 data 分支，与 pages 部署分支分离
 */
const REPO_OWNER = 'keaidejiajia';
const REPO_NAME = 'xinghuo21';
const FILE_PATH = 'data.json';
const BRANCH = 'data';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }

  try {
    // Fast path: raw content avoids GitHub Contents API base64 overhead.
    const rawRes = await fetch(
      `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${FILE_PATH}?t=${Date.now()}`,
      { headers: { Accept: 'application/json' }, cache: 'no-store' }
    );
    if (rawRes.ok) {
      const data = await rawRes.text();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(data);
    }

    const token = process.env.GITHUB_TOKEN;
    if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not set', rawStatus: rawRes.status });

    // Use standard Contents API (returns Base64 content) to avoid encoding corruption
    const ghRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (ghRes.status === 404) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({});
    }

    if (!ghRes.ok) {
      const errText = await ghRes.text().catch(() => '');
      return res.status(502).json({ error: 'GitHub API failed', status: ghRes.status, detail: errText.slice(0, 200) });
    }

    const ghData = await ghRes.json();
    // Decode Base64 content to UTF-8 string
    const data = Buffer.from(ghData.content, 'base64').toString('utf-8');

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
