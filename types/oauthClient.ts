/**
 * oauth_clients（SSO 单点登录客户端白名单）相关类型
 * 数据表：client_id TEXT PK / client_secret / client_name / redirect_uris TEXT[] / enabled BOOLEAN / created_at / updated_at
 */

/** 数据库行（蛇形命名，原样返回） */
export interface OauthClientRow {
  client_id: string;
  client_secret: string;
  client_name: string;
  redirect_uris: string[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/** 前端资源（驼峰命名） */
export interface OauthClient {
  clientId: string;
  clientSecret: string;
  clientName: string;
  redirectUris: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 新增请求体 */
export interface CreateOauthClientRequest {
  clientId: string;
  clientSecret: string;
  clientName: string;
  redirectUris: string[];
  enabled?: boolean;
}

/** 更新请求体（clientSecret 留空 = 不修改） */
export interface UpdateOauthClientRequest {
  clientName: string;
  clientSecret?: string;
  redirectUris: string[];
  enabled: boolean;
}
