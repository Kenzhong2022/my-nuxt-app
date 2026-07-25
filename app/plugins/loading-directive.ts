// plugins/loading-directive.ts
import type { Directive, DirectiveBinding } from "vue";
import { loadingConfig } from "~/config/loading";
import gsap from "gsap";

/** 标记元素是否已挂载 loading 的属性名 */
const LOADING_ATTR = "data-loading";

/** loading 遮罩层的 CSS 类名 */
const OVERLAY_CLASS = "v-loading-overlay";

/**
 * 创建 loading 遮罩 DOM 元素
 * @returns {HTMLElement} 包含 GSAP 动画和文字提示的遮罩层
 */
function createOverlay(): HTMLElement {
  const { text, color, bgColor, textColor, zIndex } = loadingConfig;

  /** 遮罩层根元素 */
  const overlay = document.createElement("div");
  overlay.className = OVERLAY_CLASS;

  /** 内容容器，垂直居中排列转圈和文字 */
  const container = document.createElement("div");
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  `;

  /** 旋转动画指示器（用 GSAP 驱动） */
  const spinner = document.createElement("div");
  spinner.className = "v-loading-spinner";
  spinner.style.cssText = `
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 3px solid ${color};
    border-top-color: transparent;
  `;
  container.appendChild(spinner);

  /** 加载提示文字 */
  const textEl = document.createElement("div");
  textEl.textContent = text || "加载中";
  textEl.style.cssText = `
    margin-top: 12px;
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
    duration: 1,
    repeat: -1,
    ease: "none",
  });

  return overlay;
}

/**
 * 在目标元素上挂载 loading 遮罩
 * @param {HTMLElement} el - 目标 DOM 元素
 */
function mountLoading(el: HTMLElement): void {
  if (el.hasAttribute(LOADING_ATTR)) return;

  el.setAttribute(LOADING_ATTR, "true");

  // 确保宿主元素有定位上下文
  const pos = getComputedStyle(el).position;
  if (pos === "static" || !pos) {
    el.style.position = "relative";
  }

  el.appendChild(createOverlay());
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
 * Vue 自定义指令：v-my-loading
 * 绑定值：boolean（true 显示遮罩，false 移除遮罩）
 */
const loadingDirective: Directive<HTMLElement, boolean> = {
  /**
   * 元素挂载时触发
   * @param {HTMLElement} el - 指令绑定的元素
   * @param {DirectiveBinding<boolean>} binding - 指令绑定对象
   */
  mounted(el: HTMLElement, binding: DirectiveBinding<boolean>): void {
    if (binding.value) mountLoading(el);
  },

  /**
   * 绑定值更新时触发
   * @param {HTMLElement} el - 指令绑定的元素
   * @param {DirectiveBinding<boolean>} binding - 指令绑定对象（含 oldValue）
   */
  updated(el: HTMLElement, binding: DirectiveBinding<boolean>): void {
    if (binding.value === binding.oldValue) return;

    binding.value ? mountLoading(el) : removeLoading(el);
  },

  /**
   * 元素卸载时触发，清理残留的遮罩和动画
   * @param {HTMLElement} el - 指令绑定的元素
   */
  unmounted(el: HTMLElement): void {
    removeLoading(el);
  },
};

/**
 * Nuxt 插件：注册全局 v-my-loading 指令
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive("my-loading", loadingDirective);
});
