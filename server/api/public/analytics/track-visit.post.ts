// server/api/analytics/track-visit.post.ts
import { UAParser } from "ua-parser-js";
import { QQwry } from "qqwry-lite";
import type { ApiResponse } from "~~/types/common";
import type { TrackVisitRequest } from "~~/types/analytics/requests";
import type { VisitInsert } from "~~/types/analytics/database";
const qqwry = new QQwry();
export default defineEventHandler(
  async (event): Promise<ApiResponse<never>> => {
    const { sql } = setupDatabase();

    const body = await readBody<TrackVisitRequest>(event);

    // ========== 1. 必填校验 ==========
    if (!body.page) {
      throw createError({
        statusCode: 400,
        statusMessage: "page is required",
      });
    }

    // ========== 2. 获取客户端信息 ==========
    const userAgent =
      body.userAgent || getRequestHeader(event, "user-agent") || null;

    // 获取真实 IP（考虑反向代理）
    const clientIp =
      getRequestIP(event, { xForwardedFor: true }) ||
      getRequestHeader(event, "x-forwarded-for")?.split(",")[0]?.trim() ||
      getRequestHeader(event, "x-real-ip") ||
      event.node.req.socket.remoteAddress ||
      null;

    // ========== 3. 解析 UA → 设备/浏览器/OS ==========
    let deviceType: "desktop" | "mobile" | "tablet" | null = null;
    let browser: string | null = null;
    let os: string | null = null;

    if (userAgent) {
      const ua = new UAParser(userAgent);
      const device = ua.getDevice();
      deviceType = (device.type as "mobile" | "tablet") || "desktop";
      browser =
        `${ua.getBrowser().name || ""} ${ua.getBrowser().version || ""}`.trim() ||
        null;
      os =
        `${ua.getOS().name || ""} ${ua.getOS().version || ""}`.trim() || null;
    }

    // ========== 4. IP → 国家 ==========
    let country: string | null = null;
    let region: string | null = null;
    let city: string | null = null;
    if (clientIp) {
      const { addr, info } = qqwry.searchIP(clientIp);

      if (addr.includes("省") || addr.includes("市")) {
        // 国内地址
        country = "中国";
        const match = addr.match(/^(.*?省)?(.*?市)?/);
        region = match?.[1] || null; // 江苏省
        city = match?.[2] || null; // 南京市
      } else {
        // 国外地址，addr = "美国"
        country = addr;
      }
    }

    // ========== 5. 会话 ID ==========
    const sessionId = body.sessionId || generateSessionId();

    // ========== 6. 组装数据 ==========
    const record: VisitInsert = {
      page_path: body.page,
      page_query: body.query ? JSON.stringify(body.query) : null,
      referer: body.referer || getRequestHeader(event, "referer") || null,
      user_id: body.userId || null,
      session_id: sessionId,
      device_type: deviceType,
      browser,
      os,
      client_ip: clientIp,
      country,
      user_agent: userAgent,
      load_time_ms: body.loadTimeMs || null,
      region,
      city,
    };

    // ========== 7. 插入数据库 ==========
    try {
      await sql`
        INSERT INTO visits (
          page_path, page_query, referer, user_id, session_id,
          device_type, browser, os, client_ip, country, user_agent, load_time_ms, region, city
        ) VALUES (
          ${record.page_path}, ${record.page_query}, ${record.referer}, ${record.user_id}, ${record.session_id},
          ${record.device_type}, ${record.browser}, ${record.os}, ${record.client_ip}, ${record.country}, ${record.user_agent}, ${record.load_time_ms}, ${record.region}, ${record.city}
        )
      `;

      return {
        code: 200,
        message: "访问记录已保存",
        data: null as never,
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

// ========== 工具函数 ==========

/**
 * 判断是否为内网 IP
 */
function isPrivateIp(ip: string): boolean {
  return /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1|fe80:)/i.test(
    ip,
  );
}

/**
 * 生成会话 ID
 */
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
