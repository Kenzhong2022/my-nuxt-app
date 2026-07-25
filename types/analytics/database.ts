/**
 * visits 表对应的数据库模型
 */
export interface VisitRow {
  id: number;
  timestamp: string; // TIMESTAMPTZ
  page_path: string;
  page_query: string | null;
  referer: string | null;
  user_id: number | null;
  session_id: string | null;
  device_type: "desktop" | "mobile" | "tablet" | null;
  browser: string | null;
  os: string | null;
  client_ip: string | null;
  country: string | null;
  user_agent: string | null;
  load_time_ms: number | null;
}

/**
 * 插入 visits 表的字段（可选字段用 Partial）
 */
export type VisitInsert = Pick<VisitRow, "page_path"> &
  Partial<
    Pick<
      VisitRow,
      | "page_query"
      | "referer"
      | "user_id"
      | "session_id"
      | "device_type"
      | "browser"
      | "os"
      | "client_ip"
      | "country"
      | "user_agent"
      | "load_time_ms"
    >
  >;
