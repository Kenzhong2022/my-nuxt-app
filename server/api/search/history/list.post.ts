import { setupDatabase } from "~~/server/utils/database";

export default defineEventHandler(async (event) => {
  // 获取请求体
  const body = await readBody(event);
  const query = body.query || "";

  if (!query.trim()) {
    return { suggestions: [] };
  }

  // 初始化数据库连接
  const { sql } = setupDatabase();

  // 从搜索日志中获取热门搜索建议（按搜索次数排序）
  const result = await sql`
    SELECT keyword, COUNT(*) as count 
    FROM user_search_log 
    WHERE keyword ILIKE ${"%" + query + "%"} 
    GROUP BY keyword 
    ORDER BY count DESC 
    LIMIT 10
  `;

  const suggestions = result.map((row: any) => row.keyword);

  return { suggestions };
});
