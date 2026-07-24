const BASE_URL = "http://localhost:3001";

const testCases = [
  {
    name: "Hourly - 默认日期（今天）",
    url: `${BASE_URL}/api/public/analytics/hourly`,
    method: "GET",
    expectedKeys: ["date", "hourlyVisits", "total"],
  },
  {
    name: "Hourly - 指定日期",
    url: `${BASE_URL}/api/public/analytics/hourly?date=2026-07-24`,
    method: "GET",
    expectedKeys: ["date", "hourlyVisits", "total"],
  },
  {
    name: "Hourly - 指定日期和时区",
    url: `${BASE_URL}/api/public/analytics/hourly?date=2026-07-24&timezone=UTC`,
    method: "GET",
    expectedKeys: ["date", "hourlyVisits", "total"],
  },
  {
    name: "Daily - 默认日期区间（近7天）",
    url: `${BASE_URL}/api/public/analytics/daily`,
    method: "GET",
    expectedKeys: ["startDate", "endDate", "dates", "dailyVisits", "total"],
  },
  {
    name: "Daily - 指定日期区间",
    url: `${BASE_URL}/api/public/analytics/daily?startDate=2026-07-20&endDate=2026-07-24`,
    method: "GET",
    expectedKeys: ["startDate", "endDate", "dates", "dailyVisits", "total"],
  },
  {
    name: "Daily - 指定日期区间和时区",
    url: `${BASE_URL}/api/public/analytics/daily?startDate=2026-07-20&endDate=2026-07-24&timezone=UTC`,
    method: "GET",
    expectedKeys: ["startDate", "endDate", "dates", "dailyVisits", "total"],
  },
  ];

async function runTests() {
  console.log("==========================");
  console.log("  Analytics API Test Suite");
  console.log("==========================\n");

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    console.log(`\n--- Test: ${testCase.name} ---`);
    console.log(`URL: ${testCase.url}`);

    try {
      const response = await fetch(testCase.url, {
        method: testCase.method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      console.log("Response:", JSON.stringify(data, null, 2));

      const missingKeys = testCase.expectedKeys.filter((key) => !(key in data));
      if (missingKeys.length > 0) {
        console.error(`FAIL: Missing expected keys: ${missingKeys.join(", ")}`);
        failed++;
      } else {
        console.log("PASS: All expected keys present");
        passed++;
      }
    } catch (error) {
      console.error(`FAIL: ${error.message}`);
      failed++;
    }
  }

  console.log("\n==========================");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("==========================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
