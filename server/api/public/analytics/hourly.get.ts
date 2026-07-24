import { setupDatabase } from "~~/server/utils/database";
import type { HourlyResponse } from "~~/types/analytics/responses";
import type { HourlyVisits } from "~~/types/analytics/common";

/**
 * 类型守卫：验证行数据是否为合法的小时访问量记录
 */
function isHourlyRow(row: unknown): row is { hour: number; count: number } {
  if (typeof row !== "object" || row === null) return false;
  const r = row as Record<string, unknown>;
  return typeof r.hour === "number" && typeof r.count === "number";
}

/**
 * 从查询参数中提取字符串值
 */
function getStringParam(value: unknown): string | undefined {
  if (typeof value === "string" && value) return value;
  return undefined;
}

export default defineEventHandler(async (event): Promise<HourlyResponse> => {
  const { sql } = setupDatabase();
  const query = getQuery(event);

  // 解析时区参数，默认 Asia/Shanghai
  const timezone = getStringParam(query.timezone) ?? "Asia/Shanghai";

  // 解析日期参数，默认今天
  const dateParam = getStringParam(query.date);
  const targetDate = dateParam ? new Date(dateParam) : new Date();
  const dateStr = targetDate.toLocaleDateString("en-CA", {
    timeZone: timezone,
  });

  const rows = await sql`
    SELECT
      EXTRACT(HOUR FROM timestamp AT TIME ZONE ${timezone})::int AS hour,
      COUNT(*)::int AS count
    FROM visits
    WHERE (timestamp AT TIME ZONE ${timezone})::date = ${dateStr}::date
    GROUP BY hour
    ORDER BY hour
  `;

  // 使用类型守卫过滤合法行，避免裸断言
  const hourlyRows = rows.filter(isHourlyRow);

  // 构建 24 小时访问量元组
  const hourlyVisits = Array.from({ length: 24 }, (_, hour) => {
    const row = hourlyRows.find((r) => r.hour === hour);
    return row ? row.count : 0;
  }) as HourlyVisits;

  const total = hourlyVisits.reduce((sum, c) => sum + c, 0);

  return {
    date: dateStr,
    hourlyVisits,
    total,
  };
});
