/**
 * Vercel Serverless Function — 安全保存数据到 GitHub
 * GitHub Token 存储在 Vercel 环境变量 GITHUB_TOKEN 中，前端看不到
 */

const REPO_OWNER = 'keaidejiajia';
const REPO_NAME = 'xinghuo21';
const FILE_PATH = 'data.json';
const BRANCH = 'pages';

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Server not configured: GITHUB_TOKEN missing' });
  }

  try {
    const newData = req.body;
    if (!newData || typeof newData !== 'object') {
      return res.status(400).json({ error: 'Invalid data' });
    }

    // 1. 获取当前文件（获取 sha，更新必需）
    const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`;
    const getRes = await fetch(getUrl, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    });
    
    let sha = null;
    if (getRes.ok) {
      const fileInfo = await getRes.json();
      sha = fileInfo.sha;
    }

    // 2. 写入新内容
    const content = Buffer.from(JSON.stringify(newData, null, 2), 'utf-8').toString('base64');
    const putBody = {
      message: `网页端数据更新 ${new Date().toLocaleString('zh-CN')}`,
      content,
      branch: BRANCH,
    };
    if (sha) putBody.sha = sha;

    const putUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      body: JSON.stringify(putBody),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      console.error('[save] GitHub write failed:', putRes.status, errText.slice(0, 200));
      return res.status(500).json({ error: 'GitHub write failed', status: putRes.status, detail: errText.slice(0, 300) });
    }

    console.log('[save] Successfully wrote to GitHub');
    return res.status(200).json({ ok: true, message: 'Saved', time: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
