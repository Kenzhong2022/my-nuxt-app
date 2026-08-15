/**
 * CSV 导出工具
 * 零依赖纯前端实现，UTF-8 BOM 保证 Excel 打开中文不乱码
 */

/** CSV 单元格转义：含逗号/引号/换行时用双引号包裹，内部引号翻倍 */
function escapeCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 导出 CSV 文件并触发浏览器下载
 * @param filename 文件名（不含扩展名）
 * @param rows 二维数组，第一行为表头，如 [["日期", "访问量"], ["2026-08-12", 100]]
 */
export function downloadCsv(
  filename: string,
  rows: (string | number)[][],
): void {
  const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
  // \uFEFF BOM：Excel 识别 UTF-8 编码，避免中文乱码
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  // 触发下载事件告诉浏览器这个链接应该被下载到本地，而不是在当前页面打开。
  link.download = `${filename}.csv`; // 设置下载文件名
  // 触发点击事件，模拟用户点击下载链接
  link.click();

  URL.revokeObjectURL(url);
}
