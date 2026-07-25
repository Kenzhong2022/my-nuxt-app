// server/api/analytics/city-heatmap.get.ts
import type { CityHeatmapQuery } from "~~/types/analytics/geo";
import type { CityHeatmapResponse } from "~~/types/analytics/responses";

export default defineEventHandler(
  async (event): Promise<CityHeatmapResponse> => {
    const { sql } = setupDatabase();
    const query = getQuery<CityHeatmapQuery>(event);

    // 1. 参数校验
    if (!query.timeRange) {
      throw createError({
        statusCode: 400,
        statusMessage: "timeRange is required",
      });
    }

    // 2. 构建时间条件
    let timeCondition: string;
    const now = new Date();

    switch (query.timeRange) {
      case "today":
        timeCondition = `timestamp >= '${now.toISOString().split("T")[0]} 00:00:00'`;
        break;
      case "7d":
        timeCondition = `timestamp >= NOW() - INTERVAL '7 days'`;
        break;
      case "30d":
        timeCondition = `timestamp >= NOW() - INTERVAL '30 days'`;
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

    // 3. 构建查询
    const regionFilter = query.region ? `AND region = '${query.region}'` : "";
    const topN = Math.min(query.topN || 50, 100);

    // 4. 执行查询
    const cities = await sql`
    SELECT 
      city as name,
      COUNT(*)::int as value,
      COUNT(DISTINCT session_id)::int as uv
    FROM visits
    WHERE ${sql.unsafe(timeCondition)}
      AND city IS NOT NULL
      ${sql.unsafe(regionFilter)}
    GROUP BY city
    ORDER BY value DESC
    LIMIT ${topN}
  `;

    // 5. 计算百分比和总量
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
