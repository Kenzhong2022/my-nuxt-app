#!/usr/bin/env node
/**
 * 城市热力图 API 测试脚本
 * 用法: node test-city-heatmap.mjs [timeRange] [region] [topN]
 * 示例:
 *   node test-city-heatmap.mjs 7d
 *   node test-city-heatmap.mjs 30d 江苏省 20
 *   node test-city-heatmap.mjs custom 2026-07-01 2026-07-25
 */

const BASE_URL = process.env.API_URL || "http://localhost:3000";

const [, , timeRange = "7d", region, topN] = process.argv;

async function testCityHeatmap() {
  const params = new URLSearchParams();
  params.append("timeRange", timeRange);

  if (region && region !== "custom") {
    params.append("region", region);
  }

  if (topN) {
    params.append("topN", topN);
  }

  if (timeRange === "custom") {
    params.append("startDate", region || "2026-07-01");
    params.append("endDate", topN || "2026-07-25");
  }

  const url = `${BASE_URL}/api/public/analytics/city-heatmap?${params.toString()}`;

  console.log("====================================");
  console.log("测试接口:", url);
  console.log("====================================\n");

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.log("❌ 请求失败:", res.status, res.statusText);
      console.log("错误详情:", JSON.stringify(data, null, 2));
      return;
    }

    console.log("✅ 请求成功\n");
    console.log("范围:", data.regionName);
    console.log("总访问量:", data.totalVisits.toLocaleString());
    console.log("最大城市值:", data.maxValue.toLocaleString());
    console.log("城市数量:", data.cities.length);
    console.log("\n--- TOP 城市 ---");

    data.cities.slice(0, 10).forEach((city, i) => {
      console.log(
        `${String(i + 1).padStart(2)}. ${city.name.padEnd(8)} ` +
          `PV: ${String(city.value).padStart(6)} ` +
          `UV: ${String(city.uv).padStart(6)} ` +
          `占比: ${city.percent}%`,
      );
    });

    if (data.cities.length > 10) {
      console.log(`   ... 共 ${data.cities.length} 个城市`);
    }

    console.log("\n--- ECharts 数据预览 ---");
    console.log("cities[0]:", JSON.stringify(data.cities[0], null, 2));
  } catch (err) {
    console.error("❌ 请求异常:", err.message);
  }
}

testCityHeatmap();
