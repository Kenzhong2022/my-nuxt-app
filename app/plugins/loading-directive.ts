// plugins/loading-directive.client.ts
import type { Directive, DirectiveBinding } from "vue";
import gsap from "gsap";

/** 默认配置（绑定对象中传递的值会覆盖这里的默认值） */
const defaultConfig = {
  text: "加载中...",
  color: "var(--el-color-primary)",
  bgColor: "var(--el-mask-color)",
  textColor: "var(--el-text-color-primary)",
  zIndex: 2000,
};

/** 标记元素是否已挂载 loading 的属性名 */
const LOADING_ATTR = "data-loading";

/** loading 遮罩层的 CSS 类名 */
const OVERLAY_CLASS = "v-loading-overlay";

/** 指令绑定的选项：value 控制显隐，其余字段覆盖默认配置 */
interface LoadingOptions {
  /** 是否显示遮罩 */
  value: boolean;
  /** 加载文本 */
  text?: string;
  /** spinner 颜色 */
  color?: string;
  /** 遮罩背景色 */
  bgColor?: string;
  /** 文本颜色 */
  textColor?: string;
  /** z-index */
  zIndex?: number;
}

/** 指令绑定值的联合类型：boolean 或对象 */
type LoadingBinding = boolean | LoadingOptions;

/** 将绑定值归一化为 LoadingOptions */
function normalizeOptions(binding: LoadingBinding): LoadingOptions {
  return typeof binding === "boolean" ? { value: binding } : binding;
}

/**
 * 创建 loading 遮罩 DOM 元素
 * @param {LoadingOptions} options - 传值覆盖默认配置
 * @returns {HTMLElement} 包含 GSAP 动画和文字提示的遮罩层
 */
function createOverlay(options: LoadingOptions): HTMLElement {
  // 有传值则覆盖默认配置
  const text = options.text || defaultConfig.text;
  const color = options.color || defaultConfig.color;
  const bgColor = options.bgColor || defaultConfig.bgColor;
  const textColor = options.textColor || defaultConfig.textColor;
  const zIndex = options.zIndex || defaultConfig.zIndex;

  /** 遮罩层根元素 */
  const overlay = document.createElement("div");
  overlay.className = OVERLAY_CLASS;

  /** 内容容器，垂直居中排列转圈和文字 */
  const container = document.createElement("div");
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  `;

  /** 旋转动画指示器（用 GSAP 驱动） */
  const spinner = document.createElement("div");
  spinner.style.cssText = `
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 3px solid ${color};
    border-top-color: transparent;
  `;
  container.appendChild(spinner);

  /** 加载提示文字（位于加载图标下方） */
  const textEl = document.createElement("div");
  textEl.className = "loading-text";
  textEl.textContent = text;
  textEl.style.cssText = `
    font-size: 14px;
    line-height: 1.5;
    color: ${textColor};
    text-align: center;
    white-space: nowrap;
  `;
  container.appendChild(textEl);

  overlay.appendChild(container);

  // 遮罩层铺满宿主元素
  overlay.style.cssText = `
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${bgColor};
    z-index: ${zIndex};
  `;

  // GSAP 驱动旋转动画
  gsap.to(spinner, {
    rotation: 360,
    duration: 2,
    repeat: -1,
    ease: "none",
  });

  return overlay;
}

/**
 * 在目标元素上挂载 loading 遮罩
 * @param {HTMLElement} el - 目标 DOM 元素
 * @param {LoadingOptions} options - 每次调用时的选项
 */
function mountLoading(el: HTMLElement, options: LoadingOptions): void {
  if (el.hasAttribute(LOADING_ATTR)) return;

  el.setAttribute(LOADING_ATTR, "true");

  // 确保宿主元素有定位上下文
  const pos = getComputedStyle(el).position;
  if (pos === "static" || !pos) {
    el.style.position = "relative";
  }

  el.appendChild(createOverlay(options));
}

/**
 * 移除目标元素上的 loading 遮罩
 * @param {HTMLElement} el - 目标 DOM 元素
 */
function removeLoading(el: HTMLElement): void {
  if (!el.hasAttribute(LOADING_ATTR)) return;

  el.removeAttribute(LOADING_ATTR);

  // 清理 GSAP 动画，避免内存泄漏
  const overlay = el.querySelector(`.${OVERLAY_CLASS}`);
  if (overlay) {
    gsap.killTweensOf(overlay.querySelectorAll("*"));
    overlay.remove();
  }
}

/**
 * Vue 自定义指令：v-custom-loading
 * 绑定值：boolean 或 { value: boolean; text?: string; ... }
 */
const loadingDirective: Directive<HTMLElement, LoadingBinding> = {
  mounted(el: HTMLElement, binding: DirectiveBinding<LoadingBinding>): void {
    const options = normalizeOptions(binding.value);
    if (options.value) mountLoading(el, options);
  },

  /**
   * @description 更新指令绑定值时调用
   * @param el 目标 DOM 元素
   * @param binding binding binding.value
   * @returns
   */
  updated(el: HTMLElement, binding: DirectiveBinding<LoadingBinding>): void {
    const options = normalizeOptions(binding.value);
    const old = normalizeOptions(binding.oldValue as LoadingBinding);

    // 加载中文本变化时热更新，无需重建遮罩
    if (options.value && old.value && options.text !== old.text) {
      const textEl = el.querySelector(`.${OVERLAY_CLASS} .loading-text`);
      if (textEl) textEl.textContent = options.text || defaultConfig.text;
    }

    if (options.value === old.value) return;

    options.value ? mountLoading(el, options) : removeLoading(el);
  },

  unmounted(el: HTMLElement): void {
    removeLoading(el);
  },

  // SSR 支持：服务端渲染时指令无副作用，返回空 props 跳过
  getSSRProps() {
    return {};
  },
};

/**
 * Nuxt 插件：注册全局 v-custom-loading 指令
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive("custom-loading", loadingDirective);
});
