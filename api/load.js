/**
 * Vercel Serverless Function — 从 GitHub 读取最新数据
 * 使用 GitHub Contents API（认证通道，无 CDN 缓存问题）
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

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not set' });

  try {
    const ghRes = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.raw+json',
        },
      }
    );

    if (ghRes.status === 404) {
      // data.json 不存在（首次使用）— 返回空对象
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({});
    }

    if (!ghRes.ok) {
      const errText = await ghRes.text().catch(() => '');
      return res.status(502).json({ error: 'GitHub API failed', status: ghRes.status, detail: errText.slice(0, 200) });
    }

    const data = await ghRes.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
