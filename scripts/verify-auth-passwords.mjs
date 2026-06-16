import fs from 'node:fs';
import {
  DEFAULT_TEACHER_PASSWORD,
  changeTeacherPassword,
  verifyTeacherPassword,
} from '../src/lib/authPasswords.ts';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const calls = [];
globalThis.fetch = async (url, options) => {
  const body = JSON.parse(options?.body || '{}');
  calls.push({ url, body });

  if (url === '/api/auth') {
    if (body.password === DEFAULT_TEACHER_PASSWORD) {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: false, message: '账号或密码错误' }), { status: 401 });
  }

  if (url === '/api/change-password') {
    if (body.currentPassword !== DEFAULT_TEACHER_PASSWORD) {
      return new Response(JSON.stringify({ ok: false, message: '原密码不正确' }), { status: 401 });
    }
    if (body.newPassword !== body.confirmPassword) {
      return new Response(JSON.stringify({ ok: false, message: '两次输入的新密码不一致' }), { status: 400 });
    }
    return new Response(JSON.stringify({ ok: true, message: '班主任密码已修改' }), { status: 200 });
  }

  return new Response(JSON.stringify({ ok: false, message: 'unknown endpoint' }), { status: 404 });
};

assert(DEFAULT_TEACHER_PASSWORD === 'jiawei0915', 'default teacher password should be jiawei0915');

const loginOk = await verifyTeacherPassword('jiawei0915');
assert(loginOk.ok, 'teacher login should call /api/auth and pass with default password');
assert(calls.at(-1).url === '/api/auth', 'teacher login should use /api/auth');

const loginFail = await verifyTeacherPassword('XH21_Teacher_0616!');
assert(!loginFail.ok, 'old teacher password should not pass');

const changeFail = await changeTeacherPassword({
  currentPassword: 'wrong',
  newPassword: 'newpass0915',
  confirmPassword: 'newpass0915',
});
assert(!changeFail.ok, 'wrong current password should fail');
assert(calls.at(-1).url === '/api/change-password', 'password change should use /api/change-password');

const mismatch = await changeTeacherPassword({
  currentPassword: 'jiawei0915',
  newPassword: 'newpass0915',
  confirmPassword: 'newpass0916',
});
assert(!mismatch.ok, 'mismatched confirmation should fail');

const success = await changeTeacherPassword({
  currentPassword: 'jiawei0915',
  newPassword: 'newpass0915',
  confirmPassword: 'newpass0915',
});
assert(success.ok, 'valid password change should pass');

const loginSource = fs.readFileSync('src/pages/LoginPage.tsx', 'utf8');
assert(!loginSource.includes('isTeacherPassword'), 'login page should not verify teacher password locally');
assert(!loginSource.includes('只修改当前浏览器'), 'password UI should not claim browser-only changes');

const mainSource = fs.readFileSync('src/main.tsx', 'utf8');
const localOnlyBlock = mainSource.match(/const LOCAL_ONLY_KEYS = new Set\(\[([\s\S]*?)\]\);/)?.[1] ?? '';
assert(localOnlyBlock.includes('xinghuo_teacher_password'), 'stale local teacher password key should remain excluded from data sync');

console.log('auth password assertions passed');
