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

/**
 * 移除对象中值为空（null、undefined、空字符串）的属性，返回新对象。
 * @param obj 原始对象
 * @param isEmpty 可选的自定义判空函数，默认检查 null / undefined / ''
 * @returns 过滤后的新对象（浅拷贝）
 */
export const removeEmptyValues = <T extends Record<string, any>>(
  obj: T,
  isEmpty?: (value: any) => boolean,
): Partial<T> => {
  const defaultIsEmpty = (val: any): boolean => val === null || val === undefined || val === '';

  const check = isEmpty ?? defaultIsEmpty;

  const result: Partial<T> = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (!check(value)) {
        result[key] = value;
      }
    }
  }
  return result;
};

/**
 * 深度移除对象中值为空（null、undefined、空字符串）的属性，支持嵌套对象和数组。
 * @param obj 原始对象
 * @param isEmpty 可选的自定义判空函数，默认检查 null / undefined / ''
 * @returns 过滤后的新对象（深拷贝，但只处理一层）
 */
export const deepRemoveEmptyValues = <T extends Record<string, any>>(
  obj: T,
  isEmpty?: (value: any) => boolean,
): Partial<T> => {
  const defaultIsEmpty = (val: any): boolean => val === null || val === undefined || val === '';

  const check = isEmpty ?? defaultIsEmpty;

  // 递归处理值
  const cleanValue = (value: any): any => {
    // 如果值是空，直接返回 undefined（后续会被过滤掉）
    if (check(value)) {
      return undefined;
    }

    // 如果是数组，递归处理每个元素，并过滤掉空元素
    if (Array.isArray(value)) {
      const cleanedArray = value.map((item) => cleanValue(item)).filter((item) => item !== undefined);
      // 如果数组为空，返回 undefined 以便上层过滤
      return cleanedArray.length > 0 ? cleanedArray : undefined;
    }

    // 如果是对象（非 null，非数组），递归处理其属性
    if (typeof value === 'object' && value !== null) {
      const cleanedObj: Record<string, any> = {};
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          const cleanedItem = cleanValue(value[key]);
          if (cleanedItem !== undefined) {
            cleanedObj[key] = cleanedItem;
          }
        }
      }
      // 如果对象变为空对象，返回 undefined
      return Object.keys(cleanedObj).length > 0 ? cleanedObj : undefined;
    }

    // 其他值（数字、布尔等）直接返回
    return value;
  };

  // 处理根对象
  const result = cleanValue(obj);
  // 如果根对象被清空或为 undefined，返回空对象
  return typeof result === 'object' && result !== null ? result : {};
};
