/**
 * Vercel Serverless Function — 安全保存数据到 GitHub（带并发重试）
 * 数据存储在 data 分支，与 pages 部署分支分离
 */
const REPO_OWNER = 'keaidejiajia';
const REPO_NAME = 'xinghuo21';
const FILE_PATH = 'data.json';
const BRANCH = 'data';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not set' });

  try {
    const newData = req.body;
    const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`;
    const putUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
    const content = Buffer.from(JSON.stringify(newData, null, 2), 'utf-8').toString('base64');

    for (let attempt = 0; attempt < 3; attempt++) {
      // 获取当前文件的 SHA（如果存在）
      let sha = null;
      const getRes = await fetch(getUrl, {
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (getRes.ok) {
        const ghData = await getRes.json();
        sha = ghData.sha;
      }
      // 404 意味着文件不存在（首次保存），不带 SHA 即可创建

      const putBody = { message: `📊 ${new Date().toLocaleString('zh-CN')}`, content, branch: BRANCH };
      if (sha) putBody.sha = sha;

      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
        body: JSON.stringify(putBody),
      });

      if (putRes.ok) {
        return res.status(200).json({ ok: true, message: 'Saved', time: new Date().toISOString() });
      }

      // 409 = conflict (SHA 不匹配)，重试
      if (putRes.status !== 409) {
        const errText = await putRes.text();
        return res.status(500).json({ error: 'GitHub API failed', detail: { status: putRes.status, body: errText.slice(0, 200) } });
      }
      // 404 on PUT = branch doesn't exist, try without branch first to create file on default branch
      // Then retry with branch specification
      if (putRes.status === 404 && !sha) {
        const errText = await putRes.text();
        // If the data branch doesn't exist, create it by pushing to main first then we'll handle it
        return res.status(500).json({ error: 'Branch may not exist', detail: { status: putRes.status, body: errText.slice(0, 200) } });
      }
      await new Promise(r => setTimeout(r, 600));
    }
    return res.status(500).json({ error: 'Conflict after 3 retries' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
