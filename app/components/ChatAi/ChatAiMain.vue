<template>
  <div class="main-container">
    <!-- 欢迎首页（仅首次发送前展示，发送过一次消息后永久隐藏；手机端媒体查询隐藏） -->
    <ChatAiWelcome v-if="!hasStarted" class="welcome" />
    <!-- 流式回复展示 -->
    <div v-else class="reply-preview">
      <!-- 推理模型的思维链（流式期间自动展开实时展示，完成后自动收起，普通模型无此区域） -->
      <el-collapse v-if="reasoning" v-model="activeReasoning" class="reasoning-collapse">
        <el-collapse-item name="think">
          <template #title>
            <span class="reasoning-title">思考过程</span>
          </template>
          <div class="reasoning-text">{{ reasoning }}</div>
        </el-collapse-item>
      </el-collapse>
      {{ output }}
    </div>
    <!-- 底部输入框 -->
    <div class="input-wrap">
      <ChatInputBar v-model:text="text" v-model:image="image" v-model:model-id="modelId" @send="onSend" />
    </div>
  </div>
</template>

<script setup lang="ts">
import ChatAiWelcome from './ChatAiWelcome.vue'
import ChatInputBar from './ChatInputBar.vue'
import {
  HumanMessage,
  HumanMessageMultimodal,
  AIMessage,
  type BaseMessageLike,
} from '~/composables/useAiChat'

// ===================== 输入状态（与 ChatInputBar 双向绑定） =====================
const text = ref('')
const image = ref('')
const modelId = ref('')

// ===================== AI 对话（Workers AI 流式，见 composables/useAiChat） =====================
const { output, reasoning, loading, resolveChatModelId, sendChat } = useAiChat()

// 思维链折叠状态：流式期间自动展开实时展示打字过程，完成后自动收起（仍可手动展开）
const activeReasoning = ref<string[]>([])
watch(loading, (v) => {
  activeReasoning.value = v ? ['think'] : []
}, { immediate: true })

// 多轮对话历史（本地维护，每次请求全量携带作为上下文）
const history = ref<BaseMessageLike[]>([])

// 是否已发送过消息（首次发送后欢迎页不再展示，避免每轮清空输出时闪回）
const hasStarted = ref(false)

async function onSend() {
  const prompt = text.value.trim()
  if (!prompt) {
    ElMessage.warning('请输入内容')
    return
  }
  if (loading.value) return
  hasStarted.value = true

  // 先暂存图片再清空输入
  const img = image.value
  text.value = ''
  image.value = ''

  // 带图时构造多模态消息，图片仅随本轮 user 消息发送（历史里保留完整分片）
  const message = img ? new HumanMessageMultimodal(prompt, img) : new HumanMessage(prompt)
  history.value.push(message)

  try {
    // 多轮对话：全量历史 + 本轮输入，上下文由请求体携带（服务端无状态）
    await sendChat([...history.value], resolveChatModelId(modelId.value))
    // 回复完成计入历史，供后续轮次引用
    history.value.push(new AIMessage(output.value))
    ElMessage.success('回复完成')
  } catch (err) {
    // 失败的消息回滚，避免脏数据进入后续上下文
    history.value.pop()
    console.error("[ai/chat] 发送失败:", err)
    // CF Free 计划无权调用该模型（403 / 错误码 5035，已弃用模型已被前置筛除）→ 映射为友好文案
    const raw = err instanceof Error ? err.message : String(err)
    const msg = raw.startsWith('Workers AI API error (403 Forbidden)')
      ? '当前会员等级不足，该模型需要 Cloudflare 付费计划'
      : raw
    ElMessage.error(`发送失败: ${msg}`)
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
  overflow: auto;
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
  overflow: auto;
}

// 思维链折叠区（弱化视觉，与正文区分）
.reasoning-collapse {
  margin-bottom: 0.75rem;
  white-space: normal;

  .reasoning-title {
    font-size: var(--kk-font-size-extra-small);
    color: var(--el-text-color-secondary);
  }

  .reasoning-text {
    font-size: var(--kk-font-size-extra-small);
    color: var(--el-text-color-secondary);
    white-space: pre-wrap;
    word-break: break-word;
  }

  // 折叠面板边框弱化为分隔线
  :deep(.el-collapse-item__header),
  :deep(.el-collapse-item__wrap) {
    border-bottom: none;
    background: transparent;
  }
}

// ===================== 手机端适配（≤768px） =====================
@media (max-width: 768px) {
  // 欢迎页在手机端隐藏，仅保留输入栏
  .welcome {
    display: none;
  }

  .input-wrap {
    width: 100%;
  }

  .reply-preview {
    width: 100%;
    margin-bottom: 6rem;
  }
}
</style>
