import type { Directive } from "vue";

const LOADING_ATTR = "data-loading";
const OVERLAY_CLASS = "v-loading-overlay";

/**
 * 创建加载遮罩元素
 */
function createOverlay(): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = OVERLAY_CLASS;
  overlay.innerHTML = '<div class="v-loading-spinner"></div>';
  return overlay;
}

/**
 * 挂载遮罩到宿主元素
 */
function mountLoading(el: HTMLElement) {
  if (el.hasAttribute(LOADING_ATTR)) return;
  el.setAttribute(LOADING_ATTR, "true");
  // 确保宿主元素有定位上下文
  const position = getComputedStyle(el).position;
  if (position === "static" || !position) {
    el.style.position = "relative";
  }
  el.appendChild(createOverlay());
}

/**
 * 移除遮罩
 */
function removeLoading(el: HTMLElement) {
  if (!el.hasAttribute(LOADING_ATTR)) return;
  el.removeAttribute(LOADING_ATTR);
  el.querySelector(`.${OVERLAY_CLASS}`)?.remove();
}

/**
 * v-loading 指令
 * 用法: <div v-loading="isLoading"></div>
 */
const loadingDirective: Directive<HTMLElement, boolean> = {
  mounted(el, binding) {
    if (binding.value) {
      mountLoading(el);
    }
  },
  updated(el, binding) {
    if (binding.value === binding.oldValue) return;
    if (binding.value) {
      mountLoading(el);
    } else {
      removeLoading(el);
    }
  },
  unmounted(el) {
    removeLoading(el);
  },
};

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive("loading", loadingDirective);
});
