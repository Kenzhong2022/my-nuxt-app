// utils/qrcode.js
// 职责：生成取餐码的防篡改签名（核销时用于校验码的真伪）

import crypto from "crypto";

// 1. 加载签名密钥（绝密）
// 说明：这是整个防伪系统的“命根子”。必须从环境变量读取，防止密钥泄露导致签名被伪造。
// 原理：HMAC 算法需要这个密钥来生成哈希，坏人不知道密钥就无法算出正确的 4 位码。
const SECRET = process.env.QRCODE_SECRET || "demo-secret-key";

/**
 * 生成取餐二维码的 4 位防伪签名
 *
 * @param {number|string} storeId - 门店 ID（防止多门店短号重叠，核销时必须带入）
 * @param {number|string} shortNumber - 取餐短号（比如 28，店员喊号用）
 * @returns {string} 4 位大写字母/数字组合（如 "H3K9"）
 *
 * @example
 * // 门店 1001，短号 28
 * generateQRCodeSign(1001, 28) // 返回 "H3K9"
 */
export function generateQRCodeSign(storeId, shortNumber) {
  // 2. 初始化 HMAC-SHA256 加密器
  // 说明：HMAC（哈希消息认证码）是国际标准签名算法，比自己拼字符串做 MD5 更安全。
  //      选择 SHA256 是因为它长度足够且性能优秀，虽然我们只截取前 4 位，但底层仍受完整算法保护。
  const hmac = crypto.createHmac("sha256", SECRET);

  // 3. 写入待签名的数据
  // 内容：门店 ID 和下划线拼接短号（例如 "1001_28"）
  // 注意：这里只包含业务数据，不包含密钥本身。密钥通过上面的 createHmac 传入。
  hmac.update(`${storeId}_${shortNumber}`);

  // 4. 计算哈希值并转为十六进制字符串（例如 "a1b2c3..."）
  const fullHash = hmac.digest("hex");

  // 5. 截取前 4 位并转为大写
  // 为什么要截断？
  //   - 二维码容量有限，太长的签名会增大图片尺寸。
  //   - 店员核销时看的是短号（28），这 4 位只用于机器后台校验，人类不关心。
  //   - 安全性权衡：虽然 4 位只有 16^4 = 65536 种组合，但配合密钥和单次有效机制，
  //     足以防止普通用户随手改号（暴力破解需要 6 万次尝试，后端加锁即可防御）。
  return fullHash.substring(0, 4).toUpperCase();
}

// 生成的完整 QR 码字符串：前缀_门店ID_短号_签名
export function generateFullQRCode(storeId, shortNumber, prefix = "C") {
  const sign = generateQRCodeSign(storeId, shortNumber);
  return `${prefix}_${storeId}_${shortNumber}_${sign}`;
  // 示例输出：C_1001_28_H3K9
}
