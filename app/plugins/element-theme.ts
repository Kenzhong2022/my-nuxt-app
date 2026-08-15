import { TinyColor } from "@ctrl/tinycolor";

/**
 * 生成 Element Plus 色阶变量
 * @param color 主色 hex
 * @param isDark 是否暗黑模式
 */
function generateVars(color: string, isDark: boolean): string {
  const base = new TinyColor(color);
  if (!base.isValid) return "";

  // Light 向白色混合，Dark 向暗色背景混合
  const mixTarget = isDark
    ? new TinyColor("#1d1d1d")
    : new TinyColor("#ffffff");

  // Element Plus 实际用到的 light 级别：3, 5, 7, 8, 9
  // 注意：TinyColor.mix 是 mutating 方法，必须每次 new 新实例
  const levels = [3, 5, 7, 8, 9];
  const lightVars = levels
    .map((l) => {
      const mixed = new TinyColor(color).mix(mixTarget, l * 10).toHexString();
      return `--el-color-primary-light-${l}: ${mixed};`;
    })
    .join("\n    ");

  // dark-2：混合 20% 黑色
  const dark2 = new TinyColor(color)
    .mix(new TinyColor("#000000"), 20)
    .toHexString();

  return `
    --el-color-primary: ${base.toHexString()};
    ${lightVars}
    --el-color-primary-dark-2: ${dark2};
  `;
}

export default defineNuxtPlugin(() => {
  // cookie 只负责 SSR 初始值 + 持久化
  const cookie = useCookie("el-primary-color", {
    default: () => "#ff6b6b",
    maxAge: 60 * 60 * 24 * 365,
  });

  // 上一次主题色（用于"恢复上次"功能），同样 cookie 持久化
  const prevCookie = useCookie<string | null>("el-primary-color-prev", {
    default: () => null,
    maxAge: 60 * 60 * 24 * 365,
  });

  // 用 useState 做跨组件响应式共享，初始值取自 cookie
  const primaryColor = useState<string>(
    "CUSTOM-PRIMARY-COLOR-KEY",
    () => cookie.value,
  );

  // 共享"上一次颜色"状态，初始值取自 cookie
  const prevColor = useState<string | null>(
    "CUSTOM-PRIMARY-COLOR-PREV-KEY",
    () => prevCookie.value,
  );

  // 颜色变化时：旧值存为"上一次"，新值同步回 cookie
  watch(primaryColor, (newVal, oldVal) => {
    if (oldVal && oldVal !== newVal) {
      prevColor.value = oldVal;
      prevCookie.value = oldVal;
    }
    cookie.value = newVal;
  });

  // 响应式生成 CSS
  // 用 :root.dark / :root:not(.dark) 提高特异性到 (0,2,0)，
  // 覆盖 Element Plus 的 :root (0,1,0) 和 dark/css-vars.css 的 html.dark (0,1,1)
  const themeCss = computed(() => {
    const light = `:root:not(.dark) {\n    ${generateVars(primaryColor.value, false)}\n  }`;
    const dark = `:root.dark {\n    ${generateVars(primaryColor.value, true)}\n  }`;
    return light + "\n" + dark;
  });

  // 用函数形式确保 useHead 响应式更新 innerHTML
  useHead(() => ({
    style: [
      {
        id: "dynamic-element-theme",
        innerHTML: themeCss.value,
      },
    ],
  }));
});
