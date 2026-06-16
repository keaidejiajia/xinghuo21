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

  const startedAt = Date.now();
  try {
    const newData = req.body;
    const dataKeys = newData && typeof newData === 'object' ? Object.keys(newData) : [];
    const payloadText = JSON.stringify(newData, null, 2);
    const payloadBytes = Buffer.byteLength(payloadText, 'utf-8');
    console.log('[api/save] started', { dataKeys, payloadBytes });
    const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`;
    const putUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
    const content = Buffer.from(payloadText, 'utf-8').toString('base64');

    for (let attempt = 0; attempt < 3; attempt++) {
      // 获取当前文件的 SHA（如果存在）
      let sha = null;
      const getRes = await fetch(getUrl, {
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (getRes.ok) {
        const ghData = await getRes.json();
        sha = ghData.sha;
      } else if (getRes.status !== 404) {
        const errText = await getRes.text().catch(() => '');
        console.error('[api/save] get sha failed', { status: getRes.status, body: errText.slice(0, 300) });
        return res.status(502).json({ error: 'GitHub SHA lookup failed', detail: { status: getRes.status, body: errText.slice(0, 300) } });
      }
      // 404 意味着文件不存在（首次保存），不带 SHA 即可创建

      const putBody = { message: `📊 ${new Date().toLocaleString('zh-CN')}`, content, branch: BRANCH };
      if (sha) putBody.sha = sha;

      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify(putBody),
      });

      if (putRes.ok) {
        const ms = Date.now() - startedAt;
        console.log('[api/save] saved', { attempt: attempt + 1, ms, payloadBytes });
        return res.status(200).json({ ok: true, message: 'Saved', time: new Date().toISOString(), ms, bytes: payloadBytes });
      }

      // 409 = conflict (SHA 不匹配)，重试
      if (putRes.status !== 409) {
        const errText = await putRes.text();
        console.error('[api/save] put failed', { status: putRes.status, body: errText.slice(0, 300), ms: Date.now() - startedAt });
        return res.status(500).json({ error: 'GitHub API failed', detail: { status: putRes.status, body: errText.slice(0, 200) } });
      }
      console.warn('[api/save] conflict, retrying', { attempt: attempt + 1, ms: Date.now() - startedAt });
      await new Promise(r => setTimeout(r, 600));
    }
    console.error('[api/save] conflict after retries', { ms: Date.now() - startedAt });
    return res.status(500).json({ error: 'Conflict after 3 retries' });
  } catch (e) {
    console.error('[api/save] crashed', { message: e.message, ms: Date.now() - startedAt });
    return res.status(500).json({ error: e.message });
  }
}
