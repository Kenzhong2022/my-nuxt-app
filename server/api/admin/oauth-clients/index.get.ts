import { setupDatabase } from '~~/server/utils/database';
import { requireAdmin } from '~~/server/utils/requireAdmin';
import { toOauthClient } from '~~/server/utils/oauthClient';
import type { ApiResponse } from '~~/types/common';
import type { OauthClient, OauthClientRow } from '~~/types/oauthClient';

/**
 * 获取 SSO 客户端白名单列表（全量，数据量小不分页）
 * url: /api/admin/oauth-clients
 * method: GET（仅管理员）
 */
export default defineEventHandler(async (event): Promise<ApiResponse<OauthClient[]>> => {
  requireAdmin(event);
  const { sql } = setupDatabase();

  try {
    const rows = (await sql`
      SELECT client_id, client_secret, client_name,
             redirect_uris, enabled, created_at, updated_at
      FROM oauth_clients
      ORDER BY created_at DESC
    `) as unknown as OauthClientRow[];

    return { code: 200, message: 'success', data: rows.map(toOauthClient) };
  } catch (error) {
    console.error('获取 SSO 白名单列表失败:', error);
    return { code: 500, message: '获取 SSO 白名单列表失败', data: [] };
  }
});
