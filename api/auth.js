import crypto from 'node:crypto';

const REPO_OWNER = 'keaidejiajia';
const REPO_NAME = 'xinghuo21';
const FILE_PATH = 'teacher-auth.json';
const BRANCH = 'data';
const DEFAULT_TEACHER_PASSWORD = 'jiawei0915';
const PASSWORD_SALT = 'xinghuo21-teacher-password-v1';

function hashPassword(password) {
  return crypto.createHash('sha256').update(`${PASSWORD_SALT}:${String(password || '')}`).digest('hex');
}

async function readTeacherAuth(token) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}?ref=${BRANCH}`;
  const ghRes = await fetch(url, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
  });

  if (ghRes.status === 404) {
    return { teacherPasswordHash: hashPassword(DEFAULT_TEACHER_PASSWORD) };
  }

  if (!ghRes.ok) {
    const detail = await ghRes.text().catch(() => '');
    throw new Error(`GitHub API failed: ${ghRes.status} ${detail.slice(0, 160)}`);
  }

  const ghData = await ghRes.json();
  const raw = Buffer.from(ghData.content, 'base64').toString('utf-8');
  return JSON.parse(raw);
}

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
    const { password } = req.body || {};
    const auth = await readTeacherAuth(token);
    const ok = auth.teacherPasswordHash === hashPassword(password);

    if (!ok) {
      return res.status(401).json({ ok: false, message: '账号或密码错误' });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
