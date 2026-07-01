// 👇 导入我们之前在 server/utils/deepseek.ts 中封装好的 DeepSeek 客户端和模型枚举
// 导入类型定义，让 TypeScript 能够提供类型检查和代码提示
import {
  deepseekClient,
  DeepSeekModel,
  ThinkingEffort,
} from "~~/server/utils/deepseek";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

/**
 * 👇 Nuxt 3 服务端 API 路由的标准写法
 * defineEventHandler 是 Nuxt 提供的函数，用于定义一个服务端事件处理器
 * 这个文件的名字是 stream.post.ts，所以它会自动映射为 POST 请求：/api/chat/stream
 *
 * 为什么要写在 server/api/ 文件夹下？
 * 因为这个文件夹下的所有代码都只会在服务端运行，永远不会发送到浏览器
 * 这样我们的 API Key 就绝对安全了
 */
export default defineEventHandler(async (event) => {
  // 👇 设置 SSE（Server-Sent Events）响应头
  // 这是实现流式输出（打字机效果）的核心！
  // SSE 是一种 HTTP 协议，允许服务端持续向客户端推送数据
  setHeader(event, "Content-Type", "text/event-stream"); // 告诉客户端这是一个事件流 第二个参数是事件流的类型
  setHeader(event, "Cache-Control", "no-cache, no-transform"); // 禁用缓存，确保每次都是最新数据
  setHeader(event, "Connection", "keep-alive"); // 保持连接打开，不要断开
  setHeader(event, "X-Accel-Buffering", "no"); // 禁用缓冲，确保数据及时发送
  setHeader(event, "Content-Encoding", "none"); // 禁用压缩，确保数据及时发送
  // 👇 读取客户端发送过来的请求体
  // event 是 Nuxt 封装的请求对象，包含了所有请求相关的信息
  // readBody 是一个异步函数，用于解析 POST 请求的 JSON 格式请求体
  const body = await readBody(event);

  // 👇 参数验证：这是一个非常重要的安全措施
  // 我们必须检查客户端发送的参数是否符合预期，防止恶意请求或错误请求
  if (!body.messages || !Array.isArray(body.messages)) {
    // 如果参数不合法，抛出一个 400 错误（Bad Request）
    // createError 是 Nuxt 提供的函数，用于创建标准化的 HTTP 错误
    throw createError({
      statusCode: 400,
      statusMessage: "messages 参数必须是数组",
    });
  }

  try {
    // 👇 调用 DeepSeek API，开启流式输出
    // deepseekClient 是我们之前封装好的 OpenAI 客户端实例
    const stream = await deepseekClient.chat.completions.create({
      // 指定使用的模型，默认用 V4-Flash（性价比最高）
      // 如果客户端在请求体中指定了 model，就用客户端指定的
      model: body.model || DeepSeekModel.V4_FLASH,

      // 完整的对话历史，由客户端维护并发送过来
      // 类型断言告诉 TypeScript 这个数组符合 ChatCompletionMessageParam 类型
      messages: body.messages as ChatCompletionMessageParam[],

      // 温度参数：控制输出的随机性，0=最确定，2=最随机
      // 默认 0.7 是一个比较平衡的值
      temperature: body.temperature || 0.7,

      // 最大输出 token 数：限制 AI 回答的最大长度
      // 防止 AI 生成过长的回答浪费 token
      max_tokens: body.maxTokens || 2048,

      // ✨ 最关键的参数：开启流式输出
      // 如果设置为 false，API 会等所有内容生成完再一次性返回
      // 如果设置为 true，API 会返回一个可读流，生成一个字就返回一个字
      stream: true,

      // 思考模式开关（V4 模型新特性）
      // 注释掉表示默认关闭，需要时可以打开
      // thinking: { effort: ThinkingEffort.MEDIUM }
    });

    // 👇 循环读取流中的数据块（chunk）
    // for await...of 是 JavaScript 用于遍历异步迭代器的语法
    // stream 是一个异步迭代器，每次迭代都会返回一个生成好的文本块
    for await (const chunk of stream) {
      // 从每个数据块中提取内容
      // chunk.choices[0].delta.content 是 AI 生成的回答内容
      // chunk.choices[0].delta.reasoning_content 是 AI 的思考过程（只有开启思考模式时才有）
      // 使用 || '' 确保即使值为 undefined 也不会出错
      const content = chunk.choices[0]?.delta?.content || "";
      const reasoningContent = chunk.choices[0]?.delta?.reasoning_content || "";

      // 如果有内容，就发送给客户端
      if (content || reasoningContent) {
        // 📡 SSE 协议的标准格式：data: 内容\n\n
        // 每个事件必须以 "data: " 开头，以两个换行符 "\n\n" 结尾
        // 我们把内容用 JSON.stringify 包裹起来，这样可以传递复杂的数据结构
        event.node.res.write(
          `data: ${JSON.stringify({
            content,
            reasoningContent,
          })}\n\n`,
        );
      }
    }

    // 👇 发送结束信号，告诉客户端所有内容都已经生成完毕
    // 客户端收到 "[DONE]" 后就知道可以关闭连接了
    event.node.res.write(`data: [DONE]\n\n`);

    // 结束响应流
    event.node.res.end();
  } catch (error) {
    // 👇 错误处理：如果调用 DeepSeek API 失败
    console.error("流式调用失败:", error); // 在服务端打印错误日志，方便调试

    // 即使出错了，我们也要按照 SSE 协议的格式发送错误信息
    // 不能直接抛出错误，因为客户端期待的是一个流式响应
    // 如果直接抛出错误，客户端会收到一个普通的 HTTP 错误，而不是友好的提示
    event.node.res.write(
      `data: ${JSON.stringify({
        error: "AI 服务暂时不可用，请稍后重试",
      })}\n\n`,
    );

    // 发送结束信号
    event.node.res.write(`data: [DONE]\n\n`);

    // 结束响应流
    event.node.res.end();
  }
});
