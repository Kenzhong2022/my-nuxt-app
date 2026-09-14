// composables/useThemeDark.ts
// 暗黑模式共享状态：cookie 持久化（而非 localStorage），SSR 阶段随请求即可读到主题，
// 服务端首屏 HTML 直接带正确的 dark 类，避免客户端水合后主题类切换造成的水合不一致与闪烁
export function useThemeDark() {
  // useCookie 两端可读：服务端从请求头解析，客户端读写 document.cookie 并同步
  const cookie = useCookie<'dark' | 'light' | undefined>('color-scheme', {
    maxAge: 60 * 60 * 24 * 365,
  });

  // useState 跨组件单例：Default 布局与 ThemeColorPicker 共用同一份状态
  const isDark = useState<boolean>('theme-color-dark', () => cookie.value === 'dark');

  // 偏好变更时写回 cookie，下次 SSR 直接命中正确主题
  watch(isDark, (val) => {
    cookie.value = val ? 'dark' : 'light';
  });

  // 一次性迁移：旧版 useDark 把偏好存在 localStorage，cookie 缺失时由客户端接管。
  // 放在 onMounted（水合完成后）执行，避免水合期间状态突变再次引发 mismatch
  onMounted(() => {
    if (cookie.value) return;
    const legacy = localStorage.getItem('color-scheme');
    if (legacy === 'dark' || legacy === 'light') {
      cookie.value = legacy;
      isDark.value = legacy === 'dark';
    }
  });

  return isDark;
}
