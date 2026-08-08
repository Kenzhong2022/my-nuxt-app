/**
 * ============================================================
 * 权限系统类型定义
 * ============================================================
 *
 * 【命名规则】
 * 格式: {层级}:{模块}:{页面}:{操作}
 *
 * 层级标识 (LevelPrefix):
 *   - module  → 模块级（一级菜单/路由模块）
 *   - page    → 页面级（二级菜单/具体页面）
 *   - action  → 操作级（按钮/接口权限）
 *
 * 命名约束:
 *   1. 全部小写，英文半角冒号 `:` 分隔
 *   2. 模块名、页面名使用英文简写或全拼，保持语义一致
 *   3. 操作名使用动词开头，统一词汇表:
 *      create 新增 | edit 编辑 | delete 删除 | view 查看
 *      export 导出 | import 导入 | audit 审核 | publish 发布
 *      assign 分配 | enable 启用 | disable 禁用
 *   4. 禁止包含空格、中文、特殊符号（除冒号外）
 *   5. 层级深度固定: module(2段) → page(3段) → action(4段)
 *
 * 示例:
 *   module:system             → 系统管理模块
 *   page:system:user          → 用户管理页面
 *   action:system:user:create → 新增用户按钮
 */

import type { ButtonType } from "element-plus";

/** 权限层级前缀，只允许这三个值 */
export type LevelPrefix = "module" | "page" | "action";

/** 权限 ID 字符串（受命名规则约束，按层级段数枚举） */
export type PermissionId =
  | `${LevelPrefix}:${string}`
  | `${LevelPrefix}:${string}:${string}`
  | `${LevelPrefix}:${string}:${string}:${string}`;

/** 权限节点类型（只读，防止运行时篡改树结构） */
export interface PermissionNode {
  /** 权限唯一标识，必须遵循命名规则 */
  readonly id: PermissionId;
  /** 显示名称 */
  readonly label: string;
  /** 子节点 */
  readonly children?: readonly PermissionNode[];
}

/** 权限树（只读数组，防止运行时篡改结构） */
export type PermissionTree = readonly PermissionNode[];

/** 按钮权限配置（用于页面组件） */
export interface ActionButtonConfig {
  /** 按钮权限 ID */
  readonly action: PermissionId;
  /** 按钮显示文本 */
  readonly label: string;
  /** Element Plus 按钮类型 */
  readonly uiType?: ButtonType;
  /** 业务层禁用（与权限无关） */
  readonly disabled?: boolean;
}

/** 页面元数据权限声明 */
export interface PagePermissionMeta {
  /** 必须满足的页面权限（单一） */
  readonly requiredPermission?: PermissionId;
  /** 满足任意一项即可的权限列表 */
  readonly requiredPermissionAny?: readonly PermissionId[];
}

/** 后端返回的权限数据格式（保留类型契约，当前无后端） */
export interface PermissionPayload {
  readonly permissions: readonly PermissionId[];
  readonly version?: string;
}

/** 本地存储的权限缓存结构（保留类型契约） */
export interface PermissionCache {
  readonly permissions: readonly PermissionId[];
  readonly timestamp: number;
  readonly expiresAt: number;
}

/**
 * 扩展 vue-router 路由元信息，使 definePageMeta 支持权限声明
 * 用法: definePageMeta({ requiredPermission: 'page:system:user' as PermissionId })
 */
declare module "vue-router" {
  interface RouteMeta {
    readonly requiredPermission?: PermissionId;
    readonly requiredPermissionAny?: readonly PermissionId[];
  }
}
