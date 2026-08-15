/** 将 snake_case 字符串类型转为 camelCase */
type SnakeToCamel<S extends string> = S extends `${infer Head}_${infer Tail}`
  ? `${Head}${Capitalize<SnakeToCamel<Tail>>}`
  : S;

/** 递归将对象（含嵌套对象/数组）所有键映射为 camelCase 的类型 */
export type CamelCaseKeys<T> = T extends (infer U)[]
  ? CamelCaseKeys<U>[]
  : T extends object
    ? { [K in keyof T as SnakeToCamel<K & string>]: CamelCaseKeys<T[K]> }
    : T;

/**
 * 通用转换器：递归把对象所有键从 snake_case 转为 camelCase
 * 注意：PostgreSQL 的 numeric/bigint 字段仍为 string，需在业务层按需 Number() 转换
 */
export function toCamelCase<T>(value: T): CamelCaseKeys<T> {
  if (Array.isArray(value)) {
    return value.map(toCamelCase) as CamelCaseKeys<T>;
  }
  // timestamptz 等字段驱动返回 Date 对象，透传（JSON 序列化时自动转 ISO 字符串）
  if (value instanceof Date) {
    return value as CamelCaseKeys<T>;
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] =
        toCamelCase(val);
    }
    return result as CamelCaseKeys<T>;
  }
  return value as CamelCaseKeys<T>;
}
