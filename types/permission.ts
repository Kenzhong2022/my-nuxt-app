/**
 * ============================================================
 * 权限系统类型定义
 * ============================================================
 *
 * 【命名规则】两级结构：页面 + 按钮，path 为核心键
 *
 * permission 键（perm_key）格式:
 *   - 页面: page:{path}            如 page:/system/user
 *   - 按钮: action:{path}:{code}   如 action:/system/user:create
 *
 * 关键设计:
 *   1. path 即路由路径（页面权限身份与路由统一，守卫 O(path) 查询）
 *   2. 按钮行 path = 所属页面 path（归属关系由 path 表达，无独立父键）
 *   3. 模块层级不落库，由 path 前缀推导（/system/* → system 组），纯展示用
 *
 * code 约束（小写字母开头，仅小写字母/数字）:
 *   create 新增 | edit 编辑 | delete 删除 | view 查看
 *   export 导出 | import 导入 | audit 审核 | publish 发布
 *   assign 分配 | enable 启用 | disable 禁用
 */

import type { ButtonType } from "element-plus";

/** 权限节点类型（只读，防止运行时篡改树结构） */
export interface PermissionNode {
  /** 权限唯一标识，必须遵循命名规则 */
  readonly id: string;
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
  readonly action: string;
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
  readonly requiredPermission?: string;
  /** 满足任意一项即可的权限列表 */
  readonly requiredPermissionAny?: readonly string[];
}

/** 后端返回的权限数据格式（保留类型契约，当前无后端） */
export interface PermissionPayload {
  readonly permissions: readonly string[];
  readonly version?: string;
}

/**
 * ============================================================
 * 权限资源目录（permissions 表）相关类型
 * ============================================================
 *
 * 表设计见数据库 permissions 表：
 *   页面(1) + 按钮(2) 两级；按钮行 path = 所属页面 path（归属键）
 *   页面行 path 即路由路径，携带路由注册信息（route_name/menu_visible/icon）
 *   按钮行携带 button_type（el-button type 取值），页面行为 null
 */

/** 权限节点类型（对应 permissions 表 type 列） */
export enum PermissionType {
  /** 页面级（具体页面，可注册动态路由，path 即路由路径） */
  PAGE = 1,
  /** 操作级（按钮/接口权限，path 指向所属页面） */
  ACTION = 2,
}

/** el-button type 合法取值（与表 CHECK 约束一致；text 已废弃仅兼容） */
export type PermissionButtonType =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | ""
  | "text";

/** permissions 表行结构（snake_case，驱动返回） */
export interface PermissionRow {
  id: number | string;
  /** 权限键：page:{path} / action:{path}:{code}，角色绑定与归属的引用键 */
  perm_key: string;
  type: number;
  /** 页面行=自身路由路径；按钮行=所属页面路径 */
  path: string;
  name: string;
  route_name: string | null;
  menu_visible: number;
  icon: string | null;
  /** 按钮行=el-button type；页面行为 null */
  button_type: PermissionButtonType | null;
  status: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/** 权限资源实体（API 返回，camelCase） */
export interface PermissionResource {
  id: number;
  permKey: string;
  type: PermissionType;
  path: string;
  name: string;
  routeName: string | null;
  menuVisible: boolean;
  icon: string | null;
  /** 按钮行=el-button type；页面行为 null */
  buttonType: PermissionButtonType | null;
  status: number;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  /** 按钮子节点（仅页面行，按 path 归组后填充） */
  children?: PermissionResource[];
}

/** 新增权限请求 */
export interface CreatePermissionRequest {
  type: PermissionType;
  name: string;
  /** 页面行=新页面路由路径（/ 开头，即权限身份键）；按钮行=所属页面路径 */
  path: string;
  /** 按钮行必填（操作动词，进 perm_key 末段）；页面行忽略 */
  code?: string;
  /** 按钮行=el-button type；页面行忽略 */
  buttonType?: PermissionButtonType;
  /** 页面行路由注册信息 */
  routeName?: string;
  menuVisible?: boolean;
  icon?: string;
  status?: number;
  description?: string;
}

/** 更新权限请求（type/path 不可变，如需调整请删除重建） */
export interface UpdatePermissionRequest {
  name?: string;
  routeName?: string | null;
  menuVisible?: boolean;
  icon?: string | null;
  /** 按钮行=el-button type；页面行忽略 */
  buttonType?: PermissionButtonType | null;
  status?: number;
  description?: string | null;
}

/** 本地存储的权限缓存结构（保留类型契约） */
export interface PermissionCache {
  readonly permissions: readonly string[];
  readonly timestamp: number;
  readonly expiresAt: number;
}

/**
 * 扩展 vue-router 路由元信息，使 definePageMeta 支持权限声明
 * 用法: definePageMeta({ requiredPermission: 'page:system:user' as PermissionId })
 */
declare module "vue-router" {
  interface RouteMeta {
    readonly requiredPermission?: string;
    readonly requiredPermissionAny?: readonly string[];
  }
}
