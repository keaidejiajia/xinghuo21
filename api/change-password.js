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
    return { auth: { teacherPasswordHash: hashPassword(DEFAULT_TEACHER_PASSWORD) }, sha: null };
  }

  if (!ghRes.ok) {
    const detail = await ghRes.text().catch(() => '');
    throw new Error(`GitHub API failed: ${ghRes.status} ${detail.slice(0, 160)}`);
  }

  const ghData = await ghRes.json();
  const raw = Buffer.from(ghData.content, 'base64').toString('utf-8');
  return { auth: JSON.parse(raw), sha: ghData.sha };
}

async function writeTeacherAuth(token, nextAuth, sha) {
  const putUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
  const content = Buffer.from(JSON.stringify(nextAuth, null, 2), 'utf-8').toString('base64');
  const body = {
    message: `Update teacher password ${new Date().toISOString()}`,
    content,
    branch: BRANCH,
  };
  if (sha) body.sha = sha;

  const putRes = await fetch(putUrl, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
    body: JSON.stringify(body),
  });

  if (!putRes.ok) {
    const detail = await putRes.text().catch(() => '');
    throw new Error(`GitHub API failed: ${putRes.status} ${detail.slice(0, 160)}`);
  }
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
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    const nextPassword = String(newPassword || '').trim();
    const repeatedPassword = String(confirmPassword || '').trim();

    if (nextPassword.length < 6) {
      return res.status(400).json({ ok: false, message: '新密码至少需要 6 位' });
    }

    if (nextPassword !== repeatedPassword) {
      return res.status(400).json({ ok: false, message: '两次输入的新密码不一致' });
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const { auth, sha } = await readTeacherAuth(token);
      if (auth.teacherPasswordHash !== hashPassword(currentPassword)) {
        return res.status(401).json({ ok: false, message: '原密码不正确' });
      }

      const nextAuth = {
        teacherPasswordHash: hashPassword(nextPassword),
        updatedAt: new Date().toISOString(),
      };

      try {
        await writeTeacherAuth(token, nextAuth, sha);
        return res.status(200).json({ ok: true, message: '班主任密码已修改' });
      } catch (e) {
        if (!String(e.message || '').includes('409') || attempt === 2) throw e;
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return res.status(500).json({ ok: false, message: '密码修改冲突，请重试' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
