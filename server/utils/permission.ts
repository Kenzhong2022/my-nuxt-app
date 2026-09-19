import type { PermissionButtonType, PermissionRow, PermissionResource } from '~~/types/permission';
import { PermissionType } from '~~/types/permission';
import { toCamelCase } from './caseConvert';

/** 按钮标识段（code）合法格式：小写字母开头，仅含小写字母/数字 */
const CODE_PATTERN = /^[a-z][a-z0-9]*$/;

/** 路由 path 合法格式：/ 开头，段为小写字母/数字（支持 :param 动态段） */
const PATH_PATTERN = /^\/[a-z0-9:_-]*(\/[a-z0-9:_-]+)*$/;

/** 路由 name 合法格式：字母开头，仅含字母/数字/-/_ */
const ROUTE_NAME_PATTERN = /^[a-zA-Z][\w-]*$/;

/** el-button type 合法值（与表 CHECK 约束一致） */
const BUTTON_TYPES: readonly PermissionButtonType[] = [
  'default',
  'primary',
  'success',
  'warning',
  'danger',
  'info',
  '',
  'text',
];

/**
 * permissions 数据库行 → 前端 PermissionResource 类型
 * 键名转换交给通用 toCamelCase，这里只处理 bigint 数值化与布尔化
 */
export function toPermissionResource(row: PermissionRow): PermissionResource {
  const { id, menuVisible, type, parentId, sortOrder, ...rest } = toCamelCase(row);

  return {
    ...rest,
    id: Number(id),
    type: type as PermissionType,
    menuVisible: menuVisible === 1,
    parentId: Number(parentId) || 0,
    sortOrder: Number(sortOrder) || 0,
  };
}

/**
 * 平铺行集合 → 菜单资源树（目录 type0 → 页面 type1 → 按钮 type2）
 * - 目录/页面按 parent_id 挂接（parent_id=0 或父缺失 → 根，避免孤儿丢失）
 * - 按钮按 path 归到同路径页面 children
 * - 同级按 sort_order、id 升序
 */
export function buildMenuTree(rows: PermissionRow[]): PermissionResource[] {
  const nodes = rows.map(toPermissionResource);
  const byId = new Map<number, PermissionResource>();
  const pageByPath = new Map<string, PermissionResource>();
  for (const node of nodes) {
    byId.set(node.id, node);
    if (node.type === PermissionType.PAGE) pageByPath.set(node.path, node);
  }

  const childrenMap = new Map<number, PermissionResource[]>();
  const roots: PermissionResource[] = [];
  const pushChild = (parentId: number, child: PermissionResource) => {
    const list = childrenMap.get(parentId) ?? [];
    list.push(child);
    childrenMap.set(parentId, list);
  };

  for (const node of nodes) {
    if (node.type === PermissionType.ACTION) {
      // 按钮归属由 path 表达，挂到同路径页面下（无对应页面则丢弃）
      const page = pageByPath.get(node.path);
      if (page) pushChild(page.id, node);
      continue;
    }
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) pushChild(node.parentId, node);
    else roots.push(node);
  }

  const sortNodes = (a: PermissionResource, b: PermissionResource) => a.sortOrder - b.sortOrder || a.id - b.id;

  const attach = (list: PermissionResource[]): PermissionResource[] =>
    list.sort(sortNodes).map((node) => {
      const children = childrenMap.get(node.id);
      return { ...node, children: children?.length ? attach(children) : undefined };
    });

  return attach(roots);
}

/** 校验按钮标识段（code）：小写字母开头，仅含小写字母/数字 */
export function isValidPermissionCode(code: string): boolean {
  return CODE_PATTERN.test(code);
}

/** 校验路由 path：/ 开头，段为小写字母/数字/:param/-/_ */
export function isValidPath(path: string): boolean {
  return PATH_PATTERN.test(path);
}

/** 校验路由 name：字母开头，仅含字母/数字/-/_ */
export function isValidRouteName(name: string): boolean {
  return ROUTE_NAME_PATTERN.test(name);
}

/** 校验 el-button type 取值 */
export function isValidButtonType(t: string): t is PermissionButtonType {
  return (BUTTON_TYPES as readonly string[]).includes(t);
}

/** 拼接权限键：目录 dir:{path}，页面 page:{path}，按钮 action:{path}:{code} */
export function derivePermKey(type: PermissionType, path: string, code: string): string {
  if (type === PermissionType.DIRECTORY) return `dir:${path}`;
  return type === PermissionType.PAGE ? `page:${path}` : `action:${path}:${code}`;
}

/** 判断 PostgreSQL 错误是否为唯一约束冲突（perm_key / 页面 path 唯一索引） */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === '23505'
  );
}
