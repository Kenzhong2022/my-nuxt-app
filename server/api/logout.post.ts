// POST /api/logout —— 服务端清除会话 cookie
// cookie 均为 HttpOnly，前端 JS 无法删除，登出必须由服务端执行
export default defineEventHandler((event) => {
  deleteCookie(event, 'token', { path: '/' });
  deleteCookie(event, 'refresh_token', { path: '/' });
  return { code: 200, msg: '已退出登录' };
});
