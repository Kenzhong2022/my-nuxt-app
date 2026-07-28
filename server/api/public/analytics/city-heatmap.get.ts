// server/api/analytics/city-heatmap.get.ts
import type { CityHeatmapQuery } from "~~/types/analytics/geo";
import type { CityHeatmapResponse } from "~~/types/analytics/responses";

export default defineEventHandler(
  async (event): Promise<CityHeatmapResponse> => {
    const { sql } = setupDatabase();
    const query = getQuery<CityHeatmapQuery>(event);

    // 1. 构建时间条件（默认全部时间）
    let timeCondition: string | null = null;
    const now = new Date();
    const range = query.timeRange ?? "all";

    switch (range) {
      case "all":
        timeCondition = null;
        break;
      case "today":
        timeCondition = `timestamp >= '${now.toISOString().split("T")[0]} 00:00:00'`;
        break;
      case "7d":
        timeCondition = `timestamp >= NOW() - INTERVAL '7 days'`;
        break;
      case "30d":
        timeCondition = `timestamp >= NOW() - INTERVAL '30 days'`;
        break;
      case "4m":
        timeCondition = `timestamp >= NOW() - INTERVAL '4 months'`;
        break;
      case "8m":
        timeCondition = `timestamp >= NOW() - INTERVAL '8 months'`;
        break;
      case "12m":
        timeCondition = `timestamp >= NOW() - INTERVAL '12 months'`;
        break;
      case "year":
        timeCondition = `timestamp >= '${now.getFullYear()}-01-01 00:00:00'`;
        break;
      case "custom":
        if (!query.startDate || !query.endDate) {
          throw createError({
            statusCode: 400,
            statusMessage: "custom range requires startDate and endDate",
          });
        }
        timeCondition = `timestamp BETWEEN '${query.startDate} 00:00:00' AND '${query.endDate} 23:59:59'`;
        break;
      default:
        throw createError({
          statusCode: 400,
          statusMessage: "invalid timeRange",
        });
    }

    // 2. 执行查询（全部使用 sql 模板片段，避免字符串拼接问题）
    const topN = Math.min(query.topN || 50, 100);

    const cities = await sql`
    SELECT 
      city as name,
      COUNT(*)::int as value,
      COUNT(DISTINCT session_id)::int as uv
    FROM visits
    WHERE city IS NOT NULL
      ${timeCondition ? sql`AND ${sql.unsafe(timeCondition)}` : sql``}
      ${query.region ? sql`AND region = ${query.region}` : sql``}
    GROUP BY city
    ORDER BY value DESC
    LIMIT ${topN}
  `;

    // 3. 计算百分比和总量
    const totalVisits = cities.reduce((sum, city) => sum + city.value, 0);
    const maxValue = cities[0]?.value || 0;

    const result: CityHeatmapResponse = {
      regionName: query.region || "全国",
      totalVisits,
      maxValue,
      cities: cities.map((c) => ({
        name: c.name,
        value: c.value,
        uv: c.uv,
        percent: Number(((c.value / totalVisits) * 100).toFixed(1)),
      })),
    };

    return result;
  },
);
