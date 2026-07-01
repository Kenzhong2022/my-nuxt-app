import { createEventStream } from "h3";

// 内存存储：每个 ticket 对应一个事件流（不能放 Redis！）
const streams = new Map<string, any>();

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const ticket = query.t as string;

  if (!ticket) {
    throw createError({ statusCode: 400, message: "缺少 ticket" });
  }

  // 1. 创建 SSE 事件流
  const eventStream = createEventStream(event);

  // 2. 存入内存 Map（方便其他接口调用）
  streams.set(ticket, eventStream);

  // 3. 连接断开时自动清理
  eventStream.onClosed(() => {
    streams.delete(ticket);
    console.log(`[SSE] 连接已关闭: ${ticket}`);
  });

  // 4. 发送一个初始连接成功消息（可选）
  await eventStream.send(JSON.stringify({ type: "connected" }));

  // 注意：这里不要 return，让函数自然结束，连接会保持打开状态
  // 如果非要 return，可以 return eventStream.send() 但会发送两次
});
