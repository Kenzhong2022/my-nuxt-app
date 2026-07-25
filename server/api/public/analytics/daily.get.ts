import { setupDatabase } from "~~/server/utils/database";
import type { DailyResponse } from "~~/types/analytics/responses";

/**
 * 类型守卫：验证行数据是否为合法的日期访问量记录
 */
function isDailyRow(row: unknown): row is { date: string; count: number } {
  if (typeof row !== "object" || row === null) return false;
  const r = row as Record<string, unknown>;
  return typeof r.date === "string" && typeof r.count === "number";
}

/**
 * 从查询参数中提取字符串值
 */
function getStringParam(value: unknown): string | undefined {
  if (typeof value === "string" && value) return value;
  return undefined;
}

export default defineEventHandler(async (event): Promise<DailyResponse> => {
  const { sql } = setupDatabase();
  const query = getQuery(event);

  // 解析时区参数，默认 Asia/Shanghai
  const timezone = getStringParam(query.timezone) ?? "Asia/Shanghai";

  // 解析日期区间参数，默认近7天
  const now = new Date();
  const startParam = getStringParam(query.startDate);
  const endParam = getStringParam(query.endDate);
  const startDate = startParam
    ? new Date(startParam)
    : new Date(Date.now() - 6 * 86400000); // 默认近7天
  const endDate = endParam ? new Date(endParam) : now;

  const startDateStr = startDate.toLocaleDateString("en-CA", {
    timeZone: timezone,
  }); // 格式化开始日期为字符串，用于 SQL 查询
  const endDateStr = endDate.toLocaleDateString("en-CA", {
    timeZone: timezone,
  }); // 格式化结束日期为字符串，用于 SQL 查询


  
  const rows = await sql`
    SELECT
      to_char(
        (timestamp AT TIME ZONE ${timezone})::date,
        'YYYY-MM-DD'
      ) AS date,
      COUNT(*)::int AS count
    FROM visits
    WHERE
      (timestamp AT TIME ZONE ${timezone})::date >= ${startDateStr}::date
      AND
      (timestamp AT TIME ZONE ${timezone})::date <= ${endDateStr}::date
    GROUP BY date
    ORDER BY date
  `;

  // 使用类型守卫过滤合法行，避免裸断言
  const dailyRows = rows.filter(isDailyRow);

  const dates: string[] = [];
  const dailyVisits: number[] = [];

  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateStr = current.toLocaleDateString("en-CA", { timeZone: timezone });
    dates.push(dateStr);
    const row = dailyRows.find((r) => r.date === dateStr);
    dailyVisits.push(row ? row.count : 0);
    current.setDate(current.getDate() + 1);
  }

  const total = dailyVisits.reduce((sum, c) => sum + c, 0);

  return {
    startDate: startDateStr,
    endDate: endDateStr,
    dates,
    dailyVisits,
    total,
  };
});
