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
    const token = process.env.GITHUB_TOKEN;
    if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not set' });

    // Use GitHub APIs instead of raw.githubusercontent.com to avoid CDN cache staleness.
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
    let data = '';

    if (ghData.encoding === 'base64' && ghData.content) {
      data = Buffer.from(ghData.content, 'base64').toString('utf-8');
    } else if (ghData.encoding === 'none' && ghData.git_url) {
      // Files larger than 1MB return metadata only from the Contents API.
      const blobRes = await fetch(ghData.git_url, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      if (!blobRes.ok) {
        const errText = await blobRes.text().catch(() => '');
        return res.status(502).json({ error: 'GitHub Blob API failed', status: blobRes.status, detail: errText.slice(0, 200) });
      }
      const blobData = await blobRes.json();
      data = Buffer.from(blobData.content, 'base64').toString('utf-8');
    } else {
      return res.status(502).json({ error: 'Unsupported GitHub content encoding', encoding: ghData.encoding });
    }

    JSON.parse(data);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
