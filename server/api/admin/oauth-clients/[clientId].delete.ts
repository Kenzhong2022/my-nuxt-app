import { getRouterParam, createError } from 'h3';
import { setupDatabase } from '~~/server/utils/database';
import { requireAdmin } from '~~/server/utils/requireAdmin';
import type { ApiResponse } from '~~/types/common';

/**
 * 删除 SSO 客户端
 * url: /api/admin/oauth-clients/:clientId
 * method: DELETE（仅管理员）
 */
export default defineEventHandler(async (event): Promise<ApiResponse<null>> => {
  requireAdmin(event);

  const clientId = decodeURIComponent(getRouterParam(event, 'clientId') ?? '');
  if (!clientId) {
    throw createError({ statusCode: 400, message: '缺少 client_id' });
  }

  const { sql } = setupDatabase();

  try {
    const rows = (await sql`
      DELETE FROM oauth_clients WHERE client_id = ${clientId} RETURNING client_id
    `) as unknown as { client_id: string }[];

    if (!rows[0]) {
      return { code: 404, message: 'SSO 客户端不存在', data: null };
    }
    return { code: 200, message: '删除成功', data: null };
  } catch (error) {
    console.error('删除 SSO 客户端失败:', error);
    return { code: 500, message: '删除 SSO 客户端失败', data: null };
  }
});
