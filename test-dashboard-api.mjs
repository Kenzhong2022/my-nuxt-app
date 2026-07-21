// test-dashboard-api.mjs
const BASE_URL = "http://localhost:3000"; // 根据实际端口调整

async function testDashboardAPI() {
  try {
    const response = await fetch(`${BASE_URL}/api/public/analytics/dashboard`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    console.log("✅ 接口返回数据：");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ 请求失败:", error.message);
  }
}

testDashboardAPI();
