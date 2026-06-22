const REPO_OWNER = 'keaidejiajia';
const REPO_NAME = 'xinghuo21';
const FILE_PATH = 'parent-access.json';
const BRANCH = 'data';
const VIEW_THROTTLE_MINUTES = 10;

function emptyData() {
  return { entries: [], updatedAt: new Date().toISOString() };
}

function localDateFromIso(iso) {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shouldCountView(entry, occurredAt) {
  if (!entry.lastCountedViewAt) return true;
  const elapsedMs = new Date(occurredAt).getTime() - new Date(entry.lastCountedViewAt).getTime();
  return elapsedMs >= VIEW_THROTTLE_MINUTES * 60 * 1000;
}

function upsertEvent(data, event) {
  const date = event.date || localDateFromIso(event.occurredAt);
  const id = `${date}-${event.studentId}`;
  const entries = Array.isArray(data.entries) ? [...data.entries] : [];
  const index = entries.findIndex(entry => entry.id === id);
  const device = event.device === 'mobile' ? 'mobile' : 'desktop';

  if (index === -1) {
    entries.push({
      id,
      date,
      studentId: event.studentId,
      parentName: event.parentName,
      firstAccessAt: event.occurredAt,
      lastAccessAt: event.occurredAt,
      loginCount: event.type === 'login' ? 1 : 0,
      viewCount: event.type === 'view' ? 1 : 0,
      lastDevice: device,
      lastCountedViewAt: event.type === 'view' ? event.occurredAt : undefined,
    });
  } else {
    const current = entries[index];
    const countView = event.type === 'view' && shouldCountView(current, event.occurredAt);
    entries[index] = {
      ...current,
      parentName: event.parentName || current.parentName,
      firstAccessAt: current.firstAccessAt <= event.occurredAt ? current.firstAccessAt : event.occurredAt,
      lastAccessAt: current.lastAccessAt >= event.occurredAt ? current.lastAccessAt : event.occurredAt,
      loginCount: current.loginCount + (event.type === 'login' ? 1 : 0),
      viewCount: current.viewCount + (countView ? 1 : 0),
      lastDevice: device,
      lastCountedViewAt: countView ? event.occurredAt : current.lastCountedViewAt,
    };
  }

  entries.sort((a, b) => b.date.localeCompare(a.date) || b.lastAccessAt.localeCompare(a.lastAccessAt));
  return { entries, updatedAt: event.occurredAt };
}

async function readData(token) {
  const ghRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`,
    { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
  );

  if (ghRes.status === 404) return { data: emptyData(), sha: null };
  if (!ghRes.ok) {
    const detail = await ghRes.text().catch(() => '');
    const error = new Error('GitHub parent-access read failed');
    error.status = ghRes.status;
    error.detail = detail.slice(0, 300);
    throw error;
  }

  const ghData = await ghRes.json();
  let text = '';
  if (ghData.encoding === 'base64' && ghData.content) {
    text = Buffer.from(ghData.content, 'base64').toString('utf-8');
  } else if (ghData.encoding === 'none' && ghData.git_url) {
    const blobRes = await fetch(ghData.git_url, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    });
    if (!blobRes.ok) {
      const detail = await blobRes.text().catch(() => '');
      const error = new Error('GitHub parent-access blob read failed');
      error.status = blobRes.status;
      error.detail = detail.slice(0, 300);
      throw error;
    }
    const blobData = await blobRes.json();
    text = Buffer.from(blobData.content, 'base64').toString('utf-8');
  }

  return { data: text ? JSON.parse(text) : emptyData(), sha: ghData.sha };
}

async function writeData(token, data, sha) {
  const payloadText = JSON.stringify(data, null, 2);
  const body = {
    message: `👀 parent access ${new Date().toLocaleString('zh-CN')}`,
    content: Buffer.from(payloadText, 'utf-8').toString('base64'),
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  return fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN not set' });

  try {
    if (req.method === 'GET') {
      const { data } = await readData(token);
      return res.status(200).json(data);
    }

    const event = req.body;
    if (!event || !['login', 'view'].includes(event.type) || !event.studentId || !event.parentName || !event.occurredAt) {
      return res.status(400).json({ error: 'Invalid parent access event' });
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, sha } = await readData(token);
      const next = upsertEvent(data, event);
      const putRes = await writeData(token, next, sha);
      if (putRes.ok) return res.status(200).json({ ok: true, updatedAt: next.updatedAt });
      if (putRes.status !== 409) {
        const detail = await putRes.text().catch(() => '');
        return res.status(500).json({ error: 'GitHub parent-access write failed', status: putRes.status, detail: detail.slice(0, 200) });
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return res.status(500).json({ error: 'Conflict after 3 retries' });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message, detail: error.detail });
  }
}
