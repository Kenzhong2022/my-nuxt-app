// stores/userInfo.ts —— 当前登录用户 store（RuoYi 规范）
// 数据来源：GET /api/getInfo + GET /api/getRouters，由 app.vue 在 SSR 期间
// 经 callOnce 拉取一次，pinia 状态随 Nuxt payload 序列化传给客户端，水合不重复请求
//
// RuoYi 约定：
//   - roles       角色权限串数组（roleKey，如 ["admin", "operator"]）
//   - permissions 权限标识数组（"模块:实体:操作"，如 ["system:user:list"]）
//   - 超级管理员  permissions = ["*:*:*"]，任意 checkPermi 直接放行
//   - 无角色用户  roles = ["ROLE_DEFAULT"]（RuoYi GetInfo 行为）
import { computed, ref } from "vue";
import type {
  GetInfoResponse,
  GetRoutersResponse,
  RuoYiRoute,
  SysRole,
  SysUser,
} from "~~/types/user";

/** RuoYi 约定常量 */
const SUPER_ADMIN = "admin"; // 超管角色标识
const ALL_PERMISSION = "*:*:*"; // 通配权限
const ROLE_DEFAULT = "ROLE_DEFAULT"; // 无角色时的默认角色

export const useUserInfoStore = defineStore("userInfo", () => {
  // ========== State ==========
  const user = ref<SysUser | null>(null);
  const roles = ref<string[]>([]);
  const permissions = ref<string[]>([]);
  const routers = ref<RuoYiRoute[]>([]);
  /** 是否已完成首次拉取（未加载时指令默认隐藏，防越权内容闪现） */
  const isLoaded = ref(false);

  // ========== Getters ==========
  const name = computed(
    () => user.value?.nickName || user.value?.userName || "",
  );
  const avatar = computed(() => user.value?.avatar || "");
  const isAdmin = computed(
    () =>
      roles.value.includes(SUPER_ADMIN) ||
      permissions.value.includes(ALL_PERMISSION),
  );
  /** 角色详情（含 roleName，供展示） */
  const roleInfos = computed<SysRole[]>(() => user.value?.roles ?? []);

  // ========== Actions ==========
  /** 拉取用户信息+角色+权限（静默失败：未登录/异常时视为游客，不阻塞渲染） */
  async function getInfo(): Promise<SysUser | null> {
    try {
      // useRequestFetch：SSR 内部请求时透传浏览器带来的 cookie（token），客户端等价 $fetch
      const requestFetch = useRequestFetch();
      const res = await requestFetch<GetInfoResponse>("/api/getInfo");
      if (res.code === 200) {
        user.value = res.user;
        // RuoYi：roles 为空数组时置默认角色，避免权限判断异常
        roles.value = res.roles?.length ? res.roles : [ROLE_DEFAULT];
        permissions.value = res.permissions ?? [];
      } else {
        resetToGuest();
      }
    } catch {
      resetToGuest();
    }
    isLoaded.value = true;
    return user.value;
  }

  /** 拉取菜单路由树（RuoYi getRouters） */
  async function getRouters(): Promise<RuoYiRoute[]> {
    try {
      const requestFetch = useRequestFetch();
      const res = await requestFetch<GetRoutersResponse>("/api/getRouters");
      routers.value = res.code === 200 ? res.data : [];
    } catch {
      routers.value = [];
    }
    return routers.value;
  }

  /** 登出/失效时清空（RuoYi logOut 对应） */
  function clearUserInfo() {
    resetToGuest();
    routers.value = [];
    isLoaded.value = false;
  }

  function resetToGuest() {
    user.value = null;
    roles.value = [];
    permissions.value = [];
  }

  // ========== 权限校验（RuoYi utils/permission 的 checkPermi/checkRole 语义） ==========
  /**
   * 校验权限标识（供 v-hasPermi 指令与组件调用）
   * @param value 权限标识数组，满足任一即可，如 ['system:user:add']
   */
  function checkPermi(value: string[]): boolean {
    if (value && value.length > 0) {
      return permissions.value.some(
        (p) => p === ALL_PERMISSION || value.includes(p),
      );
    }
    console.error(`need roles! Like v-hasPermi="['system:user:add']"`);
    return false;
  }

  /**
   * 校验角色（供 v-hasRole 指令与组件调用）
   * @param value 角色权限串数组，满足任一即可，如 ['admin']
   */
  function checkRole(value: string[]): boolean {
    if (value && value.length > 0) {
      return roles.value.some(
        (r) => r === SUPER_ADMIN || value.includes(r),
      );
    }
    console.error(`need roles! Like v-hasRole="['admin']"`);
    return false;
  }

  return {
    // state
    user,
    roles,
    permissions,
    routers,
    isLoaded,
    // getters
    name,
    avatar,
    isAdmin,
    roleInfos,
    // actions
    getInfo,
    getRouters,
    clearUserInfo,
    // 权限校验
    checkPermi,
    checkRole,
  };
});
