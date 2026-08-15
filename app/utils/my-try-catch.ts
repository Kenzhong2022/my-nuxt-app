import { ElMessage } from "element-plus";

/**
 * try/catch 二次封装
 * @param fn try 内容（同步函数）
 * @param keyword 失败提示关键字，如 "导出" → 出错时提示 "导出失败"并 console.error 原始错误；不传则只提示通用文案
 * @returns fn 的返回值；抛错时返回 undefined（由调用方区分"无数据"和"出错"）
 */
export function myTryCatch<T>(fn: () => T, keyword?: string): T | undefined {
  try {
    return fn();
  } catch (error) {
    console.error(`[${keyword ?? "操作"}失败]`, error);
    ElMessage.error(keyword ? `${keyword}失败` : "操作失败");
    return undefined;
  }
}
