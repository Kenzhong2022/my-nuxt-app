import type { AddressPayload } from "~~/types/address";

/**
 * 校验收货地址载荷
 * @returns 错误信息（string），通过校验返回 null
 */
export const validateAddress = (body?: Partial<AddressPayload>): string | null => {
  const receiver = String(body?.receiver ?? "").trim();
  const phone = String(body?.phone ?? "").trim();
  const region = String(body?.region ?? "").trim();
  const detail = String(body?.detail ?? "").trim();

  if (!receiver || receiver.length > 20) return "收件人姓名不能为空且不超过20字";
  if (!/^1[3-9]\d{9}$/.test(phone)) return "手机号格式不正确";
  if (!region || region.length > 100) return "请选择省市区";
  if (!detail || detail.length > 200) return "详细地址不能为空且不超过200字";
  return null;
};

/** 校验通过后的规范化载荷 */
export const normalizeAddress = (body: Partial<AddressPayload>) => ({
  receiver: String(body.receiver).trim(),
  phone: String(body.phone).trim(),
  region: String(body.region).trim(),
  detail: String(body.detail).trim(),
  isDefault: Boolean(body.isDefault),
});
