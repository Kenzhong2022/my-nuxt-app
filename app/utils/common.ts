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
