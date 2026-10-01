/**
 * 主题色安全值域工具（HSL 规则，参考明暗双模式可视性校验）
 * - 亮度过低（l < 28）：暗色模式下与深色背景融为一体
 * - 亮度过高（l > 85）：亮色模式下与白色背景融为一体
 * - 饱和度过低（s < 15）：灰度色系没有主题辨识度，不能作为主题色
 * - 暗色模式：亮度保底 30（色相/饱和度不变），保证暗底可读
 * 依赖项目已有 @ctrl/tinycolor 做色彩空间转换
 */
import { TinyColor } from '@ctrl/tinycolor';

/** 主题色安全值域常量（s/l 单位 %） */
export const THEME_COLOR_LIMITS = {
  /** 亮色模式亮度下限 */
  lightLMin: 28,
  /** 亮色模式亮度上限 */
  lightLMax: 85,
  /** 饱和度下限（低于视为灰度色） */
  sMin: 15,
  /** 暗色模式亮度保底 */
  darkLFloor: 30,
} as const;

/** 默认主题色（与 element-theme 插件共用） */
export const DEFAULT_PRIMARY_COLOR = '#ff6b6b';

/**
 * hex 转 HSL
 * @param hex 颜色值（支持 #rgb/#rrggbb/rgba 字符串）
 * @returns h: 0~360，s/l: 0~100；非法色值返回 null
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const color = new TinyColor(hex);
  if (!color.isValid) return null;
  const { h, s, l } = color.toHsl();
  return { h, s: s * 100, l: l * 100 };
}

/**
 * HSL 转 hex
 * @param h 色相 0~360
 * @param s 饱和度 0~100
 * @param l 亮度 0~100
 */
export function hslToHex(h: number, s: number, l: number): string {
  return new TinyColor({ h, s: s / 100, l: l / 100 }).toHexString();
}

/**
 * 校验颜色是否满足明暗双模式主题色安全规则
 * @returns valid 是否可用；reason 违规原因（用于提示文案）
 */
export function validateThemeColor(hex: string): {
  valid: boolean;
  reason?: 'invalid' | 'too-dark' | 'too-bright' | 'too-gray';
} {
  const hsl = hexToHsl(hex);
  if (!hsl) return { valid: false, reason: 'invalid' };
  if (hsl.l < THEME_COLOR_LIMITS.lightLMin) return { valid: false, reason: 'too-dark' };
  if (hsl.l > THEME_COLOR_LIMITS.lightLMax) return { valid: false, reason: 'too-bright' };
  if (hsl.s < THEME_COLOR_LIMITS.sMin) return { valid: false, reason: 'too-gray' };
  return { valid: true };
}

/**
 * 亮色模式安全化：亮度夹取到 [lightLMin, lightLMax]，色相/饱和度不变
 * @returns 校正后的 hex；非法色值原样返回
 */
export function clampLightColor(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  const l = Math.min(Math.max(hsl.l, THEME_COLOR_LIMITS.lightLMin), THEME_COLOR_LIMITS.lightLMax);
  return hslToHex(hsl.h, hsl.s, l);
}

/**
 * 暗色模式安全化：亮度保底 darkLFloor，色相/饱和度不变（参考 demo 的 getDarkAdjustColor）
 * @returns 校正后的 hex；非法色值原样返回
 */
export function adjustDarkColor(hex: string): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  const l = Math.max(hsl.l, THEME_COLOR_LIMITS.darkLFloor);
  return hslToHex(hsl.h, hsl.s, l);
}
