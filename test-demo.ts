import { queryPrometheusDemoData } from "./lib/prometheus/demo-data.ts";

async function testDemoMode() {
  try {
    console.log("Testing demo data function...");

    const result1 = await queryPrometheusDemoData("up");
    console.log("Query 'up' result:", JSON.stringify(result1, null, 2));

    const result2 = await queryPrometheusDemoData("sum(up)");
    console.log("Query 'sum(up)' result:", JSON.stringify(result2, null, 2));

    console.log("Demo data test completed successfully!");
  } catch (error) {
    console.error("Demo data test failed:", error.message);
  }
}

testDemoMode();