// server/api/analytics/track-visit.post.ts
import type { VisitRecord } from "~~/types/analytics";
import type { ApiResponse } from "~~/types/common";
export default defineEventHandler(
  async (event): Promise<ApiResponse<never>> => {
    const { sql } = setupDatabase();

    const body = await readBody<{
      page?: string;
      userAgent?: string;
      clientTimestamp?: string;
    }>(event);

    // 获取客户端信息（可从请求头提取）
    const userAgent = body.userAgent || event.headers.get("user-agent") || null;
    const clientIp =
      event.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      event.node.req.socket.remoteAddress ||
      null;

    // 构造插入数据（以服务器接收时间为准）
    const record: VisitRecord = {
      timestamp: new Date().toISOString(),
      page: body.page || "/",
      userAgent,
      clientIp,
    };

    try {
      await sql`
      INSERT INTO visits (timestamp, page, user_agent, client_ip)
      VALUES (${record.timestamp}, ${record.page}, ${record.userAgent}, ${record.clientIp})
    `;

      return <ApiResponse<never>>{
        code: 200,
        message: "访问记录已保存",
        data: record,
      };
    } catch (error: any) {
      console.error("埋点写入失败:", error.message);
      throw createError({
        statusCode: 500,
        statusMessage: "数据记录失败",
      });
    }
  },
);
