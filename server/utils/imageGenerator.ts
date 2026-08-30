/**
 * 生图工具：多 provider 统一入口，均返回图片二进制
 * - cloudflare（默认）: Workers AI Flux schnell，免费快速，1024×1024（纯文生图）
 * - bailian: 阿里百炼多模态（wan2.7-image-pro / qwen-image-3.0-pro），支持 1K/2K/4K
 * - qwen-edit: 百炼 qwen-image 系列 I2I 图像编辑（默认 2.0），以参考图锁定商品形态，保证图集一致性
 *
 * 接入新模型只需在 PROVIDERS 注册实现，上传与入库流程（cloudinary.ts / generate-main-image）完全不用动。
 */

/** 生图 provider 及其选项 */
export interface GenerateImageOptions {
  provider?: "cloudflare" | "bailian" | "qwen-edit";
  /** 仅 bailian / qwen-edit 生效：模型名。bailian 默认 wan2.7-image-pro；qwen-edit 默认 qwen-image-2.0（免费额度独立于 3.0），可传 qwen-image-3.0 / qwen-image-edit-plus 等 */
  model?: string;
  /** 仅 bailian 生效：1K / 2K / 4K 或 "宽*高"，默认 2K */
  size?: string;
  /** 随机数种子：同 seed + 相近提示词可显著收敛输出形态（商品一致性辅助手段） */
  seed?: number;
  /** 仅 qwen-image-3.0 生效：参考图 URL（一般传商品主图），锁定商品的形状/颜色/材质。仅支持单图，多图参考不支持 */
  referenceImageUrl?: string;
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
  const { accountId, workersAi } = useRuntimeConfig().cloudflare || {};
  if (!accountId || !workersAi?.apiToken) {
    throw new Error(
      "Cloudflare 未配置：请在 .env 中填写 NUXT_CLOUDFLARE_ACCOUNT_ID / NUXT_CLOUDFLARE_WORKERS_AI_API_TOKEN",
    );
  }
  return { accountId, apiToken: workersAi.apiToken };
}

/** Flux schnell 仅支持 prompt / steps / seed，无宽高参数（固定 1024×1024） */
const generateWithFlux: GenerateFn = async (prompt, options) => {
  const { accountId, apiToken } = getCloudflareConfig();

  const response = await fetch(
    `${CF_API_BASE}/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      // seed 需为 uint64 范围内整数，传入时锁定初始噪声，提升跨图一致性
      body: JSON.stringify({ prompt, steps: 4, seed: options.seed }),
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
// Provider 3: 百炼 qwen-image 系列图像编辑 I2I（参考图 + 指令，同步调用）
// ============================================
//
// 商品一致性方案：以商品主图为视觉锚点，提示词只描述"如何变换视角/场景"，
// 商品的形状、颜色、材质由参考图锁定，图集内多张图保持同款。
// 默认 qwen-image-2.0（免费额度与 3.0 相互独立），可通过 options.model 切换同系列模型。
// API: POST /services/aigc/multimodal-generation/generation（同步，直接返回图片 URL）

const generateWithQwenEdit: GenerateFn = async (prompt, options) => {
  const { apiKey, baseUrl } = getDashscopeConfig();
  const referenceImage = options.referenceImageUrl;
  // 仅允许单张参考图（本业务只传商品主图），拒绝多图/非法输入
  if (
    typeof referenceImage !== "string" ||
    !/^https?:\/\//.test(referenceImage)
  ) {
    throw new Error(
      "qwen-edit 需要单个合法的 referenceImageUrl（http(s) 参考图 URL，一般传商品主图），不支持多图参考",
    );
  }

  const response = await fetch(
    `${baseUrl}/services/aigc/multimodal-generation/generation`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options.model || "qwen-image-2.0",
        input: {
          messages: [
            {
              role: "user",
              content: [
                // 固定单图参考（商品主图）+ 编辑指令；不允许多图参考
                { image: referenceImage },
                { text: prompt },
              ],
            },
          ],
        },
        parameters: {
          // I2I 图像编辑：prompt_extend 只能用 direct 模式，agent 会 400
          prompt_extend: true,
          prompt_extend_mode: "direct",
          // 商品图负面提示词：防变形/水印/多余物体
          negative_prompt: "变形，扭曲，水印，文字，模糊，残缺，多余物体，畸形",
          n: 1,
          watermark: false,
          ...(options.size ? { size: options.size } : {}),
        },
      }),
    },
  );

  // 同步返回：output.choices[0].message.content[].image 即图片 URL
  const data = (await response.json()) as {
    output?: {
      choices?: Array<{ message?: { content?: Array<{ image?: string }> } }>;
    };
    code?: string;
    message?: string;
  };
  const imageUrl = data.output?.choices?.[0]?.message?.content?.find(
    (item) => item.image,
  )?.image;
  if (!response.ok || !imageUrl) {
    throw new Error(
      `qwen-image(${options.model || "qwen-image-2.0"}) 生图失败: ${data.code || response.status} ${data.message || ""}`,
    );
  }

  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) {
    throw new Error(
      `下载 qwen-image 图片失败: ${imgResponse.status} ${imgResponse.statusText}`,
    );
  }
  return Buffer.from(await imgResponse.arrayBuffer());
};

// ============================================
// 统一入口
// ============================================

const PROVIDERS: Record<string, GenerateFn> = {
  cloudflare: generateWithFlux,
  bailian: generateWithBailian,
  "qwen-edit": generateWithQwenEdit,
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
