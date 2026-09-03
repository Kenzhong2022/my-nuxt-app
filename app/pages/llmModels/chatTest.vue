<script setup lang="ts">
// 纯对话模型页：单次对话（无历史记忆），调用 POST /api/ai/chat（Cloudflare Workers AI 流式）
// pages/**/components 不在 Nuxt 自动注册范围（仅扫描 app/components/），需显式导入
import PromptDialog from './components/PromptDialog.vue';
import ModelFilterSelect from './components/ModelFilterSelect.vue';
import ImageUpload from './components/ImageUpload.vue';
import { CHAT_TASKS, toModelId } from './constants/chat.ts';
import { SYSTEM_PROMPT } from './constants/prompt.ts';
import type { ChatMessage } from './constants/chat.ts';
import type { LlmModelCatalog } from '~~/types/llmModel';

const input = ref('');
const output = ref('');
const loading = ref(false);

// 当前选中模型名（ModelFilterSelect 内部解析为 LlmModel）
const modelName = ref('');
const catalog = ref<LlmModelCatalog | null>(null);

// 用户上传的图片 base64 / 提示词弹窗
const uploadedImage = ref('');
const promptVisible = ref(false);

onMounted(async () => {
  // 目录仅用于 send() 时反查所选模型的厂商与名称（筛选组件内部也会各自加载）
  catalog.value = await $fetch<LlmModelCatalog>('/allModels/llm-modules.json');
});

/** 按模型名反查目录中的模型（作者名拼 Workers AI 调用 ID 用） */
function findSelectedModel() {
  return (
    catalog.value?.taskTypes.flatMap((g) => g.models).find((m) => m.name === modelName.value) ?? null
  );
}

async function send() {
  const text = input.value.trim();
  if (!text || loading.value) return;

  loading.value = true;
  output.value = '';
  input.value = '';

  // 单次对话：每次只带 system + 本次输入，不带历史
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: text },
  ];

  // 选中模型为对话类（文本生成/图生文）时随请求下发，否则缺省走 API 默认模型
  const selected = findSelectedModel();
  const chatModel = selected && CHAT_TASKS.includes(selected.taskType)
    ? toModelId(selected.author, selected.name)
    : undefined;

  try {
    // 流式必须用原生 fetch（$fetch/useFetch 会等整个响应结束）
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, model: chatModel }),
    });
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${detail.slice(0, 120)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // SSE 按行切分，最后一段可能不完整，留到下一轮
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(line.slice(6));
          if (json.response) output.value += json.response;
        } catch {
          // 忽略无法解析的残缺行
        }
      }
    }
  } catch (err) {
    output.value += `\n[请求失败: ${err instanceof Error ? err.message : err}]`;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="chat-page">
    <div class="chat-card">
      <div class="page-header">
        <h2>AI 对话（纯对话模型）</h2>
        <el-button text type="primary" size="small" @click="promptVisible = true">查看提示词</el-button>
      </div>

      <PromptDialog v-model:visible="promptVisible" :prompt="SYSTEM_PROMPT" />

      <!-- 模型筛选：任务类型 / 厂商 / 徽标（多选）级联过滤 + 模型选择 -->
      <ModelFilterSelect
        v-model:model-id="modelName"
        :applies-tasks="CHAT_TASKS"
        applies-label="适用对话"
      />

      <!-- 图片上传（按钮 / Ctrl+V 粘贴 → base64 预览，位于对话之上） -->
      <ImageUpload v-model:image="uploadedImage" :disabled="loading" />

      <div class="output" :class="{ placeholder: !output && !loading }">
        <template v-if="output">{{ output }}</template>
        <template v-else-if="loading">生成中…</template>
        <template v-else>输入问题开始对话（每次提问独立，不保留上下文）</template>
      </div>

      <form class="input-row" @submit.prevent="send">
        <el-input
          v-model="input"
          :disabled="loading"
          placeholder="问点什么…（Ctrl+V 可粘贴图片）"
          size="large"
          clearable
        />
        <el-button
          type="primary"
          size="large"
          native-type="submit"
          :loading="loading"
          :disabled="!input.trim()"
        >
          发送
        </el-button>
      </form>
    </div>
  </div>
</template>

<style scoped lang="scss">
// ===================== 页面布局 =====================
.chat-page {
  display: flex;
  justify-content: center;
  padding: 2.5rem 1rem;
}
.chat-card {
  width: 100%;
  max-width: 45rem;
  color: var(--el-text-color-primary);
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
    font-size: var(--kk-font-size-large);
    font-weight: 700;
  }
}

// ===================== 对话输出 =====================
.output {
  min-height: 15rem;
  padding: 1rem;
  margin: 0.75rem 0;
  font-size: var(--kk-font-size-base);
  line-height: var(--kk-line-height-large);
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid var(--el-border-color);
  border-radius: 0.5rem;

  &.placeholder {
    color: var(--el-text-color-placeholder);
  }
}

// ===================== 输入行 =====================
.input-row {
  display: flex;
  gap: 0.75rem;
}
</style>
