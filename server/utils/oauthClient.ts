import { toCamelCase } from './caseConvert';
import type { OauthClient, OauthClientRow } from '~~/types/oauthClient';

/** client_id 合法格式：字母/数字开头，仅含字母/数字/-/_，长度 2-64 */
const CLIENT_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$/;

/**
 * 校验 client_id 格式
 * @param clientId 客户端标识
 */
export function isValidClientId(clientId: string): boolean {
  return CLIENT_ID_PATTERN.test(clientId);
}

/**
 * 校验单个回调地址：必须是 http(s) 绝对 URL
 * @param uri 回调地址
 */
export function isValidRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 清洗回调地址数组：去空白、去空项
 * @param uris 原始数组（可能来自请求体，元素未必是字符串）
 */
export function normalizeRedirectUris(uris: unknown): string[] {
  if (!Array.isArray(uris)) return [];
  return uris
    .map((uri) => String(uri ?? '').trim())
    .filter((uri) => uri.length > 0);
}

/**
 * oauth_clients 数据库行 → 前端资源（蛇形 → 驼峰）
 * @param row 数据库行
 */
export function toOauthClient(row: OauthClientRow): OauthClient {
  return toCamelCase(row) as unknown as OauthClient;
}
