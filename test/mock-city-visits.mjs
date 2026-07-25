#!/usr/bin/env node
/**
 * 城市 IP 伪装测试脚本
 * 用于模拟不同城市访问，增加数据多样性
 * 用法: node mock-city-visits.mjs [次数]
 * 示例: node mock-city-visits.mjs 20
 */

const BASE_URL = process.env.API_URL || "http://localhost:3000";
const COUNT = parseInt(process.argv[2]) || 10;

// 国内主要城市公网 IP（阿里云节点测试 IP）
const CITY_IPS = [
  { city: "北京", ip: "59.110.190.69", region: "北京市" },
  { city: "上海", ip: "106.14.228.194", region: "上海市" },
  { city: "广州", ip: "119.29.29.29", region: "广东省" },
  { city: "深圳", ip: "120.77.166.226", region: "广东省" },
  { city: "杭州", ip: "118.31.219.247", region: "浙江省" },
  { city: "南京", ip: "114.114.114.114", region: "江苏省" },
  { city: "成都", ip: "182.140.140.140", region: "四川省" },
  { city: "武汉", ip: "119.96.128.0", region: "湖北省" },
  { city: "西安", ip: "123.125.81.0", region: "陕西省" },
  { city: "重庆", ip: "183.60.82.0", region: "重庆市" },
  { city: "天津", ip: "125.39.240.0", region: "天津市" },
  { city: "青岛", ip: "47.104.38.82", region: "山东省" },
  { city: "厦门", ip: "125.77.0.0", region: "福建省" },
  { city: "长沙", ip: "113.240.0.0", region: "湖南省" },
  { city: "郑州", ip: "123.52.0.0", region: "河南省" },
  { city: "沈阳", ip: "123.188.0.0", region: "辽宁省" },
  { city: "哈尔滨", ip: "123.165.0.0", region: "黑龙江省" },
  { city: "昆明", ip: "116.52.0.0", region: "云南省" },
  { city: "贵阳", ip: "111.85.0.0", region: "贵州省" },
  { city: "乌鲁木齐", ip: "124.117.0.0", region: "新疆维吾尔自治区" },
];

const PAGES = [
  "/",
  "/dashboard",
  "/goods/list",
  "/survey",
  "/agent/chat",
  "/admin",
];

/**
 * 随机取数组元素
 */
function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 模拟埋点上报
 */
async function sendVisit(cityInfo) {
  const page = random(PAGES);

  try {
    const res = await fetch(`${BASE_URL}/api/public/analytics/track-visit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": cityInfo.ip,
        "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/${120 + Math.floor(Math.random() * 10)}.0.0.0 Safari/537.36`,
      },
      body: JSON.stringify({
        page,
        referer: "https://www.google.com/search?q=my+nuxt+app",
      }),
    });

    const data = await res.json().catch(() => ({}));
    console.log(
      `✅ ${cityInfo.city}(${cityInfo.ip}) → ${page} | ${data.message || "ok"}`,
    );
    return true;
  } catch (err) {
    console.log(
      `❌ ${cityInfo.city}(${cityInfo.ip}) → ${page} | ${err.message}`,
    );
    return false;
  }
}

/**
 * 主程序
 */
async function main() {
  console.log("====================================");
  console.log("城市 IP 伪装埋点测试");
  console.log(`目标: ${BASE_URL}`);
  console.log(`次数: ${COUNT}`);
  console.log(`可用城市: ${CITY_IPS.length} 个`);
  console.log("====================================\n");

  let success = 0;
  let fail = 0;

  for (let i = 0; i < COUNT; i++) {
    const city = random(CITY_IPS);
    const ok = await sendVisit(city);
    ok ? success++ : fail++;

    // 间隔 100-500ms，避免过快
    if (i < COUNT - 1) {
      await new Promise((r) => setTimeout(r, 100 + Math.random() * 400));
    }
  }

  console.log("\n====================================");
  console.log(`完成: ${success} 成功, ${fail} 失败`);
  console.log("====================================");
}

main();
