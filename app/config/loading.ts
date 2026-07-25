export interface LoadingConfig {
  /** 加载中文本 */
  text: string;
  /** 加载效果颜色 */
  color: string;
  /** 加载背景颜色 */
  bgColor: string;
  /** 加载文本颜色 */
  textColor: string;
  /** 加载z-index */
  zIndex: number;
}

export const loadingConfig: LoadingConfig = {
  text: "加载中...",
  color: "var(--el-color-primary)",
  bgColor: "var(--el-mask-color)",
  textColor: "var(--el-text-color-primary)",
  zIndex: 2000,
};
