<template>
  <div ref="mainRef" class="main-container">
    <!-- 欢迎首页（仅首次发送前展示，发送过一次消息后永久隐藏；手机端媒体查询隐藏） -->
    <ChatAiWelcome v-if="!hasStarted" class="welcome" />
    <!-- 会话消息列表：用户消息右侧气泡，AI 回复左侧气泡（流式回复完成后才计入 history，避免重复渲染） -->
    <div v-else class="message-list">
      <div
        v-for="(msg, i) in history"
        :key="i"
        class="message-row"
        :class="msg.role === 'human' ? 'is-user' : 'is-ai'"
      >
        <img v-if="msgImage(msg)" :src="msgImage(msg)" alt="用户发送的图片" class="message-image" />
        <div v-if="msgText(msg)" class="bubble">{{ msgText(msg) }}</div>
      </div>
      <!-- 流式中的 AI 回复（带思维链折叠区，完成后计入 history） -->
      <div v-if="loading" class="message-row is-ai">
        <el-collapse v-if="reasoning" v-model="activeReasoning" class="reasoning-collapse">
          <el-collapse-item name="think">
            <template #title>
              <span class="reasoning-title">思考过程</span>
            </template>
            <div class="reasoning-text">{{ reasoning }}</div>
          </el-collapse-item>
        </el-collapse>
        <div class="bubble">{{ output || '…' }}</div>
      </div>
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

// 容器引用（消息区自动滚动用）
const mainRef = ref<HTMLElement | null>(null)

// 消息新增 / 流式输出增长时滚动到底部，保证最新气泡可见
watch([() => history.value.length, output, reasoning], () => {
  nextTick(() => mainRef.value?.scrollTo({ top: mainRef.value.scrollHeight }))
})

// ===================== 消息渲染辅助（气泡内容提取） =====================
/** 提取消息展示文本：字符串直接返回，多模态分片取 text 分片拼接 */
function msgText(m: BaseMessageLike): string {
  if (typeof m.content === 'string') return m.content
  return m.content.map((p) => (p.type === 'text' ? p.text : '')).join('')
}

/** 提取多模态消息中的图片（base64 data URL），纯文本消息返回空串 */
function msgImage(m: BaseMessageLike): string {
  if (typeof m.content === 'string') return ''
  const part = m.content.find((p) => p.type === 'image_url')
  return part && part.type === 'image_url' ? part.image_url.url : ''
}

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
    // CF Free 计划无权调用该模型（403 / 错误码 5035，已弃用模型已被前置筛除）→ 映射为友好文案；
    // 服务端重试（maxRetries=3）全部失败后的网络类错误（Connect Timeout / fetch failed）→ 提示稍后重试
    const raw = err instanceof Error ? err.message : String(err)
    const msg = raw.startsWith('Workers AI API error (403 Forbidden)')
      ? '当前会员等级不足，该模型需要 Cloudflare 付费计划'
      : raw.includes('Connect Timeout') || raw.includes('fetch failed')
        ? '网络连接不稳定，服务端已自动重试仍失败，请稍后重新发送'
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

// ===================== 会话消息列表 =====================
.message-list {
  width: 80%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 8rem;
}
.message-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;

  // 用户消息：右对齐 + 主题色浅底气泡
  &.is-user {
    align-items: flex-end;

    .bubble {
      background: var(--el-color-primary-light-8);
      border-color: var(--el-color-primary-light-7);
    }
  }
}
.bubble {
  max-width: 85%;
  padding: 0.625rem 0.875rem;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: var(--kk-font-size-small);
  line-height: 1.6;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 0.75rem;
}
// 用户发送的图片缩略图
.message-image {
  max-width: 12rem;
  border: 1px solid var(--el-border-color-light);
  border-radius: 0.5rem;
  cursor: zoom-in;
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

  .message-list {
    width: 100%;
    margin-bottom: 6rem;
  }
}
</style>
