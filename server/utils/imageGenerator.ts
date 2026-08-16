/**
 * 文生图工具：多 provider 统一入口，均返回图片二进制
 * - cloudflare（默认）: Workers AI Flux schnell，免费快速，1024×1024
 * - bailian: 阿里百炼多模态（wan2.7-image-pro / qwen-image-3.0-pro），支持 1K/2K/4K
 *
 * 接入新模型只需在 PROVIDERS 注册实现，上传与入库流程（cloudinary.ts / regenerate-images）完全不用动。
 */

/** 生图 provider 及其选项 */
export interface GenerateImageOptions {
  provider?: "cloudflare" | "bailian";
  /** 仅 bailian 生效：默认 wan2.7-image-pro，可选 qwen-image-3.0-pro 等 */
  model?: string;
  /** 仅 bailian 生效：1K / 2K / 4K 或 "宽*高"，默认 2K */
  size?: string;
}

type GenerateFn = (
  prompt: string,
  options: GenerateImageOptions,
) => Promise<Buffer>;

// ============================================
// Provider 1: Cloudflare Workers AI Flux schnell
// ============================================

const CF_API_BASE = "https://api.cloudflare.com/client/v4/accounts";

function getCloudflareConfig() {
  const config = useRuntimeConfig().cloudflare;
  if (!config?.accountId || !config?.apiToken) {
    throw new Error(
      "Cloudflare 未配置：请在 .env 中填写 CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN",
    );
  }
  return config as { accountId: string; apiToken: string };
}

/** Flux schnell 仅支持 prompt / steps / seed，无宽高参数（固定 1024×1024） */
const generateWithFlux: GenerateFn = async (prompt) => {
  const { accountId, apiToken } = getCloudflareConfig();

  const response = await fetch(
    `${CF_API_BASE}/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, steps: 4 }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `生图接口请求失败: ${response.status} ${response.statusText} ${(await response.text()).slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as {
    success?: boolean;
    result?: { image?: string };
    errors?: unknown[];
  };

  if (!data.success || !data.result?.image) {
    throw new Error(
      `生图接口返回异常: ${JSON.stringify(data.errors).slice(0, 200)}`,
    );
  }

  return Buffer.from(data.result.image, "base64");
};

// ============================================
// Provider 2: 阿里百炼多模态生图（异步任务 + 轮询）
// ============================================

const DASHSCOPE_DEFAULT_BASE = "https://dashscope.aliyuncs.com/api/v1";
const BAILIAN_POLL_INTERVAL = 3000;
const BAILIAN_MAX_POLLS = 60; // 最长约 3 分钟

function getDashscopeConfig() {
  const { apiKey, baseUrl } = useRuntimeConfig().dashscope || {};
  if (!apiKey) {
    throw new Error("百炼未配置：请在 .env 中填写 DASHSCOPE_API_KEY");
  }
  return {
    apiKey: apiKey as string,
    // BASE_URL 留空时用官方默认地址
    baseUrl: (baseUrl || DASHSCOPE_DEFAULT_BASE) as string,
  };
}

/** 创建百炼异步生图任务，返回 task_id */
async function createBailianTask(
  baseUrl: string,
  prompt: string,
  apiKey: string,
  model: string,
  size: string,
): Promise<string> {
  const response = await fetch(
    `${baseUrl}/services/aigc/multimodal-generation/generation`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model,
        input: {
          messages: [{ role: "user", content: [{ text: prompt }] }],
        },
        parameters: { size, n: 1, watermark: false },
      }),
    },
  );

  const data = (await response.json()) as {
    output?: { task_id?: string };
    code?: string;
    message?: string;
  };

  if (!response.ok || !data.output?.task_id) {
    throw new Error(
      `百炼创建任务失败: ${data.code || response.status} ${data.message || ""}`,
    );
  }
  return data.output.task_id;
}

/** 轮询任务直至完成，返回图片 URL */
async function pollBailianTask(
  baseUrl: string,
  taskId: string,
  apiKey: string,
): Promise<string> {
  for (let i = 0; i < BAILIAN_MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, BAILIAN_POLL_INTERVAL));

    const response = await fetch(`${baseUrl}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = (await response.json()) as {
      output?: {
        task_status?: string;
        choices?: Array<{ message?: { content?: Array<{ image?: string }> } }>;
        results?: Array<{ url?: string }>;
      };
    };

    const status = data.output?.task_status;
    if (status === "SUCCEEDED") {
      const url =
        data.output?.choices?.[0]?.message?.content?.find((c) => c.image)
          ?.image || data.output?.results?.[0]?.url;
      if (!url)
        throw new Error(
          `百炼返回成功但未找到图片: ${JSON.stringify(data).slice(0, 200)}`,
        );
      return url;
    }
    if (status === "FAILED" || status === "CANCELED" || status === "UNKNOWN") {
      throw new Error(
        `百炼任务失败（${status}）: ${JSON.stringify(data.output).slice(0, 200)}`,
      );
    }
    // PENDING / RUNNING 继续轮询
  }
  throw new Error(
    `百炼任务超时（${(BAILIAN_MAX_POLLS * BAILIAN_POLL_INTERVAL) / 1000}s）: ${taskId}`,
  );
}

const generateWithBailian: GenerateFn = async (prompt, options) => {
  const { apiKey, baseUrl } = getDashscopeConfig();
  const model = options.model || "wan2.7-image-pro";
  const size = options.size || "2K";

  const taskId = await createBailianTask(baseUrl, prompt, apiKey, model, size);
  const imageUrl = await pollBailianTask(baseUrl, taskId, apiKey);

  // 下载图片为二进制，保持与 Flux provider 相同的返回契约
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(
      `下载百炼图片失败: ${response.status} ${response.statusText}`,
    );
  }
  return Buffer.from(await response.arrayBuffer());
};

// ============================================
// 统一入口
// ============================================

const PROVIDERS: Record<string, GenerateFn> = {
  cloudflare: generateWithFlux,
  bailian: generateWithBailian,
};

/**
 * 生成图片并返回二进制（各 provider 契约一致，上传/入库流程无需感知差异）
 * @param prompt 提示词
 * @param options.provider 生图服务，默认 cloudflare
 */
export async function generateImage(
  prompt: string,
  options: GenerateImageOptions = {},
): Promise<Buffer> {
  const fn = PROVIDERS[options.provider || "cloudflare"];
  if (!fn) {
    throw new Error(
      `未知的生图 provider: ${options.provider}（可选 ${Object.keys(PROVIDERS).join(" / ")}）`,
    );
  }
  return fn(prompt, options);
}
