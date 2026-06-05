export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not set' });

  try {
    const data = req.body;
    const content = Buffer.from(JSON.stringify(data, null, 2), 'utf-8').toString('base64');

    // Get current file SHA
    const getRes = await fetch(
      'https://api.github.com/repos/keaidejiajia/xinghuo21/contents/data.json?ref=pages',
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' } }
    );
    const getJson = await getRes.json();
    const sha = getJson.sha;

    // Update file
    const putRes = await fetch(
      'https://api.github.com/repos/keaidejiajia/xinghuo21/contents/data.json',
      {
        method: 'PUT',
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' },
        body: JSON.stringify({
          message: '📊 自动同步行为数据',
          content,
          sha,
          branch: 'pages',
        }),
      }
    );

    if (!putRes.ok) {
      const err = await putRes.json();
      return res.status(500).json({ error: 'GitHub API failed', detail: err });
    }

    return res.status(200).json({ ok: true, message: '数据已同步' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
