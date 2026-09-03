<template>
  <div class="main-container">
    <!-- 欢迎首页（收到回复后隐藏） -->
    <ChatAiWelcome v-if="!output" />
    <!-- 流式回复展示 -->
    <div v-else class="reply-preview">{{ output }}</div>
    <!-- 底部输入框 -->
    <div class="input-wrap">
      <ChatInputBar v-model:text="text" v-model:image="image" v-model:model-id="modelId" @send="onSend" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ChatAiWelcome from './ChatAiWelcome.vue'
import ChatInputBar from './ChatInputBar.vue'
import { HumanMessage, HumanMessageMultimodal } from '~/composables/useAiChat'

// ===================== 输入状态（与 ChatInputBar 双向绑定） =====================
const text = ref('')
const image = ref('')
const modelId = ref('')

// ===================== AI 对话（Workers AI 流式，见 composables/useAiChat） =====================
const { output, loading, resolveChatModelId, sendChat } = useAiChat()

async function onSend() {
  const prompt = text.value.trim()
  if (!prompt) {
    ElMessage.warning('请输入内容')
    return
  }
  if (loading.value) return

  // 先暂存图片再清空输入
  const img = image.value
  text.value = ''
  image.value = ''

  try {
    // 单次对话：仅带本次输入（/api/ai/chat 不保留上下文），带图时构造多模态消息
    const message = img ? new HumanMessageMultimodal(prompt, img) : new HumanMessage(prompt)
    await sendChat([message], resolveChatModelId(modelId.value))
    ElMessage.success('回复完成')
  } catch (err) {
    ElMessage.error(`发送失败: ${err instanceof Error ? err.message : err}`)
  }
}
</script>

<style scoped lang="scss">
// ===================== 主对话容器 =====================
.main-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: center;
  position: relative;

  .input-wrap {
    position: absolute;
    bottom: 1.875rem;
    left: 0;
    right: 0;
    width: 80%;
    margin: 0 auto;
  }
}

// 流式回复展示区
.reply-preview {
  width: 80%;
  margin-bottom: 8rem;
  padding: 1rem;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: var(--kk-font-size-small);
  line-height: 1.6;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 0.75rem;
}
</style>
