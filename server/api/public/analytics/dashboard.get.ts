// server/api/public/analytics/dashboard.get.ts
import { setupDatabase } from "~~/server/utils/database";
import type {
  DashboardOverview,
  HourlyVisits,
  DailyVisits,
} from "~~/types/analytics";

export default defineEventHandler(async (): Promise<DashboardOverview> => {
  const { sql } = setupDatabase();

  // ========== 1. 今日每小时访问量（北京时间） ==========
  const hourlyRows = (await sql`
    SELECT
      EXTRACT(HOUR FROM timestamp AT TIME ZONE 'Asia/Shanghai')::int AS hour,
      COUNT(*)::int AS count
    FROM visits
    WHERE (timestamp AT TIME ZONE 'Asia/Shanghai')::date =
          (current_timestamp AT TIME ZONE 'Asia/Shanghai')::date
    GROUP BY hour
    ORDER BY hour
  `) as { hour: number; count: number }[];

  const hourlyVisits = Array.from({ length: 24 }, (_, hour) => {
    const row = hourlyRows.find((r) => r.hour === hour);
    return row ? row.count : 0;
  }) as unknown as HourlyVisits;

  // ========== 2. 近7天每日访问量（北京时间） ==========
  const dailyRows = (await sql`
    SELECT
      to_char(
        (timestamp AT TIME ZONE 'Asia/Shanghai')::date,
        'YYYY-MM-DD'
      ) AS date,
      COUNT(*)::int AS count
    FROM visits
    WHERE
      (timestamp AT TIME ZONE 'Asia/Shanghai')::date >=
          (current_timestamp AT TIME ZONE 'Asia/Shanghai')::date - INTERVAL '6 days'
      AND
      (timestamp AT TIME ZONE 'Asia/Shanghai')::date <=
          (current_timestamp AT TIME ZONE 'Asia/Shanghai')::date
    GROUP BY date
    ORDER BY date
  `) as { date: string; count: number }[];

  const dailyVisits = (() => {
    const result: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(Date.now() - i * 86400000);
      const dateStr = targetDate.toLocaleDateString("en-CA", {
        timeZone: "Asia/Shanghai",
      });
      const row = dailyRows.find((r) => r.date === dateStr);
      result.push(row ? row.count : 0);
    }
    return result;
  })() as unknown as DailyVisits;

  // ========== 3. 昨日总访问量（北京时间） ==========
  const yesterdayResult = (await sql`
    SELECT COUNT(*)::int AS count
    FROM visits
    WHERE
      (timestamp AT TIME ZONE 'Asia/Shanghai')::date =
          (current_timestamp AT TIME ZONE 'Asia/Shanghai')::date - INTERVAL '1 day'
  `) as { count: number }[];

  const yesterdayTotal = yesterdayResult[0]?.count ?? 0;

  // ========== 4 & 5 ==========
  const todayTotal = hourlyVisits.reduce((sum, c) => sum + c, 0);
  const weekTotal = dailyVisits.reduce((sum, c) => sum + c, 0);
  const updatedAt = new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString()
    .replace("Z", "+08:00"); // 返回北京时间 ISO 字符串，例如 2026-07-21T18:43:21.643+08:00
  return {
    hourlyVisits,
    dailyVisits,
    yesterdayTotal,
    todayTotal,
    weekTotal,
    updatedAt,
  };
});
