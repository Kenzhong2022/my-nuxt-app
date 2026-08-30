// server/utils/database.ts
import { neon } from "@neondatabase/serverless";

// 每个进程只探测一次连通性（dev 热重载或线上冷启动后各执行一轮）
let connectionProbed = false;

/**
 * 初始化数据库连接
 * @returns 包含数据库连接对象的对象
 */
export const setupDatabase = () => {
  const config = useRuntimeConfig();
  // 从运行时配置中获取连接字符串
  const sql = neon(config.databaseUrl);

  // 首次调用时立即发一条探测查询验证连通性（fire-and-forget，不阻塞返回）
  if (!connectionProbed) {
    connectionProbed = true;
    sql`SELECT 1`
      .then(() => console.log("[database] Neon 连接成功 ✓"))
      .catch((err) =>
        console.error("[database] Neon 连接失败:", err?.message || err),
      );
  }

  return { sql };
};
