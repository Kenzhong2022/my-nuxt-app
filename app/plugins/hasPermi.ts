/**
 * ============================================================
 * v-hasPermi / v-hasRole 按钮权限指令（RuoYi 规范，SSR + 客户端通用）
 * ============================================================
 *
 * 用法（值必须为非空数组，满足任一即可）：
 *   <el-button v-hasPermi="['system:user:add']">新增</el-button>
 *   <el-button v-hasRole="['admin', 'operator']">运营操作</el-button>
 *
 * 判定来源：userInfo store（roles / permissions），
 *   - 超管 roleKey "admin" 或通配权限 "*:*:*" 放行全部（RuoYi 约定）
 *
 * 行为（RuoYi 规范）：无权限时元素从 DOM 中移除（removeChild）；
 * SSR 端 getSSRProps 输出 display:none，服务端直出即隐藏（防越权内容闪现），
 * created 与服务端样式对齐避免水合不匹配，mounted 后再执行移除。
 */
import type { Directive } from "vue";

/** 无权限时移除元素（RuoYi hasPermi/hasRole 指令行为） */
function removeEl(el: HTMLElement) {
  el.parentNode && el.parentNode.removeChild(el);
}

/** SSR/水合阶段用 display:none 隐藏（保持两端一致） */
function hideEl(el: HTMLElement) {
  el.style.display = "none";
}

function createPermissionDirective(
  check: (store: ReturnType<typeof useUserInfoStore>, value: string[]) => boolean,
): Directive<HTMLElement, string[]> {
  return {
    created(el, binding) {
      const store = useUserInfoStore();
      if (!check(store, binding.value ?? [])) hideEl(el);
    },
    mounted(el, binding) {
      const store = useUserInfoStore();
      if (!check(store, binding.value ?? [])) removeEl(el);
    },
    // SSR：指令在服务端仅支持 getSSRProps
    getSSRProps(binding) {
      const store = useUserInfoStore();
      return check(store, binding.value ?? [])
        ? {}
        : { style: { display: "none" } };
    },
  };
}

/** v-hasPermi：按权限标识校验（如 ['system:user:add']） */
const hasPermi = createPermissionDirective((store, value) =>
  store.checkPermi(value),
);

/** v-hasRole：按角色权限串校验（如 ['admin']） */
const hasRole = createPermissionDirective((store, value) =>
  store.checkRole(value),
);

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive("hasPermi", hasPermi);
  nuxtApp.vueApp.directive("hasRole", hasRole);
});
