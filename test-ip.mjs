// test-ip.mjs
import { QQwry } from "qqwry-lite";

const db = new QQwry();

const ip = process.argv[2] || "114.114.114.114";

console.log("====================================");
console.log("查询 IP:", ip);
console.log("====================================\n");

const result = db.searchIP(ip);
console.log("原始结果:", result);

// 解析地址和运营商
const { addr, info } = result;
console.log("\n--- 解析 ---");
console.log("地址:", addr); // 如: 江苏省南京市
console.log("信息:", info); // 如: 电信

// 进一步解析省份/城市
const match = addr.match(/^(.*?省)?(.*?市)?/);
console.log("省份:", match?.[1] || "-");
console.log("城市:", match?.[2] || "-");
