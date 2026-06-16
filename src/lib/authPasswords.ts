export const DEFAULT_TEACHER_PASSWORD = 'jiawei0915';

function isLocalFallbackAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

async function readApiMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    return payload?.message || payload?.error || `请求失败：${response.status}`;
  } catch {
    return `请求失败：${response.status}`;
  }
}

export async function verifyTeacherPassword(password: string): Promise<{ ok: boolean; message: string }> {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (response.ok) return { ok: true, message: '登录成功' };
    return { ok: false, message: await readApiMessage(response) };
  } catch {
    if (isLocalFallbackAvailable() && password.trim() === DEFAULT_TEACHER_PASSWORD) {
      return { ok: true, message: '登录成功' };
    }
    return { ok: false, message: '无法连接认证服务' };
  }
}

export async function changeTeacherPassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ ok: boolean; message: string }> {
  const response = await fetch('/api/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      confirmPassword: input.confirmPassword,
    }),
  });

  if (response.ok) {
    try {
      const payload = await response.json();
      return { ok: true, message: payload?.message || '班主任密码已修改' };
    } catch {
      return { ok: true, message: '班主任密码已修改' };
    }
  }

  return { ok: false, message: await readApiMessage(response) };
}
