// composables/useMenuConfig.ts —— 管理后台菜单路由配置（视图转换层）
// 数据来源：userInfo store 的 routers（app.vue 首次进入时经 getRouters() 请求
// /api/public/getRouters 拉取一次），本文件只做 RuoYi 路由树 → 菜单树的转换，不发起请求
import type { RuoYiRoute } from '~~/types/user';

/** 菜单节点（结构与 AppMenu.vue 的 MenuItem 兼容，供 Admin/Default 布局共用） */
export interface MenuNode {
  id: number;
  parentId: number;
  name: string;
  icon?: string;
  path: string;
  sort: number;
  children: MenuNode[];
}

/**
 * RuoYi 路由树 → 菜单树：
 * - 过滤 hidden 节点
 * - id 全局自增，parentId 指向父级（0 为顶级）
 * - sort 取同级顺序（服务端已按 id 排序）
 * - 子级相对路径拼接为完整路径（如 /product/list）
 */
function toMenuNodes(routes: RuoYiRoute[]): MenuNode[] {
  let autoId = 0;
  function convert(items: RuoYiRoute[], parentId: number, parentPath: string): MenuNode[] {
    return items
      .filter((route) => !route.hidden)
      .map((route, index) => {
        const id = ++autoId;
        // 库中子菜单常存完整路径（/store/cart）→ 直接使用；相对路径（list）则拼接父级
        const path = route.path.startsWith('/')
          ? route.path
          : `/${parentPath ? `${parentPath}/${route.path}` : route.path}`.replace(/\/+/g, '/');
        return {
          id,
          parentId,
          name: route.meta?.title ?? route.name,
          icon: route.meta?.icon ?? undefined,
          path,
          sort: index,
          children: convert(route.children ?? [], id, path),
        };
      });
  }
  return convert(routes, 0, '');
}

export function useMenuConfig() {
  const userInfoStore = useUserInfoStore();

  /** 路由配置表原始数据（RuoYi getRouters 返回的角色可见路由树，来自 userInfo store） */
  const routers = computed<RuoYiRoute[]>(() => userInfoStore.routers);

  /** 布局直接消费的菜单结构（computed 随 store.routers 自动更新） */
  const menuConfig = computed<MenuNode[]>(() => toMenuNodes(routers.value));

  return { routers, menuConfig };
}
